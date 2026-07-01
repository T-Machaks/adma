import { Router } from 'express';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { crudRouter } from '../lib/crudRouter.js';

const TABLE = 'adma_users';

export default crudRouter(TABLE, {
  defaults: () => ({ role: 'attendee', status: 'active' }),
  extraRoutes(r) {
    r.get('/by-email', async (req, res) => {
      try {
        const email = req.query.email?.toLowerCase();
        if (!email) return res.status(400).json({ error: 'email required' });
        const result = await ddb.send(new QueryCommand({
          TableName: TABLE,
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :e',
          ExpressionAttributeValues: { ':e': email },
          Limit: 1,
        }));
        const item = result.Items?.[0] ?? null;
        res.json(item);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  },
});
