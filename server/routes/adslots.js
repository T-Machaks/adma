import { Router } from 'express';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { crudRouter } from '../lib/crudRouter.js';

const TABLE = 'adma_adslots';

export default crudRouter(TABLE, {
  defaults: () => ({ active: true, internal: false, accent: '#f59e0b', bg: 'from-slate-700 to-slate-900' }),
  extraRoutes(r) {
    r.get('/active', async (req, res) => {
      try {
        const result = await ddb.send(new ScanCommand({
          TableName: TABLE,
          FilterExpression: 'active = :t',
          ExpressionAttributeValues: { ':t': true },
        }));
        res.json(result.Items || []);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  },
});
