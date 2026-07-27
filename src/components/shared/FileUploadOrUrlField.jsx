import { useState } from 'react';
import { UploadCloud, X, Link2, FileText } from 'lucide-react';
import { apiFetch } from '@/api/client';

const MAX_FILE_MB = 25;

// Generic raw-file upload: no client-side cropping/processing (unlike
// ImageUploadOrUrlField's fixed-crop presets), so it's safe for content where exact
// pixels/bytes matter — a precise floor plan image, a spreadsheet, a PDF. Uploads
// straight to S3 via a presigned PUT from the given `uploadEndpoint`, or accepts a
// pasted URL instead. `previewKind` picks the preview style: 'image' shows a thumbnail,
// 'document' shows a filename/link chip.
export default function FileUploadOrUrlField({ value, onChange, uploadEndpoint, accept, previewKind = 'document', label, helperText }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File must be ${MAX_FILE_MB}MB or smaller.`);
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await apiFetch(uploadEndpoint, {
        method: 'POST',
        body: { oldFileUrl: value || '', contentType: file.type, fileName: file.name },
      });
      const s3Res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);
      onChange(publicUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const fileName = value ? decodeURIComponent(value.split('/').pop() || value) : '';

  return (
    <div>
      {label && <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">{label}</label>}
      {value ? (
        <div className="space-y-2">
          {previewKind === 'image' ? (
            <div className="relative w-full max-w-[320px] aspect-video rounded-lg overflow-hidden border border-border bg-muted">
              <img src={value} alt="" className="absolute inset-0 w-full h-full object-contain" />
            </div>
          ) : (
            <a href={value} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs bg-muted border border-border rounded-lg px-3 py-2 hover:bg-muted/80 transition-colors w-fit max-w-full">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{fileName}</span>
            </a>
          )}
          <div className="flex items-center gap-2">
            <label className={`flex items-center gap-1.5 cursor-pointer text-xs bg-muted border border-border px-2.5 py-1.5 rounded-lg font-medium hover:bg-muted/80 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              <UploadCloud className="w-3.5 h-3.5" />
              {uploading ? 'Uploading…' : 'Replace'}
              <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
            <button
              type="button"
              onClick={() => onChange('')}
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
            {uploading ? 'Uploading…' : 'Upload'}
            <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
          <div className="relative flex-1">
            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="url"
              placeholder="or paste a file URL…"
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-amber"
            />
          </div>
        </div>
      )}
      {helperText && <p className="text-[10px] text-muted-foreground mt-1">{helperText}</p>}
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}
