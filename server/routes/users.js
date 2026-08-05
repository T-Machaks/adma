import { Router } from 'express';
import { GetCommand, PutCommand, UpdateCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';
import { crudRouter } from '../lib/crudRouter.js';
import { requireAuth } from '../lib/authMiddleware.js';
import { getMyExhibitorId } from '../lib/ownership.js';

const TABLE = 'adma_users';

// Fields that must never be settable through this generic endpoint at all —
// password_hash/totp_secret are only ever written by the dedicated flows in
// auth.js (bcrypt hashing, TOTP verification), never as a raw client value.
const NEVER_CLIENT_SETTABLE = ['password_hash', 'totp_secret'];
// Fields that change what an account can do — only an organizer/superadmin
// session may set these; a self-service PUT (e.g. a user editing their own
// name) or an exhibitor inviting a team member must not be able to touch them.
const PRIVILEGED_FIELDS = ['role', 'status', 'must_change_password', 'mfa_exempt'];
const ELEVATED_ROLES = ['organizer', 'marketing_partner', 'superadmin'];

function isOrganizerSession(req) {
  return req.user && (req.user.role === 'organizer' || req.user.role === 'superadmin');
}

function sanitize(user) {
  if (!user) return user;
  const { password_hash, totp_secret, ...rest } = user;
  return rest;
}

export default crudRouter(TABLE, {
  defaults: () => ({ role: 'attendee', status: 'active' }),
  extraRoutes(r) {
    // These are registered before crudRouter's own generic handlers for the
    // same paths, so they take priority -- strips password_hash/totp_secret
    // from every response instead of returning the raw DynamoDB item.
    r.get('/by-email', requireAuth, async (req, res) => {
      try {
        const email = req.query.email?.toLowerCase();
        if (!email) return res.status(400).json({ error: 'email required' });
        const result = await ddb.send(new QueryCommand({
          TableName: TABLE,
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :e',
          ExpressionAttributeValues: { ':e': email },
          Limit: 1,
        }));
        res.json(sanitize(result.Items?.[0] ?? null));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Self-service data export/portability — GET /api/users/me/export downloads a JSON
    // file of everything the caller's own account, registration, meeting requests,
    // attendee notes, and payments hold. This is the same "what data do you hold about
    // me" right already promised in PrivacyPolicy.jsx Section 7, made self-service
    // instead of a fully manual email request. CAIQ Interoperability & Portability
    // domain point of reference — a real machine-readable export, not just a policy
    // statement.
    r.get('/me/export', requireAuth, async (req, res) => {
      try {
        const me = req.user;
        const email = me.email?.toLowerCase();

        const account = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: me.id } }));

        let exhibitor = null;
        const exhibitorId = await getMyExhibitorId(req);
        if (exhibitorId) {
          const exResult = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitorId } }));
          exhibitor = exResult.Item ?? null;
        }

        const registrations = email ? await ddb.send(new QueryCommand({
          TableName: 'adma_registrations',
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :e',
          ExpressionAttributeValues: { ':e': email },
        })) : { Items: [] };

        const attendeeNotes = email ? await ddb.send(new QueryCommand({
          TableName: 'adma_attendee_notes',
          IndexName: 'user-email-index',
          KeyConditionExpression: 'user_email = :e',
          ExpressionAttributeValues: { ':e': email },
        })) : { Items: [] };

        // No email-index GSI on meeting_requests (only exhibitor-index) — a filtered scan
        // is the same approach the rest of this app already uses for small tables without
        // a matching index (e.g. payments.js's own list endpoint).
        const meetingRequests = email ? await ddb.send(new ScanCommand({
          TableName: 'adma_meeting_requests',
          FilterExpression: 'visitor_email = :e',
          ExpressionAttributeValues: { ':e': email },
        })) : { Items: [] };

        const paymentsResult = await ddb.send(new ScanCommand({ TableName: 'adma_payments' }));
        const payments = (paymentsResult.Items || []).filter(p =>
          (exhibitorId && p.exhibitor_id === exhibitorId) || p.created_by_user_id === me.id
        );

        const exportPayload = {
          exported_at: new Date().toISOString(),
          note: 'This is a self-service export of everything ADMA Digital holds tied to your account, generated on request. See /privacy for how this data is used and retained.',
          account: sanitize(account.Item),
          exhibitor_profile: exhibitor,
          registrations: registrations.Items || [],
          meeting_requests: meetingRequests.Items || [],
          attendee_notes: attendeeNotes.Items || [],
          payments,
        };

        res.setHeader('Content-Disposition', `attachment; filename="adma-digital-my-data-${new Date().toISOString().slice(0, 10)}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(exportPayload, null, 2));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    r.post('/', requireAuth, async (req, res) => {
      try {
        const body = { ...req.body };
        for (const f of NEVER_CLIENT_SETTABLE) delete body[f];
        // Self-service account creation (signup, exhibitor team invites) may only ever
        // create attendee/exhibitor accounts — anything with console access requires an
        // organizer/superadmin session.
        if (body.role && ELEVATED_ROLES.includes(body.role) && !isOrganizerSession(req)) {
          delete body.role;
        }
        if (!isOrganizerSession(req)) delete body.status;

        const item = {
          id: generateId(),
          created_date: new Date().toISOString(),
          role: 'attendee',
          status: 'active',
          ...body,
        };
        await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
        res.status(201).json(sanitize(item));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    r.get('/', requireAuth, async (req, res) => {
      try {
        const { sortBy, filter: filterJson } = req.query;
        const filterObj = filterJson ? JSON.parse(decodeURIComponent(filterJson)) : null;
        let items;
        if (filterObj) {
          const entries = Object.entries(filterObj);
          const names = {};
          const values = {};
          const parts = entries.map(([k, v], i) => {
            names[`#k${i}`] = k;
            values[`:v${i}`] = v;
            return `#k${i} = :v${i}`;
          });
          const result = await ddb.send(new ScanCommand({
            TableName: TABLE,
            FilterExpression: parts.join(' AND '),
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
          }));
          items = result.Items || [];
        } else {
          const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
          items = result.Items || [];
        }
        if (sortBy) {
          const desc = sortBy.startsWith('-');
          const field = desc ? sortBy.slice(1) : sortBy;
          items.sort((a, b) => {
            const av = a[field] ?? '';
            const bv = b[field] ?? '';
            return desc ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
          });
        }
        res.json(items.map(sanitize));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    r.get('/:id', requireAuth, async (req, res) => {
      try {
        const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
        if (!result.Item) return res.status(404).json({ error: 'Not found' });
        res.json(sanitize(result.Item));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    r.put('/:id', requireAuth, async (req, res) => {
      try {
        const body = { ...req.body };
        for (const f of NEVER_CLIENT_SETTABLE) delete body[f];
        if (!isOrganizerSession(req)) {
          for (const f of PRIVILEGED_FIELDS) delete body[f];
        }

        const entries = Object.entries(body).filter(([k]) => k !== 'id');
        if (!entries.length) return res.status(400).json({ error: 'No fields to update' });

        const names = {};
        const values = {};
        const sets = entries.map(([k, v], i) => {
          names[`#f${i}`] = k;
          values[`:v${i}`] = v;
          return `#f${i} = :v${i}`;
        });

        const result = await ddb.send(new UpdateCommand({
          TableName: TABLE,
          Key: { id: req.params.id },
          UpdateExpression: `SET ${sets.join(', ')}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: 'ALL_NEW',
        }));
        res.json(sanitize(result.Attributes));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  },
});
