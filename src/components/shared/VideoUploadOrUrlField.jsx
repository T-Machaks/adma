import { useState } from 'react';
import { UploadCloud, X, Link2 } from 'lucide-react';
import { apiFetch } from '@/api/client';
import { isEmbedVideoUrl, toEmbedUrl } from '@/lib/videoUtils';
import { uploadFileToS3 } from '@/lib/uploadFile';
import { Progress } from '@/components/ui/progress';

// Final size this'll be compressed down to (server/lambda/video-compress.js — an
// S3-triggered Lambda, deployed separately from the app server — must be kept in
// sync with this number). This used to be a hard client-side upload cap; large
// S3-hosted uploads were the main driver of slow video load times reported in the
// exhibitor portal and magazine, so the video that actually ends up live still
// needs to land under this, but the exhibitor no longer has to pre-shrink the file
// themselves to get there.
const TARGET_VIDEO_MB = 20;
// What we'll actually accept as a raw upload before compression — bounded by the
// compression Lambda's own resources (2048MB /tmp, 300s timeout), not an arbitrary
// number. Large phone-camera clips routinely exceed TARGET_VIDEO_MB; this is the
// actual ceiling exhibitors hit now.
const MAX_RAW_UPLOAD_MB = 200;
// How long to wait for the background compression before giving up and surfacing
// an error rather than polling forever.
const COMPRESS_POLL_INTERVAL_MS = 2500;
const COMPRESS_POLL_MAX_ATTEMPTS = 48; // ~2 minutes at the interval above

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Reusable video input: upload an MP4 file directly (presigned-PUT to S3 via
// /api/upload/video-ad-url) or paste a YouTube/Vimeo link. `ownerId` namespaces the S3
// key (e.g. ad slot id); `purpose` is a short tag used only for key organisation.
export default function VideoUploadOrUrlField({ value, onChange, ownerId, purpose = 'misc', label, helperText }) {
  // null = idle; 0-100 = upload in progress (tracked via XHR so we get a real percentage).
  const [uploadProgress, setUploadProgress] = useState(null);
  // Set once the raw upload finishes and we're waiting on the background
  // compression Lambda to tag the object `processed: true` before we ever hand
  // the URL to onChange — nothing should show/save a still-huge, not-yet-compressed
  // video as if it were the final asset.
  const [compressing, setCompressing] = useState(false);
  const uploading = uploadProgress !== null || compressing;
  const [error, setError] = useState(null);
  const [previewBroken, setPreviewBroken] = useState(false);
  // `value` truthiness switches this component from "editing" to "preview" mode — without
  // this flag, typing even one character would flip to preview mode immediately, unmounting
  // the url input mid-keystroke and silently dropping the rest of what's typed. Keeping the
  // input mounted while it's focused, regardless of value, is what lets typing work at all.
  const [urlFocused, setUrlFocused] = useState(false);

  const waitForCompression = async (publicUrl) => {
    for (let attempt = 0; attempt < COMPRESS_POLL_MAX_ATTEMPTS; attempt++) {
      const { processed } = await apiFetch(`/api/upload/video-status?publicUrl=${encodeURIComponent(publicUrl)}`);
      if (processed) return;
      await sleep(COMPRESS_POLL_INTERVAL_MS);
    }
    throw new Error('Still compressing after 2 minutes — it should catch up shortly; try reopening this page in a bit.');
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.type !== 'video/mp4') {
      setError('Please select an MP4 video file.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_RAW_UPLOAD_MB * 1024 * 1024) {
      setError(`Video must be ${MAX_RAW_UPLOAD_MB}MB or smaller.`);
      e.target.value = '';
      return;
    }
    setUploadProgress(0);
    setPreviewBroken(false);
    try {
      const { uploadUrl, publicUrl } = await apiFetch('/api/upload/video-ad-url', {
        method: 'POST',
        body: { ownerId: ownerId || 'new', purpose },
      });
      await uploadFileToS3(uploadUrl, file, { contentType: 'video/mp4', onProgress: setUploadProgress });
      setUploadProgress(null);
      // Only files already over TARGET_VIDEO_MB actually need the background
      // compression pass — skip the wait for anything already small enough
      // (the Lambda still tags it processed=true on its own turn, but there's
      // no reason to make the exhibitor wait on that round-trip here).
      if (file.size > TARGET_VIDEO_MB * 1024 * 1024) {
        setCompressing(true);
        await waitForCompression(publicUrl);
      }
      onChange(publicUrl);
      // Deliberately does NOT delete the previous video here (removed 2026-08-31 —
      // see git history for the old "oldVideoUrl" cleanup call). `value` at this point
      // is only a local draft — the caller's onChange may not persist it anywhere
      // (Cancel, a failed save, or a second upload before the first was ever saved),
      // so it can't be assumed to be safely replaceable. Deleting eagerly here caused
      // a real production incident: an exhibitor's live, still-DB-referenced video was
      // deleted out from under them by a second upload attempt that itself was never
      // saved, leaving the booth page pointing at a 404 while a good replacement sat
      // orphaned in S3 (see RISK_REGISTER.md). The tradeoff is an orphaned S3 object
      // per replacement instead — a harmless storage cost, not data loss — until a
      // proper "delete only after a confirmed save" cleanup is built per call site.
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadProgress(null);
      setCompressing(false);
      e.target.value = '';
    }
  };

  const statusLabel = compressing ? 'Compressing…' : uploadProgress !== null ? `Uploading… ${uploadProgress}%` : null;

  return (
    <div>
      {label && <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">{label}</label>}
      {value && !urlFocused ? (
        <div className="space-y-2">
          <div className="relative w-full max-w-[320px] aspect-video rounded-lg overflow-hidden border border-border bg-black">
            {previewBroken ? (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-400 font-medium bg-red-950/30 px-2 text-center">
                Couldn't load this video
              </div>
            ) : isEmbedVideoUrl(value) ? (
              <iframe key={value} src={toEmbedUrl(value)} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media" title="Video ad preview" />
            ) : (
              <video key={value} src={value} controls muted playsInline preload="none" className="absolute inset-0 w-full h-full object-contain" onError={() => setPreviewBroken(true)} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className={`flex items-center gap-1.5 cursor-pointer text-xs bg-muted border border-border px-2.5 py-1.5 rounded-lg font-medium hover:bg-muted/80 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              <UploadCloud className="w-3.5 h-3.5" />
              {statusLabel ?? 'Replace'}
              <input type="file" accept="video/mp4" className="hidden" onChange={handleFile} disabled={uploading} />
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
            <UploadCloud className="w-3.5 h-3.5" />
            {statusLabel ?? 'Upload MP4'}
            <input type="file" accept="video/mp4" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
          <div className="relative flex-1">
            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="url"
              placeholder="or paste a YouTube/Vimeo link…"
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              onFocus={() => setUrlFocused(true)}
              // Normalise to embed form once they're done — not load-bearing for
              // correctness (the preview and public renderer both normalise again at
              // display time), just tidies up what actually gets saved.
              onBlur={e => { setUrlFocused(false); if (e.target.value.trim()) onChange(toEmbedUrl(e.target.value.trim())); }}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-amber"
            />
          </div>
        </div>
      )}
      {uploadProgress !== null && <Progress value={uploadProgress} className="h-1 mt-2" />}
      {compressing && <Progress value={undefined} className="h-1 mt-2 animate-pulse" />}
      <p className="text-[10px] text-muted-foreground mt-1">
        {helperText ?? `MP4 file (up to ${MAX_RAW_UPLOAD_MB}MB — larger files are compressed down to ~${TARGET_VIDEO_MB}MB automatically) or a YouTube/Vimeo link — plays automatically, muted, in the video ad rotation.`}
      </p>
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}
