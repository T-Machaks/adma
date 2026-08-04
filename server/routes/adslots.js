import { Router } from 'express';
import { ScanCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { crudRouter } from '../lib/crudRouter.js';
import { sendOtpEmail } from '../lib/mailer.js';
import { requireAuth } from '../lib/authMiddleware.js';
import { CONSOLE_ROLES, getMyExhibitorId } from '../lib/ownership.js';

const TABLE = 'adma_adslots';

async function ownsAdSlot(req, item) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  return item.exhibitor_id === await getMyExhibitorId(req);
}

// Shared with server/routes/payments.js — once a Section A (Banner Carousel) payment is
// confirmed, this is the same "requested" transition + organiser email that the free
// /:id/request-review route below performs, just triggered by payment instead of a
// direct exhibitor click.
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

  const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
  const reviewEmail = settingsResult.Item?.paidFeatureRequestEmail;
  if (reviewEmail) {
    const isEdit = !!item.pending_changes;
    await sendOtpEmail(reviewEmail, null, {
      subject: `ADMA — Ad slot ${isEdit ? 'edit' : 'creation'} review: ${item.company}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
          <h2 style="margin:0 0 8px;color:#111">Ad slot ${isEdit ? 'edit' : 'creation'} requires review</h2>
          <p style="color:#555"><strong>${item.company}</strong> has ${isEdit ? 'submitted changes to' : 'created'} their carousel ad slot (paid) and it's awaiting review before it goes live.</p>
          <p style="color:#555">Review and activate it from the ADMA organiser console — Paid Listing Requests.</p>
        </div>
      `,
    }).catch(() => {});
  }

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
