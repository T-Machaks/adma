const BASE = process.env.OMNIFLEX_API_URL || 'https://omniflex.co.zw';
// Two separate OmniFlex workspaces, two separate keys — do not merge these back into
// one. OMNIFLEX_API_KEY belongs to "ADMA Digital OTPs & Notifications" (powers
// sendSmsOtp/verifySmsOtp/sendSms below — login OTPs and one-off notification sends
// like meeting confirmations). OMNIFLEX_CAMPAIGN_API_KEY belongs to the separate "ADMA
// Digital main account" workspace, added 2026-09-01 specifically for bulk SMS
// broadcasts (createSmsCampaign below) — confirmed live that a key valid in one
// workspace is rejected outright ("This key does not belong to this workspace") when
// used against the other's endpoints.
const API_KEY = process.env.OMNIFLEX_API_KEY;
const CAMPAIGN_API_KEY = process.env.OMNIFLEX_CAMPAIGN_API_KEY;
const OTP_CAMPAIGN_ID = process.env.OMNIFLEX_OTP_CAMPAIGN_ID;

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
  return post('/api/sms/send', { phone: normalizePhone(phone), message });
}

// Bulk SMS via OmniFlex's actual Campaigns API — the real bulk-send mechanism, as
// opposed to sendSms() above (one recipient at a time; that's what a broadcast used
// before 2026-09-01, looped with a client-side concurrency cap — confirmed live that
// the account this key belongs to rejects that endpoint entirely with "This key does
// not belong to this workspace"; the /api/campaigns/* Content-Type of call is what
// this account's key is actually scoped for). recipients: [{ phone, name? }] — phone
// normalized to OmniFlex's 263XXXXXXXXX form here since callers pass whatever form
// their own source data is in. status: 'active' dispatches immediately (no
// scheduled_date) rather than sitting as a draft or a future-scheduled send.
export async function createSmsCampaign({ name, message_template, recipients, sender_id }) {
  if (!CAMPAIGN_API_KEY) throw new Error('OMNIFLEX_CAMPAIGN_API_KEY is not configured.');
  return post('/api/campaigns', {
    name,
    type: 'SMS',
    message_template,
    sender_id: sender_id || undefined,
    status: 'active',
    recipients: recipients.map(r => ({ phone: normalizePhone(r.phone), name: r.name || undefined })),
  }, CAMPAIGN_API_KEY);
}
