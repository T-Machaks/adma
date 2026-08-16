import { GetCommand, ScanCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { crudRouter } from '../lib/crudRouter.js';
import { nextMay30ISO } from '../lib/subscription.js';
import { logSecurityEvent } from '../lib/securityLog.js';
import { revokeAllSessionsForExhibitor, revokeAllSessionsForUser } from '../lib/session.js';
import { requireAuth, requireRole } from '../lib/authMiddleware.js';
import { getMyExhibitorId } from '../lib/ownership.js';
import { sendOtpEmail } from '../lib/mailer.js';

// Every table with an `exhibitor_id` field to clean up when an exhibitor is deleted,
// keyed to whether it has a GSI on that field (Query) or needs a filtered Scan.
// adma_payments is deliberately NOT here — financial/audit records are kept regardless,
// same reasoning as the rest of this app never hard-deleting a payment row.
const CASCADE_DELETE_TABLES = [
  { table: 'adma_meeting_requests',  index: 'exhibitor-index' },
  { table: 'adma_booth_messages',    index: 'exhibitor-index' },
  { table: 'adma_collaborations',    index: 'exhibitor-index' },
  { table: 'adma_job_listings',      index: 'exhibitor-index' },
  { table: 'adma_tender_listings',   index: 'exhibitor-index' },
  { table: 'adma_virtual_enquiries', index: 'exhibitor-index' },
  { table: 'adma_engagements',       index: 'exhibitor-index' },
  { table: 'adma_adslots',           index: null },
  { table: 'adma_job_applications',  index: null },
];

// Fields only an organiser/superadmin/marketing_partner may set — an exhibitor must
// never be able to grant themselves a package, unlock their own portal, or fake a paid
// billing/add-on state via a self-service PUT. `package` had no such guard before this
// was generalized from the single portal_locked check; folding it in here too.
const ORGANIZER_ONLY_FIELDS = [
  'portal_locked', 'package',
  'package_billed_at', 'package_expires_at',
  'marketplace_addon_status', 'marketplace_addon_billed_at', 'marketplace_addon_expires_at',
];

// Mirrors the same email/company matching ExhibitorHome.jsx uses client-side to
// resolve "my booth" from the session's email/company.
function ownsBooth(req, exhibitor) {
  if (!req.user) return false;
  if (req.user.role === 'organizer' || req.user.role === 'superadmin') return true;
  if (ORGANIZER_ONLY_FIELDS.some(f => f in req.body)) return false;
  if (req.user.role !== 'exhibitor') return false;
  const email = req.user.email?.toLowerCase();
  const company = req.user.company?.toLowerCase();
  return (exhibitor.contact_email && email && exhibitor.contact_email.toLowerCase() === email)
      || (exhibitor.name && company && exhibitor.name.toLowerCase() === company);
}

export default crudRouter('adma_exhibitors', {
  defaults: () => ({ featured: false, package: 'Basic', subscription_expires_at: nextMay30ISO() }),
  auth: { read: 'public', write: ownsBooth },
  // Soft-deleted exhibitors (see DELETE /:id below) disappear from every existing
  // list/detail read — directory, site plan, dashboard, analytics — with no extra
  // frontend filtering needed anywhere.
  filterItems: (item) => !item.deleted,
  extraRoutes(r) {
    // Overrides crudRouter's generic DELETE — never calls next(), so the generic
    // handler (registered after extraRoutes runs) never fires for this path. Soft-
    // deletes the exhibitor itself (recoverable, not physically removed), downgrades
    // every linked account instead of deleting it (owner + team members keep their
    // login/registration history, just lose exhibitor access), and hard-deletes every
    // dependent record so nothing is left pointing at a gone exhibitor_id.
    r.delete('/:id', requireRole('organizer', 'superadmin'), async (req, res) => {
      try {
        const exhibitorId = req.params.id;
        const exhResult = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitorId } }));
        const exhibitor = exhResult.Item;
        if (!exhibitor) return res.status(404).json({ error: 'Exhibitor not found.' });
        if (exhibitor.deleted) return res.status(400).json({ error: 'This exhibitor has already been deleted.' });

        await ddb.send(new UpdateCommand({
          TableName: 'adma_exhibitors',
          Key: { id: exhibitorId },
          UpdateExpression: 'SET deleted = :t, deleted_at = :now, deleted_by = :u',
          ExpressionAttributeValues: { ':t': true, ':now': new Date().toISOString(), ':u': req.user.id },
        }));

        // Owner (exhibitor.user_id) + any team member matched the same way
        // ExhibitorTeam.jsx resolves "my team" — by company name, case-insensitive.
        const nameLower = (exhibitor.name || '').trim().toLowerCase();
        const usersResult = await ddb.send(new ScanCommand({ TableName: 'adma_users' }));
        const linkedUsers = (usersResult.Items || []).filter(u =>
          u.id === exhibitor.user_id || (u.role === 'exhibitor' && u.company && u.company.trim().toLowerCase() === nameLower)
        );
        await Promise.all(linkedUsers.map(async u => {
          await ddb.send(new UpdateCommand({
            TableName: 'adma_users',
            Key: { id: u.id },
            UpdateExpression: 'SET #role = :r, company = :c',
            ExpressionAttributeNames: { '#role': 'role' },
            ExpressionAttributeValues: { ':r': 'attendee', ':c': '' },
          }));
          await revokeAllSessionsForUser(u.id);
        }));

        let cascadeDeleted = 0;
        for (const { table, index } of CASCADE_DELETE_TABLES) {
          const result = index
            ? await ddb.send(new QueryCommand({
                TableName: table,
                IndexName: index,
                KeyConditionExpression: 'exhibitor_id = :id',
                ExpressionAttributeValues: { ':id': exhibitorId },
              }))
            : await ddb.send(new ScanCommand({
                TableName: table,
                FilterExpression: 'exhibitor_id = :id',
                ExpressionAttributeValues: { ':id': exhibitorId },
              }));
          const items = result.Items || [];
          await Promise.all(items.map(item => ddb.send(new DeleteCommand({ TableName: table, Key: { id: item.id } }))));
          cascadeDeleted += items.length;
        }

        logSecurityEvent('exhibitor_deleted', {
          exhibitorId, exhibitorName: exhibitor.name, deletedBy: req.user.id,
          linkedAccountsDowngraded: linkedUsers.length, dependentRecordsDeleted: cascadeDeleted,
          ip: req.ip,
        });
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Logs lock/unlock separately before falling through to crudRouter's own generic
    // PUT /:id handler (registered after extraRoutes runs) — Express runs both handlers
    // in registration order for the same method+path as long as this one calls next().
    r.put('/:id', async (req, res, next) => {
      if ('portal_locked' in req.body) {
        logSecurityEvent('exhibitor_lock_changed', {
          exhibitorId: req.params.id,
          locked: !!req.body.portal_locked,
          ip: req.ip,
        });
        // Locking should take effect immediately, not just block the next login attempt —
        // kill any session the exhibitor is actively using right now.
        if (req.body.portal_locked) {
          const result = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: req.params.id } }));
          await revokeAllSessionsForExhibitor(req.params.id, result.Item?.user_id);
        }
      }

      // Renaming the company was previously a dead end: `adma_exhibitors.name` updated
      // fine, but `adma_users.company` (copied once at exhibitor-approval time onto the
      // owner's account and again onto every team member added afterward, since
      // ExhibitorTeam.jsx seeds new members from that same stale field) never got
      // touched again — so the old name kept showing up everywhere that reads `company`
      // off a user record. Cascade the rename to every user record carrying the old
      // name so it actually propagates instead of leaving orphaned copies behind.
      if (typeof req.body.name === 'string' && req.body.name.trim()) {
        const current = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: req.params.id } }));
        const oldName = current.Item?.name;
        // Deliberately NOT trimmed — must be byte-identical to what crudRouter's generic
        // PUT handler is about to write to adma_exhibitors.name itself (untrimmed), or
        // the two fields end up mismatched again the moment either side has stray
        // whitespace (confirmed this the hard way: an existing record's name already
        // carries a trailing space, and a trimmed cascade silently diverged from it).
        const newName = req.body.name;
        if (oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
          const usersResult = await ddb.send(new ScanCommand({
            TableName: 'adma_users',
            FilterExpression: 'company = :old',
            ExpressionAttributeValues: { ':old': oldName },
          }));
          await Promise.all((usersResult.Items || []).map(u => ddb.send(new UpdateCommand({
            TableName: 'adma_users',
            Key: { id: u.id },
            UpdateExpression: 'SET company = :new',
            ExpressionAttributeValues: { ':new': newName },
          }))));
        }
      }

      next();
    });

    // POST /api/exhibitors/upgrade-enquiry — exhibitor asks about upgrading their
    // package/tier. exhibitor_id is always resolved from the session, never trusted
    // from the client, so one exhibitor can't file an enquiry "as" another.
    r.post('/upgrade-enquiry', requireAuth, async (req, res) => {
      try {
        const exhibitorId = await getMyExhibitorId(req);
        if (!exhibitorId) return res.status(400).json({ error: 'No booth linked to your account.' });

        const exhibitorResult = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitorId } }));
        const exhibitor = exhibitorResult.Item;
        if (!exhibitor) return res.status(404).json({ error: 'Exhibitor not found.' });

        const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
        const notifyEmail = settingsResult.Item?.packageUpgradeEnquiryEmail;
        if (!notifyEmail) return res.status(400).json({ error: 'No upgrade enquiry email configured in Organiser Portal.' });

        const targetPackage = req.body.target_package;

        await sendOtpEmail(notifyEmail, null, {
          subject: `ADMA Digital — Package upgrade enquiry: ${exhibitor.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
              <h2 style="margin:0 0 8px;color:#111">Package upgrade enquiry</h2>
              <p style="color:#555"><strong>${exhibitor.name}</strong> (currently ${exhibitor.package || 'Basic'}) is interested in upgrading${targetPackage ? ` to <strong>${targetPackage}</strong>` : ''}.</p>
              <p style="color:#555"><strong>Contact:</strong> ${exhibitor.contact_email || 'no contact email on file'}</p>
              <p style="color:#555">Follow up with them directly to arrange the upgrade.</p>
            </div>
          `,
        });

        if (exhibitor.contact_email) {
          await sendOtpEmail(exhibitor.contact_email, null, {
            subject: 'ADMA Digital — We received your upgrade enquiry',
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
                <h2 style="margin:0 0 8px;color:#111">Thanks for your interest!</h2>
                <p style="color:#555">We've received your enquiry about upgrading <strong>${exhibitor.name}</strong>'s package${targetPackage ? ` to <strong>${targetPackage}</strong>` : ''}. The ADMA team will be in touch shortly.</p>
              </div>
            `,
          }).catch(() => { /* non-fatal — the organiser copy above is the one that matters */ });
        }

        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  },
});
