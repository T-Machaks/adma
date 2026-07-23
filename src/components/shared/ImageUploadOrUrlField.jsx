import { useState } from 'react';
import { ImagePlus, X, Link2 } from 'lucide-react';
import { apiFetch } from '@/api/client';
import { resizeImageToBlob } from '@/lib/imageUtils';

// Reusable image input: upload a file (resized + presigned-PUT to S3 via the
// generic /api/upload/marketing-image-url route) or paste a public URL directly.
// `ownerId` namespaces the S3 key (e.g. exhibitor id, ad slot id); `purpose` is
// a short tag ('adslot'|'job'|'tender'|'collab') used only for key organisation.
export default function ImageUploadOrUrlField({ value, onChange, ownerId, purpose = 'misc', label }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await resizeImageToBlob(file);
      const { uploadUrl, publicUrl } = await apiFetch('/api/upload/marketing-image-url', {
        method: 'POST',
        body: { ownerId: ownerId || 'new', purpose },
      });
      const s3Res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
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
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-white border border-border rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
            <img src={value} alt="" className="w-full h-full object-contain" />
          </div>
          <label className={`flex items-center gap-1.5 cursor-pointer text-xs bg-muted border border-border px-2.5 py-1.5 rounded-lg font-medium hover:bg-muted/80 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            <ImagePlus className="w-3.5 h-3.5" />
            {uploading ? 'Uploading…' : 'Replace'}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
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
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}
