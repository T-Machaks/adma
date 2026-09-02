import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileShare, Exhibitor } from '@/api/entities';
import { Link2, Copy, Check, Trash2, Ban, FileIcon, Loader2, Plus, Image as ImageIcon, Building2, Images, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeGalleryItem } from '@/lib/imageUtils';
import { getPackageLimits } from '@/lib/standTiers';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function shareStatus(share) {
  if (share.revoked) return { label: 'Revoked', tone: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
  if (new Date(share.expires_at) < new Date()) return { label: 'Expired', tone: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
  return { label: 'Active', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', text);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy link"
      className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-amber hover:bg-amber/10 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// One-click "apply to profile" row for a single uploaded file — Logo, Booth Image, and
// Gallery are the only three fields worth offering here (the rest of the exhibitor
// profile is text, not images). Skips the crop/position step entirely and writes the
// file's already-public S3 URL straight onto the profile, same as pasting a URL into
// the Logo field's own "or paste an image URL…" box would — there's no meaningful
// difference, this just removes the manual copy/open/paste round trip. Only shown for
// image files; a PDF or video has nothing sensible to apply here.
function ApplyToProfileActions({ file, exhibitorFull, exhibitorId, disabled }) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['exhibitor-full', exhibitorId] });
    queryClient.invalidateQueries({ queryKey: ['exhibitors-all'] });
    queryClient.invalidateQueries({ queryKey: ['exhibitor', exhibitorId] });
  };

  const setLogo = useMutation({
    mutationFn: () => Exhibitor.update(exhibitorId, { logo_url: file.url }),
    onSuccess: invalidate,
  });
  const setBoothImage = useMutation({
    mutationFn: () => Exhibitor.update(exhibitorId, { booth_image_url: file.url, booth_image_position: null }),
    onSuccess: invalidate,
  });
  const addToGallery = useMutation({
    mutationFn: () => Exhibitor.update(exhibitorId, {
      gallery: [...(exhibitorFull?.gallery || []), { url: file.url, caption: '' }],
    }),
    onSuccess: invalidate,
  });

  if (!exhibitorFull) return null;

  const isLogo = exhibitorFull.logo_url === file.url;
  const isBoothImage = exhibitorFull.booth_image_url === file.url;
  const galleryMax = getPackageLimits(exhibitorFull).galleryMax;
  const gallery = exhibitorFull.gallery || [];
  const inGallery = gallery.some(g => normalizeGalleryItem(g).url === file.url);
  const galleryFull = gallery.length >= galleryMax;

  const pill = (active, pending, onClick, disabledReason, Icon, label) => (
    <button
      type="button"
      onClick={onClick}
      disabled={active || pending || disabled || !!disabledReason}
      title={disabledReason || label}
      className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        active
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-border text-muted-foreground hover:bg-amber/10 hover:text-amber hover:border-amber/30'
      }`}
    >
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : active ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
      {active ? `${label} ✓` : label}
    </button>
  );

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1">
      {pill(isLogo, setLogo.isPending, () => setLogo.mutate(), null, ImageIcon, 'Logo')}
      {pill(isBoothImage, setBoothImage.isPending, () => setBoothImage.mutate(), null, Building2, 'Booth Image')}
      {pill(
        inGallery, addToGallery.isPending, () => addToGallery.mutate(),
        galleryMax === 0 ? "This exhibitor's package has no gallery" : (!inGallery && galleryFull ? 'Gallery is full — remove one first' : null),
        Images, 'Gallery'
      )}
      {(setLogo.isError || setBoothImage.isError || addToGallery.isError) && (
        <span className="text-[10px] text-red-600 w-full">
          {(setLogo.error || setBoothImage.error || addToGallery.error)?.message}
        </span>
      )}
    </div>
  );
}

// Per-exhibitor list of ADMA's own expiring upload links — lets an organizer send a
// new exhibitor one link instead of asking for a WeTransfer/SharePoint link back. Each
// link works for 14 days with no login required on the exhibitor's end; files uploaded
// through it live for 60 days from upload regardless of the link's own expiry (cleaned
// up automatically by an S3 lifecycle rule, not from here).
export default function FileShareDialog({ exhibitor, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ['file-shares', exhibitor?.id],
    queryFn: () => FileShare.list(exhibitor.id),
    enabled: open && !!exhibitor,
  });

  // The exhibitor's current profile state (logo_url, booth_image_url, gallery, package)
  // — fetched fresh here rather than trusting the row snapshot AdminPanel passed in, so
  // the Apply buttons above always reflect what's really on the profile right now, and
  // stay correct across several applies in a row within the same dialog session.
  const { data: exhibitorFull } = useQuery({
    queryKey: ['exhibitor-full', exhibitor?.id],
    queryFn: () => Exhibitor.get(exhibitor.id),
    enabled: open && !!exhibitor,
  });

  const createMutation = useMutation({
    mutationFn: () => FileShare.create(exhibitor.id, note),
    onSuccess: () => {
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['file-shares', exhibitor.id] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (token) => FileShare.revoke(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['file-shares', exhibitor.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (token) => FileShare.remove(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['file-shares', exhibitor.id] }),
  });

  const linkUrl = (token) => `${window.location.origin}/file-share/${token}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>File Share — {exhibitor?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note (optional) — e.g. 'booth photos & logo'"
            className="flex-1"
          />
          <Button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="gap-1.5 flex-shrink-0">
            {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            New Link
          </Button>
        </div>
        {createMutation.isError && (
          <p className="text-xs text-red-600">{createMutation.error.message}</p>
        )}

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-3 mt-2">
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>
          ) : shares.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No links yet. Create one above to let this exhibitor upload files directly — no login needed on their end.</p>
          ) : (
            shares.map(share => {
              const status = shareStatus(share);
              const isLive = status.label === 'Active';
              return (
                <div key={share.token} className="border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${status.tone}`}>{status.label}</span>
                        {share.note && <span className="text-xs text-muted-foreground truncate">{share.note}</span>}
                      </div>
                      {isLive && (
                        <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                          <Link2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <code className="text-[11px] text-muted-foreground truncate">{linkUrl(share.token)}</code>
                          <CopyButton text={linkUrl(share.token)} />
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Expires {new Date(share.expires_at).toLocaleDateString()} · Created by {share.created_by_email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isLive && (
                        <button
                          type="button"
                          onClick={() => revokeMutation.mutate(share.token)}
                          disabled={revokeMutation.isPending}
                          title="Deactivate this link"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-amber hover:bg-amber/10 transition-colors disabled:opacity-60"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { if (window.confirm('Delete this link? Files already uploaded are not affected.')) deleteMutation.mutate(share.token); }}
                        disabled={deleteMutation.isPending}
                        title="Delete link"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-60"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {share.files?.length > 0 && (
                    <div className="divide-y divide-border border-t border-border pt-1.5">
                      {share.files.map(f => {
                        const isImage = f.content_type?.startsWith('image/');
                        return (
                          <div key={f.id} className="py-1.5">
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs hover:text-amber transition-colors"
                            >
                              <FileIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                              <span className="truncate flex-1">{f.filename}</span>
                              <span className="text-muted-foreground flex-shrink-0">{formatBytes(f.size)}</span>
                            </a>
                            {isImage && (
                              <ApplyToProfileActions file={f} exhibitorFull={exhibitorFull} exhibitorId={exhibitor.id} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
