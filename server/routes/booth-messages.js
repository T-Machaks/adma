import { crudRouter } from '../lib/crudRouter.js';

// Attendee <-> exhibitor virtual-stand chat. Messages are threaded per
// (exhibitor_id, thread_email) — thread_email is the attendee's email.
export default crudRouter('adma_booth_messages', {
  defaults: () => ({ from_exhibitor: false }),
  gsiFields: { exhibitor_id: 'exhibitor-index' },
});
