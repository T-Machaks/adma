import { useState } from 'react';
import { ImagePlus, X, Link2 } from 'lucide-react';
import { apiFetch } from '@/api/client';
import { standardizeImage, IMAGE_PRESETS, IMAGE_PRESET_LABELS } from '@/lib/imageUtils';

// Aspect ratio (as a CSS class) matching each preset's target dimensions, so the preview
// reflects roughly how the auto-cropped image will actually look, not a generic square.
const PREVIEW_ASPECT = {
  logo: 'aspect-square max-w-[140px]',
  banner: 'aspect-video max-w-[280px]',
  cutout: 'aspect-[3/4] max-w-[180px]',
};

// Checkered backdrop (instead of solid white) so PNG transparency is actually visible in
// the preview rather than hidden behind a forced background color.
const TRANSPARENCY_BG = {
  backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
};

// Reusable image input: upload a file (auto-cropped/fit to the given preset's standard
// dimensions and format, then presigned-PUT to S3 via /api/upload/marketing-image-url)
// or paste a public URL directly. `ownerId` namespaces the S3 key (e.g. exhibitor id, ad
// slot id); `purpose` is a short tag ('adslot'|'job'|'tender'|'collab') used only for key
// organisation. `preset` picks the standard spec from IMAGE_PRESETS ('logo'|'banner'|'cutout').
export default function ImageUploadOrUrlField({ value, onChange, ownerId, purpose = 'misc', label, preset = 'banner' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [previewBroken, setPreviewBroken] = useState(false);

  const presetSpec = IMAGE_PRESETS[preset] || IMAGE_PRESETS.banner;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setPreviewBroken(false);
    try {
      const blob = await standardizeImage(file, preset);
      const { uploadUrl, publicUrl } = await apiFetch('/api/upload/marketing-image-url', {
        method: 'POST',
        body: { ownerId: ownerId || 'new', purpose, format: presetSpec.format },
      });
      const s3Res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': `image/${presetSpec.format}` }, body: blob });
      if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);
      onChange(publicUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      {label && <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">{label}</label>}
      {value ? (
        <div className="space-y-2">
          <div
            className={`relative w-full rounded-lg overflow-hidden border border-border ${PREVIEW_ASPECT[preset] || PREVIEW_ASPECT.banner}`}
            style={TRANSPARENCY_BG}
          >
            {!previewBroken ? (
              <img
                key={value}
                src={value}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
                onError={() => setPreviewBroken(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-500 font-medium bg-red-50 dark:bg-red-950/20 px-2 text-center">
                Couldn't load this image
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className={`flex items-center gap-1.5 cursor-pointer text-xs bg-muted border border-border px-2.5 py-1.5 rounded-lg font-medium hover:bg-muted/80 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              <ImagePlus className="w-3.5 h-3.5" />
              {uploading ? 'Uploading…' : 'Replace'}
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
            <button
              type="button"
              onClick={() => { onChange(''); setPreviewBroken(false); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <label className={`flex items-center gap-1.5 cursor-pointer text-xs bg-muted border border-border px-2.5 py-1.5 rounded-lg font-medium hover:bg-muted/80 transition-colors flex-shrink-0 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            <ImagePlus className="w-3.5 h-3.5" />
            {uploading ? 'Uploading…' : 'Upload'}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
          <div className="relative flex-1">
            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="url"
              placeholder="or paste an image URL…"
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-amber"
            />
          </div>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-1">
        Standard: {IMAGE_PRESET_LABELS[preset] || IMAGE_PRESET_LABELS.banner}. Uploaded files are auto-cropped to fit — pasted URLs are used as-is.
      </p>
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}
