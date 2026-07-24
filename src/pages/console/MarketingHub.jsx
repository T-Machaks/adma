import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdSlot, Announcement, Exhibitor, EngagementEvent, MeetingRequest, GuidePage,
} from '@/api/entities';
import { notifyAnnouncement } from '@/api/notify';
import {
  Megaphone, Sparkles, BarChart2, TrendingUp, MousePointerClick,
  Plus, Trash2, Download, ExternalLink, ImageIcon, Link2, Check, Play,
  ChevronDown, ChevronUp, Layers, BookOpen, Monitor, FileEdit,
} from 'lucide-react';
import AdBannerCarousel from '@/components/home/AdBannerCarousel';
import ImageUploadOrUrlField from '@/components/shared/ImageUploadOrUrlField';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

function StatRow({ icon, color, label, value, empty }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-lg font-bold leading-none">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
        {value === 0 && empty && (
          <p className="text-[10px] text-muted-foreground text-right leading-tight max-w-[120px]">{empty}</p>
        )}
      </div>
    </div>
  );
}

const ALL_MAGAZINE_PAGES = [
  { num: '1',  type: 'editorial', title: 'Cover',              defaultImage: null },
  { num: '2',  type: 'editorial', title: 'Welcome',            defaultImage: null },
  { num: '3',  type: 'editorial', title: 'Contents',           defaultImage: null },
  { num: '4',  type: 'interactive', advertiser: 'Afritractors',        defaultImage: '/magazines/adma-pages/page-004.jpg', desc: 'Auto-rotating product carousel' },
  { num: '5',  type: 'editorial', title: 'Event Overview',     defaultImage: null },
  { num: '6',  type: 'image',     advertiser: 'Centre Pivot Irrigation', defaultImage: '/magazines/adma-pages/page-006.jpg', desc: 'Full-page image ad' },
  { num: '7',  type: 'video',     advertiser: 'Cloverleaf Motors',     defaultImage: '/magazines/adma-pages/page-007.jpg', desc: 'Image + video embed' },
  { num: '8',  type: 'editorial', title: 'Site Plan',          defaultImage: null },
  { num: '9',  type: 'editorial', title: 'Industry Insight',   defaultImage: null },
  { num: '10', type: 'image',     advertiser: 'Brown Engineering Group', defaultImage: '/magazines/adma-pages/page-010.jpg', desc: 'Full-page image ad' },
  { num: '11', type: 'editorial', title: 'Exhibitor Dir.',     defaultImage: null },
  { num: '12', type: 'image',     advertiser: 'Croco Motors',         defaultImage: '/magazines/adma-pages/page-012.jpg', desc: 'Full-page image ad' },
  { num: '13', type: 'image',     advertiser: 'Amtec',                defaultImage: '/magazines/adma-pages/page-013.jpg', desc: 'Half-page image ad' },
  { num: '14', type: 'editorial', title: 'Why Attend?',        defaultImage: null },
  { num: '15', type: 'editorial', title: 'Back Cover',         defaultImage: null },
  { num: '16', type: 'image',     advertiser: 'Sample Exhibitor',      defaultImage: null, desc: 'Interactive hotspot ad — tap markers for product info' },
];
const AD_PAGES = ALL_MAGAZINE_PAGES.filter(p => p.type !== 'editorial');

const TIER_COLORS = {
  Platinum: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  Gold:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400',
  Silver:   'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Bronze:   'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
};

const GRADIENT_OPTIONS = [
  { label: 'Amber', value: 'from-amber-700 to-amber-900' },
  { label: 'Orange', value: 'from-orange-700 to-orange-900' },
  { label: 'Slate', value: 'from-slate-700 to-slate-900' },
  { label: 'Blue', value: 'from-blue-800 to-blue-900' },
  { label: 'Emerald', value: 'from-emerald-800 to-emerald-900' },
  { label: 'Zinc', value: 'from-zinc-700 to-zinc-900' },
  { label: 'Violet', value: 'from-violet-800 to-violet-900' },
];

const EMPTY_SLOT = {
  company: '', headline: '', sub: '', label: 'Platinum Exhibitor',
  logo_url: '', image_url: '', image_type: 'bg', url: '', bg: 'from-slate-700 to-slate-900',
  exhibitor_id: '', exhibitor_name: '', placement: 'carousel',
};

const EMPTY_POST = {
  type: 'General', title: '', body: '', sponsored: true, sponsor_name: '',
};

