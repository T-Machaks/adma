// OmniFlex Reseller API client — ADMA Digital is an OmniFlex reseller (slug "adma",
// adma.omniflex.co.zw). This is a *different* credential/scope from lib/omniflex.js
// (which sends OTPs/notifications from ADMA's own OmniFlex campaign) — this one lets
// ADMA provision a per-exhibitor OmniFlex workspace, allocate purchased SMS credit
// bundles into it, and mint one-time SSO login links so an exhibitor lands in their
// workspace already signed in. See knowledge-base/adma-exhibitor-portal-integration.md
// in the omniflex repo for the full contract this implements.
const BASE = process.env.OMNIFLEX_API_URL || 'https://omniflex.co.zw';
const RESELLER_API_KEY = process.env.OMNIFLEX_RESELLER_API_KEY;

async function request(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${RESELLER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data.message || data.error || `OmniFlex reseller API ${r.status}`);
    err.status = r.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

// Once per exhibitor, on first bundle purchase (or a stale/missing omniflex_org_id).
// 409 → that admin_email already has an OmniFlex account elsewhere; caller should
// surface "use a different contact email or contact ADMA" rather than retry.
export async function provisionWorkspace({ name, admin_email, admin_name }) {
  return request('POST', '/api/reseller/clients', { name, admin_email, admin_name });
}

// Every purchase, only ever called AFTER payment has been taken — never call this
// speculatively. 409 pool_insufficient means ADMA's own OmniFlex pool is low; the
// caller must not treat that as the exhibitor's problem (they've already paid) —
// see completePayment()'s sms_bundle branch in routes/payments.js for how that's
// surfaced to ops instead of silently failing. Only 5xx is worth retrying — a 4xx
// means the request itself is wrong and retrying won't help.
export async function allocateBundle(orgId, credits, reference) {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; ; attempt++) {
    try {
      return await request('POST', `/api/reseller/clients/${orgId}/allocate`, { credits, reference });
    } catch (e) {
      if (e.status >= 500 && attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
        continue;
      }
      throw e;
    }
  }
}

// One-time (~120s) SSO URL that drops the exhibitor's browser straight into their
// OmniFlex workspace, already signed in — never store or log the returned url, use
// it immediately. 409 email_taken → that email is an OmniFlex account in a *different*
// workspace already; 404 → the stored omniflex_org_id is stale, caller should
// re-provision and retry once.
export async function makeLoginLink(orgId, { email, name }, returnTo = '/') {
  return request('POST', `/api/reseller/clients/${orgId}/login-link`, { email, name, returnTo });
}

// Live package prices, cached ~1h (in-memory — fine for a single-process pm2 app;
// resets on restart/deploy, which is an acceptable amount of re-fetching). Falls back
// to fixed constants only if the live call itself fails outright — a successful
// response that's merely missing one of the two package ids still gets the fresh
// price for whichever one it *did* find.
const FALLBACK_PRICES = { SMS500: 15.00, SMS1000: 25.00 };
const PRICE_CACHE_MS = 60 * 60 * 1000;
let priceCache = null;
let priceCacheAt = 0;

export async function getBundlePrices() {
  if (priceCache && Date.now() - priceCacheAt < PRICE_CACHE_MS) return priceCache;
  try {
    const r = await fetch(`${BASE}/api/packages`);
    const data = await r.json();
    const packages = data.packages || [];
    const find = (id, credits) => packages.find(p => p.id === id) || packages.find(p => p.credits === credits);
    const p500 = find('SMS500', 500);
    const p1000 = find('SMS1000', 1000);
    const prices = {
      SMS500: p500 ? Number(p500.usd_price) : FALLBACK_PRICES.SMS500,
      SMS1000: p1000 ? Number(p1000.usd_price) : FALLBACK_PRICES.SMS1000,
    };
    priceCache = prices;
    priceCacheAt = Date.now();
    return prices;
  } catch {
    return FALLBACK_PRICES;
  }
}

export const SMS_BUNDLE_CREDITS = { SMS500: 500, SMS1000: 1000 };
