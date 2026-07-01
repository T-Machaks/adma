import { crudRouter } from '../lib/crudRouter.js';

export default crudRouter('adma_announcements', {
  defaults: () => ({ type: 'General', pinned: false }),
});
