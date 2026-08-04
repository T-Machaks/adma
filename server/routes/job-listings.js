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
    // (vs Text Only) is now a per-listing choice made by the exhibitor when creating THIS
    // listing — but capped by the account's actual paid tier, never trusted from the
    // client as-is: an 'interactive' tier account can choose either per listing, a 'text'
    // tier account (or a raw API call) can never produce an interactive listing.
    r.post('/', requireAuth, async (req, res, next) => {
      if (req.user.role === 'exhibitor') {
        const exhibitorId = await getMyExhibitorId(req);
        req.body.exhibitor_id = exhibitorId;
        const { active, tier } = await getMarketplaceAddonState(exhibitorId);
        if (!active) return res.status(403).json({ error: 'Activate the Marketplace Add-on to post a job listing — see Rate Card in your exhibitor portal.' });
        if (tier === 'interactive' && req.body.interactive_status === 'active') {
          req.body.interactive_status = 'active';
        } else {
          delete req.body.interactive_status;
        }
      }
      next();
    });

    // Existing listings stay editable even if the add-on later lapses (only new posts
    // are blocked). Only re-caps interactive_status when the client actually included it
    // in this PUT — an unrelated field edit that omits it leaves the listing's existing
    // value untouched. When it IS included but doesn't qualify (wrong tier, or the
    // exhibitor is intentionally switching a listing back to text-only), it's set to
    // `null` rather than dropped, so an existing 'active' value actually gets cleared.
    r.put('/:id', async (req, res, next) => {
      if (req.user?.role === 'exhibitor' && 'interactive_status' in req.body) {
        const exhibitorId = await getMyExhibitorId(req);
        const { tier } = await getMarketplaceAddonState(exhibitorId);
        req.body.interactive_status = (tier === 'interactive' && req.body.interactive_status === 'active') ? 'active' : null;
      }
      next();
    });
  },
});
