import { useState } from 'react';
import { ImagePlus, X, Link2 } from 'lucide-react';
import { apiFetch } from '@/api/client';
import { standardizeImage, renderPdfFirstPageToBlob, IMAGE_PRESETS, IMAGE_PRESET_LABELS, MAX_IMAGE_MB, IMAGE_INPUT_HINT } from '@/lib/imageUtils';
import { uploadFileToS3 } from '@/lib/uploadFile';
import { Progress } from '@/components/ui/progress';
import ImageCropModal from './ImageCropModal';

// Aspect ratio (as a CSS class) matching each preset's target dimensions, so the preview
// reflects roughly how the auto-cropped image will actually look, not a generic square.
const PREVIEW_ASPECT = {
  logo: 'aspect-square max-w-[140px]',
  banner: 'aspect-video max-w-[280px]',
  cutout: 'aspect-[3/4] max-w-[180px]',
  // Not a real aspect ratio claim — flexible images keep whatever shape they came in,
  // this box is just a reasonable preview frame (object-contain, so nothing gets cropped).
  flexible: 'aspect-[4/3] max-w-[240px]',
};

// Plain aspect-ratio classes (no size cap, unlike PREVIEW_ASPECT above which is
// sized for the small thumbnail) for the interactive crop modal, which wants a
// properly usable-sized crop area — ImageCropModal's own max-w-md container
// already bounds it.
const CROP_ASPECT = {
  logo: 'aspect-square',
  banner: 'aspect-video',
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
  // null = idle; 0-100 = upload in progress (tracked via XHR so we get a real percentage).
  const [uploadProgress, setUploadProgress] = useState(null);
  // Set the instant a PDF is picked (before the pdf.js dynamic-import fetch even
  // starts) through until conversion finishes — dynamic imports have no built-in
  // browser progress UI, so on a slow connection this used to look like nothing
  // was happening at all for however long that fetch took.
  const [converting, setConverting] = useState(false);
  // Holds the source (post-PDF-conversion, if applicable) awaiting an interactive
  // crop choice — only used for 'cover' presets (logo, banner), where cropping
  // actually discards part of the image, so there's something worth letting the
  // person choose. 'cutout'/'flexible' presets never crop, so they skip straight
  // to standardizeImage same as before.
  const [cropTarget, setCropTarget] = useState(null);
  const uploading = uploadProgress !== null || converting || !!cropTarget;
  const [error, setError] = useState(null);
  const [previewBroken, setPreviewBroken] = useState(false);

  const presetSpec = IMAGE_PRESETS[preset] || IMAGE_PRESETS.banner;
  const isCoverPreset = presetSpec.mode === 'cover';

  const uploadBlob = async (blob) => {
    setUploadProgress(0);
    try {
      const { uploadUrl, publicUrl } = await apiFetch('/api/upload/marketing-image-url', {
        method: 'POST',
        body: { ownerId: ownerId || 'new', purpose, format: presetSpec.format },
      });
      await uploadFileToS3(uploadUrl, blob, { contentType: `image/${presetSpec.format}`, onProgress: setUploadProgress });
      onChange(publicUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Image must be ${MAX_IMAGE_MB}MB or smaller.`);
      e.target.value = '';
      return;
    }
    setPreviewBroken(false);
    try {
      // A design-tool-exported PDF is the only logo asset a lot of exhibitors
      // actually have — render its first page to an image first, then run it
      // through the exact same crop/resize pipeline as any other upload.
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      let source = file;
      if (isPdf) {
        setConverting(true);
        source = await renderPdfFirstPageToBlob(file);
        setConverting(false);
      }
      if (isCoverPreset) {
        // Hands off to ImageCropModal below — the actual upload continues from
        // handleCropConfirm once they've chosen a position, not here.
        setCropTarget(source);
      } else {
        const blob = await standardizeImage(source, preset);
        await uploadBlob(blob);
      }
    } catch (err) {
      setError(err.message);
      setConverting(false);
    } finally {
      e.target.value = '';
    }
  };

  const handleCropConfirm = async (blob) => {
    setCropTarget(null);
    await uploadBlob(blob);
  };

  const statusLabel = converting ? 'Converting…' : uploadProgress !== null ? `Uploading… ${uploadProgress}%` : null;

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
              {statusLabel ?? 'Replace'}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} disabled={uploading} />
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
            {statusLabel ?? 'Upload'}
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} disabled={uploading} />
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
      {uploadProgress !== null && <Progress value={uploadProgress} className="h-1 mt-2" />}
      {converting && <Progress value={undefined} className="h-1 mt-2 animate-pulse" />}
      <p className="text-[10px] text-muted-foreground mt-1">
        Upload: {IMAGE_INPUT_HINT}. Standard: {IMAGE_PRESET_LABELS[preset] || IMAGE_PRESET_LABELS.banner}. {preset === 'flexible'
          ? 'Uploaded files keep their original shape, just resized down if oversized — pasted URLs are used as-is.'
          : isCoverPreset
            ? "You'll be asked to position the crop after picking a file — pasted URLs are used as-is."
            : 'Uploaded files are auto-fit — pasted URLs are used as-is.'}
      </p>
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
      {cropTarget && (
        <ImageCropModal
          file={cropTarget}
          targetWidth={presetSpec.width}
          targetHeight={presetSpec.height}
          aspectClassName={CROP_ASPECT[preset] || 'aspect-video'}
          format={`image/${presetSpec.format}`}
          quality={presetSpec.quality}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropTarget(null)}
        />
      )}
    </div>
  );
}
