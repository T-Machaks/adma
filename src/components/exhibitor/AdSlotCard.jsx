import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AdSlot } from '@/api/entities';
import ImageUploadOrUrlField from '@/components/shared/ImageUploadOrUrlField';
import VideoUploadOrUrlField from '@/components/shared/VideoUploadOrUrlField';
import AdBannerPreview from '@/components/exhibitor/AdBannerPreview';
import { Edit, CreditCard } from 'lucide-react';

// Same gradient set the organiser's own MarketingHub.jsx ad forms use, kept in sync
// manually since there's no shared constants module for it yet.
const GRADIENT_OPTIONS = [
  { label: 'Amber', value: 'from-amber-700 to-amber-900' },
  { label: 'Orange', value: 'from-orange-700 to-orange-900' },
  { label: 'Slate', value: 'from-slate-700 to-slate-900' },
  { label: 'Blue', value: 'from-blue-800 to-blue-900' },
  { label: 'Emerald', value: 'from-emerald-800 to-emerald-900' },
  { label: 'Zinc', value: 'from-zinc-700 to-zinc-900' },
  { label: 'Violet', value: 'from-violet-800 to-violet-900' },
];
const DURATION_TAGS = ['15s', '30s', '60s'];

const DEFAULTS = {
  carousel: { company: '', headline: '', sub: '', label: 'Platinum Exhibitor', logo_url: '', image_url: '', image_type: 'bg', url: '', bg: 'from-slate-700 to-slate-900' },
  'video-carousel': { company: '', duration_tag: '15s', headline: '', video_url: '', url: '' },
  'footer-strip': { company: '', label: 'Platinum Exhibitor', bg: 'from-slate-700 to-slate-900', headline: '', sub: '', logo_url: '', url: '' },
};

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50';

