// Exhibitor virtual-platform subscriptions expire on 30 May every year (before the June show).
// Locked profiles are hidden from public view, not deleted — the exhibitor and organiser console still see them.
export function isSubscriptionExpired(exhibitor) {
  if (!exhibitor?.subscription_expires_at) return false;
  return new Date() > new Date(exhibitor.subscription_expires_at);
}

// Separate, additive lock for exhibitors an organiser has opted into real rate-card
// package billing — package_expires_at only ever gets set once that happens (see Admin
// Panel/Paid Listing Requests), so this is a no-op for every exhibitor still on the
// legacy free package model. Same public-visibility treatment as isSubscriptionExpired:
// greyed out/hidden from public view, self and organiser still see it.
export function isPackageBillingExpired(exhibitor) {
  if (!exhibitor?.package_expires_at) return false;
  return new Date() > new Date(exhibitor.package_expires_at);
}
