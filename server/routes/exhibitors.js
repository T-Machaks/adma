import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { crudRouter } from '../lib/crudRouter.js';
import { nextMay30ISO } from '../lib/subscription.js';

export default crudRouter('adma_exhibitors', {
  defaults: () => ({ featured: false, package: 'Basic', subscription_expires_at: nextMay30ISO() }),
  extraRoutes(r) {
    // GET /api/exhibitors/login-list — every exhibitor, for the Exhibitor Portal login
    // picker. Includes exhibitors with no linked user_id yet (most of the seeded
    // physical-show directory) since the superadmin override lets them be accessed
    // before real per-exhibitor credentials exist.
    r.get('/login-list', async (req, res) => {
      try {
        const result = await ddb.send(new ScanCommand({
          TableName: 'adma_exhibitors',
          ProjectionExpression: 'id, company_name, #n, logo_url, user_id, tier, portal_locked',
          ExpressionAttributeNames: { '#n': 'name' },
        }));
        const items = (result.Items || [])
          .map(e => ({ ...e, company_name: e.company_name || e.name }))
          .sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));
        res.json(items);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  },
});
