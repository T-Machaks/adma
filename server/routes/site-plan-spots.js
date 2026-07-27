import { Router } from 'express';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { requireRole } from '../lib/authMiddleware.js';
import { SITE_PLAN_SPOTS } from '../../src/lib/sitePlanSpots.js';

const TABLE = 'adma_site_plan_spots';
const KEY = { pk: 'singleton' };

// Seeded from the original hand-placed hotspots for the default site plan image, so
// nothing changes until an organizer uploads a new plan and redraws its own spots.
const DEFAULTS = {
  spots: SITE_PLAN_SPOTS.map((s, i) => ({ id: `default-${i}`, ...s })),
};

const r = Router();

r.get('/', async (_req, res) => {
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: KEY }));
    res.json({ ...DEFAULTS, ...(result.Item || {}) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.put('/', requireRole('organizer', 'marketing_partner', 'superadmin'), async (req, res) => {
  try {
    const entries = Object.entries(req.body).filter(([k]) => k !== 'pk');
    if (!entries.length) return res.json(DEFAULTS);
    const names = {};
    const values = {};
    const sets = entries.map(([k, v], i) => {
      names[`#f${i}`] = k;
      values[`:v${i}`] = v;
      return `#f${i} = :v${i}`;
    });
    const result = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: KEY,
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    res.json({ ...DEFAULTS, ...result.Attributes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
