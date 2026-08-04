import { apiFetch } from '@/api/client';

const BASE = '/api/payments';

export const Payment = {
  async list() {
    return apiFetch(BASE);
  },
  async get(id) {
    return apiFetch(`${BASE}/${id}`);
  },
  // { type, item_key, period, ad_slot_id?, request_payload? } → { paymentId, redirectUrl }
  async initiate(data) {
    return apiFetch(`${BASE}/initiate`, { method: 'POST', body: data });
  },
  async status(id) {
    return apiFetch(`${BASE}/${id}/status`);
  },
  async simulate(id, outcome) {
    return apiFetch(`${BASE}/${id}/simulate`, { method: 'POST', body: { outcome } });
  },
  async fulfill(id) {
    return apiFetch(`${BASE}/${id}/fulfill`, { method: 'PUT' });
  },
};
