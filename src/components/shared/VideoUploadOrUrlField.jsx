import { useState } from 'react';
import { UploadCloud, X, Link2 } from 'lucide-react';
import { apiFetch } from '@/api/client';
import { isEmbedVideoUrl, toEmbedUrl } from '@/lib/videoUtils';

const MAX_VIDEO_MB = 50;

// Reusable video input: upload an MP4 file directly (presigned-PUT to S3 via
// /api/upload/video-ad-url) or paste a YouTube/Vimeo link. `ownerId` namespaces the S3
// key (e.g. ad slot id); `purpose` is a short tag used only for key organisation.
export default function VideoUploadOrUrlField({ value, onChange, ownerId, purpose = 'misc', label }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [previewBroken, setPreviewBroken] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.type !== 'video/mp4') {
      setError('Please select an MP4 video file.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Video must be ${MAX_VIDEO_MB}MB or smaller.`);
      e.target.value = '';
      return;
    }
    setUploading(true);
    setPreviewBroken(false);
    try {
      const { uploadUrl, publicUrl } = await apiFetch('/api/upload/video-ad-url', {
        method: 'POST',
        body: { ownerId: ownerId || 'new', purpose },
      });
      const s3Res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: file });
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
          <div className="relative w-full max-w-[320px] aspect-video rounded-lg overflow-hidden border border-border bg-black">
            {previewBroken ? (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-400 font-medium bg-red-950/30 px-2 text-center">
                Couldn't load this video
              </div>
            ) : isEmbedVideoUrl(value) ? (
              <iframe key={value} src={value} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media" title="Video ad preview" />
            ) : (
              <video key={value} src={value} controls muted playsInline className="absolute inset-0 w-full h-full object-contain" onError={() => setPreviewBroken(true)} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className={`flex items-center gap-1.5 cursor-pointer text-xs bg-muted border border-border px-2.5 py-1.5 rounded-lg font-medium hover:bg-muted/80 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              <UploadCloud className="w-3.5 h-3.5" />
              {uploading ? 'Uploading…' : 'Replace'}
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
            {uploading ? 'Uploading…' : 'Upload MP4'}
            <input type="file" accept="video/mp4" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
          <div className="relative flex-1">
            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="url"
              placeholder="or paste a YouTube/Vimeo link…"
              value={value || ''}
              onChange={e => onChange(toEmbedUrl(e.target.value))}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-amber"
            />
          </div>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-1">
        MP4 file (max {MAX_VIDEO_MB}MB) or a YouTube/Vimeo link — plays automatically, muted, in the video ad rotation.
      </p>
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}
