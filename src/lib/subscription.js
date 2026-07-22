// Exhibitor virtual-platform subscriptions expire on 30 May every year (before the June show).
// Locked profiles are hidden from public view, not deleted — the exhibitor and organiser console still see them.
export function isSubscriptionExpired(exhibitor) {
  if (!exhibitor?.subscription_expires_at) return false;
  return new Date() > new Date(exhibitor.subscription_expires_at);
}
