import { apiFetch } from '@/api/client';

const BASE = '/api/exhibitors';

export const Exhibitor = {
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
  async getBoothImageUploadUrl(exhibitorId, oldImageUrl = null) {
    return apiFetch('/api/upload/booth-image-url', {
      method: 'POST',
      body: { exhibitorId, oldImageUrl },
    });
  },
  async getGalleryUploadUrl(exhibitorId) {
    return apiFetch('/api/upload/gallery-image-url', {
      method: 'POST',
      body: { exhibitorId },
    });
  },
  // Sets the login email on the exhibitor's linked account — organizer-only. Pass
  // sendEmail=true to also email them a password-reset link so they can set their
  // own password (defaults false so fixing a typo doesn't re-send on every save).
  async setLoginEmail(exhibitorId, email, sendEmail = false) {
    return apiFetch('/api/auth/organizer/set-exhibitor-email', {
      method: 'POST',
      body: { exhibitor_id: exhibitorId, email, send_email: sendEmail },
    });
  },
};
