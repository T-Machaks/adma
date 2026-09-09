import { crudRouter } from '../lib/crudRouter.js';

// Organizer-authored content (News, Event Updates, Farming Tips, etc.) — not
// exhibitor-posted, so there's no ownership check to build, unlike jobs/tenders/
// collaborations. Read stays public (same convention as those: the full list,
// Draft posts included, is fetchable — Blog.jsx filters to status === 'Published'
// client-side, exactly like Jobs.jsx filters to status === 'Open') so the console
// BlogManager can list everything through the same endpoint without a second route.
export default crudRouter('adma_blog_posts', {
  defaults: () => ({ status: 'Draft', category: 'News' }),
  auth: { read: 'public', write: ['organizer', 'marketing_partner', 'superadmin'] },
});
