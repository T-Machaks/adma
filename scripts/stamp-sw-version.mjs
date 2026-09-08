// Stamps public/sw.js's VERSION constant with this build's commit SHA, run as a build
// step (see .github/workflows/deploy.yml) after `vite build` has copied it verbatim
// into dist/sw.js. Vite doesn't process public/ files at all, so without this the
// service worker's caches never actually change between deploys -- a browser only
// re-installs a service worker when the file's own bytes differ, and since sw.js
// itself was hand-edited only once (2026-09-01) while dozens of unrelated deploys
// followed, every one of them silently failed to reach anyone who already had the app
// open: no new service worker install -> no controllerchange event -> the auto-reload
// logic in src/main.jsx never fires -> the tab just keeps running whatever JS bundle
// it loaded at the start of the session, indefinitely, until someone manually hard-
// refreshes. Deriving VERSION from the commit SHA (unique on every real deploy,
// unlike a hand-maintained date string someone has to remember to bump) closes that
// gap for good.
import { readFileSync, writeFileSync } from 'fs';

const sha = process.argv[2];
if (!sha) {
  console.error('Usage: node scripts/stamp-sw-version.mjs <commit-sha> [dist/sw.js path]');
  process.exit(1);
}
const path = process.argv[3] || 'dist/sw.js';

const before = readFileSync(path, 'utf8');
const after = before.replace(/const VERSION\s*=\s*'[^']*'/, `const VERSION     = 'adma-${sha}'`);
if (before === after) {
  console.error(`Could not find a VERSION constant to replace in ${path}`);
  process.exit(1);
}
writeFileSync(path, after);
console.log(`Stamped ${path} with VERSION = 'adma-${sha}'`);
