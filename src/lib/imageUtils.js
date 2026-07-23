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
  // 16:9 photo banner — ad slot full-bleed background, job/tender/collab display images.
  banner: { width: 1200, height: 675,  mode: 'cover',   format: 'jpeg', quality: 0.85 },
  // Tall product cutout — fit-within (no crop), transparent padding, preserves alpha.
  cutout: { width: 900,  height: 1200, mode: 'contain', format: 'png',  quality: 1 },
};

export const IMAGE_PRESET_LABELS = {
  logo:   '500×500px square · PNG (transparent background supported)',
  banner: '1200×675px (16:9) · JPG',
  cutout: 'Fits within 900×1200px · PNG (transparent background supported)',
};

export function standardizeImage(file, presetKey = 'banner') {
  const preset = IMAGE_PRESETS[presetKey] || IMAGE_PRESETS.banner;
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
