import { crudRouter } from '../lib/crudRouter.js';

export default crudRouter('adma_tender_listings', {
  defaults: () => ({ status: 'Open' }),
  gsiFields: { exhibitor_id: 'exhibitor-index' },
});
