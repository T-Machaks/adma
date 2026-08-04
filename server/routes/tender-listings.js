import { crudRouter } from '../lib/crudRouter.js';
import { requireAuth } from '../lib/authMiddleware.js';
import { CONSOLE_ROLES, getMyExhibitorId, getMarketplaceAddonState } from '../lib/ownership.js';

const TABLE = 'adma_tender_listings';

async function ownsTender(req, item) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  return item.exhibitor_id === await getMyExhibitorId(req);
}

export default crudRouter(TABLE, {
  defaults: () => ({ status: 'Open' }),
  gsiFields: { exhibitor_id: 'exhibitor-index' },
  // Read stays public — this is a real public tender directory. Only editing/deleting
  // is scoped to the exhibitor who posted it.
  auth: { read: 'public', write: ownsTender },
  extraRoutes(r) {
    // Rate card Section C gate — same shape as job-listings.js: posting requires an
    // active account-level Marketplace Add-on. Interactive (vs Text Only) is a per-
    // listing choice made when creating THIS tender, capped by the account's actual
    // paid tier — never trusted from the client as-is.
    r.post('/', requireAuth, async (req, res, next) => {
      if (req.user.role === 'exhibitor') {
        const exhibitorId = await getMyExhibitorId(req);
        req.body.exhibitor_id = exhibitorId;
        const { active, tier } = await getMarketplaceAddonState(exhibitorId);
        if (!active) return res.status(403).json({ error: 'Activate the Marketplace Add-on to post a tender listing — see Rate Card in your exhibitor portal.' });
        if (tier === 'interactive' && req.body.interactive_status === 'active') {
          req.body.interactive_status = 'active';
        } else {
          delete req.body.interactive_status;
        }
      }
      next();
    });

    // Only re-caps interactive_status when the client actually included it in this PUT —
    // an unrelated field edit that omits it leaves the listing's existing value untouched.
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
