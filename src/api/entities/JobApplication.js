import { apiFetch } from '@/api/client';

const BASE = '/api/job-applications';

export const JobApplication = {
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
  async filterByJob(jobId) {
    return apiFetch(`${BASE}?filter=${encodeURIComponent(JSON.stringify({ job_id: jobId }))}`);
  },
};
