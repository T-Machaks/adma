import { crudRouter } from '../lib/crudRouter.js';

export default crudRouter('adma_auctions', {
  defaults: () => ({ status: 'Upcoming' }),
  auth: { read: 'public', write: ['organizer', 'superadmin'] },
});
