// Gallery items were historically plain URL strings; new uploads store
// { url, caption } so a caption can be attached — this reads either shape
// uniformly so nothing on an existing exhibitor's gallery breaks.
export function normalizeGalleryItem(item) {
  return typeof item === 'string' ? { url: item, caption: '' } : (item || { url: '', caption: '' });
}

export function resizeImageToBlob(file, maxDim = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const objUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = reject;
    img.src = objUrl;
  });
}

// Standard predefined dimensions/formats for branded assets (logos, ad banners, display
// images) — every upload through these presets is auto-cropped/fit to spec client-side
// so nothing inconsistent ever reaches S3, no matter what the source file looked like.
export const IMAGE_PRESETS = {
  // Square logo, transparency-preserving — used for exhibitor logos and ad slot logos.
  logo:   { width: 500,  height: 500,  mode: 'cover',   format: 'png',  quality: 1 },
  // 16:9 photo banner — ad slot full-bleed background where every slide in the carousel
  // needs to be the same shape.
  banner: { width: 1200, height: 675,  mode: 'cover',   format: 'jpeg', quality: 0.85 },
  // Tall product cutout — fit-within (no crop), transparent padding, preserves alpha.
  cutout: { width: 900,  height: 1200, mode: 'contain', format: 'png',  quality: 1 },
  // No forced canvas/crop at all — keeps whatever aspect ratio the source photo has, just
  // caps the longest side so nothing huge lands in S3. Used for classifieds-style listing
  // tiles (jobs/tenders/collaborations), where varying image shapes is the point, not a
  // defect — forcing every one into 16:9 defeated the whole "tiles of different sizes" look.
  flexible: { maxDim: 1600, format: 'jpeg', quality: 0.85 },
};

export const IMAGE_PRESET_LABELS = {
  logo:   '500×500px square · PNG (transparent background supported)',
  banner: '1200×675px (16:9) · JPG',
  cutout: 'Fits within 900×1200px · PNG (transparent background supported)',
  flexible: 'Any shape or size · JPG (capped to 1600px on the longest side)',
};

// Every preset auto-crops/resizes the OUTPUT client-side regardless of source size, so
// this only guards against an oversized source file being slow to decode on-device
// (a phone photo at full RAW-ish resolution can be 30-50MB+) — it's not a quality cap.
export const MAX_IMAGE_MB = 10;
// What the upload buttons tell people they can pick, shown alongside the preset's
// output spec (IMAGE_PRESET_LABELS) so both "what you can upload" and "what you'll get"
// are visible at once.
export const IMAGE_INPUT_HINT = `JPG, PNG, WEBP or PDF (first page) · up to ${MAX_IMAGE_MB}MB`;

// Crops a loaded <img> to an exact target size at a given zoom/pan, generalizing the
// "object-fit: cover + object-position" math the browser itself uses. `zoom` is the
// actual scale factor (source-image pixels -> output pixels); omitted, it defaults to
// the cover scale (image fills the whole frame, same fixed behavior as before this
// took a zoom parameter at all — every existing caller that doesn't pass one is
// unaffected). Passing a smaller zoom (down to the "contain" scale, where the whole
// image just fits with no cropping) is what lets a wide/narrow source — a logo that
// doesn't match the frame's aspect ratio being the motivating case — be shown in full
// with padding instead of always having its edges cropped away.
export function cropImageToBlob(imgEl, targetW, targetH, posXPercent, posYPercent, format = 'image/jpeg', quality = 0.85, zoom = null) {
  const scale = zoom ?? Math.max(targetW / imgEl.naturalWidth, targetH / imgEl.naturalHeight);
  const scaledW = imgEl.naturalWidth * scale;
  const scaledH = imgEl.naturalHeight * scale;
  // Signed — negative means the scaled image is smaller than the frame on that axis
  // (zoomed below cover scale), so it's centered with padding there instead of panned.
  const overflowX = scaledW - targetW;
  const overflowY = scaledH - targetH;
  // Where the scaled image's top-left lands in the output canvas — pan picks where
  // within the overflow the frame sits when the image is bigger than the frame;
  // centers it when the image is smaller.
  const dx = overflowX >= 0 ? -(overflowX * (posXPercent / 100)) : (targetW - scaledW) / 2;
  const dy = overflowY >= 0 ? -(overflowY * (posYPercent / 100)) : (targetH - scaledH) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (format !== 'image/png') {
    // JPEG can't encode transparency — fill white first so any padding (from a
    // below-cover zoom) doesn't render as black instead of blank.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
  }
  ctx.drawImage(imgEl, 0, 0, imgEl.naturalWidth, imgEl.naturalHeight, dx, dy, scaledW, scaledH);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))), format, quality);
  });
}

// Renders a PDF's first page to a PNG Blob, entirely in the browser — pdf.js is
// browser-native here (real <canvas>, no Node/native-binding involvement at all),
// so this doesn't carry any of the fragility the server-side conversion scripts
// (scripts/convert-adma.mjs) need Node canvas polyfills to work around. Lets
// standardizeImage's normal crop/resize pipeline treat a PDF logo exactly like any
// other image file — a design-tool-exported PDF is the only asset many exhibitors
// actually have for their logo, and previously they had to convert it themselves
// with an external tool before this form would even accept it.
export async function renderPdfFirstPageToBlob(file, scale = 3) {
  const pdfjsLib = await import('pdfjs-dist/build/pdf');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.js?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  // scale=3 renders at ~3x the PDF's own point size — comfortably higher
  // resolution than any of the crop presets' target dimensions (max 1200px),
  // so the subsequent crop/resize is working from a sharp source, not upscaling.
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  // Most logo PDFs have a transparent or undefined background — fill white first
  // so a design with dark linework on "nothing" doesn't turn invisible against
  // the app's own dark-mode backgrounds later.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))), 'image/png', 1);
  });
}

export function standardizeImage(file, presetKey = 'banner') {
  const preset = IMAGE_PRESETS[presetKey] || IMAGE_PRESETS.banner;
  if (preset.maxDim) return resizeImageToBlob(file, preset.maxDim, preset.quality);
  return new Promise((resolve, reject) => {
    const objUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const canvas = document.createElement('canvas');
      canvas.width = preset.width;
      canvas.height = preset.height;
      const ctx = canvas.getContext('2d');
      const scale = preset.mode === 'cover'
        ? Math.max(preset.width / img.width, preset.height / img.height)
        : Math.min(preset.width / img.width, preset.height / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const dx = (preset.width - drawW) / 2;
      const dy = (preset.height - drawH) / 2;
      ctx.drawImage(img, dx, dy, drawW, drawH);
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        `image/${preset.format}`,
        preset.quality,
      );
    };
    img.onerror = reject;
    img.src = objUrl;
  });
}
