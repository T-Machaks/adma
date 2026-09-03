// Generates the 1200x630 Open Graph / Twitter Card image shown when an exhibitor's
// page is shared (WhatsApp, Facebook, LinkedIn, iMessage, X) — replaces what used to
// be a bare 500x500 square logo (or the site's own generic logo when the exhibitor
// had none at all). Every card follows the same layout regardless: a small ADMA brand
// badge, the exhibitor's own logo when they have one (the site's mark otherwise, so a
// no-logo exhibitor still gets a real card instead of empty space), their name as the
// headline, and a consistent tagline/CTA — matching the same design system as the
// site-wide default image (public/marketing-images source, steel background + amber
// glow), see index.html's own og:image for that one.
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, '../assets');

// Registered once per server process (ESM module caching — this file only ever
// evaluates once) rather than per request. Bundled locally rather than fetched from
// Google Fonts at request time: this runs in the live request path, and a visitor's
// share preview must never depend on an external font host being reachable.
GlobalFonts.registerFromPath(path.join(ASSETS, 'fonts/Inter-ExtraBold.ttf'), 'InterExtraBold');
GlobalFonts.registerFromPath(path.join(ASSETS, 'fonts/Inter-SemiBold.ttf'), 'InterSemiBold');

const W = 1200, H = 630;
const MARGIN = 90;
const admaLogoPath = path.join(__dirname, '../../public/adma-logo-transparent.png');

function roundedRect(ctx, x, y, size, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + size, y, x + size, y + size, r);
  ctx.arcTo(x + size, y + size, x, y + size, r);
  ctx.arcTo(x, y + size, x, y, r);
  ctx.arcTo(x, y, x + size, y, r);
  ctx.closePath();
}

// `exhibitor` needs at least `name`; `logo_url` is optional. Returns a PNG Buffer.
// Never throws for a bad/unreachable exhibitor logo — falls back to the ADMA mark
// instead, since a share preview failing outright is worse than a slightly generic one.
export async function generateExhibitorOgCard(exhibitor) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1b3729';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.8, H * 0.15, 0, W * 0.8, H * 0.15, 700);
  glow.addColorStop(0, 'rgba(234, 179, 8, 0.28)');
  glow.addColorStop(1, 'rgba(234, 179, 8, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const admaLogo = await loadImage(admaLogoPath);

  // Small brand badge, top-left — present on every card regardless of whose logo
  // is featured on the right.
  const badgeH = 44;
  const badgeW = badgeH * (admaLogo.width / admaLogo.height);
  ctx.drawImage(admaLogo, MARGIN, 60, badgeW, badgeH);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '600 20px InterSemiBold';
  ctx.textBaseline = 'middle';
  ctx.fillText('admadigital.co.zw', MARGIN + badgeW + 16, 60 + badgeH / 2 + 1);

  // Main visual, right side, on a white rounded card so a transparent-background PNG
  // of any colour reads clearly against the dark background.
  let logoImg = admaLogo;
  if (exhibitor.logo_url) {
    try {
      logoImg = await loadImage(exhibitor.logo_url);
    } catch {
      // exhibitor's own logo is missing/unreachable — fall back to the ADMA mark
      // rather than fail the whole card.
      logoImg = admaLogo;
    }
  }
  const boxSize = 200;
  const boxX = W - MARGIN - boxSize, boxY = (H - boxSize) / 2 - 20;
  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, boxX, boxY, boxSize, 20);
  ctx.fill();
  const pad = 28;
  const innerSize = boxSize - pad * 2;
  const scale = Math.min(innerSize / logoImg.width, innerSize / logoImg.height);
  const lw = logoImg.width * scale, lh = logoImg.height * scale;
  ctx.drawImage(logoImg, boxX + (boxSize - lw) / 2, boxY + (boxSize - lh) / 2, lw, lh);

  // Headline — exhibitor name, truncated with an ellipsis if it would run into the
  // logo card (the right-side card is always present now, so the same width budget
  // applies whether the logo shown is the exhibitor's own or the ADMA fallback).
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 58px InterExtraBold';
  const maxTextWidth = 780;
  let name = exhibitor.name || 'ADMA Exhibitor';
  while (ctx.measureText(name).width > maxTextWidth && name.length > 3) {
    name = name.slice(0, -1);
  }
  if (name !== (exhibitor.name || 'ADMA Exhibitor')) name = name.trimEnd() + '…';
  ctx.fillText(name, MARGIN, 340);

  // Tagline — names the actual product (ADMA Digital's virtual exhibition), not the
  // physical show, since this card is for the online platform specifically.
  ctx.fillStyle = '#eab308';
  ctx.font = '600 30px InterSemiBold';
  ctx.fillText('ADMA Digital Virtual Exhibitor', MARGIN, 390);

  // CTA
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '600 26px InterSemiBold';
  ctx.fillText('View Virtual Booth  ·  Book a Meeting', MARGIN, 450);

  return canvas.encode('png');
}
