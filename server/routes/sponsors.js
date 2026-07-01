import { crudRouter } from '../lib/crudRouter.js';

export default crudRouter('adma_sponsors', {
  defaults: () => ({ tier: 'Bronze', featured: false }),
});
