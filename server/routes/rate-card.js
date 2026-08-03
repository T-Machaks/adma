import { Router } from 'express';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { requireRole } from '../lib/authMiddleware.js';

const TABLE = 'adma_rate_card';
const KEY = { pk: 'singleton' };

// Item `key` values are deliberately the same values already used elsewhere in the
// system (AdSlot.placement, Exhibitor.package, magazine section.type) so a price
// lookup is just `items.find(i => i.key === realFieldValue)` — no parallel taxonomy.
const DEFAULTS = {
  billingPeriods: {
    monthly:   { months: 1,  freeMonths: 0, label: 'Monthly' },
    quarterly: { months: 3,  freeMonths: 0, label: 'Quarterly' },
    biannual:  { months: 6,  freeMonths: 1, label: 'Bi-Annually' },
    annual:    { months: 12, freeMonths: 2, label: 'Annually' },
  },
  sections: [
    {
      id: 'landing_page', label: 'Section A: Landing Page',
      items: [
        { key: 'carousel',       label: 'Banner Carousel',     monthlyRate: 30 },
        { key: 'video-carousel', label: 'Video Carousel',      monthlyRate: 50 },
        { key: 'footer-strip',   label: 'Strip Footer Banner', monthlyRate: 20 },
      ],
    },
    {
      id: 'virtual_exhibition', label: 'Section B: Virtual Exhibition Packages',
      items: [
        { key: 'Premium',  label: 'Premium',  monthlyRate: 35 },
        { key: 'Enhanced', label: 'Enhanced', monthlyRate: 25 },
        { key: 'Basic',    label: 'Basic',    monthlyRate: 15 },
      ],
    },
    {
      id: 'marketplace', label: 'Section C: Marketplace (Add-Ons)',
      note: 'Covers Jobs, Tenders, Collaborations & Auctions — one activation unlocks all; use only what you need.',
      items: [
        { key: 'text',        label: 'Text Only',   monthlyRate: 10 },
        { key: 'interactive', label: 'Interactive', monthlyRate: 15 },
      ],
    },
    {
      id: 'magazine', label: 'Section D: Digital Magazine',
      items: [
        { key: 'image',    label: 'Static Display Ad', monthlyRate: 15 },
        { key: 'carousel', label: 'Product Carousel',   monthlyRate: 30, desc: 'Also includes a Static Display Ad' },
        { key: 'video',    label: 'Video',              monthlyRate: 50, desc: 'Includes Static Display Ad and Product Carousel' },
      ],
    },
  ],
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
