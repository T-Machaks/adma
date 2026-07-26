import { crudRouter } from '../lib/crudRouter.js';
import { CONSOLE_ROLES, getMyExhibitorId } from '../lib/ownership.js';

async function ownsMeeting(req, item) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  if (item.visitor_email?.toLowerCase() === req.user.email?.toLowerCase()) return true;
  return item.exhibitor_id === await getMyExhibitorId(req);
}

export default crudRouter('adma_meeting_requests', {
  defaults: () => ({ status: 'Pending' }),
  gsiFields: { exhibitor_id: 'exhibitor-index' },
  auth: { read: ownsMeeting, write: ownsMeeting },
  extraRoutes(r) {
    // A meeting request can only ever be booked as yourself — override whatever the
    // client sent for visitor_email instead of trusting it.
    r.post('/', (req, res, next) => {
      req.body.visitor_email = req.user?.email;
      next();
    });
  },
});
