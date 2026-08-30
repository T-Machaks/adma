import { Router } from 'express';
import express from 'express';
import { GetCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';
import { requireAuth } from '../lib/authMiddleware.js';
import { CONSOLE_ROLES, getMyExhibitorId } from '../lib/ownership.js';
import { getRateCard, computeServerPrice } from './rate-card.js';
import { initiatePayment, pollPaymentStatus, isPaynowConfigured } from '../lib/paynow.js';
import { markAdSlotRequested, createAdSlotFromRequest } from './adslots.js';
import { sendOtpEmail } from '../lib/mailer.js';
import { provisionWorkspace, allocateBundle, getBundlePrices, SMS_BUNDLE_CREDITS } from '../lib/omniflexReseller.js';

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

// Only meaningful on an exhibitor record — a non-exhibitor account has no `package` or
// marketplace posting rights to attach these to. Enforced server-side, not just hidden
// from the non-exhibitor Rate Card view.
const EXHIBITOR_ONLY_TYPES = new Set(['package', 'marketplace_addon', 'sms_bundle']);

const AD_PLACEMENTS = new Set(['carousel', 'video-carousel', 'footer-strip']);

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
// `exhibitorId` is null for a non-exhibitor payer — package/marketplace_addon are
// rejected outright, and an adslot_request has no pre-existing slot to reference so it's
// built entirely from `request_payload` instead.
async function buildItem(rateCard, exhibitorId, raw) {
  const { type, period, ad_slot_id, request_payload } = raw;

  // SMS credit bundles are priced live from OmniFlex, not from ADMA's own rate card —
  // handled entirely separately from the SECTION_BY_TYPE/findItem path below, and with
  // no `period` concept (a one-time credit purchase, not a subscription).
  if (type === 'sms_bundle') {
    if (!exhibitorId) throw { status: 403, message: 'SMS credit bundles require a Virtual Exhibitor account.' };
    const credits = SMS_BUNDLE_CREDITS[raw.item_key];
    if (!credits) throw { status: 400, message: 'Unknown SMS bundle.' };
    const prices = await getBundlePrices();
    const amount = prices[raw.item_key];
    if (amount == null) throw { status: 503, message: 'SMS bundle pricing is temporarily unavailable. Please try again shortly.' };
    return {
      id: generateId(),
      type,
      section_id: null,
      item_key: raw.item_key,
      item_label: `${credits.toLocaleString()} SMS Credits`,
      period: null,
      amount,
      sms_credits: credits,
      fulfilled: false, // flips true once allocateBundle() succeeds — see completePayment()
    };
  }

  if (!SECTION_BY_TYPE[type]) throw { status: 400, message: 'Invalid payment type.' };
  if (!period) throw { status: 400, message: 'period is required.' };
  if (!exhibitorId && EXHIBITOR_ONLY_TYPES.has(type)) {
    throw { status: 403, message: 'That item requires a Virtual Exhibitor account.' };
  }

  let itemKey = raw.item_key;
  let adSlotId = null;
  let itemRequestPayload = null;
  let fulfilled = null;

  if (type === 'adslot_request') {
    if (ad_slot_id) {
      // Existing-slot path — the exhibitor already created/edited the ad on My Booth and
      // is now paying to submit it for review.
      if (!exhibitorId) throw { status: 403, message: 'That ad slot does not belong to your account.' };
      const slotResult = await ddb.send(new GetCommand({ TableName: 'adma_adslots', Key: { id: ad_slot_id } }));
      const slot = slotResult.Item;
      if (!slot || slot.exhibitor_id !== exhibitorId) throw { status: 403, message: 'That ad slot does not belong to your account.' };
      // The item priced is always the slot's OWN placement — never the client's claimed
      // item_key — so a tampered item_key can't buy a cheaper/different placement type.
      itemKey = slot.placement;
      adSlotId = ad_slot_id;
    } else {
      // No pre-existing slot (always true for a non-exhibitor payer, who has no booth to
      // create one on) — the ad is built entirely from inline cart content instead, and
      // the actual AdSlot record gets created at payment-completion time.
      if (!AD_PLACEMENTS.has(itemKey)) throw { status: 400, message: 'Unknown ad placement.' };
      if (!request_payload?.company) throw { status: 400, message: 'Ad request: a company/advertiser name is required.' };
      itemRequestPayload = request_payload;
    }
  }

  if (type === 'magazine_request') {
    if (!request_payload?.company || !request_payload?.image_url) {
      throw { status: 400, message: 'Magazine request: company and image_url are required.' };
    }
    itemRequestPayload = request_payload;
    fulfilled = false;
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
    request_payload: itemRequestPayload,
    fulfilled,
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
  const smsFailures = [];
  let exhibitorOrgId; // lazily fetched, memoized across multiple sms_bundle lines in one cart

  for (let idx = 0; idx < record.items.length; idx++) {
    const item = record.items[idx];
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
      if (item.ad_slot_id) {
        await markAdSlotRequested(item.ad_slot_id).catch(() => {});
      } else {
        // Non-exhibitor path — no pre-existing slot, build it now from what was
        // collected inline in the cart.
        await createAdSlotFromRequest({
          placement: item.item_key,
          requestPayload: item.request_payload,
          createdByUserId: record.created_by_user_id,
        }).catch(() => {});
      }
    } else if (item.type === 'magazine_request' && !magazineNotified) {
      magazineNotified = true; // one email even if somehow more than one magazine line exists
      const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
      const reviewEmail = settingsResult.Item?.paidFeatureRequestEmail;
      if (reviewEmail) {
        const p = item.request_payload || {};
        const advertiser = p.company || record.exhibitor_name || 'A customer';
        await sendOtpEmail(reviewEmail, null, {
          subject: `ADMA — Paid magazine placement request: ${advertiser}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
              <h2 style="margin:0 0 8px;color:#111">Magazine placement request (paid)</h2>
              <p style="color:#555"><strong>${advertiser}</strong> has paid for a <strong>${item.item_label}</strong> placement.</p>
              <table style="width:100%;margin-top:12px;border-collapse:collapse">
                <tr><td style="padding:4px 0;color:#888;font-size:13px;width:35%">Company</td><td style="padding:4px 0;color:#111;font-size:13px">${advertiser}</td></tr>
                <tr><td style="padding:4px 0;color:#888;font-size:13px">Image</td><td style="padding:4px 0;color:#111;font-size:13px">${p.image_url ? `<a href="${p.image_url}">${p.image_url}</a>` : '—'}</td></tr>
                <tr><td style="padding:4px 0;color:#888;font-size:13px">Destination URL</td><td style="padding:4px 0;color:#111;font-size:13px">${p.click_url || '—'}</td></tr>
              </table>
              <p style="color:#555;margin-top:16px">Build this into a magazine page from the ADMA organiser console — Magazine Sections / Paid Listing Requests.</p>
            </div>
          `,
        }).catch(() => {});
      }
    } else if (item.type === 'sms_bundle') {
      // The exhibitor has already paid at this point — a failure here must never look
      // like the exhibitor's problem. No auto-refund: this app has no working refund
      // path against Paynow's EcoCash/OneMoney/card rails (nothing in lib/paynow.js
      // exposes one, and Zim mobile-money aggregators generally don't offer a clean
      // programmatic refund). Instead this mirrors the magazine_request precedent
      // above — leave the item unfulfilled, alert ops, let them resolve it (top up
      // ADMA's OmniFlex pool, then retry via POST .../retry-sms-allocation) or refund
      // manually through Paynow's own dashboard if that's ever truly warranted.
      try {
        if (exhibitorOrgId === undefined) {
          const exResult = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: record.exhibitor_id } }));
          exhibitorOrgId = exResult.Item?.omniflex_org_id || null;
        }
        if (!exhibitorOrgId) {
          const created = await provisionWorkspace({
            name: record.exhibitor_name || 'ADMA Exhibitor',
            admin_email: record.exhibitor_email,
            admin_name: record.exhibitor_name || 'ADMA Exhibitor',
          });
          exhibitorOrgId = created.id;
          await ddb.send(new UpdateCommand({
            TableName: 'adma_exhibitors',
            Key: { id: record.exhibitor_id },
            UpdateExpression: 'SET omniflex_org_id = :o',
            ExpressionAttributeValues: { ':o': exhibitorOrgId },
          }));
        }
        await allocateBundle(exhibitorOrgId, item.sms_credits, `ADMA-payment-${record.id}-${item.id}`);
        await ddb.send(new UpdateCommand({
          TableName: TABLE,
          Key: { id: record.id },
          UpdateExpression: `SET #items[${idx}].fulfilled = :t`,
          ExpressionAttributeNames: { '#items': 'items' },
          ExpressionAttributeValues: { ':t': true },
        }));
      } catch (err) {
        console.error(`[sms_bundle] allocation failed for payment ${record.id} item ${item.id}:`, err.message);
        smsFailures.push({ item, error: err });
      }
    }
  }

  if (smsFailures.length) {
    const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
    const opsEmail = settingsResult.Item?.paidFeatureRequestEmail;
    if (opsEmail) {
      await sendOtpEmail(opsEmail, null, {
        subject: `ADMA — SMS credit allocation failed (payment ${record.reference})`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
            <h2 style="margin:0 0 8px;color:#111">SMS credit allocation needs manual follow-up</h2>
            <p style="color:#555">${record.exhibitor_name || 'An exhibitor'} paid for SMS credits (payment <strong>${record.reference}</strong>, already confirmed paid) but allocation into their OmniFlex workspace failed:</p>
            <ul style="color:#555;font-size:13px">${smsFailures.map(f => `<li>${f.item.item_label} — ${f.error.message}</li>`).join('')}</ul>
            <p style="color:#555">The payment succeeded — the exhibitor has been charged and must not be charged again. Once the underlying issue is resolved, retry allocation from the Payments Ledger, or refund manually via Paynow's dashboard if that's the right call instead.</p>
          </div>
        `,
      }).catch(() => {});
    }
  }

  if (record.exhibitor_email) {
    await sendOtpEmail(record.exhibitor_email, null, {
      subject: `ADMA — Payment confirmed (${record.items.length} item${record.items.length > 1 ? 's' : ''})`,
      html: paymentConfirmationHtml(record),
    }).catch(() => {});
  }
}

// An exhibitor sees every payment tied to their booth (any team member added one);
// a non-exhibitor payer only ever sees the ones they personally made — there's no
// "booth" to share visibility across for that account type.
async function ownsPaymentRecord(req, record) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  if (record.exhibitor_id) return record.exhibitor_id === await getMyExhibitorId(req);
  return record.created_by_user_id === req.user.id;
}

// Resolves who's actually paying. An exhibitor session pays as their booth (unchanged
// behaviour — package/marketplace-addon/ad-slot-by-id all need this). Any other
// authenticated role (attendee, etc.) can still check out — buildCart rejects the
// exhibitor-only item types for them — using their own account as the record-level payer
// identity; the advertiser/company name for what they're actually buying lives on the
// individual cart item's request_payload instead.
async function loadPayerForCheckout(req) {
  if (req.user.role === 'exhibitor') {
    const exhibitorId = await getMyExhibitorId(req);
    if (!exhibitorId) throw { status: 400, message: 'No booth linked to your account.' };
    const result = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitorId } }));
    if (!result.Item) throw { status: 404, message: 'Exhibitor not found.' };
    return { exhibitorId, payerName: result.Item.name, payerEmail: result.Item.contact_email || null };
  }
  const result = await ddb.send(new GetCommand({ TableName: 'adma_users', Key: { id: req.user.id } }));
  if (!result.Item) throw { status: 404, message: 'Account not found.' };
  return { exhibitorId: null, payerName: result.Item.full_name || null, payerEmail: result.Item.email || req.user.email || null };
}

// Shared by /initiate and /initiate-eft — the two differ only in method/status/pop_url.
async function buildPaymentRecord(req) {
  const { exhibitorId, payerName, payerEmail } = await loadPayerForCheckout(req);
  const items = await buildCart(exhibitorId, req.body.items);
  const amount = items.reduce((sum, i) => sum + i.amount, 0);
  return {
    id: generateId(),
    created_date: new Date().toISOString(),
    // `adma_payments` has a GSI keyed on exhibitor_id (exhibitor-index) — DynamoDB
    // rejects a PutItem where an indexed attribute is an explicit NULL type, it must be
    // omitted entirely for a non-exhibitor payer. `undefined` gets stripped by
    // removeUndefinedValues before the PutCommand goes out (see lib/dynamo.js).
    exhibitor_id: exhibitorId || undefined,
    exhibitor_name: payerName,
    exhibitor_email: payerEmail,
    created_by_user_id: req.user.id,
    amount,
    currency: 'USD',
    reference: `ADMA-${generateId()}`,
    items,
  };
}

const r = Router();

// List — organiser sees everything (Payments Ledger console page); anyone else only
// ever sees their own records (booth-wide for an exhibitor, personal for anyone else).
r.get('/', requireAuth, async (req, res) => {
  try {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    let items = result.Items || [];
    if (!CONSOLE_ROLES.includes(req.user.role)) {
      const myExhibitorId = await getMyExhibitorId(req);
      items = items.filter(p => (myExhibitorId && p.exhibitor_id === myExhibitorId) || p.created_by_user_id === req.user.id);
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
    const record = await buildPaymentRecord(req);
    record.method = 'paynow';
    record.status = 'pending';

    const init = await initiatePayment({ paymentId: record.id, reference: record.reference, items: record.items, email: record.exhibitor_email });
    record.poll_url = init.pollUrl;
    record.redirect_url = init.redirectUrl;

    await ddb.send(new PutCommand({ TableName: TABLE, Item: record }));
    res.json({ paymentId: record.id, redirectUrl: init.redirectUrl });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// EFT/bank-transfer alternative — no Paynow call, lands as pending_verification for the
// organiser to manually approve/reject after the payer uploads a proof-of-payment.
r.post('/initiate-eft', requireAuth, async (req, res) => {
  try {
    const record = await buildPaymentRecord(req);
    record.method = 'eft';
    record.status = 'pending_verification';
    record.pop_url = null;

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

// Organiser retry after a failed SMS-credit allocation (e.g. ADMA's OmniFlex pool was
// temporarily low) — re-attempts allocateBundle() for one already-paid sms_bundle line
// item without touching the payment/charge itself. Provisions a workspace first if one
// still doesn't exist (covers the rare case where provisioning itself was what failed).
r.post('/:id/items/:itemId/retry-sms-allocation', requireAuth, async (req, res) => {
  try {
    if (!CONSOLE_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do that.' });
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
    const record = result.Item;
    if (!record) return res.status(404).json({ error: 'Payment not found' });
    const idx = record.items.findIndex(i => i.id === req.params.itemId);
    if (idx === -1) return res.status(404).json({ error: 'Item not found in this payment.' });
    const item = record.items[idx];
    if (item.type !== 'sms_bundle') return res.status(400).json({ error: 'This item is not an SMS bundle.' });
    if (item.fulfilled) return res.json({ ok: true, already: true });

    const exResult = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: record.exhibitor_id } }));
    const exhibitor = exResult.Item;
    if (!exhibitor) return res.status(404).json({ error: 'Exhibitor not found.' });

    let orgId = exhibitor.omniflex_org_id;
    if (!orgId) {
      const created = await provisionWorkspace({
        name: record.exhibitor_name || exhibitor.name,
        admin_email: record.exhibitor_email || exhibitor.contact_email,
        admin_name: record.exhibitor_name || exhibitor.name,
      });
      orgId = created.id;
      await ddb.send(new UpdateCommand({
        TableName: 'adma_exhibitors',
        Key: { id: record.exhibitor_id },
        UpdateExpression: 'SET omniflex_org_id = :o',
        ExpressionAttributeValues: { ':o': orgId },
      }));
    }

    await allocateBundle(orgId, item.sms_credits, `ADMA-payment-${record.id}-${item.id}-retry`);

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
    res.status(e.status || 500).json({ error: e.message });
  }
});

export default r;
