import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Exhibitor, MeetingRequest, AdSlot } from '@/api/entities';
import { EVENT_CONFIG } from '@/lib/eventConfig';
import { notifyMeeting } from '@/api/notify';
import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';
import {
  Store, Calendar, CheckCircle, XCircle, Clock,
  Mail, Phone, Globe, MapPin, Edit, Users, Star, QrCode, ScanLine,
  ImagePlus, Trash2, ArrowRight, TrendingUp, X, Megaphone, Lock, MousePointerClick,
  Images, MessageCircle, Award, Plus,
} from 'lucide-react';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import AdBannerPreview from '@/components/exhibitor/AdBannerPreview';
import ImageUploadOrUrlField from '@/components/shared/ImageUploadOrUrlField';
import { resizeImageToBlob } from '@/lib/imageUtils';
import { getStandTier, standTierAtLeast, getPackageLimits } from '@/lib/standTiers';
import { isSubscriptionExpired } from '@/lib/subscription';

const STATUS_STYLES = {
  Pending:   { cls: 'bg-amber-100 text-amber-700', icon: Clock },
  Confirmed: { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  Declined:  { cls: 'bg-red-100 text-red-700', icon: XCircle },
};

const PACKAGE_NEXT = { Basic: 'Enhanced', Enhanced: 'Premium' };
const UPGRADE_PERKS = {
  Enhanced: ['Full company profile & products', 'Live chat with attendees', 'Gallery of 6 scrolling images', 'Booth analytics dashboard'],
  Premium:  ['Everything in Enhanced', 'AI-referenceable full profile', 'Gallery of 9 scrolling images', 'Digital magazine ads', 'Ad carousel slot'],
};

export default function ExhibitorHome() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [updateError, setUpdateError] = useState(null);

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list('-created_date'),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings-all'],
    queryFn: () => MeetingRequest.list('-created_date'),
  });

  const { data: allAdSlots = [] } = useQuery({
    queryKey: ['adslots'],
    queryFn: () => AdSlot.list(),
  });

  const myBooth = exhibitors.find(
    e => e.contact_email?.toLowerCase() === user?.email?.toLowerCase()
      || (user?.company && e.name?.toLowerCase() === user.company.toLowerCase())
  ) ?? exhibitors[0];

  // Fetches the exhibitor's own ad slot regardless of active/review state — unlike the
  // attendee-facing carousel/footer (which only ever read AdSlot.listActive()), the
  // exhibitor needs to see a slot that's still pending its first review or paused.
  const myAd = myBooth ? (allAdSlots.find(a => a.exhibitor_id === myBooth.id) ?? null) : null;
  const isPremiumPkg = myBooth?.package === 'Premium';
  const standTier = myBooth ? getStandTier(myBooth) : 'Basic';
  const isEnhancedPlus = myBooth ? standTierAtLeast(myBooth, 'Enhanced') : false;
  const limits = myBooth ? getPackageLimits(myBooth) : { descChars: 250, galleryMax: 0 };
  const expired = myBooth ? isSubscriptionExpired(myBooth) : false;

  const myMeetings = meetings.filter(m => {
    if (!myBooth) return true;
    const nameMatch = myBooth.name?.toLowerCase();
    return (
      m.exhibitor_id === myBooth.id ||
      m.exhibitor_name?.toLowerCase() === nameMatch ||
      m.company?.toLowerCase() === nameMatch ||
      !m.exhibitor_name
    );
  });

  const pending   = myMeetings.filter(m => m.status === 'Pending');
  const confirmed = myMeetings.filter(m => m.status === 'Confirmed');

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => MeetingRequest.update(id, { status }),
    onSuccess: (updated) => {
      setUpdateError(null);
      qc.invalidateQueries({ queryKey: ['meetings-all'] });
      const action = updated.status === 'Confirmed' ? 'confirmed' : 'declined';
      notifyMeeting(updated, action);
    },
    onSettled: () => setUpdatingId(null),
    onError: (err) => setUpdateError(err.message),
  });

  const updateBoothImage = useMutation({
    mutationFn: (imageUrl) => Exhibitor.update(myBooth.id, { booth_image_url: imageUrl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exhibitors-all'] }),
  });

  const [uploadingGallery, setUploadingGallery] = useState(false);
  const updateGallery = useMutation({
    mutationFn: (gallery) => Exhibitor.update(myBooth.id, { gallery }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exhibitors-all'] }),
  });

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const current = myBooth.gallery || [];
    if (current.length >= limits.galleryMax) { e.target.value = ''; return; }
    setUploadingGallery(true);
    try {
      const blob = await resizeImageToBlob(file);
      const { uploadUrl, publicUrl } = await Exhibitor.getGalleryUploadUrl(myBooth.id);
      const s3Res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
      if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);
      await updateGallery.mutateAsync([...current, publicUrl]);
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleRemoveGalleryImage = (idx) => {
    updateGallery.mutate((myBooth.gallery || []).filter((_, i) => i !== idx));
  };

  const updateBooth = useMutation({
    mutationFn: (data) => Exhibitor.update(myBooth.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exhibitors-all'] }); setEditOpen(false); },
  });

  const handleEditOpen = () => {
    if (!editOpen) setEditForm({
      name: myBooth.name || '',
      description: myBooth.description || '',
      contact_email: myBooth.contact_email || '',
      phone: myBooth.phone || '',
      website: myBooth.website || '',
      video_url: myBooth.video_url || '',
      specialties: (myBooth.specialties || []).join(', '),
      certifications: (myBooth.certifications || []).join(', '),
      faq: myBooth.faq?.length ? myBooth.faq : [],
    });
    setEditOpen(o => !o);
  };

  const handleSaveProfile = () => {
    const { specialties, certifications, faq, ...rest } = editForm;
    updateBooth.mutate({
      ...rest,
      specialties: (specialties || '').split(',').map(s => s.trim()).filter(Boolean),
      certifications: (certifications || '').split(',').map(s => s.trim()).filter(Boolean),
      faq: (faq || []).filter(f => f.question?.trim() && f.answer?.trim()),
    });
  };

  const addFaqRow = () => setEditForm(f => ({ ...f, faq: [...(f.faq || []), { question: '', answer: '' }] }));
  const updateFaqRow = (i, key, value) => setEditForm(f => ({
    ...f, faq: f.faq.map((row, idx) => idx === i ? { ...row, [key]: value } : row),
  }));
  const removeFaqRow = (i) => setEditForm(f => ({ ...f, faq: f.faq.filter((_, idx) => idx !== i) }));

  const handleBoothImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const blob = await resizeImageToBlob(file);
      const { uploadUrl, publicUrl } = await Exhibitor.getBoothImageUploadUrl(
        myBooth.id,
        myBooth.booth_image_url || null
      );
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });
      if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);
      await updateBoothImage.mutateAsync(publicUrl);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveBoothImage = async () => {
    await Exhibitor.update(myBooth.id, { booth_image_url: null });
    qc.invalidateQueries({ queryKey: ['exhibitors-all'] });
  };

  // Ad Banner self-service — creating a new slot or editing an existing one both go
  // through organiser review: new slots are created inactive, edits are held in
  // `pending_changes` on the live record until the organiser approves.
  const [adEditOpen, setAdEditOpen] = useState(false);
  const [adForm, setAdForm] = useState({});

  const openAdEdit = () => {
    const base = myAd ? { ...myAd, ...(myAd.pending_changes || {}) } : {};
    setAdForm({
      company: base.company || myBooth.name || '',
      headline: base.headline || '',
      sub: base.sub || '',
      label: base.label || 'Platinum Exhibitor',
      logo_url: base.logo_url || '',
      image_url: base.image_url || '',
      image_type: base.image_type || 'bg',
      url: base.url || myBooth.website || '',
      bg: base.bg || 'from-slate-700 to-slate-900',
    });
    setAdEditOpen(true);
  };

  const saveAdRequest = useMutation({
    mutationFn: async (formValues) => {
      if (myAd) {
        await AdSlot.update(myAd.id, { pending_changes: formValues });
        return AdSlot.requestReview(myAd.id);
      }
      const created = await AdSlot.create({
        ...formValues,
        exhibitor_id: myBooth.id,
        exhibitor_name: myBooth.name,
        placement: 'carousel',
        active: false,
      });
      return AdSlot.requestReview(created.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adslots'] });
      setAdEditOpen(false);
    },
  });

  if (!myBooth) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-heading text-xl font-bold mb-2">No booth found</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Your account ({user?.email}) is not linked to any exhibitor record.
          Contact the organiser to get your booth set up.
        </p>
        <a href={`mailto:${EVENT_CONFIG.contactEmail}`} className="text-amber text-sm font-medium hover:underline">
          Contact the Organiser →
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Subscription expired banner */}
      {expired && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl px-5 py-4">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-heading font-bold text-sm text-red-700 dark:text-red-400">Subscription Expired</p>
            <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5">
              Your annual subscription expired on {new Date(myBooth.subscription_expires_at).toLocaleDateString()}. Your booth is now hidden from the public directory and site plan — renew to restore visibility.
            </p>
          </div>
          <a
            href={`mailto:${EVENT_CONFIG.contactEmail}?subject=Subscription%20Renewal%20-%20${encodeURIComponent(myBooth.name)}`}
            className="flex items-center gap-1.5 flex-shrink-0 text-xs bg-red-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-150 whitespace-nowrap"
          >
            Renew Now <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Booth card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-steel px-4 sm:px-6 py-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              {myBooth.logo_url
                ? <img src={myBooth.logo_url} alt={myBooth.name} className="w-12 h-12 object-contain" />
                : <span className="font-heading text-2xl font-bold text-white">{myBooth.name?.[0]}</span>
              }
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-lg sm:text-xl font-bold text-white tracking-wide truncate">{myBooth.name}</h1>
              <div className="flex items-center flex-wrap gap-2 mt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber text-white">{standTier}</span>
                {myBooth.section && (
                  <span className="text-xs text-slate-300 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {myBooth.section}
                  </span>
                )}
                {myBooth.booth && (
                  <span className="text-xs text-slate-300">Booth {myBooth.booth}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleEditOpen}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white border border-white/20 hover:border-white/40 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-95 flex-shrink-0 touch-manipulation"
          >
            <Edit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit Profile</span>
          </button>
        </div>

        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {myBooth.contact_email && (
            <a href={`mailto:${myBooth.contact_email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="w-4 h-4 text-amber flex-shrink-0" />
              {myBooth.contact_email}
            </a>
          )}
          {myBooth.phone && (
            <a href={`tel:${myBooth.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="w-4 h-4 text-amber flex-shrink-0" />
              {myBooth.phone}
            </a>
          )}
          {myBooth.website && (
            <a href={myBooth.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Globe className="w-4 h-4 text-amber flex-shrink-0" />
              {myBooth.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {myBooth.description && !editOpen && (
          <div className="px-4 sm:px-6 pb-4 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{myBooth.description.slice(0, limits.descChars)}</p>
          </div>
        )}

        {editOpen && (
          <div className="px-4 sm:px-6 py-5 border-t border-border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Edit Company Info</p>
            {[
              { key: 'name', label: 'Company Name', type: 'text' },
              { key: 'contact_email', label: 'Contact Email', type: 'email' },
              { key: 'phone', label: 'Phone', type: 'tel' },
              { key: 'website', label: 'Website', type: 'url', placeholder: 'https://' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground font-medium block mb-1">{label}</label>
                <input
                  type={type}
                  value={editForm[key] || ''}
                  placeholder={placeholder}
                  onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                />
              </div>
            ))}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground font-medium">Description</label>
                <span className={`text-[10px] font-medium ${(editForm.description?.length || 0) >= limits.descChars ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {editForm.description?.length || 0}/{limits.descChars}
                </span>
              </div>
              <textarea
                rows={5}
                maxLength={limits.descChars}
                value={editForm.description || ''}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value.slice(0, limits.descChars) }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50 resize-none"
              />
            </div>

            {isEnhancedPlus && (
              <div className="pt-2 border-t border-border">
                <label className="text-xs text-muted-foreground font-medium block mb-1">Company Video URL</label>
                <input
                  type="url"
                  value={editForm.video_url || ''}
                  placeholder="https://www.youtube.com/embed/… or https://player.vimeo.com/video/…"
                  onChange={e => setEditForm(f => ({ ...f, video_url: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Shown as an embedded video on your public booth page. Use a YouTube/Vimeo embed URL, not a regular watch link.</p>
              </div>
            )}

            {isPremiumPkg && (
              <div className="pt-2 border-t border-border space-y-3">
                <p className="text-xs font-semibold text-amber uppercase tracking-wide flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" /> Premium Stand — AI-Referenceable Profile
                </p>
                <p className="text-[11px] text-muted-foreground -mt-2">AgriBot draws on these fields when attendees ask about your company.</p>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1">Specialties (comma-separated)</label>
                  <input
                    type="text"
                    value={editForm.specialties || ''}
                    placeholder="e.g. Irrigation design, Solar pumping"
                    onChange={e => setEditForm(f => ({ ...f, specialties: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1">Certifications (comma-separated)</label>
                  <input
                    type="text"
                    value={editForm.certifications || ''}
                    placeholder="e.g. ISO 9001, SAZ Approved"
                    onChange={e => setEditForm(f => ({ ...f, certifications: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground font-medium">FAQ</label>
                    <button type="button" onClick={addFaqRow} className="flex items-center gap-1 text-[11px] text-amber font-semibold hover:underline">
                      <Plus className="w-3 h-3" /> Add question
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(editForm.faq || []).map((row, i) => (
                      <div key={i} className="flex gap-1.5 items-start bg-muted/40 rounded-lg p-2">
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="text"
                            value={row.question}
                            placeholder="Question"
                            onChange={e => updateFaqRow(i, 'question', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                          />
                          <input
                            type="text"
                            value={row.answer}
                            placeholder="Answer"
                            onChange={e => updateFaqRow(i, 'answer', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                          />
                        </div>
                        <button type="button" onClick={() => removeFaqRow(i)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveProfile}
                disabled={updateBooth.isPending}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold bg-amber text-white rounded-lg hover:bg-amber/90 active:scale-95 transition-all disabled:opacity-60 touch-manipulation"
              >
                {updateBooth.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold border border-border rounded-lg hover:bg-muted active:scale-95 transition-all touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Meetings',    value: myMeetings.length, icon: Calendar },
          { label: 'Pending',           value: pending.length,    icon: Clock },
          { label: 'Confirmed',         value: confirmed.length,  icon: CheckCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-amber" />
            </div>
            <div>
              <div className="font-heading text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Package Upgrade CTA — shown for non-Premium exhibitors */}
      {!upgradeDismissed && PACKAGE_NEXT[standTier] && (
        <div className="relative bg-gradient-to-r from-amber-900/80 to-steel rounded-2xl overflow-hidden border border-amber/30">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '16px 16px' }} />
          <button
            onClick={() => setUpgradeDismissed(true)}
            className="absolute top-3 right-3 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="relative px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-10 h-10 bg-amber/20 border border-amber/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-amber" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-heading font-bold text-sm">
                Upgrade to {PACKAGE_NEXT[standTier]}
              </p>
              <p className="text-white/70 text-xs mt-0.5">
                Currently <span className="text-amber font-semibold">{standTier}</span> — unlock more reach and features
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
                {(UPGRADE_PERKS[PACKAGE_NEXT[standTier]] ?? []).map(p => (
                  <li key={p} className="text-[11px] text-white/80 flex items-center gap-1">
                    <span className="text-amber font-bold">·</span> {p}
                  </li>
                ))}
              </ul>
            </div>
            <a
              href={`mailto:${EVENT_CONFIG.contactEmail}?subject=Booth%20Upgrade%20Enquiry`}
              className="flex items-center gap-1.5 flex-shrink-0 text-xs bg-amber text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-amber/90 active:scale-95 transition-all duration-150 whitespace-nowrap"
            >
              Enquire <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Messages — Enhanced+ */}
      {isEnhancedPlus && (
        <a
          href="/exhibitor/messages"
          className="flex items-center gap-3 bg-card border border-border rounded-2xl p-4 hover:bg-muted transition-colors"
        >
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Attendee Messages</p>
            <p className="text-xs text-muted-foreground">Live chat with attendees browsing your virtual stand</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </a>
      )}

      {/* Meeting requests */}
      <div>
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide mb-4">
          Meeting Requests
        </h2>

        {myMeetings.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">No meeting requests yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Attendees can request meetings via the Connect Hub or Meetings page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myMeetings.map(m => {
              const cfg = STATUS_STYLES[m.status] ?? STATUS_STYLES.Pending;
              const StatusIcon = cfg.icon;
              return (
                <div key={m.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{m.visitor_name || m.attendee_name || m.full_name || 'Attendee'}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                          <StatusIcon className="w-3 h-3" />
                          {m.status}
                        </span>
                      </div>
                      {(m.reason || m.message) && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.reason || m.message}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {m.preferred_date && <span>📅 {m.preferred_date}{m.preferred_time ? ` at ${m.preferred_time}` : ''}</span>}
                        {(m.visitor_email || m.attendee_email) && <span>✉ {m.visitor_email || m.attendee_email}</span>}
                      </div>
                    </div>
                  </div>
                  {m.status === 'Pending' && (
                    <>
                      {updateError && updatingId === null && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{updateError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={updatingId === m.id}
                          onClick={() => { setUpdateError(null); setUpdatingId(m.id); updateStatus.mutate({ id: m.id, status: 'Confirmed' }); }}
                          className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-3 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        >
                          <CheckCircle className="w-4 h-4" /> {updatingId === m.id ? 'Saving…' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === m.id}
                          onClick={() => { setUpdateError(null); setUpdatingId(m.id); updateStatus.mutate({ id: m.id, status: 'Declined' }); }}
                          className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-red-100 hover:bg-red-200 active:scale-95 text-red-700 py-3 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        >
                          <XCircle className="w-4 h-4" /> Decline
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gallery — every stand tier (Basic and up) */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Images className="w-5 h-5 text-amber" />
            <div>
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide">Virtual Stand Gallery</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {limits.galleryMax > 0 ? `Up to ${limits.galleryMax} images shown on your virtual stand · ${standTier} package` : `${standTier} package`}
              </p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {limits.galleryMax === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <Images className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">Gallery not included in the Basic package</p>
              <p className="text-xs text-muted-foreground max-w-xs">Upgrade to Enhanced or Premium to add a scrolling image gallery to your virtual stand.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(myBooth.gallery || []).map((src, i) => (
                <div key={i} className="relative group aspect-square">
                  <img src={src} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-border" />
                  <button
                    onClick={() => handleRemoveGalleryImage(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(myBooth.gallery || []).length < limits.galleryMax && (
                <label className={`flex flex-col items-center justify-center gap-1 aspect-square cursor-pointer border-2 border-dashed border-border rounded-lg hover:bg-muted/40 transition-colors ${uploadingGallery ? 'opacity-60 pointer-events-none' : ''}`}>
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{uploadingGallery ? 'Uploading…' : 'Add image'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} disabled={uploadingGallery} />
                </label>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Booth Stand Image */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <ImagePlus className="w-5 h-5 text-amber" />
          <div>
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide">Booth Stand Image</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Shown to attendees when they tap your booth on the site plan</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {myBooth.booth_image_url ? (
            <>
              <img
                src={myBooth.booth_image_url}
                alt="Booth stand"
                className="w-full rounded-xl object-cover max-h-56 border border-border"
              />
              <div className="flex gap-2">
                <label className={`flex items-center gap-2 cursor-pointer text-xs bg-muted border border-border px-3 py-2 rounded-lg font-medium hover:bg-muted/80 transition-colors ${uploadingImage ? 'opacity-60 pointer-events-none' : ''}`}>
                  <ImagePlus className="w-3.5 h-3.5" />
                  {uploadingImage ? 'Uploading…' : 'Replace Image'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleBoothImageUpload} disabled={uploadingImage} />
                </label>
                <button
                  onClick={handleRemoveBoothImage}
                  className="flex items-center gap-2 text-xs text-red-600 border border-red-200 px-3 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </>
          ) : (
            <label className={`flex flex-col items-center justify-center gap-3 cursor-pointer border-2 border-dashed border-border rounded-xl p-8 hover:bg-muted/40 transition-colors ${uploadingImage ? 'opacity-60 pointer-events-none' : ''}`}>
              <ImagePlus className="w-8 h-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">{uploadingImage ? 'Uploading…' : 'Upload Booth Image'}</p>
                <p className="text-xs text-muted-foreground mt-1">JPG or PNG · automatically resized</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleBoothImageUpload} disabled={uploadingImage} />
            </label>
          )}
        </div>
      </div>

      {myBooth.featured && (
        <div className="flex items-center gap-2 text-xs text-amber font-semibold bg-amber/10 border border-amber/20 rounded-xl px-4 py-3">
          <Star className="w-4 h-4 fill-amber" />
          Your booth is marked as Featured and will appear highlighted in the exhibitor directory.
        </div>
      )}

      {/* Ad Banner */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-amber" />
          <div>
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide">Ad Banner</h2>
            <p className="text-xs text-muted-foreground mt-0.5">How your ad appears in the attendee home carousel</p>
          </div>
        </div>
        <div className="p-5">
          {isPremiumPkg ? (
            <div className="space-y-3">
              {myAd && myAd.active !== false && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Live</p>
                  <AdBannerPreview ad={myAd} />
                </div>
              )}
              {myAd?.pending_changes && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber mb-1.5">Pending Review</p>
                  <AdBannerPreview ad={{ ...myAd, ...myAd.pending_changes }} />
                </div>
              )}
              {myAd && myAd.active === false && !myAd.pending_changes && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber mb-1.5">Awaiting First Review</p>
                  <AdBannerPreview ad={myAd} />
                </div>
              )}
              {!myAd && !adEditOpen && (
                <div className="flex flex-col items-center justify-center gap-1 py-4 text-center">
                  <Megaphone className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium">No ad configured yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Create your carousel ad — the organiser will review it before it goes live.
                  </p>
                </div>
              )}

              {!adEditOpen ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground flex-1">
                    {myAd?.review_status === 'requested'
                      ? 'Your changes are awaiting organiser review.'
                      : myAd
                        ? <>This banner rotates in the attendee home screen carousel. Click performance is tracked in{' '}
                            <a href="/exhibitor/analytics" className="text-amber font-medium hover:underline">Analytics</a>.</>
                        : ''}
                  </p>
                  <button
                    onClick={openAdEdit}
                    disabled={myAd?.review_status === 'requested'}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-amber text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-amber/90 disabled:opacity-50 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> {myAd ? 'Edit Ad' : 'Create Ad'}
                  </button>
                </div>
              ) : (
                <div className="border-t border-border pt-3 space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Company Name</label>
                    <input
                      type="text"
                      value={adForm.company || ''}
                      onChange={e => setAdForm(f => ({ ...f, company: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Headline</label>
                    <input
                      type="text"
                      value={adForm.headline || ''}
                      placeholder="World-Class Farm Equipment"
                      onChange={e => setAdForm(f => ({ ...f, headline: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Subtext</label>
                    <input
                      type="text"
                      value={adForm.sub || ''}
                      placeholder="Visit our booth"
                      onChange={e => setAdForm(f => ({ ...f, sub: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                    />
                  </div>
                  <ImageUploadOrUrlField
                    label="Logo"
                    value={adForm.logo_url}
                    onChange={v => setAdForm(f => ({ ...f, logo_url: v }))}
                    ownerId={myBooth.id}
                    purpose="adslot"
                    preset="logo"
                  />
                  <ImageUploadOrUrlField
                    label="Background/Cutout Image (optional)"
                    value={adForm.image_url}
                    onChange={v => setAdForm(f => ({ ...f, image_url: v }))}
                    ownerId={myBooth.id}
                    purpose="adslot"
                    preset={adForm.image_type === 'cutout' ? 'cutout' : 'banner'}
                  />
                  {adForm.image_url && (
                    <div>
                      <label className="text-xs text-muted-foreground font-medium block mb-1">Image Style</label>
                      <select
                        value={adForm.image_type || 'bg'}
                        onChange={e => setAdForm(f => ({ ...f, image_type: e.target.value }))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                      >
                        <option value="bg">Full background photo</option>
                        <option value="cutout">Cutout on gradient</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Destination URL</label>
                    <input
                      type="url"
                      value={adForm.url || ''}
                      placeholder="https://company.com"
                      onChange={e => setAdForm(f => ({ ...f, url: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Submitting sends this to the organiser for review — it won't go live until approved.</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => saveAdRequest.mutate(adForm)}
                      disabled={saveAdRequest.isPending || !adForm.company || !adForm.headline}
                      className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold bg-amber text-white rounded-lg hover:bg-amber/90 active:scale-95 transition-all disabled:opacity-60 touch-manipulation"
                    >
                      {saveAdRequest.isPending ? 'Submitting…' : 'Submit for Review'}
                    </button>
                    <button
                      onClick={() => setAdEditOpen(false)}
                      className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 backdrop-blur-[3px] bg-background/70 flex flex-col items-center justify-center z-10 gap-3 rounded-xl">
                <div className="w-10 h-10 bg-amber/10 border border-amber/20 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber" />
                </div>
                <div className="text-center px-6">
                  <p className="font-heading font-bold text-sm">Premium Feature</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Premium package exhibitors get a dedicated ad slot in the attendee home screen carousel.
                  </p>
                </div>
                <a
                  href={`mailto:${EVENT_CONFIG.contactEmail}?subject=Booth%20Upgrade%20Enquiry`}
                  className="flex items-center gap-1.5 text-xs bg-amber text-white font-semibold px-4 py-2 rounded-lg hover:bg-amber/90 active:scale-95 transition-all duration-150"
                >
                  Upgrade to Premium <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="relative w-full h-24 bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }} />
                <div className="relative h-full flex items-center px-4 gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-20 bg-white/20 rounded" />
                    <div className="h-3 w-36 bg-white/30 rounded" />
                    <div className="h-2 w-28 bg-white/20 rounded" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booth QR code */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber" />
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide">Booth QR Code</h2>
          </div>
          <a
            href="/exhibitor/scan"
            className="flex items-center gap-1.5 text-xs text-amber font-semibold hover:underline"
          >
            <ScanLine className="w-3.5 h-3.5" /> Scan Visitors
          </a>
        </div>
        <div className="p-5 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <QRCodeDisplay
            value={JSON.stringify({
              t: 'exhibitor',
              id: myBooth.id,
              n: myBooth.name,
              b: myBooth.booth,
              s: myBooth.section,
              ev: EVENT_CONFIG.qrEventCode,
            })}
            size={160}
            label={myBooth.name}
            sublabel={`Booth ${myBooth.booth} · ${myBooth.section}`}
            logo_url={myBooth.logo_url || null}
          />
          <div className="flex-1 space-y-3 text-sm text-center sm:text-left">
            <p className="text-muted-foreground leading-relaxed">
              Display this QR code at your stand. Visitors scan it using the {EVENT_CONFIG.eventName} app to confirm their booth visit — it's automatically logged in your engagement analytics.
            </p>
            <div className="space-y-1.5">
              {[
                'Print and frame it at your booth entrance',
                'Add it to your digital display or presentation',
                'Include it in your marketing materials',
              ].map(tip => (
                <div key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-amber font-bold mt-0.5">·</span>
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
