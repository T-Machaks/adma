import { Router } from 'express';
import { GetCommand, PutCommand, UpdateCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';
import { crudRouter } from '../lib/crudRouter.js';

const TABLE = 'adma_users';

function sanitize(user) {
  if (!user) return user;
  const { password_hash, totp_secret, ...rest } = user;
  return rest;
}

export default crudRouter(TABLE, {
  defaults: () => ({ role: 'attendee', status: 'active' }),
  extraRoutes(r) {
    // These are registered before crudRouter's own generic handlers for the
    // same paths, so they take priority -- strips password_hash/totp_secret
    // from every response instead of returning the raw DynamoDB item.
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
        res.json(sanitize(result.Items?.[0] ?? null));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    r.post('/', async (req, res) => {
      try {
        const item = {
          id: generateId(),
          created_date: new Date().toISOString(),
          role: 'attendee',
          status: 'active',
          ...req.body,
        };
        await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
        res.status(201).json(sanitize(item));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    r.get('/', async (req, res) => {
      try {
        const { sortBy, filter: filterJson } = req.query;
        const filterObj = filterJson ? JSON.parse(decodeURIComponent(filterJson)) : null;
        let items;
        if (filterObj) {
          const entries = Object.entries(filterObj);
          const names = {};
          const values = {};
          const parts = entries.map(([k, v], i) => {
            names[`#k${i}`] = k;
            values[`:v${i}`] = v;
            return `#k${i} = :v${i}`;
          });
          const result = await ddb.send(new ScanCommand({
            TableName: TABLE,
            FilterExpression: parts.join(' AND '),
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
          }));
          items = result.Items || [];
        } else {
          const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
          items = result.Items || [];
        }
        if (sortBy) {
          const desc = sortBy.startsWith('-');
          const field = desc ? sortBy.slice(1) : sortBy;
          items.sort((a, b) => {
            const av = a[field] ?? '';
            const bv = b[field] ?? '';
            return desc ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
          });
        }
        res.json(items.map(sanitize));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    r.get('/:id', async (req, res) => {
      try {
        const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
        if (!result.Item) return res.status(404).json({ error: 'Not found' });
        res.json(sanitize(result.Item));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    r.put('/:id', async (req, res) => {
      try {
        const body = req.body;
        const entries = Object.entries(body).filter(([k]) => k !== 'id');
        if (!entries.length) return res.status(400).json({ error: 'No fields to update' });

        const names = {};
        const values = {};
        const sets = entries.map(([k, v], i) => {
          names[`#f${i}`] = k;
          values[`:v${i}`] = v;
          return `#f${i} = :v${i}`;
        });

        const result = await ddb.send(new UpdateCommand({
          TableName: TABLE,
          Key: { id: req.params.id },
          UpdateExpression: `SET ${sets.join(', ')}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: 'ALL_NEW',
        }));
        res.json(sanitize(result.Attributes));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  },
});
