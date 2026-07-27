import { apiFetch } from '@/api/client';

const BASE = '/api/event-info';

export const EventInfo = {
  async get() {
    return apiFetch(BASE);
  },
  async update(data) {
    return apiFetch(BASE, { method: 'PUT', body: data });
  },
};
