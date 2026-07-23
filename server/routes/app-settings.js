import { Router } from 'express';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';

const TABLE = 'adma_app_settings';
const KEY = { pk: 'singleton' };
const DEFAULTS = {
  virtualExhibitionOpen: false,
  physicalEventRegistrationUrl: 'https://agrishow.co.zw/',
  ccSalesAuctionUrl: '',
  paidFeatureRequestEmail: '',
  marketingVideoUrl: '',
  eventDatesLabel: '01 Aug 2026 – 30 May 2027',
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

r.put('/', async (req, res) => {
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
