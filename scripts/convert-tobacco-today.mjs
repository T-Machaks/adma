// One-time script: converts tobacco-today-2026-q2.pdf → public/magazines/tobacco-today-pages/page-001.jpg …
// Run with: node scripts/convert-tobacco-today.mjs

import { createCanvas, DOMMatrix, DOMPoint, DOMRect } from '@napi-rs/canvas';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';

globalThis.DOMMatrix = DOMMatrix;
globalThis.DOMPoint  = DOMPoint;
globalThis.DOMRect   = DOMRect;

globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') return createCanvas(0, 0);
    throw new Error(`document.createElement('${tag}') not supported in conversion script`);
  },
  createElementNS(_ns, tag) { return globalThis.document.createElement(tag); },
};

{
  const probe = createCanvas(1, 1).getContext('2d');
  const proto = Object.getPrototypeOf(probe);
  const native = proto.getImageData;
  proto.getImageData = function patchedGetImageData(x, y, w, h) {
    const sx = Math.round(x);  const sy = Math.round(y);
    const sw = Math.round(w);  const sh = Math.round(h);
    if (sw <= 0 || sh <= 0 || sx >= this.canvas.width || sy >= this.canvas.height) {
      return { data: new Uint8ClampedArray(4), width: 1, height: 1 };
    }
    try {
      return native.call(this, sx, sy, sw, sh);
    } catch {
      return { data: new Uint8ClampedArray(sw * sh * 4), width: sw, height: sh };
    }
  };
}

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PDF_PATH  = resolve(ROOT, 'public/magazines/tobacco-today-2026-q2.pdf');
const OUT_DIR   = resolve(ROOT, 'public/magazines/tobacco-today-pages');
const SCALE     = 2.5;
const QUALITY   = 93;

if (!existsSync(PDF_PATH)) {
  console.error('PDF not found at', PDF_PATH);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
pdfjsLib.GlobalWorkerOptions.workerSrc = false;

const NodeCanvasFactory = {
  create(w, h) {
    const canvas = createCanvas(w, h);
    return { canvas, context: canvas.getContext('2d') };
  },
  reset({ canvas }, w, h) {
    canvas.width  = w;
    canvas.height = h;
  },
  destroy(_cc) {},
};

const data = new Uint8Array(readFileSync(PDF_PATH));
const loadTask = pdfjsLib.getDocument({
  data,
  canvasFactory: NodeCanvasFactory,
  verbosity: 0,
});
const pdf = await loadTask.promise;
const total = pdf.numPages;
console.log(`Loaded PDF: ${total} pages — rendering at ${SCALE}× scale …\n`);

const start = Date.now();

for (let i = 1; i <= total; i++) {
  const page     = await pdf.getPage(i);
  const viewport = page.getViewport({ scale: SCALE });
  const cc       = NodeCanvasFactory.create(
    Math.round(viewport.width),
    Math.round(viewport.height),
  );

  await page.render({
    canvasContext: cc.context,
    viewport,
    canvasFactory: NodeCanvasFactory,
  }).promise;

  const filename = `page-${String(i).padStart(3, '0')}.jpg`;
  const buf = cc.canvas.toBuffer('image/jpeg', { quality: QUALITY });
  writeFileSync(`${OUT_DIR}/${filename}`, buf);

  const pct  = Math.round((i / total) * 100);
  const bar  = '█'.repeat(Math.floor(pct / 5)).padEnd(20, '░');
  process.stdout.write(`\r  [${bar}] ${pct}%  page ${i}/${total}  (${filename})`);
}

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\n\nDone! ${total} pages written to public/magazines/tobacco-today-pages/  (${elapsed}s)`);
