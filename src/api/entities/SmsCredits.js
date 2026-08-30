import { apiFetch } from '@/api/client';

const BASE = '/api/sms-credits';

export const SmsCredits = {
  // { prices: { SMS500, SMS1000 }, hasWorkspace }
  async summary() {
    return apiFetch(BASE + '/summary');
  },
  // { url } — single-use SSO link, ~120s TTL. Caller does window.location.href = url
  // immediately; never store or reuse it.
  async open() {
    return apiFetch(BASE + '/open');
  },
};
