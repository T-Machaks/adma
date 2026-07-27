import { apiFetch } from '@/api/client';

const BASE = '/api/site-plan-spots';

export const SitePlanSpots = {
  async get() {
    return apiFetch(BASE);
  },
  async update(data) {
    return apiFetch(BASE, { method: 'PUT', body: data });
  },
};
