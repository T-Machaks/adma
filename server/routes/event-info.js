import { Router } from 'express';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { requireRole } from '../lib/authMiddleware.js';

const TABLE = 'adma_event_info';
const KEY = { pk: 'singleton' };

// Seeded from the content EventInfo.jsx used to hardcode, so the page renders
// identically until an organizer edits something via /console/event-content.
const DEFAULTS = {
  dates: '04 – 06 June 2026',
  hours: '08:00 – 17:00 daily (Gates: 07:30)',
  venue: 'ART Farm, Pomona, Zimbabwe',
  entry: 'Free for visitors · Exhibitor packages available',
  aboutParagraphs: [
    "ADMA Agri Show is Zimbabwe's largest agricultural exhibition, bringing together machinery dealers, input suppliers, irrigation specialists, livestock breeders, financiers, and agri-tech innovators under one roof.",
    'Set on 25 acres at ART Farm, Pomona, the show hosts 231 exhibitors and live livestock auctions, providing a structured environment for serious business, product demonstrations, and contract opportunities across the full agricultural value chain.',
  ],
  visitorGuidance: [
    { icon: '🗺️', text: 'Pick up a printed site map at the registration desk or view it in this app.' },
    { icon: '📱', text: 'Scan QR codes at exhibitor stands to access brochures, product sheets, and demo videos.' },
    { icon: '📅', text: 'Use the Meetings section to book a one-on-one session with any exhibitor.' },
    { icon: '🔔', text: 'Check the Updates section regularly for schedule changes and important notices.' },
    { icon: '🅿️', text: 'Follow signage for parking and shuttle drop-off points at the main gate.' },
  ],
  exhibitorTiers: [
    { tier: 'Platinum', color: 'bg-emerald-100 text-emerald-700', desc: 'Largest stand space, prime location, maximum visibility' },
    { tier: 'Gold', color: 'bg-yellow-100 text-yellow-700', desc: 'Premium placement, branding rights, full stand' },
    { tier: 'Silver', color: 'bg-slate-100 text-slate-600', desc: 'Standard stand, directory listing, signage' },
    { tier: 'Bronze', color: 'bg-orange-100 text-orange-800', desc: 'Compact space, shared zones, entry-level package' },
  ],
  rules: [
    'Professional business attire is recommended for exhibitor representatives.',
    'Photography of exhibitor stands requires permission from the exhibitor.',
    'No canvassing or distribution of materials outside your assigned stand.',
    'Vehicles, machinery, and livestock must be pre-approved for outdoor display zones.',
    'All attendees must wear their visitor or exhibitor badge at all times.',
    'The organisers reserve the right to remove any person behaving in an unsafe or inappropriate manner.',
    'Smoking is only permitted in designated areas.',
  ],
  faqs: [
    { q: 'Is registration free for visitors?', a: 'General visitor access is free of charge. Some sessions may require pre-registration. Please confirm with the ADMA organising team.' },
    { q: 'Where is the ADMA Agri Show held?', a: 'ADMA Agri Show will be held at ART Farm, Pomona, Zimbabwe, on 25 acres of showground. Ample parking is available on-site.' },
    { q: 'What are the exhibition opening hours?', a: 'The exhibition is open from 08:00 to 17:00 across the three show days. Gates open at 07:30 for early access.' },
    { q: 'Can I book meetings with exhibitors in advance?', a: 'Yes. Use the Meetings section in this app to submit a meeting request to any exhibitor. They will confirm your slot.' },
    { q: 'Is there catering available on-site?', a: 'Yes, a catering and refreshment area is available throughout the event. Various food vendors will be on-site.' },
    { q: 'Are children allowed?', a: 'ADMA Agri Show is a family-friendly agricultural exhibition, though children under 16 should be accompanied by a responsible adult in machinery and livestock zones.' },
    { q: 'Is there parking at the venue?', a: 'Yes, dedicated parking is available at the venue. Security personnel will guide visitors. Vehicle stickers are issued per exhibitor tier — check announcements for allocation.' },
    { q: 'How do I become an exhibitor?', a: 'Visit the ADMA website to complete the exhibitor registration form. Different sponsorship tiers (Platinum, Gold, Silver, Bronze) are available with varying stand sizes and benefits.' },
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
