import { apiFetch } from '@/api/client';

const BASE = '/api/tender-listings';

export const TenderListing = {
  async list(sortBy = null) {
    return apiFetch(sortBy ? `${BASE}?sortBy=${sortBy}` : BASE);
  },
  async get(id) {
    return apiFetch(`${BASE}/${id}`);
  },
  async create(data) {
    return apiFetch(BASE, { method: 'POST', body: data });
  },
  async update(id, data) {
    return apiFetch(`${BASE}/${id}`, { method: 'PUT', body: data });
  },
  async delete(id) {
    return apiFetch(`${BASE}/${id}`, { method: 'DELETE' });
  },
  async filter(query = {}) {
    return apiFetch(`${BASE}?filter=${encodeURIComponent(JSON.stringify(query))}`);
  },
  async getDocumentUploadUrl(exhibitorId, oldDocumentUrl = null) {
    return apiFetch('/api/upload/tender-document-url', {
      method: 'POST',
      body: { exhibitorId, oldDocumentUrl },
    });
  },
  async requestPayment(id) {
    return apiFetch(`${BASE}/${id}/request-payment`, { method: 'POST' });
  },
};
