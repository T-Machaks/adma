import { crudRouter } from '../lib/crudRouter.js';

// Reads only in normal UI flow — bid creation is validated server-side via
// POST /api/lots/:id/bid, which also writes the adma_bids record.
export default crudRouter('adma_bids', {
  gsiFields: { lot_id: 'lot-index' },
});
