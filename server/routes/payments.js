import { Router } from 'express';
import express from 'express';
import { GetCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';
import { requireAuth } from '../lib/authMiddleware.js';
import { CONSOLE_ROLES, getMyExhibitorId } from '../lib/ownership.js';
import { getRateCard, computeServerPrice } from './rate-card.js';
import { initiatePayment, pollPaymentStatus, isPaynowConfigured } from '../lib/paynow.js';
import { markAdSlotRequested } from './adslots.js';
import { sendOtpEmail } from '../lib/mailer.js';

const TABLE = 'adma_payments';

// Maps a payment item `type` to the rate-card section it prices against.
const SECTION_BY_TYPE = {
  package: 'virtual_exhibition',
  marketplace_addon: 'marketplace',
  adslot_request: 'landing_page',
  magazine_request: 'magazine',
};

// At most one of these per cart — an exhibitor has exactly one package and at most one
// active add-on tier, so a second selection replaces rather than adds. Re-validated here
// even though the client UI already enforces it (never trust the client).
const SINGLETON_TYPES = new Set(['package', 'marketplace_addon']);

function findItem(rateCard, sectionId, itemKey) {
  const section = rateCard.sections.find(s => s.id === sectionId);
  return section?.items.find(i => i.key === itemKey) || null;
}

function computeExpiryISO(periodKey, billingPeriods) {
  const months = billingPeriods?.[periodKey]?.months ?? 1;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

function paymentConfirmationHtml(record) {
  const rows = record.items.map(i => `
    <tr>
      <td style="padding:6px 0;color:#111;font-size:13px">${i.item_label}</td>
      <td style="padding:6px 0;color:#111;font-size:13px;text-align:right;font-weight:600">$${Number(i.amount).toLocaleString()}</td>
    </tr>`).join('');
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;color:#111">Payment Confirmed</h2>
      <p style="color:#555">Thanks — your payment has been received.</p>
      <table style="width:100%;margin-top:16px;border-collapse:collapse">
        ${rows}
        <tr><td style="padding:10px 0 0;color:#888;font-size:13px;border-top:1px solid #eee">Total</td><td style="padding:10px 0 0;color:#111;font-size:13px;font-weight:700;text-align:right;border-top:1px solid #eee">$${Number(record.amount).toLocaleString()} ${record.currency}</td></tr>
        <tr><td colspan="2" style="padding:10px 0 0;color:#888;font-size:12px">Reference: ${record.reference}</td></tr>
      </table>
      <p style="color:#555;margin-top:20px;font-size:13px">The ADMA team will be in touch if anything further is needed.</p>
    </div>
  `;
}

// Validates and server-prices one submitted cart line. Returns a fully-formed item object
// (never trusting client-supplied item_key/amount beyond what's re-derived here), or
// throws a { status, message } error the caller turns into an HTTP response.
async function buildItem(rateCard, exhibitorId, raw) {
  const { type, period, ad_slot_id, request_payload } = raw;
  if (!SECTION_BY_TYPE[type]) throw { status: 400, message: 'Invalid payment type.' };
  if (!period) throw { status: 400, message: 'period is required.' };

  let itemKey = raw.item_key;
  let adSlotId = null;

  if (type === 'adslot_request') {
    if (!ad_slot_id) throw { status: 400, message: 'ad_slot_id is required.' };
    const slotResult = await ddb.send(new GetCommand({ TableName: 'adma_adslots', Key: { id: ad_slot_id } }));
    const slot = slotResult.Item;
    if (!slot || slot.exhibitor_id !== exhibitorId) throw { status: 403, message: 'That ad slot does not belong to your account.' };
    // The item priced is always the slot's OWN placement — never the client's claimed
    // item_key — so a tampered item_key can't buy a cheaper/different placement type.
    itemKey = slot.placement;
    adSlotId = ad_slot_id;
  }

  if (type === 'magazine_request') {
    if (!request_payload?.company || !request_payload?.image_url) {
      throw { status: 400, message: 'Magazine request: company and image_url are required.' };
    }
  }

  const item = findItem(rateCard, SECTION_BY_TYPE[type], itemKey);
  if (!item) throw { status: 400, message: 'Unknown rate card item.' };

  return {
    id: generateId(),
    type,
    section_id: SECTION_BY_TYPE[type],
    item_key: itemKey,
    item_label: item.label,
    period,
    amount: computeServerPrice(item.monthlyRate, period, rateCard.billingPeriods),
    ad_slot_id: adSlotId,
    request_payload: type === 'magazine_request' ? request_payload : null,
    fulfilled: type === 'magazine_request' ? false : null,
  };
}

async function buildCart(exhibitorId, rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw { status: 400, message: 'Cart is empty.' };
  const rateCard = await getRateCard();
  const items = [];
  const seenSingleton = new Set();
  for (const raw of rawItems) {
    if (SINGLETON_TYPES.has(raw.type)) {
      if (seenSingleton.has(raw.type)) throw { status: 400, message: `Only one ${raw.type} item is allowed per checkout.` };
      seenSingleton.add(raw.type);
    }
    items.push(await buildItem(rateCard, exhibitorId, raw));
  }
  return items;
}

// Idempotent: uses a conditional update to atomically claim a still-pending/pending-
// verification record before running side effects, so a poll, the Paynow webhook, and an
// organiser's EFT approval racing each other can't double-fire activation/email.
async function completePayment(record) {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: record.id },
      UpdateExpression: 'SET #s = :paid, paid_date = :now',
      ConditionExpression: '#s = :pending OR #s = :pendingVerification',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':paid': 'paid', ':pending': 'pending', ':pendingVerification': 'pending_verification',
        ':now': new Date().toISOString(),
      },
    }));
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException') return; // already processed elsewhere
    throw e;
  }

  const rateCard = await getRateCard();
  let magazineNotified = false;

  for (const item of record.items) {
    if (item.type === 'package') {
      await ddb.send(new UpdateCommand({
        TableName: 'adma_exhibitors',
        Key: { id: record.exhibitor_id },
        UpdateExpression: 'SET package = :pkg, package_billing_period = :p, package_billed_at = :now, package_expires_at = :exp',
        ExpressionAttributeValues: {
          ':pkg': item.item_key, ':p': item.period,
          ':now': new Date().toISOString(),
          ':exp': computeExpiryISO(item.period, rateCard.billingPeriods),
        },
      }));
    } else if (item.type === 'marketplace_addon') {
      await ddb.send(new UpdateCommand({
        TableName: 'adma_exhibitors',
        Key: { id: record.exhibitor_id },
        UpdateExpression: 'SET marketplace_addon_status = :s, marketplace_addon_tier = :t, marketplace_addon_period = :p, marketplace_addon_billed_at = :now, marketplace_addon_expires_at = :exp',
        ExpressionAttributeValues: {
          ':s': 'active', ':t': item.item_key, ':p': item.period,
          ':now': new Date().toISOString(),
          ':exp': computeExpiryISO(item.period, rateCard.billingPeriods),
        },
      }));
    } else if (item.type === 'adslot_request') {
      await markAdSlotRequested(item.ad_slot_id).catch(() => {});
    } else if (item.type === 'magazine_request' && !magazineNotified) {
      magazineNotified = true; // one email even if somehow more than one magazine line exists
      const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
      const reviewEmail = settingsResult.Item?.paidFeatureRequestEmail;
      if (reviewEmail) {
        const p = item.request_payload || {};
        await sendOtpEmail(reviewEmail, null, {
          subject: `ADMA — Paid magazine placement request: ${record.exhibitor_name}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
              <h2 style="margin:0 0 8px;color:#111">Magazine placement request (paid)</h2>
              <p style="color:#555"><strong>${record.exhibitor_name}</strong> has paid for a <strong>${item.item_label}</strong> placement.</p>
              <table style="width:100%;margin-top:12px;border-collapse:collapse">
                <tr><td style="padding:4px 0;color:#888;font-size:13px;width:35%">Company</td><td style="padding:4px 0;color:#111;font-size:13px">${p.company || record.exhibitor_name}</td></tr>
                <tr><td style="padding:4px 0;color:#888;font-size:13px">Image</td><td style="padding:4px 0;color:#111;font-size:13px">${p.image_url ? `<a href="${p.image_url}">${p.image_url}</a>` : '—'}</td></tr>
                <tr><td style="padding:4px 0;color:#888;font-size:13px">Destination URL</td><td style="padding:4px 0;color:#111;font-size:13px">${p.click_url || '—'}</td></tr>
              </table>
              <p style="color:#555;margin-top:16px">Build this into a magazine page from the ADMA organiser console — Magazine Sections / Paid Listing Requests.</p>
            </div>
          `,
        }).catch(() => {});
      }
    }
  }

  if (record.exhibitor_email) {
    await sendOtpEmail(record.exhibitor_email, null, {
      subject: `ADMA — Payment confirmed (${record.items.length} item${record.items.length > 1 ? 's' : ''})`,
      html: paymentConfirmationHtml(record),
    }).catch(() => {});
  }
}

async function ownsPaymentRecord(req, record) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  return record.exhibitor_id === await getMyExhibitorId(req);
}

async function loadExhibitorForCheckout(req) {
  if (req.user.role !== 'exhibitor') throw { status: 403, message: 'Only exhibitors can make payments.' };
  const exhibitorId = await getMyExhibitorId(req);
  if (!exhibitorId) throw { status: 400, message: 'No booth linked to your account.' };
  const result = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitorId } }));
  if (!result.Item) throw { status: 404, message: 'Exhibitor not found.' };
  return { exhibitorId, exhibitor: result.Item };
}

const r = Router();

// List — organiser sees everything (Payments Ledger console page); an exhibitor only
// ever sees their own records.
r.get('/', requireAuth, async (req, res) => {
  try {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    let items = result.Items || [];
    if (!CONSOLE_ROLES.includes(req.user.role)) {
      const myId = await getMyExhibitorId(req);
      items = items.filter(p => p.exhibitor_id === myId);
    }
    items.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    const record = result.Item;
    if (!record) return res.status(404).json({ error: 'Payment not found' });
    if (!await ownsPaymentRecord(req, record)) return res.status(403).json({ error: 'You do not have permission to do that.' });
    res.json(record);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/initiate', requireAuth, async (req, res) => {
  try {
    const { exhibitorId, exhibitor } = await loadExhibitorForCheckout(req);
    const items = await buildCart(exhibitorId, req.body.items);
    const amount = items.reduce((sum, i) => sum + i.amount, 0);
    const reference = `ADMA-${generateId()}`;

    const record = {
      id: generateId(),
      created_date: new Date().toISOString(),
      exhibitor_id: exhibitorId,
      exhibitor_name: exhibitor.name,
      exhibitor_email: exhibitor.contact_email || null,
      method: 'paynow',
      status: 'pending',
      amount,
      currency: 'USD',
      reference,
      items,
    };

    const init = await initiatePayment({ paymentId: record.id, reference, items, email: exhibitor.contact_email });
    record.poll_url = init.pollUrl;
    record.redirect_url = init.redirectUrl;

    await ddb.send(new PutCommand({ TableName: TABLE, Item: record }));
    res.json({ paymentId: record.id, redirectUrl: init.redirectUrl });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// EFT/bank-transfer alternative — no Paynow call, lands as pending_verification for the
// organiser to manually approve/reject after the exhibitor uploads a proof-of-payment.
r.post('/initiate-eft', requireAuth, async (req, res) => {
  try {
    const { exhibitorId, exhibitor } = await loadExhibitorForCheckout(req);
    const items = await buildCart(exhibitorId, req.body.items);
    const amount = items.reduce((sum, i) => sum + i.amount, 0);
    const reference = `ADMA-${generateId()}`;

    const record = {
      id: generateId(),
      created_date: new Date().toISOString(),
      exhibitor_id: exhibitorId,
      exhibitor_name: exhibitor.name,
      exhibitor_email: exhibitor.contact_email || null,
      method: 'eft',
      status: 'pending_verification',
      amount,
      currency: 'USD',
      reference,
      items,
      pop_url: null,
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: record }));
    res.json({ paymentId: record.id });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Owner attaches their uploaded proof-of-payment file — only while still awaiting review,
// so a record already approved/rejected can't be silently swapped afterward.
r.put('/:id/pop', requireAuth, async (req, res) => {
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    const record = result.Item;
    if (!record) return res.status(404).json({ error: 'Payment not found' });
    if (!await ownsPaymentRecord(req, record)) return res.status(403).json({ error: 'You do not have permission to do that.' });
    if (record.status !== 'pending_verification') return res.status(400).json({ error: 'This payment is no longer awaiting verification.' });
    if (!req.body.pop_url) return res.status(400).json({ error: 'pop_url is required.' });

    const updated = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: req.params.id },
      UpdateExpression: 'SET pop_url = :u',
      ExpressionAttributeValues: { ':u': req.body.pop_url },
      ReturnValues: 'ALL_NEW',
    }));
    res.json(updated.Attributes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Organiser approves an EFT submission — runs the exact same activation path a confirmed
// Paynow payment does.
r.post('/:id/verify-eft', requireAuth, async (req, res) => {
  try {
    if (!CONSOLE_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do that.' });
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    const record = result.Item;
    if (!record) return res.status(404).json({ error: 'Payment not found' });
    if (record.status !== 'pending_verification') return res.status(400).json({ error: 'This payment is not awaiting verification.' });

    await completePayment(record);
    const fresh = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    res.json(fresh.Item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/:id/reject-eft', requireAuth, async (req, res) => {
  try {
    if (!CONSOLE_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do that.' });
    const updated = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: req.params.id },
      UpdateExpression: 'SET #s = :s',
      ConditionExpression: '#s = :pendingVerification',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'rejected', ':pendingVerification': 'pending_verification' },
      ReturnValues: 'ALL_NEW',
    }));
    res.json(updated.Attributes);
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException') return res.status(400).json({ error: 'This payment is not awaiting verification.' });
    res.status(500).json({ error: e.message });
  }
});

r.get('/:id/status', requireAuth, async (req, res) => {
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    const record = result.Item;
    if (!record) return res.status(404).json({ error: 'Payment not found' });
    if (!await ownsPaymentRecord(req, record)) return res.status(403).json({ error: 'You do not have permission to do that.' });

    if (record.status !== 'pending' || record.poll_url?.startsWith('stub:')) {
      return res.json({ status: record.status });
    }

    const polled = await pollPaymentStatus(record.poll_url);
    if (polled.paid) await completePayment(record);
    const fresh = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    res.json({ status: fresh.Item?.status || record.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Stub-only — lets the /payment/stub test-mode page resolve a payment without a real
// Paynow account. 400s once real credentials are configured so it can never be used in
// production to fake a payment.
r.post('/:id/simulate', requireAuth, async (req, res) => {
  try {
    if (isPaynowConfigured()) return res.status(400).json({ error: 'Paynow is live — simulation is disabled.' });

    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    const record = result.Item;
    if (!record) return res.status(404).json({ error: 'Payment not found' });
    if (!await ownsPaymentRecord(req, record)) return res.status(403).json({ error: 'You do not have permission to do that.' });
    if (record.status !== 'pending') return res.json({ status: record.status });

    const { outcome } = req.body;
    if (outcome === 'paid') {
      await completePayment(record);
    } else {
      await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id: req.params.id },
        UpdateExpression: 'SET #s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': 'cancelled' },
      }));
    }

    const fresh = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    res.json({ status: fresh.Item?.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public webhook target for Paynow's server-to-server result callback (real mode only —
// meaningless in stub mode since nothing ever calls it). Paynow posts
// application/x-www-form-urlencoded, not JSON, hence the dedicated parser here. The
// webhook body's claimed status is never trusted directly — it's only used to look up
// which record to re-poll via the record's own stored poll_url before completing it.
r.post('/result', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const reference = req.body?.reference;
    if (!reference) return res.status(200).send('ok');

    const scan = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'reference = :ref',
      ExpressionAttributeValues: { ':ref': reference },
    }));
    const record = scan.Items?.[0];
    if (!record || record.status !== 'pending') return res.status(200).send('ok');

    const polled = await pollPaymentStatus(record.poll_url);
    if (polled.paid) await completePayment(record);

    res.status(200).send('ok');
  } catch (e) {
    console.error('Paynow result webhook failed:', e.message);
    res.status(200).send('ok'); // Paynow retries on non-2xx; a logged failure is enough here.
  }
});

// Organiser-only — marks one paid magazine_request line item within a checkout as built
// into an actual magazine page. Addressed by item id since a checkout can bundle a
// magazine request alongside unrelated items that aren't part of this checklist.
r.put('/:id/items/:itemId/fulfill', requireAuth, async (req, res) => {
  try {
    if (!CONSOLE_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do that.' });
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    const record = result.Item;
    if (!record) return res.status(404).json({ error: 'Payment not found' });
    const idx = record.items.findIndex(i => i.id === req.params.itemId);
    if (idx === -1) return res.status(404).json({ error: 'Item not found in this payment.' });

    // `items` is a DynamoDB reserved keyword — must go through ExpressionAttributeNames,
    // not used bare in the UpdateExpression (confirmed the hard way: DynamoDB rejects the
    // unescaped form with "Attribute name is a reserved keyword").
    const updated = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: req.params.id },
      UpdateExpression: `SET #items[${idx}].fulfilled = :t`,
      ExpressionAttributeNames: { '#items': 'items' },
      ExpressionAttributeValues: { ':t': true },
      ReturnValues: 'ALL_NEW',
    }));
    res.json(updated.Attributes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
