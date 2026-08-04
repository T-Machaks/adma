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

// Maps a payment `type` to the rate-card section it prices against. Section A is
// deliberately scoped to the single 'carousel' item — Video Carousel and Strip Footer
// Banner have no self-service creation path (organiser-only), so there's nothing for a
// payment to gate yet; adslot_request always prices against 'carousel'.
const SECTION_BY_TYPE = {
  package: 'virtual_exhibition',
  marketplace_addon: 'marketplace',
  adslot_request: 'landing_page',
  magazine_request: 'magazine',
};

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
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;color:#111">Payment Confirmed</h2>
      <p style="color:#555">Thanks — your payment for <strong>${record.item_label}</strong> has been received.</p>
      <table style="width:100%;margin-top:16px;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#888;font-size:13px">Amount</td><td style="padding:6px 0;color:#111;font-size:13px;font-weight:600">$${Number(record.amount).toLocaleString()} ${record.currency}</td></tr>
        <tr><td style="padding:6px 0;color:#888;font-size:13px">Reference</td><td style="padding:6px 0;color:#111;font-size:13px;font-weight:600">${record.reference}</td></tr>
        <tr><td style="padding:6px 0;color:#888;font-size:13px">Billing period</td><td style="padding:6px 0;color:#111;font-size:13px;font-weight:600">${record.period}</td></tr>
      </table>
      <p style="color:#555;margin-top:20px;font-size:13px">The ADMA team will be in touch if anything further is needed.</p>
    </div>
  `;
}

// Idempotent: uses a conditional update to atomically claim a still-pending record before
// running side effects, so a poll and the Paynow webhook racing each other can't both fire
// the activation/email twice.
async function completePayment(record) {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: record.id },
      UpdateExpression: 'SET #s = :paid, paid_date = :now',
      ConditionExpression: '#s = :pending',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':paid': 'paid', ':pending': 'pending', ':now': new Date().toISOString() },
    }));
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException') return; // already processed elsewhere
    throw e;
  }

  const rateCard = await getRateCard();

  if (record.type === 'package') {
    await ddb.send(new UpdateCommand({
      TableName: 'adma_exhibitors',
      Key: { id: record.exhibitor_id },
      UpdateExpression: 'SET package = :pkg, package_billing_period = :p, package_billed_at = :now, package_expires_at = :exp',
      ExpressionAttributeValues: {
        ':pkg': record.item_key,
        ':p': record.period,
        ':now': new Date().toISOString(),
        ':exp': computeExpiryISO(record.period, rateCard.billingPeriods),
      },
    }));
  } else if (record.type === 'marketplace_addon') {
    await ddb.send(new UpdateCommand({
      TableName: 'adma_exhibitors',
      Key: { id: record.exhibitor_id },
      UpdateExpression: 'SET marketplace_addon_status = :s, marketplace_addon_tier = :t, marketplace_addon_period = :p, marketplace_addon_billed_at = :now, marketplace_addon_expires_at = :exp',
      ExpressionAttributeValues: {
        ':s': 'active',
        ':t': record.item_key,
        ':p': record.period,
        ':now': new Date().toISOString(),
        ':exp': computeExpiryISO(record.period, rateCard.billingPeriods),
      },
    }));
  } else if (record.type === 'adslot_request') {
    await markAdSlotRequested(record.ad_slot_id).catch(() => {});
  } else if (record.type === 'magazine_request') {
    const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
    const reviewEmail = settingsResult.Item?.paidFeatureRequestEmail;
    if (reviewEmail) {
      const p = record.request_payload || {};
      await sendOtpEmail(reviewEmail, null, {
        subject: `ADMA — Paid magazine placement request: ${record.exhibitor_name}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
            <h2 style="margin:0 0 8px;color:#111">Magazine placement request (paid)</h2>
            <p style="color:#555"><strong>${record.exhibitor_name}</strong> has paid for a <strong>${record.item_label}</strong> placement.</p>
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

  if (record.exhibitor_email) {
    await sendOtpEmail(record.exhibitor_email, null, {
      subject: `ADMA — Payment confirmed: ${record.item_label}`,
      html: paymentConfirmationHtml(record),
    }).catch(() => {});
  }
}

async function ownsPaymentRecord(req, record) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  return record.exhibitor_id === await getMyExhibitorId(req);
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
    if (req.user.role !== 'exhibitor') return res.status(403).json({ error: 'Only exhibitors can make payments.' });

    const { type, period, ad_slot_id, request_payload } = req.body;
    let { item_key } = req.body;
    if (!SECTION_BY_TYPE[type]) return res.status(400).json({ error: 'Invalid payment type.' });
    if (!period) return res.status(400).json({ error: 'period is required.' });

    const exhibitorId = await getMyExhibitorId(req);
    if (!exhibitorId) return res.status(400).json({ error: 'No booth linked to your account.' });
    const exhibitorResult = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitorId } }));
    const exhibitor = exhibitorResult.Item;
    if (!exhibitor) return res.status(404).json({ error: 'Exhibitor not found.' });

    let adSlotId = null;
    if (type === 'adslot_request') {
      item_key = 'carousel'; // only self-service item in Section A — never trust the client for this
      if (!ad_slot_id) return res.status(400).json({ error: 'ad_slot_id is required.' });
      const slotResult = await ddb.send(new GetCommand({ TableName: 'adma_adslots', Key: { id: ad_slot_id } }));
      if (!slotResult.Item || slotResult.Item.exhibitor_id !== exhibitorId) {
        return res.status(403).json({ error: 'That ad slot does not belong to your account.' });
      }
      adSlotId = ad_slot_id;
    }

    if (type === 'magazine_request') {
      if (!request_payload?.company || !request_payload?.image_url) {
        return res.status(400).json({ error: 'company and image_url are required.' });
      }
    }

    const rateCard = await getRateCard();
    const item = findItem(rateCard, SECTION_BY_TYPE[type], item_key);
    if (!item) return res.status(400).json({ error: 'Unknown rate card item.' });

    // Amount is always computed server-side from the rate card — never trust a
    // client-supplied price.
    const amount = computeServerPrice(item.monthlyRate, period, rateCard.billingPeriods);
    const reference = `ADMA-${generateId()}`;

    const record = {
      id: generateId(),
      created_date: new Date().toISOString(),
      exhibitor_id: exhibitorId,
      exhibitor_name: exhibitor.name,
      exhibitor_email: exhibitor.contact_email || null,
      type,
      section_id: SECTION_BY_TYPE[type],
      item_key,
      item_label: item.label,
      period,
      amount,
      currency: 'USD',
      status: 'pending',
      reference,
      ad_slot_id: adSlotId,
      request_payload: type === 'magazine_request' ? request_payload : null,
      fulfilled: false,
    };

    const init = await initiatePayment({
      paymentId: record.id,
      reference,
      amount,
      itemName: item.label,
      email: exhibitor.contact_email,
    });
    record.poll_url = init.pollUrl;
    record.redirect_url = init.redirectUrl;

    await ddb.send(new PutCommand({ TableName: TABLE, Item: record }));

    res.json({ paymentId: record.id, redirectUrl: init.redirectUrl });
  } catch (e) {
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

// Organiser-only — marks a paid magazine_request as built into an actual magazine page.
r.put('/:id/fulfill', requireAuth, async (req, res) => {
  try {
    if (!CONSOLE_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do that.' });
    const result = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: req.params.id },
      UpdateExpression: 'SET fulfilled = :t',
      ExpressionAttributeValues: { ':t': true },
      ReturnValues: 'ALL_NEW',
    }));
    res.json(result.Attributes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
