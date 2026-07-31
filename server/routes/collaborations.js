import { crudRouter } from '../lib/crudRouter.js';
import { requireAuth } from '../lib/authMiddleware.js';
import { CONSOLE_ROLES, getMyExhibitorId, getMarketplaceAddonState } from '../lib/ownership.js';

const TABLE = 'adma_collaborations';

async function ownsCollaboration(req, item) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  return item.exhibitor_id === await getMyExhibitorId(req);
}

export default crudRouter(TABLE, {
  defaults: () => ({ status: 'Pending' }),
  gsiFields: { exhibitor_id: 'exhibitor-index' },
  // Read stays public — Collaborations.jsx is a real public directory, everyone sees
  // every listing. Only editing/deleting is scoped to the exhibitor who posted it.
  auth: { read: 'public', write: ownsCollaboration },
  extraRoutes(r) {
    // Rate card Section C gate — posting requires an active account-level Marketplace
    // Add-on (same as jobs/tenders). The account-level payment IS the activation now, so
    // an exhibitor-posted collaboration goes straight to 'Open' — no more per-listing
    // organiser approval step (the old Pending/request-payment workflow is retired).
    r.post('/', requireAuth, async (req, res, next) => {
      if (req.user.role === 'exhibitor') {
        const exhibitorId = await getMyExhibitorId(req);
        req.body.exhibitor_id = exhibitorId;
        const { active } = await getMarketplaceAddonState(exhibitorId);
        if (!active) return res.status(403).json({ error: 'Activate the Marketplace Add-on to post a collaboration — see Rate Card in your exhibitor portal.' });
        req.body.status = 'Open';
      }
      next();
    });
  },
});