function exportCSV(rows, filename, headers) {
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function MarketingHub() {
  const qc = useQueryClient();
  const { user } = useAuth();

  // Dialog state
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [slotForm, setSlotForm] = useState(EMPTY_SLOT);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [postForm, setPostForm] = useState(EMPTY_POST);
  const [deleteSlotId, setDeleteSlotId] = useState(null);
  const [deletePostId, setDeletePostId] = useState(null);
  const [expandedSection, setExpandedSection] = useState('magazine');

  // Magazine editor state
  const [selectedAdPage, setSelectedAdPage] = useState(null);
  const [editUrl, setEditUrl] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);

  // Data queries
  const { data: adSlots = [] } = useQuery({
    queryKey: ['adslots'],
    queryFn: () => AdSlot.list('-created_date'),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => Announcement.list('-created_date'),
  });

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list(null),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['engagements-all'],
    queryFn: () => EngagementEvent.list('-created_date'),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings-all'],
    queryFn: () => MeetingRequest.list('-created_date'),
  });

  const { data: guidePageConfigs = [] } = useQuery({
    queryKey: ['guide-pages'],
    queryFn: () => GuidePage.list(),
  });

  // Guide derived data
  const pageConfigMap = Object.fromEntries(guidePageConfigs.map(p => [String(p.page_num), p]));
  const guideClicks = events.filter(e => e.source === 'magazine' && e.type === 'ad_click');
  const guideClicksByAdvertiser = {};
  guideClicks.forEach(e => {
    const name = e.exhibitor_name || 'Unknown';
    guideClicksByAdvertiser[name] = (guideClicksByAdvertiser[name] || 0) + 1;
  });
  const guideVideoPlays      = events.filter(e => e.source === 'magazine' && e.type === 'video_play').length;
  const guideVideoCompletes  = events.filter(e => e.source === 'magazine' && e.type === 'video_complete').length;
  const guideCarouselViews   = events.filter(e => e.source === 'magazine' && e.type === 'carousel_view' && e.exhibitor_name === 'SANY Group').length;

  // Sync URL inputs when selected page changes OR when guide config data arrives
  useEffect(() => {
    if (selectedAdPage) {
      setEditUrl(pageConfigMap[selectedAdPage]?.click_url || '');
      setEditImageUrl(pageConfigMap[selectedAdPage]?.image_url || '');
      setImageLoadError(false);
    }
  }, [selectedAdPage, guidePageConfigs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived data
  const sponsoredPosts = announcements.filter(a => a.sponsored);
  const activeSlots = adSlots.filter(s => s.active !== false);
  const carouselSlots = adSlots.filter(s => !s.placement || s.placement === 'carousel');
  const footerSlots = adSlots.filter(s => s.placement === 'footer-strip');
  const adClicks = events.filter(e => e.type === 'ad_click');
  const totalEngagements = events.length;

  // Tier breakdown (physical booth tier — booth sales pipeline, not virtual eligibility)
  const tierCounts = { Platinum: 0, Gold: 0, Silver: 0, Bronze: 0 };
  exhibitors.forEach(e => { if (tierCounts[e.tier] !== undefined) tierCounts[e.tier]++; });

  // Virtual package breakdown — this is what actually drives ad placement/lead export eligibility
  const premiumPkgCount = exhibitors.filter(e => e.package === 'Premium').length;

  // Ad clicks by exhibitor (for performance table)
  const clicksByExhibitor = {};
  adClicks.forEach(e => {
    const name = e.exhibitor_name || 'Unknown';
    clicksByExhibitor[name] = (clicksByExhibitor[name] || 0) + 1;
  });
  const topExhibitors = Object.entries(clicksByExhibitor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Mutations — Guide pages
  const updatePageMutation = useMutation({
    mutationFn: ({ pageNum, data }) => GuidePage.update(pageNum, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guide-pages'] }),
  });

  const handleSaveImageUrl = () => {
    if (!selectedAdPage || !editImageUrl.trim()) return;
    const existing = pageConfigMap[selectedAdPage] || {};
    updatePageMutation.mutate({ pageNum: selectedAdPage, data: { ...existing, image_url: editImageUrl.trim() } });
  };

  const handleSaveClickUrl = () => {
    if (!selectedAdPage) return;
    const existing = pageConfigMap[selectedAdPage] || {};
    updatePageMutation.mutate({ pageNum: selectedAdPage, data: { ...existing, click_url: editUrl.trim() } });
  };

  // Mutations — AdSlot
  const createSlot = useMutation({
    mutationFn: (data) => AdSlot.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adslots'] }); setSlotDialogOpen(false); setSlotForm(EMPTY_SLOT); },
  });
  const updateSlot = useMutation({
    mutationFn: ({ id, data }) => AdSlot.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adslots'] }); setSlotDialogOpen(false); setEditingSlotId(null); setSlotForm(EMPTY_SLOT); },
  });
  const toggleSlot = useMutation({
    mutationFn: ({ id, active }) => AdSlot.update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adslots'] }),
  });
  const deleteSlot = useMutation({
    mutationFn: (id) => AdSlot.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adslots'] }); setDeleteSlotId(null); },
  });

  const openCreateSlot = (placement = 'carousel') => {
    setEditingSlotId(null);
    setSlotForm({ ...EMPTY_SLOT, placement });
    setSlotDialogOpen(true);
  };
  const openEditSlot = (slot) => {
    setEditingSlotId(slot.id);
    setSlotForm({ ...EMPTY_SLOT, ...slot });
    setSlotDialogOpen(true);
  };

  // Mutations — Sponsored Announcements
  const createPost = useMutation({
    mutationFn: (data) => Announcement.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setPostDialogOpen(false);
      setPostForm(EMPTY_POST);
      notifyAnnouncement(created);
    },
  });
  const deletePost = useMutation({
    mutationFn: (id) => Announcement.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); setDeletePostId(null); },
  });

  // Report exports
  const exportEngagementReport = () => {
    exportCSV(
      events.map(e => [e.type, e.source, e.exhibitor_name, e.created_date]),
      'adma_engagement_report.csv',
      ['Type', 'Source', 'Exhibitor', 'Date'],
    );
  };

  const exportSponsoredPostsReport = () => {
    exportCSV(
      sponsoredPosts.map(a => [a.title, a.sponsor_name, a.type, a.created_date]),
      'adma_sponsored_posts.csv',
      ['Title', 'Sponsor', 'Type', 'Date'],
    );
  };

  const exportAdPerformanceReport = () => {
    exportCSV(
      adSlots.map(s => [
        s.company, s.headline, s.active ? 'Active' : 'Paused',
        clicksByExhibitor[s.company] || 0, s.created_date,
      ]),
      'adma_ad_performance.csv',
      ['Company', 'Headline', 'Status', 'Ad Clicks', 'Created'],
    );
  };

  const exportGuideReport = () => {
    const date = new Date().toISOString().slice(0, 10);
    exportCSV(
      AD_PAGES.map(p => {
        const clicks = guideClicksByAdvertiser[p.advertiser] || 0;
        const vPlays = p.num === '7' ? guideVideoPlays : '';
        const vCompletes = p.num === '7' ? guideVideoCompletes : '';
        const completionRate = p.num === '7' && guideVideoPlays > 0
          ? `${Math.round((guideVideoCompletes / guideVideoPlays) * 100)}%` : '';
        const carousel = p.num === '4' ? guideCarouselViews : '';
        return [p.advertiser, `pg${p.num}`, p.desc || p.type, clicks, vPlays, vCompletes, completionRate, carousel];
      }),
      `adma_guide_report_${date}.csv`,
      ['Advertiser', 'Page', 'Ad Type', 'Ad Clicks', 'Video Plays', 'Video Completes', 'Completion Rate', 'Carousel Views'],
    );
  };

  const kpis = [
    { label: 'Active Ad Slots',   value: activeSlots.length,    icon: Layers,            bg: 'bg-amber-50 dark:bg-amber-950/30',     color: 'text-amber' },
    { label: 'Sponsored Posts',   value: sponsoredPosts.length, icon: Sparkles,          bg: 'bg-violet-50 dark:bg-violet-950/30',   color: 'text-violet-500' },
    { label: 'Guide Ad Clicks',   value: guideClicks.length,    icon: MousePointerClick, bg: 'bg-emerald-50 dark:bg-emerald-950/30', color: 'text-emerald-500' },
    { label: 'Total Engagements', value: totalEngagements,      icon: BarChart2,         bg: 'bg-blue-50 dark:bg-blue-950/30',       color: 'text-blue-500' },
  ];

  const toggle = (section) => setExpandedSection(v => v === section ? null : section);

  if (user?.role !== 'marketing_partner' && user?.role !== 'superadmin') {
    return <Navigate to="/console" replace />;
  }

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-amber" /> Marketing Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage ad inventory, sponsored posts, and monitor performance.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className={`${bg} rounded-xl border border-border p-4`}>
            <div className={`${color} mb-2`}><Icon className="w-5 h-5" /></div>
            <div className="font-heading text-3xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Exhibition Guide ── */}
      <Section
        id="magazine"
        title="Exhibition Guide"
        icon={<BookOpen className="w-4 h-4 text-amber" />}
        expanded={expandedSection === 'magazine'}
        onToggle={() => toggle('magazine')}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={exportGuideReport}
              className="flex items-center gap-1.5 text-xs border border-border text-foreground/70 font-semibold px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Download guide analytics CSV"
            >
              <Download className="w-3 h-3" /> Report
            </button>
            <Link
              to="/magazine"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs bg-amber text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-amber/90 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Open
            </Link>
          </div>
        }
      >
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-px bg-border border-b border-border">
          {[
            { label: 'Ad Pages',     value: AD_PAGES.length },
            { label: 'Guide Clicks', value: guideClicks.length },
            { label: 'Advertisers',  value: AD_PAGES.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card px-4 py-3 text-center">
              <p className="font-heading text-2xl font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">
            All Pages — click an <span className="text-amber">ad page</span> to edit
          </p>

          {/* 15-page thumbnail grid */}
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))' }}>
            {ALL_MAGAZINE_PAGES.map(page => {
              const config = pageConfigMap[page.num];
              const isAd = page.type !== 'editorial';
              const isSelected = selectedAdPage === page.num;
              const clicks = guideClicksByAdvertiser[page.advertiser] || 0;
              const thumbSrc = isAd ? (config?.image_url || page.defaultImage) : null;

              return (
                <button
                  key={page.num}
                  disabled={!isAd}
                  onClick={() => isAd && setSelectedAdPage(n => n === page.num ? null : page.num)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all duration-150 ${
                    !isAd
                      ? 'border-border opacity-40 cursor-default'
                      : isSelected
                        ? 'border-amber shadow-md shadow-amber/20 scale-105'
                        : 'border-amber/30 hover:border-amber cursor-pointer hover:scale-105'
                  }`}
                  style={{ aspectRatio: '3/4' }}
                >
                  {thumbSrc ? (
                    <img src={thumbSrc} alt={page.advertiser} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 px-1">
                      <span className="text-slate-400 font-semibold text-center leading-tight" style={{ fontSize: 6 }}>{page.title}</span>
                    </div>
                  )}
                  {/* Page number */}
                  <div className="absolute top-0.5 left-0.5 rounded px-1 text-white font-bold leading-none" style={{ fontSize: 6, background: 'rgba(0,0,0,0.65)' }}>
                    {page.num}
                  </div>
                  {/* Ad dot */}
                  {isAd && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber" />}
                  {/* Click count */}
                  {isAd && clicks > 0 && (
                    <div className="absolute bottom-0.5 right-0.5 rounded px-1 text-white font-bold leading-none" style={{ fontSize: 6, background: '#f59e0b' }}>
                      {clicks}
                    </div>
                  )}
                </button>
              );
            })}
          </div>


          {/* Ad page edit panel */}
          {selectedAdPage && (() => {
            const page = ALL_MAGAZINE_PAGES.find(p => p.num === selectedAdPage);
            const config = pageConfigMap[selectedAdPage] || {};
            const imageUrl = config.image_url || page?.defaultImage;
            const clicks = guideClicksByAdvertiser[page?.advertiser] || 0;
            const isSaving = updatePageMutation.isPending;

            return (
              <div className="mt-4 rounded-xl border border-amber/40 bg-amber/5 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-amber/20">
                  <div className="flex items-center gap-2">
                    <FileEdit className="w-4 h-4 text-amber" />
                    <span className="font-semibold text-sm">Page {selectedAdPage} — {page?.advertiser}</span>
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">{page?.desc}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {clicks > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber">
                        <MousePointerClick className="w-3 h-3" />{clicks} clicks
                      </span>
                    )}
                    <button onClick={() => setSelectedAdPage(null)} className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded hover:bg-muted transition-colors">
                      Close
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 p-4">
                  {/* Image URL — live preview */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Ad Image</p>
                    {(() => {
                      const previewSrc = editImageUrl || config.image_url || page?.defaultImage;
                      const isCustom = editImageUrl && editImageUrl === config.image_url;
                      const isPreview = editImageUrl && editImageUrl !== config.image_url;
                      return (
                        <div className="relative rounded-xl overflow-hidden border border-border bg-muted" style={{ aspectRatio: '3/4', maxHeight: 240 }}>
                          {previewSrc && !imageLoadError ? (
                            <img
                              key={previewSrc}
                              src={previewSrc}
                              alt={page?.advertiser}
                              className="absolute inset-0 w-full h-full object-cover"
                              onLoad={() => setImageLoadError(false)}
                              onError={() => setImageLoadError(true)}
                            />
                          ) : imageLoadError ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-red-500 bg-red-50 dark:bg-red-950/20">
                              <ImageIcon className="w-7 h-7" />
                              <span className="text-[10px] font-semibold">Cannot load image</span>
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                              <ImageIcon className="w-8 h-8" />
                            </div>
                          )}
                          {isCustom && <div className="absolute top-2 left-2 rounded px-1.5 py-0.5 text-white text-[9px] font-bold" style={{ background: '#f59e0b' }}>Saved</div>}
                          {isPreview && !imageLoadError && <div className="absolute top-2 left-2 rounded px-1.5 py-0.5 text-white text-[9px] font-bold bg-blue-500">Preview</div>}
                        </div>
                      );
                    })()}
                    <div className="mt-2 space-y-2">
                      <div className="relative">
                        <ImageIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="url"
                          placeholder="https://adma.s3.af-south-1.amazonaws.com/magazines/ads/…"
                          value={editImageUrl}
                          onChange={e => { setEditImageUrl(e.target.value); setImageLoadError(false); }}
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-amber"
                        />
                      </div>
                      <button
                        onClick={handleSaveImageUrl}
                        disabled={!editImageUrl.trim() || imageLoadError || isSaving}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        {isSaving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
                        Save Image
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Preview updates live · paste S3 or any public URL</p>
                  </div>

                  {/* Click URL + analytics */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Click URL</p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <input
                            type="url"
                            placeholder="https://advertiser.com"
                            value={editUrl}
                            onChange={e => setEditUrl(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-amber"
                          />
                        </div>
                        {editUrl && (
                          <a
                            href={editUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center px-2.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Test link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={handleSaveClickUrl}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {isSaving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Save
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Where visitors go when they tap the ad · use full https:// URL</p>
                    </div>

                    {/* Analytics */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Analytics</p>

                      {/* SANY pg4 — link clicks + carousel views */}
                      {page?.num === '4' && (
                        <>
                          <StatRow
                            icon={<MousePointerClick className="w-3.5 h-3.5 text-amber" />}
                            color="bg-amber/10"
                            label="Website link clicks"
                            value={clicks}
                            empty="Tracked when readers tap the sanyglobal.com CTA."
                          />
                          <StatRow
                            icon={<BarChart2 className="w-3.5 h-3.5 text-violet-500" />}
                            color="bg-violet-500/10"
                            label="Carousel slide views"
                            value={guideCarouselViews}
                            empty="Tracked each time a reader navigates between product slides."
                          />
                        </>
                      )}

                      {/* Jetmaster pg7 — image clicks + video */}
                      {page?.num === '7' && (
                        <>
                          <StatRow
                            icon={<MousePointerClick className="w-3.5 h-3.5 text-amber" />}
                            color="bg-amber/10"
                            label="Image clicks"
                            value={clicks}
                            empty="Set a click URL above to make the image tappable."
                          />
                          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Play className="w-3.5 h-3.5 text-blue-500" />
                              </div>
                              <div className="flex-1">
                                <p className="font-heading text-lg font-bold leading-none">{guideVideoPlays}</p>
                                <p className="text-[10px] text-muted-foreground">video plays</p>
                              </div>
                              <div className="text-right">
                                <p className="font-heading text-lg font-bold leading-none">{guideVideoCompletes}</p>
                                <p className="text-[10px] text-muted-foreground">completed</p>
                              </div>
                            </div>
                            {guideVideoPlays > 0 ? (
                              <>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                  <span>Completion rate</span>
                                  <span className="font-semibold">{Math.round((guideVideoCompletes / guideVideoPlays) * 100)}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(guideVideoCompletes / guideVideoPlays) * 100}%` }} />
                                </div>
                              </>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">Tracked when readers press play.</p>
                            )}
                          </div>
                        </>
                      )}

                      {/* All other ad pages — image clicks only */}
                      {page?.num !== '4' && page?.num !== '7' && (
                        <StatRow
                          icon={<MousePointerClick className="w-3.5 h-3.5 text-amber" />}
                          color="bg-amber/10"
                          label="Image clicks"
                          value={clicks}
                          empty="Set a click URL above to make the ad tappable."
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* All-advertiser click breakdown */}
          {guideClicks.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">All Ad Clicks — Magazine</p>
              <div className="space-y-2">
                {AD_PAGES.map(page => {
                  const clicks = guideClicksByAdvertiser[page.advertiser] || 0;
                  const maxClicks = Math.max(...AD_PAGES.map(p => guideClicksByAdvertiser[p.advertiser] || 0), 1);
                  return (
                    <div key={page.num} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">{page.num}</span>
                      <span className="text-xs font-medium flex-shrink-0 w-36 truncate">{page.advertiser}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-amber rounded-full transition-all" style={{ width: `${(clicks / maxClicks) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold tabular-nums w-6 text-right flex-shrink-0">{clicks}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Link
              to="/magazine"
              className="inline-flex items-center gap-2 text-sm bg-card border border-border font-semibold px-4 py-2 rounded-xl hover:bg-muted transition-colors"
            >
              <BookOpen className="w-4 h-4" /> Preview Magazine
            </Link>
          </div>
        </div>
      </Section>

      {/* ── Ad Carousel Inventory ── */}
      <Section
        id="ads"
        title="Ad Carousel Inventory"
        icon={<Layers className="w-4 h-4 text-amber" />}
        expanded={expandedSection === 'ads'}
        onToggle={() => toggle('ads')}
        action={
          <Button size="sm" onClick={() => openCreateSlot('carousel')} className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Slot
          </Button>
        }
      >
        {/* Live preview */}
        <div className="border-b border-border bg-muted/30 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
            <Monitor className="w-3 h-3" /> Live Attendee Preview
          </p>
          <div className="-mx-1">
            <AdBannerCarousel />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Only the first 4 active carousel slots rotate on the homepage.</p>
        </div>

        {carouselSlots.length === 0 ? (
          <EmptyState icon={<Layers className="w-8 h-8 text-muted-foreground" />} label="No ad slots configured" sub="Add a slot to populate the home screen carousel." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Company</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Headline</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground hidden md:table-cell">Clicks</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {carouselSlots.map(slot => (
                  <tr key={slot.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {slot.logo_url && (
                          <div className="w-7 h-7 bg-white border border-border rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
                            <img src={slot.logo_url} alt={slot.company} className="w-6 h-6 object-contain" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm">{slot.company}</p>
                          <p className="text-xs text-muted-foreground">{slot.label}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell max-w-[200px] truncate">
                      {slot.headline}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="font-bold text-emerald-600">{clicksByExhibitor[slot.company] || 0}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={slot.active !== false}
                          onCheckedChange={(v) => toggleSlot.mutate({ id: slot.id, active: v })}
                        />
                        <span className="text-xs text-muted-foreground">
                          {slot.active !== false ? 'Live' : 'Paused'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditSlot(slot)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-amber hover:bg-amber/10 transition-colors"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteSlotId(slot.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Footer Strip Ads ── */}
      <Section
        id="footer-ads"
        title="Footer Strip Ads"
        icon={<Layers className="w-4 h-4 text-amber" />}
        expanded={expandedSection === 'footer-ads'}
        onToggle={() => toggle('footer-ads')}
        action={
          <Button size="sm" onClick={() => openCreateSlot('footer-strip')} className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Slot
          </Button>
        }
      >
        <p className="text-[11px] text-muted-foreground px-5 pt-3">Full-width banner shown site-wide, above the mobile navigation bar.</p>
        {footerSlots.length === 0 ? (
          <EmptyState icon={<Layers className="w-8 h-8 text-muted-foreground" />} label="No footer strip ads configured" sub="Add a slot to show a sitewide footer banner." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Company</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Headline</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {footerSlots.map(slot => (
                  <tr key={slot.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {slot.logo_url && (
                          <div className="w-7 h-7 bg-white border border-border rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
                            <img src={slot.logo_url} alt={slot.company} className="w-6 h-6 object-contain" />
                          </div>
                        )}
                        <p className="font-semibold text-sm">{slot.company}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell max-w-[200px] truncate">
                      {slot.headline}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={slot.active !== false}
                          onCheckedChange={(v) => toggleSlot.mutate({ id: slot.id, active: v })}
                        />
                        <span className="text-xs text-muted-foreground">
                          {slot.active !== false ? 'Live' : 'Paused'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditSlot(slot)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-amber hover:bg-amber/10 transition-colors"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteSlotId(slot.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Sponsored Announcements ── */}
      <Section
        id="posts"
        title="Sponsored Announcements"
        icon={<Sparkles className="w-4 h-4 text-amber" />}
        expanded={expandedSection === 'posts'}
        onToggle={() => toggle('posts')}
        action={
          <Button size="sm" onClick={() => { setPostForm(EMPTY_POST); setPostDialogOpen(true); }} className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Post
          </Button>
        }
      >
        {sponsoredPosts.length === 0 ? (
          <EmptyState icon={<Sparkles className="w-8 h-8 text-muted-foreground" />} label="No sponsored posts yet" sub="Create a sponsored announcement to sell premium placement in the attendee feed." />
        ) : (
          <div className="space-y-2 p-1">
            {sponsoredPosts.map(a => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-amber/30 bg-amber-50/30 dark:bg-amber-950/10">
                <Sparkles className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-semibold">{a.title}</p>
                    {a.sponsor_name && (
                      <span className="text-[10px] font-bold bg-amber/20 text-amber px-1.5 py-0.5 rounded">{a.sponsor_name}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{a.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {a.created_date ? new Date(a.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </p>
                </div>
                <button
                  onClick={() => setDeletePostId(a.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Performance ── */}
      <Section
        id="performance"
        title="Ad Performance"
        icon={<TrendingUp className="w-4 h-4 text-amber" />}
        expanded={expandedSection === 'performance'}
        onToggle={() => toggle('performance')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-1">
          {/* Top exhibitors by ad clicks */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Ad Clicks by Exhibitor</p>
            {topExhibitors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ad click data yet.</p>
            ) : (
              <div className="space-y-2">
                {topExhibitors.map(([name, count]) => (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate">{name}</span>
                      <span className="font-bold tabular-nums ml-2">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-amber rounded-full"
                        style={{ width: `${(count / (topExhibitors[0]?.[1] || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revenue pipeline — tier breakdown */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Exhibitor Tier Pipeline</p>
            <div className="space-y-2.5">
              {Object.entries(tierCounts).map(([tier, count]) => (
                <div key={tier} className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-16 text-center flex-shrink-0 ${TIER_COLORS[tier]}`}>
                    {tier}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-amber rounded-full"
                      style={{ width: `${exhibitors.length > 0 ? (count / exhibitors.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold tabular-nums w-6 text-right flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {premiumPkgCount} Premium package exhibitors eligible for lead export &amp; ad placement.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Reports ── */}
      <Section
        id="reports"
        title="Reports & Exports"
        icon={<Download className="w-4 h-4 text-amber" />}
        expanded={expandedSection === 'reports'}
        onToggle={() => toggle('reports')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-1">
          {[
            {
              label: 'Engagement Events',
              sub: `${events.length} records — all booth visits, QR scans, ad clicks`,
              icon: BarChart2,
              fn: exportEngagementReport,
            },
            {
              label: 'Sponsored Posts',
              sub: `${sponsoredPosts.length} posts — title, sponsor, type, date`,
              icon: Sparkles,
              fn: exportSponsoredPostsReport,
              disabled: sponsoredPosts.length === 0,
            },
            {
              label: 'Ad Performance',
              sub: `${adSlots.length} slots — company, status, click counts`,
              icon: MousePointerClick,
              fn: exportAdPerformanceReport,
              disabled: adSlots.length === 0,
            },
          ].map(({ label, sub, icon: Icon, fn, disabled }) => (
            <button
              key={label}
              onClick={fn}
              disabled={disabled}
              className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 active:scale-95 transition-all duration-150 text-left disabled:opacity-40 disabled:pointer-events-none"
            >
              <div className="w-9 h-9 bg-amber/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-amber" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{sub}</p>
                <p className="text-xs text-amber font-semibold mt-1.5 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Download CSV
                </p>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Add/Edit Ad Slot Dialog ── */}
      <Dialog open={slotDialogOpen} onOpenChange={(open) => { setSlotDialogOpen(open); if (!open) { setEditingSlotId(null); setSlotForm(EMPTY_SLOT); } }}>
        <DialogContent className="sm:max-w-lg" onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {editingSlotId ? 'Edit' : 'New'} {slotForm.placement === 'footer-strip' ? 'Footer Strip' : 'Ad Carousel'} Slot
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!slotForm.company || !slotForm.headline) return;
              if (editingSlotId) updateSlot.mutate({ id: editingSlotId, data: slotForm });
              else createSlot.mutate(slotForm);
            }}
            className="space-y-3 pt-1"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Placement</label>
                <Select value={slotForm.placement || 'carousel'} onValueChange={v => setSlotForm(f => ({ ...f, placement: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carousel">Home Carousel</SelectItem>
                    <SelectItem value="footer-strip">Footer Strip (sitewide)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Company Name</label>
                <Input
                  placeholder="e.g. SANY Group"
                  value={slotForm.company}
                  onChange={e => setSlotForm(f => ({ ...f, company: e.target.value, exhibitor_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Ad Label</label>
                <Input
                  placeholder="Platinum Exhibitor"
                  value={slotForm.label}
                  onChange={e => setSlotForm(f => ({ ...f, label: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Background</label>
                <Select value={slotForm.bg} onValueChange={v => setSlotForm(f => ({ ...f, bg: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRADIENT_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Headline</label>
                <Input
                  placeholder="World-Class Mining Equipment"
                  value={slotForm.headline}
                  onChange={e => setSlotForm(f => ({ ...f, headline: e.target.value }))}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Subtext</label>
                <Input
                  placeholder="Visit Booth A07 · Main Hall"
                  value={slotForm.sub}
                  onChange={e => setSlotForm(f => ({ ...f, sub: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <ImageUploadOrUrlField
                  label="Logo"
                  value={slotForm.logo_url}
                  onChange={v => setSlotForm(f => ({ ...f, logo_url: v }))}
                  ownerId={editingSlotId || slotForm.exhibitor_id}
                  purpose="adslot"
                  preset="logo"
                />
              </div>
              {slotForm.placement === 'carousel' && (
                <div className="col-span-2 space-y-2 rounded-lg border border-border p-3">
                  <ImageUploadOrUrlField
                    label="Background/Cutout Image (optional)"
                    value={slotForm.image_url}
                    onChange={v => setSlotForm(f => ({ ...f, image_url: v }))}
                    ownerId={editingSlotId || slotForm.exhibitor_id}
                    purpose="adslot"
                    preset={slotForm.image_type === 'cutout' ? 'cutout' : 'banner'}
                  />
                  {slotForm.image_url && (
                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Image Style</label>
                      <Select value={slotForm.image_type || 'bg'} onValueChange={v => setSlotForm(f => ({ ...f, image_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bg">Full background photo</SelectItem>
                          <SelectItem value="cutout">Cutout on gradient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Destination URL</label>
                <Input
                  placeholder="https://company.com or /register"
                  value={slotForm.url}
                  onChange={e => setSlotForm(f => ({ ...f, url: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => { setSlotDialogOpen(false); setEditingSlotId(null); setSlotForm(EMPTY_SLOT); }}>Cancel</Button>
              <Button type="submit" disabled={createSlot.isPending || updateSlot.isPending}>
                {editingSlotId
                  ? (updateSlot.isPending ? 'Saving…' : 'Save Changes')
                  : (createSlot.isPending ? 'Saving…' : 'Create Slot')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Sponsored Post Dialog ── */}
      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Sponsored Post</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); if (!postForm.title || !postForm.body) return; createPost.mutate(postForm); }}
            className="space-y-3 pt-1"
          >
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Sponsor Name</label>
              <Input
                placeholder="e.g. SANY Group"
                value={postForm.sponsor_name}
                onChange={e => setPostForm(f => ({ ...f, sponsor_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Type</label>
              <Select value={postForm.type} onValueChange={v => setPostForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Important">Important</SelectItem>
                  <SelectItem value="Update">Update</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Headline</label>
              <Input
                placeholder="Announcement title"
                value={postForm.title}
                onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Body</label>
              <Textarea
                rows={3}
                placeholder="Message to attendees…"
                value={postForm.body}
                onChange={e => setPostForm(f => ({ ...f, body: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPostDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPost.isPending}>
                {createPost.isPending ? 'Saving…' : 'Publish Post'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Ad Slot confirm */}
      <Dialog open={!!deleteSlotId} onOpenChange={open => !open && setDeleteSlotId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remove Ad Slot</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This slot will be removed from the carousel immediately.</p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteSlotId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteSlot.isPending} onClick={() => deleteSlot.mutate(deleteSlotId)}>
              {deleteSlot.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Sponsored Post confirm */}
      <Dialog open={!!deletePostId} onOpenChange={open => !open && setDeletePostId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Sponsored Post</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This post will be removed from the attendee feed immediately.</p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeletePostId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deletePost.isPending} onClick={() => deletePost.mutate(deletePostId)}>
              {deletePost.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ id, title, icon, expanded, onToggle, action, children }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <span className="font-heading text-sm font-bold uppercase tracking-wide flex items-center gap-2">
          {icon} {title}
        </span>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {action}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, label, sub }) {
  return (
    <div className="py-10 px-4 text-center">
      <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{sub}</p>}
    </div>
  );
}