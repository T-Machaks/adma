import { apiFetch } from '@/api/client';

const BASE = '/api/bids';

export const Bid = {
  async list(sortBy = null) {
    return apiFetch(sortBy ? `${BASE}?sortBy=${sortBy}` : BASE);
  },
  async filterByLot(lotId) {
    return apiFetch(`${BASE}?filter=${encodeURIComponent(JSON.stringify({ lot_id: lotId }))}`);
  },
};
