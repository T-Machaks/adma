import { apiFetch } from '@/api/client';

// Roles: organizer | marketing_partner | exhibitor | attendee
// organizer and marketing_partner have console access

const BASE = '/api/users';

export const User = {
  async list(sortBy = null) {
    return apiFetch(sortBy ? `${BASE}?sortBy=${sortBy}` : BASE);
  },
  async get(id) {
    return apiFetch(`${BASE}/${id}`);
  },
  async findByEmail(email) {
    return apiFetch(`${BASE}/by-email?email=${encodeURIComponent(email)}`);
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
  // Creates an exhibitor team member's account, a Confirmed event registration, and
  // emails them a combined invite + set-password link — unlike create(), which just
  // makes a bare record with no way to ever log in or get a badge.
  async inviteTeamMember(data) {
    return apiFetch('/api/auth/invite-team-member', { method: 'POST', body: data });
  },
  // Backfills a missing registration (for members added before invites existed) and
  // resends the invite + set-password email. Refused server-side if the account already
  // has a password set.
  async resendTeamInvite(email) {
    return apiFetch('/api/auth/resend-team-invite', { method: 'POST', body: { email } });
  },
};
