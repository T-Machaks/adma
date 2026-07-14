import { apiFetch } from '@/api/client';

const BASE = '/api/lots';

export const Lot = {
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
  async filterByAuction(auctionId) {
    return apiFetch(`${BASE}?filter=${encodeURIComponent(JSON.stringify({ auction_id: auctionId }))}`);
  },
  async placeBid(id, data) {
    return apiFetch(`${BASE}/${id}/bid`, { method: 'POST', body: data });
  },
  async getImageUploadUrl(lotId) {
    return apiFetch('/api/upload/lot-image-url', { method: 'POST', body: { lotId } });
  },
};
