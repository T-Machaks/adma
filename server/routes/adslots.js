import { Router } from 'express';
import { ScanCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';
import { crudRouter } from '../lib/crudRouter.js';
import { sendOtpEmail } from '../lib/mailer.js';
import { requireAuth } from '../lib/authMiddleware.js';
import { CONSOLE_ROLES, getMyExhibitorId } from '../lib/ownership.js';

const TABLE = 'adma_adslots';

// An ad slot belongs to whichever party created it — an exhibitor booth (the normal
// case) or, for a non-exhibitor's paid ad purchase (no booth to attach to), the account
// that paid for it directly (`created_by_user_id`, stamped at creation in that path).
async function ownsAdSlot(req, item) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  if (item.exhibitor_id) return item.exhibitor_id === await getMyExhibitorId(req);
  return !!item.created_by_user_id && item.created_by_user_id === req.user.id;
}

// Shared by markAdSlotRequested (exhibitor path, existing slot) and
// createAdSlotFromRequest (non-exhibitor path, brand-new slot) so the organiser gets the
// same "needs review" email regardless of which side originated the ad.
async function notifyAdSlotReviewNeeded(item) {
  const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
  const reviewEmail = settingsResult.Item?.paidFeatureRequestEmail;
  if (!reviewEmail) return;
  const isEdit = !!item.pending_changes;
  await sendOtpEmail(reviewEmail, null, {
    subject: `ADMA — Ad slot ${isEdit ? 'edit' : 'creation'} review: ${item.company}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px;color:#111">Ad slot ${isEdit ? 'edit' : 'creation'} requires review</h2>
        <p style="color:#555"><strong>${item.company}</strong> has ${isEdit ? 'submitted changes to' : 'created'} their ${item.placement === 'carousel' ? 'carousel' : item.placement} ad slot (paid) and it's awaiting review before it goes live.</p>
        <p style="color:#555">Review and activate it from the ADMA organiser console — Paid Listing Requests.</p>
      </div>
    `,
  }).catch(() => {});
}

// Shared with server/routes/payments.js — once a Section A payment is confirmed, this is
// the same "requested" transition + organiser email that the free /:id/request-review
// route below performs, just triggered by payment instead of a direct exhibitor click.
export async function markAdSlotRequested(adSlotId) {
  const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: adSlotId } }));
  const item = result.Item;
  if (!item) throw new Error('Ad slot not found');

  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id: adSlotId },
    UpdateExpression: 'SET review_status = :s',
    ExpressionAttributeValues: { ':s': 'requested' },
  }));

  await notifyAdSlotReviewNeeded(item);
  return item;
}

// Non-exhibitor path — server/routes/payments.js calls this at payment-completion time
// instead of markAdSlotRequested, since there's no pre-existing slot to flip: the
// exhibitor-side flow always creates the AdSlot on "My Booth" *before* paying, but a
// non-exhibitor has no booth to create it on, so the slot itself is created here from
// the content collected inline in the cart (`request_payload`).
export async function createAdSlotFromRequest({ placement, requestPayload, createdByUserId }) {
  const item = {
    id: generateId(),
    created_date: new Date().toISOString(),
    active: false,
    internal: false,
    accent: '#f59e0b',
    bg: requestPayload.bg || 'from-slate-700 to-slate-900',
    placement,
    exhibitor_id: null,
    exhibitor_name: requestPayload.company,
    created_by_user_id: createdByUserId,
    review_status: 'requested',
    ...requestPayload,
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  await notifyAdSlotReviewNeeded(item);
  return item;
}

export default crudRouter(TABLE, {
  defaults: () => ({ active: true, internal: false, accent: '#f59e0b', bg: 'from-slate-700 to-slate-900' }),
  // read/write: own slot only, or organizer/marketing_partner (ExhibitorHome.jsx needs
  // to see its own ad slot even while pending/inactive — /active below stays public
  // for the attendee-facing carousel, unaffected by this).
  auth: { read: ownsAdSlot, write: ownsAdSlot },
  extraRoutes(r) {
    r.get('/active', async (req, res) => {
      try {
        const result = await ddb.send(new ScanCommand({
          TableName: TABLE,
          FilterExpression: 'active = :t',
          ExpressionAttributeValues: { ':t': true },
        }));
        res.json(result.Items || []);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // An exhibitor can only ever create/claim their own ad slot — override exhibitor_id
    // instead of trusting the client, but only when the caller IS an exhibitor (an
    // organizer creating an internal/house slot has no exhibitor_id at all).
    r.post('/', requireAuth, async (req, res, next) => {
      if (req.user.role === 'exhibitor') req.body.exhibitor_id = await getMyExhibitorId(req);
      next();
    });

    // POST /api/adslots/:id/request-review — exhibitor requests organiser review of a
    // new self-service ad slot, or of pending edits (item.pending_changes) to an
    // existing live one, before it goes/stays live.
    r.post('/:id/request-review', requireAuth, async (req, res) => {
      try {
        const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
        const item = result.Item;
        if (!item) return res.status(404).json({ error: 'Ad slot not found' });
        if (!await ownsAdSlot(req, item)) return res.status(403).json({ error: 'You do not have permission to do that.' });

        const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
        if (!settingsResult.Item?.paidFeatureRequestEmail) return res.status(400).json({ error: 'No review contact email configured in Organiser Portal.' });

        await markAdSlotRequested(req.params.id);
        res.json({ ok: true, review_status: 'requested' });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  },
});
