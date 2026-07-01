import { crudRouter } from '../lib/crudRouter.js';

export default crudRouter('adma_virtual_enquiries', {
  defaults: () => ({ status: 'New' }),
  gsiFields: { exhibitor_id: 'exhibitor-index' },
});
