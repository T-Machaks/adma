import { Router } from 'express';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';

// Not under /api — served at the conventional root path search engines expect
// (https://admadigital.co.zw/sitemap.xml), same reasoning as server/routes/og.js:
// reached via an nginx location that proxies GET /sitemap.xml here instead of falling
// through to the static SPA shell (which obviously can't list dynamic exhibitor/listing
// URLs). See security/nginx/*.conf for the proxy block and public/robots.txt for the
// pointer to this route.
const APP_URL = 'https://admadigital.co.zw';

// Static, content-bearing public pages worth sending a crawler to. Deliberately excludes
// anything login-gated (meetings, attendee-dashboard, rate-card, connect, sessions),
// purely functional (payment/*, file-share/*), or console/exhibitor-portal — none of
// that is meant to rank, and sending a crawler there wastes crawl budget at best.
const STATIC_PAGES = [
  { path: '/',               priority: '1.0' },
  { path: '/exhibitors',     priority: '0.9' },
  { path: '/event-info',     priority: '0.8' },
  { path: '/schedule',       priority: '0.7' },
  { path: '/site-plan',      priority: '0.6' },
  { path: '/magazine',       priority: '0.6' },
  { path: '/partners',       priority: '0.6' },
  { path: '/marketplace',    priority: '0.6' },
  { path: '/jobs',           priority: '0.6' },
  { path: '/tenders',        priority: '0.6' },
  { path: '/auctions',       priority: '0.6' },
  { path: '/collaborations', priority: '0.5' },
  { path: '/register',       priority: '0.8' },
  { path: '/exhibitor-apply',priority: '0.7' },
  { path: '/privacy',        priority: '0.2' },
];

function urlEntry(loc, priority, lastmod) {
  return `  <url>\n    <loc>${loc}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <priority>${priority}</priority>\n  </url>`;
}

// Best-effort per table — one table's Scan failing (a typo'd name, a throttle) must
// never take the whole sitemap down; it just means that table's URLs are missing from
// this build of it until the next request tries again.
async function safeScan(table) {
  try {
    const result = await ddb.send(new ScanCommand({ TableName: table }));
    return result.Items || [];
  } catch (e) {
    console.error(`sitemap: scan failed for ${table}:`, e.message);
    return [];
  }
}

const r = Router();

r.get('/sitemap.xml', async (_req, res) => {
  const [exhibitors, jobs, tenders, auctions, collaborations] = await Promise.all([
    safeScan('adma_exhibitors'),
    safeScan('adma_job_listings'),
    safeScan('adma_tender_listings'),
    safeScan('adma_auctions'),
    safeScan('adma_collaborations'),
  ]);

  const entries = [
    ...STATIC_PAGES.map(p => urlEntry(`${APP_URL}${p.path}`, p.priority)),
    ...exhibitors.filter(e => !e.deleted).map(e => urlEntry(`${APP_URL}/exhibitors/${e.id}`, '0.7', e.created_date?.slice(0, 10))),
    ...jobs.map(j => urlEntry(`${APP_URL}/jobs/${j.id}`, '0.4', j.created_date?.slice(0, 10))),
    ...tenders.map(t => urlEntry(`${APP_URL}/tenders/${t.id}`, '0.4', t.created_date?.slice(0, 10))),
    ...auctions.map(a => urlEntry(`${APP_URL}/auctions/${a.id}`, '0.4', a.created_date?.slice(0, 10))),
    ...collaborations.map(c => urlEntry(`${APP_URL}/collaborations/${c.id}`, '0.4', c.created_date?.slice(0, 10))),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

  res.type('application/xml').send(xml);
});

export default r;
