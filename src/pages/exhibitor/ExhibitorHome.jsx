import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Exhibitor, MeetingRequest } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';
import {
  Store, Calendar, CheckCircle, XCircle, Clock,
  Mail, Phone, Globe, MapPin, Edit, Users, Star, QrCode, ScanLine,
  ImagePlus, Trash2, ArrowRight, TrendingUp, X, Megaphone, Lock, MousePointerClick,
} from 'lucide-react';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import AdBannerPreview from '@/components/exhibitor/AdBannerPreview';
import { ADS } from '@/lib/adBanners';
import { resizeImageToBlob } from '@/lib/imageUtils';

const STATUS_STYLES = {
  Pending:   { cls: 'bg-amber-100 text-amber-700', icon: Clock },
  Confirmed: { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  Declined:  { cls: 'bg-red-100 text-red-700', icon: XCircle },
};

const TIER_NEXT = { Copper: 'Chrome', Chrome: 'Gold', Gold: 'Diamond' };
const UPGRADE_PERKS = {
  Chrome: ['Exhibitor directory boost', 'Priority meeting placement', 'Dedicated booth page'],
  Gold:   ['Lead export (CSV)', 'Featured in digital magazine', 'Meeting request boost', 'Ad banner eligibility'],
  Diamond:['Home page featured listing', 'Ad carousel slot', 'Diamond badge', 'All Gold perks'],
};

export default function ExhibitorHome() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list('-created_date'),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings-all'],
    queryFn: () => MeetingRequest.list('-created_date'),
  });

  const myBooth = exhibitors.find(
    e => e.contact_email?.toLowerCase() === user?.email?.toLowerCase()
  ) ?? exhibitors[0]; // fallback to first for demo

  const myAd = myBooth ? ADS.find(a => a.exhibitor_id === myBooth.id) : null;
  const isDiamond = myBooth?.tier === 'Diamond';

  const myMeetings = myBooth
    ? meetings.filter(m =>
        m.exhibitor_id === myBooth.id ||
        m.exhibitor_name === myBooth.name ||
        m.company === myBooth.name
      )
    : [];

  const pending   = myMeetings.filter(m => m.status === 'Pending');
  const confirmed = myMeetings.filter(m => m.status === 'Confirmed');

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => MeetingRequest.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings-all'] }),
    onSettled: () => setUpdatingId(null),
    onError: (err) => alert(`Failed to update meeting: ${err.message}`),
  });

  const updateBoothImage = useMutation({
    mutationFn: (imageUrl) => Exhibitor.update(myBooth.id, { booth_image_url: imageUrl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exhibitors-all'] }),
  });

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
    });
    setEditOpen(o => !o);
  };

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

  if (!myBooth) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-heading text-xl font-bold mb-2">No booth found</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Your account ({user?.email}) is not linked to any exhibitor record.
          Contact the organiser to get your booth set up.
        </p>
        <a href="/console/registrations" className="text-amber text-sm font-medium hover:underline">
          Go to Management Console →
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

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
                {myBooth.tier && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber text-white">{myBooth.tier}</span>
                )}
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
            <p className="text-sm text-muted-foreground leading-relaxed">{myBooth.description}</p>
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
              <label className="text-xs text-muted-foreground font-medium block mb-1">Description</label>
              <textarea
                rows={3}
                value={editForm.description || ''}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50 resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => updateBooth.mutate(editForm)}
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

      {/* Tier Upgrade CTA — shown for non-Diamond exhibitors */}
      {myBooth.tier !== 'Diamond' && !upgradeDismissed && TIER_NEXT[myBooth.tier] && (
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
                Upgrade to {TIER_NEXT[myBooth.tier]}
              </p>
              <p className="text-white/70 text-xs mt-0.5">
                Currently <span className="text-amber font-semibold">{myBooth.tier}</span> — unlock more reach and features
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
                {(UPGRADE_PERKS[TIER_NEXT[myBooth.tier]] ?? []).map(p => (
                  <li key={p} className="text-[11px] text-white/80 flex items-center gap-1">
                    <span className="text-amber font-bold">·</span> {p}
                  </li>
                ))}
              </ul>
            </div>
            <a
              href="mailto:info@minecon.global?subject=Booth%20Upgrade%20Enquiry"
              className="flex items-center gap-1.5 flex-shrink-0 text-xs bg-amber text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-amber/90 active:scale-95 transition-all duration-150 whitespace-nowrap"
            >
              Enquire <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
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
                    <div className="flex gap-2">
                      <button
                        disabled={updatingId === m.id}
                        onClick={() => { setUpdatingId(m.id); updateStatus.mutate({ id: m.id, status: 'Confirmed' }); }}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-4 h-4" /> {updatingId === m.id ? 'Saving…' : 'Confirm'}
                      </button>
                      <button
                        disabled={updatingId === m.id}
                        onClick={() => { setUpdatingId(m.id); updateStatus.mutate({ id: m.id, status: 'Declined' }); }}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-red-100 hover:bg-red-200 active:scale-95 text-red-700 py-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4" /> Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
          {isDiamond && myAd ? (
            <div className="space-y-3">
              <AdBannerPreview ad={myAd} />
              <p className="text-xs text-muted-foreground">
                This banner rotates in the attendee home screen carousel. Click performance is tracked in{' '}
                <a href="/exhibitor/analytics" className="text-amber font-medium hover:underline">Analytics</a>.
              </p>
            </div>
          ) : isDiamond ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <Megaphone className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">No ad configured</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Contact the organiser to set up your carousel ad slot.
              </p>
              <a
                href="mailto:info@minecon.global?subject=Ad%20Banner%20Setup"
                className="mt-1 text-xs text-amber font-semibold hover:underline flex items-center gap-1"
              >
                Contact organiser <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 backdrop-blur-[3px] bg-background/70 flex flex-col items-center justify-center z-10 gap-3 rounded-xl">
                <div className="w-10 h-10 bg-amber/10 border border-amber/20 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber" />
                </div>
                <div className="text-center px-6">
                  <p className="font-heading font-bold text-sm">Diamond Feature</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Diamond tier exhibitors get a dedicated ad slot in the attendee home screen carousel.
                  </p>
                </div>
                <a
                  href="mailto:info@minecon.global?subject=Booth%20Upgrade%20Enquiry"
                  className="flex items-center gap-1.5 text-xs bg-amber text-white font-semibold px-4 py-2 rounded-lg hover:bg-amber/90 active:scale-95 transition-all duration-150"
                >
                  Upgrade to Diamond <ArrowRight className="w-3.5 h-3.5" />
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
              ev: 'mc26',
            })}
            size={160}
            label={myBooth.name}
            sublabel={`Booth ${myBooth.booth} · ${myBooth.section}`}
            logo_url={myBooth.logo_url || null}
          />
          <div className="flex-1 space-y-3 text-sm text-center sm:text-left">
            <p className="text-muted-foreground leading-relaxed">
              Display this QR code at your stand. Visitors scan it using the MineCon app to confirm their booth visit — it's automatically logged in your engagement analytics.
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
