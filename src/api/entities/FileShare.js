import { apiFetch } from '@/api/client';

const BASE = '/api/file-shares';

// ADMA's own expiring-link file drop for onboarding new exhibitors — organizer-side
// management here; the exhibitor's own no-login upload page (FileShareUpload.jsx)
// talks to the `public/*` endpoints below directly via fetch, not this entity.
export const FileShare = {
  async list(exhibitorId = null) {
    return apiFetch(exhibitorId ? `${BASE}?exhibitor_id=${encodeURIComponent(exhibitorId)}` : BASE);
  },
  async create(exhibitorId, note = '') {
    return apiFetch(BASE, { method: 'POST', body: { exhibitor_id: exhibitorId, note } });
  },
  async revoke(token) {
    return apiFetch(`${BASE}/${token}/revoke`, { method: 'POST' });
  },
  async remove(token) {
    return apiFetch(`${BASE}/${token}`, { method: 'DELETE' });
  },
};
