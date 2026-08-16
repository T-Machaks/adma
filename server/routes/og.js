import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The built SPA shell — same file nginx serves as static HTML for every other route.
// Read fresh on every request rather than cached at startup: this file changes on every
// deploy, and re-reading a ~3KB file for a low-traffic route (exhibitor detail shares)
// is not worth the risk of serving a stale shell if a rebuild ever happens without a
// matching pm2 restart.
const DIST_INDEX = path.join(__dirname, '../../dist/index.html');
const APP_URL = 'https://admadigital.co.zw';
const FALLBACK_IMAGE = 'https://adma-zw.s3.af-south-1.amazonaws.com/brand/adma-logo.png';

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Replaces a `<meta property="key" content="...">` (or name="key") tag's content
// attribute in place — tolerant of the source file's aligned extra whitespace.
function setMetaContent(html, attr, key, value) {
  const re = new RegExp(`(<meta ${attr}="${key}"\\s+content=")[^"]*("\\s*/?>)`);
  return html.replace(re, `$1${escapeHtml(value)}$2`);
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
      const image = ex.logo_url || ex.booth_image_url || FALLBACK_IMAGE;

      html = setMetaContent(html, 'property', 'og:url', url);
      html = setMetaContent(html, 'property', 'og:title', title);
      html = setMetaContent(html, 'property', 'og:description', description);
      html = setMetaContent(html, 'property', 'og:image', image);
      html = setMetaContent(html, 'name', 'twitter:title', title);
      html = setMetaContent(html, 'name', 'twitter:description', description);
      html = setMetaContent(html, 'name', 'twitter:image', image);
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
      // Only the fixed 500x500 logo preset has known dimensions — the booth-image/
      // generic fallback cases keep the page's default width/height (a harmless
      // mismatch; most crawlers re-derive real dimensions from the image itself).
      if (ex.logo_url) {
        html = setMetaContent(html, 'property', 'og:image:width', '500');
        html = setMetaContent(html, 'property', 'og:image:height', '500');
      }
    }
  } catch (e) {
    console.error('OG meta injection failed for exhibitor', req.params.id, ':', e.message);
    // Falls through and serves the plain, unmodified shell below — the real page still
    // loads and works normally via client-side routing either way.
  }

  res.type('html').send(html);
});

export default r;
