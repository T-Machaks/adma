import { crudRouter } from '../lib/crudRouter.js';

export default crudRouter('adma_meeting_requests', {
  defaults: () => ({ status: 'Pending' }),
  gsiFields: { exhibitor_id: 'exhibitor-index' },
});
