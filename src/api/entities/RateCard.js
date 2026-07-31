import { apiFetch } from '@/api/client';

const BASE = '/api/rate-card';

export const RateCard = {
  async get() {
    return apiFetch(BASE);
  },
  async update(data) {
    return apiFetch(BASE, { method: 'PUT', body: data });
  },
};
