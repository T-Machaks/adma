// Exhibitor virtual-platform subscriptions expire on 30 May every year (before the June show).
export function nextMay30ISO(from = new Date()) {
  const year = from.getUTCFullYear();
  const may30ThisYear = new Date(Date.UTC(year, 4, 30, 23, 59, 59));
  const expiry = from <= may30ThisYear ? may30ThisYear : new Date(Date.UTC(year + 1, 4, 30, 23, 59, 59));
  return expiry.toISOString();
}
