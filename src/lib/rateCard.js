// Display order for billing-period pills — the rate card document itself is keyed by
// these same strings, this just fixes a stable render order (object key order isn't
// guaranteed to survive a round-trip through DynamoDB/JSON the same way every time).
export const BILLING_PERIOD_ORDER = ['monthly', 'quarterly', 'biannual', 'annual'];

// price = monthlyRate × (months billed − months free). Quarterly has no discount today
// (3 months, 0 free) but the discount curve itself lives in the rate card document, not
// hardcoded here, so an organizer can change it without a code change.
export function computePrice(monthlyRate, periodKey, billingPeriods) {
  const period = billingPeriods?.[periodKey];
  if (!period) return monthlyRate;
  return monthlyRate * (period.months - period.freeMonths);
}

// Client-side mirror of server/lib/ownership.js's getMarketplaceAddonState — used only
// to drive UI (show/hide the post button, show the activation banner). The real gate is
// enforced server-side on every job/tender/collaboration POST; this is not a security
// boundary, just avoids flashing a form the request would 403 anyway.
export function isMarketplaceAddonActive(exhibitor) {
  if (!exhibitor || exhibitor.marketplace_addon_status !== 'active') return false;
  if (exhibitor.marketplace_addon_expires_at && new Date() > new Date(exhibitor.marketplace_addon_expires_at)) return false;
  return true;
}
