import { apiFetch } from '@/api/client';

const BASE = '/api/schedule-content';

export const ScheduleContent = {
  async get() {
    return apiFetch(BASE);
  },
  async update(data) {
    return apiFetch(BASE, { method: 'PUT', body: data });
  },
};
