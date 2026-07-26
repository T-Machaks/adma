import { crudRouter } from '../lib/crudRouter.js';
import { CONSOLE_ROLES } from '../lib/ownership.js';

function ownsNote(req, item) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  return item.user_email?.toLowerCase() === req.user.email?.toLowerCase();
}

export default crudRouter('adma_attendee_notes', {
  defaults: () => ({ type: 'Exhibitor', is_favorite: false }),
  gsiFields: { user_email: 'user-email-index' },
  auth: { read: ownsNote, write: ownsNote },
  extraRoutes(r) {
    // A note can never be attributed to anyone but its creator — override whatever
    // the client sent instead of trusting it.
    r.post('/', (req, res, next) => {
      req.body.user_email = req.user?.email;
      next();
    });
  },
});
