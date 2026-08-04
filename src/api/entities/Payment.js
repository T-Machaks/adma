import { apiFetch } from '@/api/client';

const BASE = '/api/payments';

export const Payment = {
  async list() {
    return apiFetch(BASE);
  },
  async get(id) {
    return apiFetch(`${BASE}/${id}`);
  },
  // items: [{ type, item_key, period, ad_slot_id?, request_payload? }, ...] → { paymentId, redirectUrl }
  async initiate(items) {
    return apiFetch(`${BASE}/initiate`, { method: 'POST', body: { items } });
  },
  // Same items shape, no Paynow redirect — lands as pending_verification. → { paymentId }
  async initiateEft(items) {
    return apiFetch(`${BASE}/initiate-eft`, { method: 'POST', body: { items } });
  },
  async attachPop(id, popUrl) {
    return apiFetch(`${BASE}/${id}/pop`, { method: 'PUT', body: { pop_url: popUrl } });
  },
  async verifyEft(id) {
    return apiFetch(`${BASE}/${id}/verify-eft`, { method: 'POST' });
  },
  async rejectEft(id) {
    return apiFetch(`${BASE}/${id}/reject-eft`, { method: 'POST' });
  },
  async status(id) {
    return apiFetch(`${BASE}/${id}/status`);
  },
  async simulate(id, outcome) {
    return apiFetch(`${BASE}/${id}/simulate`, { method: 'POST', body: { outcome } });
  },
  async fulfill(paymentId, itemId) {
    return apiFetch(`${BASE}/${paymentId}/items/${itemId}/fulfill`, { method: 'PUT' });
  },
};
