import { Router } from 'express';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { crudRouter } from '../lib/crudRouter.js';
import { requireAuth } from '../lib/authMiddleware.js';

const TABLE = 'adma_engagements';

export default crudRouter(TABLE, {
  gsiFields: { exhibitor_id: 'exhibitor-index' },
  // Engagement events are created by anonymous directory browsing (src/lib/tracking.js's
  // track() calls fire regardless of login state) — write must stay public. Reading the
  // analytics is restricted to logged-in exhibitor/organizer views.
  auth: { read: 'auth', write: 'public' },
  extraRoutes(r) {
    r.get('/by-exhibitor', requireAuth, async (req, res) => {
      try {
        const { id, name } = req.query;
        if (!id) return res.status(400).json({ error: 'id required' });
        const result = await ddb.send(new QueryCommand({
          TableName: TABLE,
          IndexName: 'exhibitor-index',
          KeyConditionExpression: 'exhibitor_id = :id',
          ExpressionAttributeValues: { ':id': id },
        }));
        let items = result.Items || [];
        if (name) items = items.filter(i => i.exhibitor_name === name);
        res.json(items);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  },
});
