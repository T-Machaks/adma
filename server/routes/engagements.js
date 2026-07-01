import { Router } from 'express';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { crudRouter } from '../lib/crudRouter.js';

const TABLE = 'adma_engagements';

export default crudRouter(TABLE, {
  gsiFields: { exhibitor_id: 'exhibitor-index' },
  extraRoutes(r) {
    r.get('/by-exhibitor', async (req, res) => {
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
