import { crudRouter } from '../lib/crudRouter.js';

export default crudRouter('adma_attendee_notes', {
  defaults: () => ({ type: 'Exhibitor', is_favorite: false }),
  gsiFields: { user_email: 'user-email-index' },
});
