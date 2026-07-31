import { crudRouter } from '../lib/crudRouter.js';
import { requireAuth } from '../lib/authMiddleware.js';
import { CONSOLE_ROLES, getMyExhibitorId, getMarketplaceAddonState } from '../lib/ownership.js';

const TABLE = 'adma_job_listings';

async function ownsJobListing(req, item) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  return item.exhibitor_id === await getMyExhibitorId(req);
}

export default crudRouter(TABLE, {
  defaults: () => ({ status: 'Open' }),
  gsiFields: { exhibitor_id: 'exhibitor-index' },
  // Read stays public — this is a real public job board. Only editing/deleting is
  // scoped to the exhibitor who posted it.
  auth: { read: 'public', write: ownsJobListing },
  extraRoutes(r) {
    // Rate card Section C gate — an exhibitor needs an active Marketplace Add-on to post
    // at all now (real server-side enforcement, not just a hidden button). Interactive
    // (vs Text Only) tier is denormalized onto the listing itself as interactive_status
    // so JobDetail.jsx's existing CV-upload rendering needs no changes.
    r.post('/', requireAuth, async (req, res, next) => {
      if (req.user.role === 'exhibitor') {
        const exhibitorId = await getMyExhibitorId(req);
        req.body.exhibitor_id = exhibitorId;
        const { active, tier } = await getMarketplaceAddonState(exhibitorId);
        if (!active) return res.status(403).json({ error: 'Activate the Marketplace Add-on to post a job listing — see Rate Card in your exhibitor portal.' });
        if (tier === 'interactive') req.body.interactive_status = 'active';
      }
      next();
    });

    // Existing listings stay editable even if the add-on later lapses (only new posts
    // are blocked) — but re-stamp interactive_status on save so upgrading the add-on
    // tier takes effect on already-posted listings without touching them individually.
    r.put('/:id', async (req, res, next) => {
      if (req.user?.role === 'exhibitor') {
        const exhibitorId = await getMyExhibitorId(req);
        const { tier } = await getMarketplaceAddonState(exhibitorId);
        if (tier === 'interactive') req.body.interactive_status = 'active';
      }
      next();
    });
  },
});