// One self-service ad placement's create/edit form + status. Saving only ever
// creates/updates the AdSlot record (`pending_changes` for a live one, a fresh inactive
// record otherwise) — organiser review is only requested once payment is confirmed via
// the Rate Card cart (server/routes/payments.js's completePayment → markAdSlotRequested),
// not from this page.
export default function AdSlotCard({ placement, title, description, myBooth, slot }) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});

  const openEdit = () => {
    const base = slot ? { ...slot, ...(slot.pending_changes || {}) } : {};
    setForm({
      ...DEFAULTS[placement],
      ...base,
      company: base.company || myBooth.name || '',
      url: base.url || myBooth.website || '',
    });
    setEditOpen(true);
  };

  const save = useMutation({
    mutationFn: async (values) => {
      if (slot) return AdSlot.update(slot.id, { pending_changes: values });
      return AdSlot.create({ ...values, exhibitor_id: myBooth.id, exhibitor_name: myBooth.name, placement, active: false });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adslots'] });
      setEditOpen(false);
    },
  });

  const awaitingReview = slot?.review_status === 'requested';
  const awaitingPayment = !!slot && !awaitingReview && (!!slot.pending_changes || slot.active === false);

  return (
    <div className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>

      {!editOpen ? (
        <div className="space-y-2">
          {slot && slot.active !== false && !slot.pending_changes && (
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Live</p>
          )}
          {slot?.pending_changes && (
            <p className={`text-[10px] font-bold uppercase tracking-wide ${awaitingReview ? 'text-amber' : 'text-muted-foreground'}`}>
              {awaitingReview ? 'Pending Review' : 'Edit Saved — Payment Required'}
            </p>
          )}
          {slot && slot.active === false && !slot.pending_changes && (
            <p className={`text-[10px] font-bold uppercase tracking-wide ${awaitingReview ? 'text-amber' : 'text-muted-foreground'}`}>
              {awaitingReview ? 'Awaiting First Review' : 'Saved — Payment Required'}
            </p>
          )}
          {!slot && <p className="text-xs text-muted-foreground">Not configured yet.</p>}

          {placement === 'carousel' && slot && (slot.active !== false || slot.pending_changes) && (
            <AdBannerPreview ad={slot.pending_changes ? { ...slot, ...slot.pending_changes } : slot} />
          )}

          <div className="flex items-center justify-end">
            <button
              onClick={openEdit}
              disabled={awaitingReview}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-amber text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-amber/90 disabled:opacity-50 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" /> {slot ? 'Edit' : 'Create'}
            </button>
          </div>

          {awaitingPayment && (
            <div className="flex flex-wrap items-center gap-2 bg-amber/10 border border-amber/20 rounded-xl p-3">
              <CreditCard className="w-4 h-4 text-amber flex-shrink-0" />
              <p className="text-xs flex-1 min-w-[140px]">Ready to pay — add it to your cart on the Rate Card page.</p>
              <Link to="/exhibitor/rate-card" className="text-xs font-semibold text-amber hover:underline flex-shrink-0">Go to Rate Card →</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Company Name</label>
            <input type="text" value={form.company || ''} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className={inputCls} />
          </div>

          {placement === 'video-carousel' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Duration</label>
                <select value={form.duration_tag || '15s'} onChange={e => setForm(f => ({ ...f, duration_tag: e.target.value }))} className={inputCls}>
                  {DURATION_TAGS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Headline <span className="text-muted-foreground/70">(optional CTA text)</span></label>
                <input type="text" value={form.headline || ''} placeholder="Learn more" onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} className={inputCls} />
              </div>
              <VideoUploadOrUrlField
                label="Video (MP4 upload or YouTube/Vimeo link)"
                value={form.video_url}
                onChange={v => setForm(f => ({ ...f, video_url: v }))}
                ownerId={myBooth.id}
                purpose="adslot-video"
              />
            </>
          )}

          {(placement === 'carousel' || placement === 'footer-strip') && (
            <>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Headline <span className="text-muted-foreground/70">(optional)</span></label>
                <input type="text" value={form.headline || ''} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Subtext <span className="text-muted-foreground/70">(optional)</span></label>
                <input type="text" value={form.sub || ''} onChange={e => setForm(f => ({ ...f, sub: e.target.value }))} className={inputCls} />
              </div>
              <ImageUploadOrUrlField
                label="Logo"
                value={form.logo_url}
                onChange={v => setForm(f => ({ ...f, logo_url: v }))}
                ownerId={myBooth.id}
                purpose="adslot"
                preset="logo"
              />
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Background Gradient</label>
                <select value={form.bg || 'from-slate-700 to-slate-900'} onChange={e => setForm(f => ({ ...f, bg: e.target.value }))} className={inputCls}>
                  {GRADIENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </>
          )}

          {placement === 'carousel' && (
            <>
              <ImageUploadOrUrlField
                label="Background/Cutout Image (optional)"
                value={form.image_url}
                onChange={v => setForm(f => ({ ...f, image_url: v }))}
                ownerId={myBooth.id}
                purpose="adslot"
                preset={form.image_type === 'cutout' ? 'cutout' : 'banner'}
              />
              {form.image_url && (
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1">Image Style</label>
                  <select value={form.image_type || 'bg'} onChange={e => setForm(f => ({ ...f, image_type: e.target.value }))} className={inputCls}>
                    <option value="bg">Full background photo</option>
                    <option value="cutout">Cutout on gradient</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              Destination URL {placement === 'video-carousel' && <span className="text-muted-foreground/70">(optional)</span>}
            </label>
            <input type="url" value={form.url || ''} placeholder="https://company.com" onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className={inputCls} />
          </div>

          <p className="text-[11px] text-muted-foreground">Save your ad, then pay to submit it for organiser review — it won't go live until approved.</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending || !form.company || (placement === 'video-carousel' && !form.video_url)}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold bg-amber text-white rounded-lg hover:bg-amber/90 active:scale-95 transition-all disabled:opacity-60 touch-manipulation"
            >
              {save.isPending ? 'Saving…' : 'Save Ad'}
            </button>
            <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
