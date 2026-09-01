// A DEDICATED base URL, deliberately NOT process.env.OMNIFLEX_API_URL (that one is
// shared with lib/omniflexReseller.js, which must keep hitting the bare root — see
// below for why this file can't use it too). Defaults to the adma.omniflex.co.zw
// tenant subdomain.
const BASE = process.env.OMNIFLEX_TENANT_API_URL || 'https://adma.omniflex.co.zw';
// Two separate OmniFlex workspaces, two separate keys — do not merge these back into
// one. OMNIFLEX_API_KEY belongs to "ADMA Digital OTPs & Notifications" (powers
// sendSmsOtp/verifySmsOtp/sendSms below — login OTPs and one-off notification sends
// like meeting confirmations). OMNIFLEX_CAMPAIGN_API_KEY belongs to the separate "ADMA
// Digital main account" workspace, added 2026-09-01 specifically for bulk SMS
// broadcasts (createSmsCampaign below).
//
// Both keys 403'd with {"code":"tenant_mismatch"} against the bare omniflex.co.zw root
// (confirmed live 2026-09-01) — traced to marketing@admadigital.co.zw (the account
// both keys belong to) having been separately upgraded to a reseller managing the
// adma.omniflex.co.zw subdomain; per omniflex's own tenant-resolution model that
// rejects a request whose org's reseller_id doesn't match the subdomain it came in on,
// so anything hitting the bare root now needs to go through that subdomain instead.
// This does NOT apply to lib/omniflexReseller.js's OMNIFLEX_RESELLER_API_KEY — that's
// a third, already-reseller-scoped key that authenticates the reseller relationship
// itself (provisioning exhibitor workspaces, SSO login-links) and keeps working
// against the bare root; only this file's two tenant-scoped keys needed to move.
const API_KEY = process.env.OMNIFLEX_API_KEY;
const CAMPAIGN_API_KEY = process.env.OMNIFLEX_CAMPAIGN_API_KEY;
const OTP_CAMPAIGN_ID = process.env.OMNIFLEX_OTP_CAMPAIGN_ID;
// The OTP campaign (OMNIFLEX_OTP_CAMPAIGN_ID) already has this configured on OmniFlex's
// side, which is why OTP texts show as ADMA — sendSms()/createSmsCampaign() don't have
// an equivalent standing config, so they need to pass it explicitly on every call.
const DEFAULT_SENDER_ID = 'ADMA';

// Normalize any Zim phone format (07XX…, +2637X…, 002637X…) to 263XXXXXXXXX.
// The 00-international-prefix case must be checked before the bare-0-trunk-prefix
// case, or "00263771234567" gets misread as a domestic 0-number and comes out
// mangled (263 + "0263771234567" instead of the correct 263771234567).
function normalizePhone(phone) {
  if (!phone) return phone;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('263')) return digits;
  if (digits.startsWith('0')) return '263' + digits.slice(1);
  return '263' + digits;
}

async function post(path, body, key = API_KEY) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || data.error || `OmniFlex ${r.status}`);
  return data;
}

export async function sendSmsOtp(phone, name) {
  if (!OTP_CAMPAIGN_ID) throw new Error('OMNIFLEX_OTP_CAMPAIGN_ID is not configured.');
  return post(`/api/campaigns/${OTP_CAMPAIGN_ID}/send-otp`, {
    identifier: normalizePhone(phone),
    name: name || undefined,
  });
}

export async function verifySmsOtp(phone, code) {
  return post('/api/otp/verify', { identifier: normalizePhone(phone), code });
}

export async function sendSms(phone, message) {
  // camelCase senderId here — confirmed from OmniFlex's own /api/sms/send docs
  // (2026-09-01); this endpoint's field naming doesn't match /api/campaigns' snake_case
  // sender_id below. Sending the wrong casing doesn't error, it just silently falls
  // back to the account's generic default sender label instead of ADMA — confirmed
  // live before this fix.
  return post('/api/sms/send', { phone: normalizePhone(phone), message, senderId: DEFAULT_SENDER_ID });
}

// Bulk SMS via OmniFlex's actual Campaigns API — the real bulk-send mechanism, as
// opposed to sendSms() above (one recipient at a time; that's what a broadcast used
// before 2026-09-01, looped with a client-side concurrency cap — confirmed live that
// the account this key belongs to rejects that endpoint entirely with "This key does
// not belong to this workspace"; the /api/campaigns/* Content-Type of call is what
// this account's key is actually scoped for). recipients: [{ phone, name? }] — phone
// normalized to OmniFlex's 263XXXXXXXXX form here since callers pass whatever form
// their own source data is in.
//
// status: 'scheduled' with scheduled_date a few seconds out — NOT 'active' with no
// date, which is what this used to send. Confirmed live 2026-09-01: an 'active'
// campaign with inline recipients creates fine (201, valid campaign object) but never
// actually dispatches — total_recipients/sent_count stay 0 indefinitely, and the
// message never arrives. The exact same request with status: 'scheduled' and a
// near-immediate scheduled_date genuinely sends (confirmed delivered, delivery_rate
// 100) — OmniFlex's dispatcher appears to only ever pick up campaigns through the
// scheduled path, even for what amounts to "send right now".
export async function createSmsCampaign({ name, message_template, recipients, sender_id }) {
  if (!CAMPAIGN_API_KEY) throw new Error('OMNIFLEX_CAMPAIGN_API_KEY is not configured.');
  return post('/api/campaigns', {
    name,
    type: 'SMS',
    message_template,
    sender_id: sender_id || DEFAULT_SENDER_ID,
    status: 'scheduled',
    scheduled_date: new Date(Date.now() + 5000).toISOString(),
    recipients: recipients.map(r => ({ phone: normalizePhone(r.phone), name: r.name || undefined })),
  }, CAMPAIGN_API_KEY);
}
