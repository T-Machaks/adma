import { crudRouter } from '../lib/crudRouter.js';
import { CONSOLE_ROLES, getMyExhibitorId } from '../lib/ownership.js';

// Attendee <-> exhibitor virtual-stand chat. Messages are threaded per
// (exhibitor_id, thread_email) — thread_email is the attendee's email.
async function ownsThread(req, item) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  if (req.user.role === 'exhibitor') return item.exhibitor_id === await getMyExhibitorId(req);
  return item.thread_email?.toLowerCase() === req.user.email?.toLowerCase();
}

export default crudRouter('adma_booth_messages', {
  defaults: () => ({ from_exhibitor: false }),
  gsiFields: { exhibitor_id: 'exhibitor-index' },
  auth: { read: ownsThread, write: ownsThread },
  extraRoutes(r) {
    // thread_email means different things depending on who's sending (the exhibitor's
    // own identity is exhibitor_id; thread_email is always the *attendee's* email, even
    // when the exhibitor is the sender) — so this validates rather than force-overwrites.
    r.post('/', async (req, res, next) => {
      if (!req.user) return next(); // let the generic write-access gate reject with 401
      if (req.user.role === 'exhibitor') {
        const myExhibitorId = await getMyExhibitorId(req);
        if (req.body.exhibitor_id !== myExhibitorId) {
          return res.status(403).json({ error: 'You do not have permission to do that.' });
        }
        req.body.from_exhibitor = true;
      } else {
        if (req.body.thread_email?.toLowerCase() !== req.user.email?.toLowerCase()) {
          return res.status(403).json({ error: 'You do not have permission to do that.' });
        }
        req.body.from_exhibitor = false;
      }
      next();
    });
  },
});
