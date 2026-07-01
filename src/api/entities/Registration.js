import { apiFetch } from '@/api/client';

const BASE = '/api/registrations';

export const Registration = {
  async list(sortBy = null) {
    return apiFetch(sortBy ? `${BASE}?sortBy=${sortBy}` : BASE);
  },
  async get(id) {
    return apiFetch(`${BASE}/${id}`);
  },
  async findByEmail(email) {
    return apiFetch(`${BASE}/by-email?email=${encodeURIComponent(email)}`);
  },
  async listByEmail(email) {
    return apiFetch(`${BASE}/by-email-all?email=${encodeURIComponent(email)}`);
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
  async sendConfirmation(id) {
    return apiFetch(`${BASE}/confirm-email`, { method: 'POST', body: { id } });
  },
};
