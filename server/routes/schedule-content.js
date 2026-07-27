import { Router } from 'express';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { requireRole } from '../lib/authMiddleware.js';

const TABLE = 'adma_schedule';
const KEY = { pk: 'singleton' };

// Seeded from the content Schedule.jsx used to hardcode (the SCHEDULE object), reshaped
// into a flexible array of days so a season with a different number of days still works.
const DEFAULTS = {
  days: [
    {
      id: 'day-1',
      label: 'Day 1',
      date: '4 June 2026',
      theme: 'Machinery & Mechanisation',
      sessions: [
        { id: 's1-1', time: '07:30', title: 'Gates Open & Registration', location: 'Main Entrance', type: 'logistics', speaker: '', duration: '30 min', virtual: false, webinar_url: '' },
        { id: 's1-2', time: '08:00', title: 'Exhibition Opens — Machinery Hall', location: 'Machinery Hall', type: 'exhibition', speaker: '', duration: 'All Day', virtual: false, webinar_url: '' },
        { id: 's1-3', time: '09:00', title: 'Opening Keynote: The Future of Farm Mechanisation in Zimbabwe', location: 'Main Stage', type: 'keynote', speaker: 'Senior Industry Representative', duration: '45 min', virtual: false, webinar_url: '' },
        { id: 's1-4', time: '10:00', title: 'Panel: Financing Tractors & Equipment for Smallholder Farmers', location: 'Conference Tent', type: 'panel', speaker: 'Industry Panellists', duration: '60 min', virtual: false, webinar_url: '' },
        { id: 's1-5', time: '11:30', title: 'Live Demo — Tractors & Implements', location: 'Outdoor Demo Zone', type: 'demo', speaker: '', duration: '60 min', virtual: false, webinar_url: '' },
        { id: 's1-6', time: '13:00', title: 'Networking Lunch Break', location: 'Catering Area', type: 'break', speaker: '', duration: '60 min', virtual: false, webinar_url: '' },
        { id: 's1-7', time: '14:00', title: 'Session: Precision Irrigation Technology', location: 'Conference Tent', type: 'session', speaker: 'Technical Expert', duration: '45 min', virtual: false, webinar_url: '' },
        { id: 's1-8', time: '15:00', title: 'Sponsored Session: Digital Tools for Farm Management', location: 'Conference Tent', type: 'sponsored', speaker: 'Sponsor Presenter', duration: '30 min', virtual: true, webinar_url: '#' },
        { id: 's1-9', time: '16:30', title: 'Day 1 Networking Sundowner', location: 'Exhibitor Lounge', type: 'networking', speaker: '', duration: '90 min', virtual: false, webinar_url: '' },
        { id: 's1-10', time: '17:00', title: 'Exhibition Closes — Day 1', location: 'All Zones', type: 'logistics', speaker: '', duration: '', virtual: false, webinar_url: '' },
      ],
    },
    {
      id: 'day-2',
      label: 'Day 2',
      date: '5 June 2026',
      theme: 'Livestock & Inputs',
      sessions: [
        { id: 's2-1', time: '07:30', title: 'Gates Open', location: 'Main Entrance', type: 'logistics', speaker: '', duration: '30 min', virtual: false, webinar_url: '' },
        { id: 's2-2', time: '08:00', title: 'Exhibition Opens — Livestock Auction Ring', location: 'Field Zone', type: 'exhibition', speaker: '', duration: 'All Day', virtual: false, webinar_url: '' },
        { id: 's2-3', time: '09:30', title: 'Keynote: Growing Livestock Value Chains in Zimbabwe', location: 'Main Stage', type: 'keynote', speaker: 'Government & Industry Leaders', duration: '45 min', virtual: false, webinar_url: '' },
        { id: 's2-4', time: '10:30', title: 'Live Livestock Auction', location: 'Field Zone', type: 'demo', speaker: '', duration: '90 min', virtual: false, webinar_url: '' },
        { id: 's2-5', time: '12:00', title: 'Roundtable: Fertiliser & Seed Trends for the 2026/27 Season', location: 'Conference Tent', type: 'panel', speaker: 'Agronomy Experts', duration: '60 min', virtual: true, webinar_url: '#' },
        { id: 's2-6', time: '13:00', title: 'Lunch Break', location: 'Catering Area', type: 'break', speaker: '', duration: '60 min', virtual: false, webinar_url: '' },
        { id: 's2-7', time: '14:00', title: 'Session: Animal Health & Biosecurity', location: 'Conference Tent', type: 'session', speaker: 'Veterinary Officer', duration: '45 min', virtual: false, webinar_url: '' },
        { id: 's2-8', time: '15:30', title: 'Exhibitor Speed Networking', location: 'Main Atrium', type: 'networking', speaker: '', duration: '60 min', virtual: false, webinar_url: '' },
        { id: 's2-9', time: '17:00', title: 'Exhibition Closes — Day 2', location: 'All Zones', type: 'logistics', speaker: '', duration: '', virtual: false, webinar_url: '' },
      ],
    },
    {
      id: 'day-3',
      label: 'Day 3',
      date: '6 June 2026',
      theme: 'Suppliers, Finance & Closing',
      sessions: [
        { id: 's3-1', time: '07:30', title: 'Gates Open', location: 'Main Entrance', type: 'logistics', speaker: '', duration: '30 min', virtual: false, webinar_url: '' },
        { id: 's3-2', time: '08:00', title: 'Exhibition Opens', location: 'All Sections', type: 'exhibition', speaker: '', duration: 'All Day', virtual: false, webinar_url: '' },
        { id: 's3-3', time: '09:00', title: 'Session: Agri-Finance & Insurance for Growing Farm Businesses', location: 'Conference Tent', type: 'session', speaker: 'Banking & Insurance Expert', duration: '45 min', virtual: false, webinar_url: '' },
        { id: 's3-4', time: '10:30', title: 'Live Demo: Irrigation & Solar Water Pumping Systems', location: 'Outdoor Demo Zone', type: 'demo', speaker: '', duration: '60 min', virtual: false, webinar_url: '' },
        { id: 's3-5', time: '12:00', title: 'Closing Keynote & Exhibitor Awards Recognition', location: 'Main Stage', type: 'keynote', speaker: 'ADMA Organising Committee', duration: '60 min', virtual: true, webinar_url: '#' },
        { id: 's3-6', time: '13:00', title: 'Lunch & Final Networking', location: 'Catering Area', type: 'break', speaker: '', duration: '90 min', virtual: false, webinar_url: '' },
        { id: 's3-7', time: '15:00', title: 'Exhibition Closes', location: 'All Zones', type: 'logistics', speaker: '', duration: '', virtual: false, webinar_url: '' },
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
