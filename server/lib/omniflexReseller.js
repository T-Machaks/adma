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

// One-time (~120s) SSO URL that drops the caller's browser straight into their
// OmniFlex workspace, already signed in — never store or log the returned url, use
// it immediately. 409 email_taken → that email is an OmniFlex account in a *different*
// workspace already; 404 → the stored omniflex_org_id is stale, caller should
// re-provision and retry once.
//
// `role` (admin | manager | operator | viewer, default admin) is sent on every call —
// OmniFlex JIT-creates the user in this workspace on first call, and re-syncs their
// role on every subsequent one, so a role change on the ADMA side (e.g. someone goes
// from invited teammate to booth owner) propagates automatically. There is no user/role
// management inside adma.omniflex.co.zw for exhibitors — this is the only source of truth.
export async function makeLoginLink(orgId, { email, name, role = 'admin' }, returnTo = '/') {
  return request('POST', `/api/reseller/clients/${orgId}/login-link`, { email, name, role, returnTo });
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

// ADMA's own remaining OmniFlex pool balance — a pre-payment sanity check so an
// exhibitor isn't charged only to find out afterward that allocate() would have 409'd
// (pool_insufficient). Cached only ~30s since the pool moves on every allocation across
// every exhibitor, not just this one.
//
// Never treated as authoritative: ANY failure (network, non-2xx, unexpected shape)
// returns null — "unknown" — and callers must treat null as "allow the purchase,"
// falling back to the existing allocate() 409 + refund-notify path as the real
// backstop. This call existing/failing must never itself block a sale.
const POOL_CACHE_MS = 30 * 1000;
let poolCache = null;
let poolCacheAt = 0;

export async function getPoolBalance() {
  if (poolCache !== null && Date.now() - poolCacheAt < POOL_CACHE_MS) return poolCache;
  try {
    const data = await request('GET', '/api/reseller/overview');
    const bal = data?.pool?.balance;
    if (typeof bal !== 'number') return null;
    poolCache = bal;
    poolCacheAt = Date.now();
    return bal;
  } catch {
    return null;
  }
}
