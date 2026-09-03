import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateExhibitorOgCard } from '../lib/ogCard.js';
import { putObject } from '../lib/s3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The built SPA shell — same file nginx serves as static HTML for every other route.
// Read fresh on every request rather than cached at startup: this file changes on every
// deploy, and re-reading a ~3KB file for a low-traffic route (exhibitor detail shares)
// is not worth the risk of serving a stale shell if a rebuild ever happens without a
// matching pm2 restart.
const DIST_INDEX = path.join(__dirname, '../../dist/index.html');
const APP_URL = 'https://admadigital.co.zw';

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Replaces a `<meta property="key" content="...">` (or name="key") tag's content
// attribute in place — tolerant of the source file's aligned extra whitespace.
function setMetaContent(html, attr, key, value) {
  const re = new RegExp(`(<meta ${attr}="${key}"\\s+content=")[^"]*("\\s*/?>)`);
  return html.replace(re, `$1${escapeHtml(value)}$2`);
}

// helmet() is mounted globally for the JSON API and sends an enforcing Content-Security-
// Policy plus several headers (Cross-Origin-Opener-Policy chief among them — a known way
// to break Google/Facebook popup-based login) that nothing else on this site sends at
// all; every other page only ever runs CSP in Report-Only (monitoring) mode via nginx.
// This route serves a real HTML page real visitors land on directly — exactly the
// shared-link scenario it exists for — so it must behave exactly like every other page,
// not more strictly. Clears helmet's extras and sets precisely the same headers nginx's
// own location / block sends for every other route (kept in sync with that block and
// with the equivalent list in server/index.js's own helmet() config by hand, since
// there's no shared constants module for it yet).
const SITE_CSP_REPORT_ONLY = "default-src 'self'; img-src 'self' data: blob: https://adma-zw.s3.af-south-1.amazonaws.com https://adma.s3.af-south-1.amazonaws.com https://i.ytimg.com; media-src 'self' https://adma-zw.s3.af-south-1.amazonaws.com https://adma.s3.af-south-1.amazonaws.com; frame-src 'self' https://www.youtube.com https://player.vimeo.com https://accounts.google.com https://www.google.com https://us05web.zoom.us https://app.zoom.us; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' https://connect.facebook.net https://accounts.google.com https://apis.google.com; connect-src 'self' https://accounts.google.com https://www.googleapis.com https://login.microsoftonline.com https://graph.microsoft.com https://graph.facebook.com https://connect.facebook.net https://adma-zw.s3.af-south-1.amazonaws.com https://adma.s3.af-south-1.amazonaws.com https://fonts.googleapis.com https://fonts.gstatic.com https://i.ytimg.com; frame-ancestors 'self'; report-uri /api/csp-report; report-to csp-endpoint";
const SITE_REPORT_TO = '{"group":"csp-endpoint","max_age":10886400,"endpoints":[{"url":"https://admadigital.co.zw/api/csp-report"}]}';

function useSitePageHeaders(res) {
  ['Content-Security-Policy', 'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy',
   'Origin-Agent-Cluster', 'Strict-Transport-Security', 'X-XSS-Protection',
   'X-Permitted-Cross-Domain-Policies', 'X-Download-Options'].forEach(h => res.removeHeader(h));
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy-Report-Only', SITE_CSP_REPORT_ONLY);
  res.setHeader('Report-To', SITE_REPORT_TO);
}

const r = Router();

// Serves the SPA shell with this exhibitor's own name/logo/description baked into the
// Open Graph / Twitter Card meta tags, so a link shared to WhatsApp/Facebook/LinkedIn
// shows that exhibitor's actual preview instead of the generic ADMA Digital card. Those
// crawlers don't run JavaScript, so a client-side-only fix (react-helmet etc.) would
// never actually reach them — this only works because nginx is configured to send
// GET /exhibitors/:id here instead of straight to the static dist/ files (see
// PROMOTION_RUNBOOK.md / nginx config for exactly which routes are proxied this way).
// Every branch below still serves a complete, valid HTML shell — a lookup failure must
// never be the reason a real visitor can't load the page, only the reason the preview
// stays generic.
r.get('/exhibitors/:id', async (req, res) => {
  useSitePageHeaders(res);

  let html;
  try {
    html = readFileSync(DIST_INDEX, 'utf-8');
  } catch (e) {
    console.error('OG route: could not read dist/index.html:', e.message);
    return res.status(200).type('html').send(
      '<!doctype html><html><head><title>ADMA Digital</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>'
    );
  }

  try {
    const result = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: req.params.id } }));
    const ex = result.Item;
    if (ex && !ex.deleted) {
      const url = `${APP_URL}/exhibitors/${req.params.id}`;
      const title = `${ex.name} — ADMA Digital`;
      const description = (ex.description && ex.description.trim())
        || `${ex.name} on ADMA Digital — the digital platform for the ADMA Agri Show.`;
      // A proper 1200x630 share card, generated fresh on every request (this route's
      // whole reason to exist — social-preview crawlers and cold un-JS'd hits — is low
      // traffic, so there's no meaningful cost to always reflecting the exhibitor's
      // current name/logo rather than caching and risking staleness) and uploaded to a
      // stable per-exhibitor key so the meta tag below is a normal static image URL,
      // same as every other page. Falls through to the outer catch (below) on any
      // failure — which serves the plain shell, whose own default og:image is already
      // the same 1200x630 branded image, so a card-generation failure is never the
      // reason a shared link looks broken, only the reason it looks generic.
      const image = await putObject(
        `og-cards/${req.params.id}.png`,
        await generateExhibitorOgCard(ex),
        'image/png'
      );

      html = setMetaContent(html, 'property', 'og:url', url);
      html = setMetaContent(html, 'property', 'og:title', title);
      html = setMetaContent(html, 'property', 'og:description', description);
      html = setMetaContent(html, 'property', 'og:image', image);
      html = setMetaContent(html, 'name', 'twitter:title', title);
      html = setMetaContent(html, 'name', 'twitter:description', description);
      html = setMetaContent(html, 'name', 'twitter:image', image);
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
      // No canonical tag exists in the base shell (a static one there would wrongly tell
      // every other CSR route it's a duplicate of whatever it pointed to — see useSEO.js's
      // comment) — inserted fresh here since this route serves real, distinct HTML per
      // exhibitor and non-JS crawlers (the ones this route exists for) never see the
      // client-side hook's version.
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: ex.name,
        ...(ex.description?.trim() ? { description: ex.description.trim() } : {}),
        ...(ex.logo_url ? { logo: ex.logo_url } : {}),
        url,
      };
      // JSON.stringify output is otherwise unescaped — an exhibitor description
      // containing a literal "</script>" would close the tag early and inject whatever
      // followed as live HTML. < sidesteps that without touching the JSON's meaning.
      const jsonLdScript = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
      html = html.replace(
        '</head>',
        `  <link rel="canonical" href="${escapeHtml(url)}" />\n  <script type="application/ld+json">${jsonLdScript}</script>\n</head>`
      );
      // Every generated card is the same fixed 1200x630 size — no longer conditional
      // on which image source was used, since generateExhibitorOgCard always produces
      // that size regardless of whether the exhibitor has their own logo.
      html = setMetaContent(html, 'property', 'og:image:width', '1200');
      html = setMetaContent(html, 'property', 'og:image:height', '630');
    }
  } catch (e) {
    console.error('OG meta injection failed for exhibitor', req.params.id, ':', e.message);
    // Falls through and serves the plain, unmodified shell below — the real page still
    // loads and works normally via client-side routing either way.
  }

  res.type('html').send(html);
});

export default r;
