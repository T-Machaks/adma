import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { UploadCloud, FileIcon, CheckCircle2, XCircle, Loader2, AlertTriangle, Clock } from 'lucide-react';
import EventLogo from '@/components/layout/EventLogo.jsx';

// The exhibitor-facing half of ADMA's own expiring-link file drop (see
// server/routes/file-shares.js) — no login, reached only via a link an organizer
// generated for them from Admin & Security → Exhibitor Portal Logins → Files. Talks to
// the public/* endpoints directly rather than through the FileShare entity/apiFetch,
// since this page must work with no session cookie at all and must tell an expired
// link apart from a generic error.
export default function FileShareUpload() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading' }); // loading | ready | expired | not_found | error
  const [files, setFiles] = useState([]); // uploaded/uploading, from the server plus in-progress ones
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/file-shares/public/${token}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 404) return setState({ status: 'not_found' });
        if (res.status === 410) return setState({ status: 'expired', message: data.error });
        if (!res.ok) return setState({ status: 'error', message: data.error || 'Something went wrong.' });
        setState({ status: 'ready', share: data });
        setFiles((data.files || []).map(f => ({ ...f, done: true })));
      } catch {
        if (!cancelled) setState({ status: 'error', message: 'Could not reach the server. Check your connection and try again.' });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const uploadOne = useCallback(async (file) => {
    const localId = `local-${Date.now()}-${Math.random()}`;
    setFiles(prev => [...prev, { id: localId, filename: file.name, size: file.size, uploading: true }]);

    try {
      const urlRes = await fetch(`/api/file-shares/public/${token}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content_type: file.type, size: file.size }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error || 'Could not start the upload.');

      const putRes = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!putRes.ok) throw new Error('Upload failed. Please try again.');

      const regRes = await fetch(`/api/file-shares/public/${token}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: urlData.fileId, filename: file.name, size: file.size,
          content_type: file.type, publicUrl: urlData.publicUrl,
        }),
      });
      if (!regRes.ok) throw new Error('Upload finished but could not be saved. Please try again.');

      setFiles(prev => prev.map(f => f.id === localId ? { ...f, uploading: false, done: true } : f));
    } catch (e) {
      setFiles(prev => prev.map(f => f.id === localId ? { ...f, uploading: false, error: e.message } : f));
    }
  }, [token]);

  const handleFiles = (fileList) => {
    Array.from(fileList).forEach(uploadOne);
  };

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.status === 'not_found' || state.status === 'expired' || state.status === 'error') {
    const copy = {
      not_found: { title: 'Link Not Found', body: "This upload link doesn't exist. Double-check the link you were sent, or ask for a new one." },
      expired: { title: 'Link Expired', body: state.message || 'This upload link is no longer active. Ask ADMA Digital for a new one.' },
      error: { title: 'Something Went Wrong', body: state.message || 'Please try again in a moment.' },
    }[state.status];
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-sm p-6 text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <p className="font-heading text-sm font-bold uppercase tracking-wide">{copy.title}</p>
          <p className="text-xs text-muted-foreground mt-2">{copy.body}</p>
        </div>
      </div>
    );
  }

  const { share } = state;
  const daysLeft = Math.max(0, Math.ceil((new Date(share.expires_at) - new Date()) / (24 * 60 * 60 * 1000)));

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-steel px-6 py-5 text-center">
          <div className="inline-block"><EventLogo /></div>
          <p className="text-white font-heading text-sm font-bold uppercase tracking-wide mt-3">Upload Files</p>
          <p className="text-slate-300 text-xs mt-1">for {share.exhibitor_name}</p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mb-4">
            <Clock className="w-3 h-3 flex-shrink-0" />
            Link active for {daysLeft} more day{daysLeft === 1 ? '' : 's'}
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl px-4 py-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-amber bg-amber/5' : 'border-border hover:border-amber/50'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Drop files here, or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Logo, booth photos, brochures — any file type, up to 500MB each</p>
            <input ref={inputRef} type="file" multiple className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
          </div>

          {files.length > 0 && (
            <div className="mt-4 divide-y divide-border border-t border-border">
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-2 py-2 text-sm">
                  <FileIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1">{f.filename}</span>
                  {f.uploading && <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-amber" />}
                  {f.done && <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />}
                  {f.error && <XCircle className="w-4 h-4 flex-shrink-0 text-red-500" title={f.error} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
