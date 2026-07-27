import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MagazinePage } from '@/api/entities';
import { AdSectionPage } from '@/pages/Magazine';
import {
  Image as ImageIcon, Video, Images, FileEdit, Type, Plus, Trash2,
  ChevronUp, ChevronDown, RotateCcw, Save, Loader2, LayoutGrid, X, Sparkles, Maximize2, RefreshCw,
  Download, Search,
} from 'lucide-react';
import ImageUploadOrUrlField from '@/components/shared/ImageUploadOrUrlField';
import VideoUploadOrUrlField from '@/components/shared/VideoUploadOrUrlField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const M = '/magazines';

// Same page-slot scheme ADMAFlipBook uses in src/pages/Magazine.jsx — PDF pages
// 2-43 are landscape double-spreads split into left/right halves; 1 and 44 are
// portrait singles. Keep this in sync with that file if the source scans change.
function buildPageSlots() {
  const list = [];
  list.push({ pageKey: '001', src: `${M}/adma-pages/page-001.jpg`, half: 'portrait', label: 'Page 1 · Cover' });
  for (let i = 2; i <= 43; i++) {
    const n = String(i).padStart(3, '0');
    list.push({ pageKey: `${n}-left`, src: `${M}/adma-pages/page-${n}.jpg`, half: 'left', label: `Spread ${i} · Left` });
    list.push({ pageKey: `${n}-right`, src: `${M}/adma-pages/page-${n}.jpg`, half: 'right', label: `Spread ${i} · Right` });
  }
  list.push({ pageKey: '044', src: `${M}/adma-pages/page-044.jpg`, half: 'portrait', label: 'Page 44 · Back Cover' });
  return list;
}
const PAGE_SLOTS = buildPageSlots();

const HEIGHT_PRESETS = [
  { label: 'Full Page', value: 100 },
  { label: 'Half Page', value: 50 },
  { label: 'Third Page', value: 33 },
  { label: 'Small Block', value: 20 },
  { label: 'Strip / Banner', value: 10 },
];

const SECTION_TYPES = [
  { type: 'image', label: 'Image Ad', icon: ImageIcon, defaultConfig: () => ({ image_url: '', click_url: '', advertiser: '', fit: 'cover' }) },
  { type: 'video', label: 'Video Embed', icon: Video, defaultConfig: () => ({ video_url: '', click_url: '', advertiser: '' }) },
  { type: 'carousel', label: 'Image Carousel', icon: Images, defaultConfig: () => ({ slides: [] }) },
  { type: 'advertorial', label: 'Advertorial', icon: FileEdit, defaultConfig: () => ({ image_url: '', heading: '', body: '', click_url: '', advertiser: '' }) },
  { type: 'text', label: 'Text Strip', icon: Type, defaultConfig: () => ({ text: '', bg: '#0f2e1c', color: '#ffffff', click_url: '', advertiser: '' }) },
  { type: 'animation', label: 'Animated Text/Graphic', icon: Sparkles, defaultConfig: () => ({ style: 'ticker', text: '', image_url: '', click_url: '', advertiser: '', bg: '#0f2e1c', color: '#ffffff', accent: '#eab308' }) },
];
const SECTION_TYPE_META = Object.fromEntries(SECTION_TYPES.map(t => [t.type, t]));

function newSectionId() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Converts an extracted magazine page's real frames (from extraction-manifest.json) into
// draft sections, top-to-bottom by their original vertical position on the page.
function framesToSections(frames, defaultCropSide = 'center') {
  const sorted = [...(frames || [])].sort((a, b) => (a.bounds?.y || 0) - (b.bounds?.y || 0));
  return sorted.map(f => {
    const heightPercent = Math.max(5, Math.min(100, Math.round((f.areaFraction || 0.1) * 100)));
    if (f.type === 'image') {
      return {
        id: newSectionId(),
        type: 'image',
        heightPercent,
        config: {
          image_url: f.image_url || '',
          advertiser: f.advertiser || '',
          click_url: '',
          fit: 'cover',
          cropSide: f.spansMultiplePages ? defaultCropSide : 'center',
        },
      };
    }
    return {
      id: newSectionId(),
      type: 'text',
      heightPercent,
      config: { text: f.text || '', bg: '#ffffff', color: '#0f172a', click_url: '', advertiser: '' },
    };
  });
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function ImageAdForm({ config, pageKey, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <ImageUploadOrUrlField
          label="Image"
          value={config.image_url}
          onChange={v => onChange({ ...config, image_url: v })}
          ownerId={pageKey}
          purpose="magazine-section"
          preset="banner"
        />
      </div>
      <Field label="Advertiser">
        <Input value={config.advertiser || ''} onChange={e => onChange({ ...config, advertiser: e.target.value })} placeholder="e.g. Amcotts" />
      </Field>
      <Field label="Click-through URL">
        <Input value={config.click_url || ''} onChange={e => onChange({ ...config, click_url: e.target.value })} placeholder="https://…" />
      </Field>
      <Field label="Image fit">
        <div className="flex gap-2">
          {['cover', 'contain'].map(f => (
            <button
              key={f}
              type="button"
              onClick={() => onChange({ ...config, fit: f })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${config.fit === f ? 'bg-amber text-slate-900 border-amber' : 'bg-muted border-border hover:bg-muted/80'}`}
            >
              {f === 'cover' ? 'Fill (crop)' : 'Fit (letterbox)'}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Crop side (for images spanning two pages)">
        <div className="flex gap-2">
          {[['left', 'Left half'], ['center', 'Center'], ['right', 'Right half']].map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...config, cropSide: v })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${(config.cropSide || 'center') === v ? 'bg-amber text-slate-900 border-amber' : 'bg-muted border-border hover:bg-muted/80'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

function VideoAdForm({ config, pageKey, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <VideoUploadOrUrlField
          label="Video"
          value={config.video_url}
          onChange={v => onChange({ ...config, video_url: v })}
          ownerId={pageKey}
          purpose="magazine-section"
        />
      </div>
      <Field label="Advertiser">
        <Input value={config.advertiser || ''} onChange={e => onChange({ ...config, advertiser: e.target.value })} placeholder="e.g. Zimplow" />
      </Field>
      <Field label="Click-through URL (optional)">
        <Input value={config.click_url || ''} onChange={e => onChange({ ...config, click_url: e.target.value })} placeholder="https://…" />
      </Field>
    </div>
  );
}

function CarouselAdForm({ config, pageKey, onChange }) {
  const slides = config.slides || [];
  const updateSlide = (i, patch) => {
    const next = slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    onChange({ ...config, slides: next });
  };
  const removeSlide = i => onChange({ ...config, slides: slides.filter((_, idx) => idx !== i) });
  const addSlide = () => onChange({ ...config, slides: [...slides, { image_url: '', label: '', click_url: '' }] });

  return (
    <div className="space-y-3">
      {slides.map((slide, i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Slide {i + 1}</span>
            <button type="button" onClick={() => removeSlide(i)} className="text-muted-foreground hover:text-red-600 p-1"><X className="w-3.5 h-3.5" /></button>
          </div>
          <ImageUploadOrUrlField
            value={slide.image_url}
            onChange={v => updateSlide(i, { image_url: v })}
            ownerId={`${pageKey}-slide${i}`}
            purpose="magazine-section"
            preset="banner"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input value={slide.label || ''} onChange={e => updateSlide(i, { label: e.target.value })} placeholder="Caption (optional)" className="text-xs" />
            <Input value={slide.click_url || ''} onChange={e => updateSlide(i, { click_url: e.target.value })} placeholder="Click-through URL" className="text-xs" />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addSlide} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Slide
      </Button>
    </div>
  );
}

function AdvertorialForm({ config, pageKey, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <ImageUploadOrUrlField
          label="Image"
          value={config.image_url}
          onChange={v => onChange({ ...config, image_url: v })}
          ownerId={pageKey}
          purpose="magazine-section"
          preset="cutout"
        />
      </div>
      <Field label="Heading">
        <Input value={config.heading || ''} onChange={e => onChange({ ...config, heading: e.target.value })} placeholder="Headline" />
      </Field>
      <Field label="Advertiser">
        <Input value={config.advertiser || ''} onChange={e => onChange({ ...config, advertiser: e.target.value })} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Body text">
          <Textarea value={config.body || ''} onChange={e => onChange({ ...config, body: e.target.value })} rows={3} placeholder="Short sponsored-content copy…" />
        </Field>
      </div>
      <Field label="Click-through URL">
        <Input value={config.click_url || ''} onChange={e => onChange({ ...config, click_url: e.target.value })} placeholder="https://…" />
      </Field>
    </div>
  );
}

function TextStripForm({ config, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <Field label="Text">
          <Input value={config.text || ''} onChange={e => onChange({ ...config, text: e.target.value })} placeholder="e.g. Register free — adma.co.zw" />
        </Field>
      </div>
      <Field label="Background colour">
        <Input type="color" value={config.bg || '#0f2e1c'} onChange={e => onChange({ ...config, bg: e.target.value })} className="h-9 p-1" />
      </Field>
      <Field label="Text colour">
        <Input type="color" value={config.color || '#ffffff'} onChange={e => onChange({ ...config, color: e.target.value })} className="h-9 p-1" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Click-through URL (optional)">
          <Input value={config.click_url || ''} onChange={e => onChange({ ...config, click_url: e.target.value })} placeholder="https://…" />
        </Field>
      </div>
    </div>
  );
}

const ANIMATION_STYLES = [
  { value: 'ticker', label: 'Scrolling Ticker' },
  { value: 'pulse-badge', label: 'Pulsing Badge' },
  { value: 'fade-in', label: 'Fade-In Text' },
];

function AnimationForm({ config, pageKey, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <Field label="Animation style">
          <div className="flex gap-2">
            {ANIMATION_STYLES.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange({ ...config, style: o.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${config.style === o.value ? 'bg-amber text-slate-900 border-amber' : 'bg-muted border-border hover:bg-muted/80'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <div className="sm:col-span-2">
        <ImageUploadOrUrlField
          label="Background image (optional)"
          value={config.image_url}
          onChange={v => onChange({ ...config, image_url: v })}
          ownerId={pageKey}
          purpose="magazine-section"
          preset="banner"
        />
      </div>
      <div className="sm:col-span-2">
        <Field label={config.style === 'pulse-badge' ? 'Badge text' : 'Animated text'}>
          <Input
            value={config.text || ''}
            onChange={e => onChange({ ...config, text: e.target.value })}
            placeholder={
              config.style === 'ticker' ? 'e.g. Delivering long-term value • Call +263…'
                : config.style === 'pulse-badge' ? 'e.g. 2-3 YEARS FINANCE'
                : 'e.g. Register Free Today'
            }
          />
        </Field>
      </div>
      <Field label="Advertiser">
        <Input value={config.advertiser || ''} onChange={e => onChange({ ...config, advertiser: e.target.value })} />
      </Field>
      <Field label="Click-through URL (optional)">
        <Input value={config.click_url || ''} onChange={e => onChange({ ...config, click_url: e.target.value })} placeholder="https://…" />
      </Field>
      <Field label="Background colour">
        <Input type="color" value={config.bg || '#0f2e1c'} onChange={e => onChange({ ...config, bg: e.target.value })} className="h-9 p-1" />
      </Field>
      {config.style === 'pulse-badge' ? (
        <Field label="Badge colour">
          <Input type="color" value={config.accent || '#eab308'} onChange={e => onChange({ ...config, accent: e.target.value })} className="h-9 p-1" />
        </Field>
      ) : (
        <Field label="Text colour">
          <Input type="color" value={config.color || '#ffffff'} onChange={e => onChange({ ...config, color: e.target.value })} className="h-9 p-1" />
        </Field>
      )}
    </div>
  );
}

const SECTION_FORMS = {
  image: ImageAdForm,
  video: VideoAdForm,
  carousel: CarouselAdForm,
  advertorial: AdvertorialForm,
  text: TextStripForm,
  animation: AnimationForm,
};

// Best-effort carry-over when switching an existing section to a different type — e.g. an
// Image Ad's image becomes the first Carousel slide, a Carousel's first slide becomes an
// Image Ad, and shared fields (click_url, advertiser, text, colours) copy straight across
// whenever the new type actually has them.
function convertSectionConfig(oldType, newType, oldConfig) {
  const base = SECTION_TYPE_META[newType].defaultConfig();
  const c = oldConfig || {};

  const shared = {};
  if ('click_url' in base) shared.click_url = c.click_url || '';
  if ('advertiser' in base) shared.advertiser = c.advertiser || '';
  if ('text' in base && typeof c.text === 'string') shared.text = c.text;
  if ('bg' in base && c.bg) shared.bg = c.bg;
  if ('color' in base && c.color) shared.color = c.color;

  if (newType === 'carousel') {
    const firstImage = c.image_url || (c.slides || [])[0]?.image_url || '';
    return {
      ...base,
      ...shared,
      slides: firstImage
        ? [{ image_url: firstImage, click_url: c.click_url || '', label: c.advertiser || '' }]
        : (c.slides || base.slides),
    };
  }

  if (oldType === 'carousel' && (newType === 'image' || newType === 'advertorial')) {
    const first = (c.slides || [])[0];
    return {
      ...base,
      ...shared,
      image_url: first?.image_url || '',
      click_url: first?.click_url || shared.click_url || '',
      advertiser: first?.label || shared.advertiser || '',
    };
  }

  if ((newType === 'image' || newType === 'advertorial') && c.image_url) {
    return { ...base, ...shared, image_url: c.image_url, fit: c.fit || 'cover', cropSide: c.cropSide || 'center' };
  }

  return { ...base, ...shared };
}

function PagePreview({ slot, sections }) {
  if (sections?.length) return <AdSectionPage sections={sections} />;
  return (
    <img
      src={slot.src}
      alt=""
      className="absolute inset-0 w-full h-full select-none"
      style={{
        objectFit: slot.half === 'portrait' ? 'fill' : 'cover',
        objectPosition: slot.half === 'left' ? 'left center' : slot.half === 'right' ? 'right center' : 'center',
      }}
      draggable={false}
    />
  );
}

function SectionRow({ section, index, total, pageKey, onChange, onRemove, onMove, onChangeType }) {
  const meta = SECTION_TYPE_META[section.type];
  const Icon = meta?.icon || ImageIcon;
  const Form = SECTION_FORMS[section.type];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 flex-wrap">
        <Icon className="w-4 h-4 text-amber-600 shrink-0" />
        <select
          value={section.type}
          onChange={e => onChangeType(e.target.value)}
          title="Change section type — keeps the image/text/link where possible"
          className="text-sm font-semibold bg-transparent border border-transparent hover:border-border rounded px-1 py-0.5 -ml-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber"
        >
          {SECTION_TYPES.map(t => (
            <option key={t.type} value={t.type}>{t.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 ml-2">
          {HEIGHT_PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ ...section, heightPercent: p.value })}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${section.heightPercent === p.value ? 'bg-amber text-slate-900 border-amber' : 'bg-background border-border hover:bg-muted'}`}
              title={`${p.label} (${p.value}%)`}
            >
              {p.value}%
            </button>
          ))}
          <Input
            type="number"
            min={1}
            max={100}
            value={section.heightPercent}
            onChange={e => onChange({ ...section, heightPercent: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })}
            className="w-14 h-6 text-[10px] px-1.5"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={onRemove} className="p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="p-3">
        {Form && <Form config={section.config || {}} pageKey={pageKey} onChange={cfg => onChange({ ...section, config: cfg })} />}
      </div>
    </div>
  );
}

export default function MagazineSectionBuilder() {
  const qc = useQueryClient();
  const [selectedKey, setSelectedKey] = useState(null);
  const [draftSections, setDraftSections] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['magazine-pages'],
    queryFn: () => MagazinePage.list(),
    staleTime: 30_000,
  });
  const pageMap = Object.fromEntries(pages.map(p => [p.page_num, p]));

  const { data: extractionPages = [] } = useQuery({
    queryKey: ['extraction-manifest'],
    queryFn: () => fetch('/magazines/extraction-manifest.json').then(r => r.json()),
    staleTime: Infinity,
  });
  const filteredExtractionPages = extractionPages.filter(p => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return true;
    if (p.pageName.toLowerCase().includes(q)) return true;
    return p.frames.some(f => (f.advertiser || '').toLowerCase().includes(q) || (f.text || '').toLowerCase().includes(q));
  });

  useEffect(() => {
    if (!selectedKey) return;
    setDraftSections(pageMap[selectedKey]?.sections || []);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const saveMutation = useMutation({
    mutationFn: ({ pageKey, sections }) => MagazinePage.update(pageKey, { sections }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['magazine-pages'] });
      setDirty(false);
    },
  });

  const selectedSlot = PAGE_SLOTS.find(s => s.pageKey === selectedKey);

  const addSection = (type) => {
    const meta = SECTION_TYPE_META[type];
    setDraftSections(prev => [...prev, {
      id: newSectionId(),
      type,
      heightPercent: prev.length === 0 ? 100 : 50,
      config: meta.defaultConfig(),
    }]);
    setDirty(true);
  };

  const updateSection = (id, next) => {
    setDraftSections(prev => prev.map(s => (s.id === id ? next : s)));
    setDirty(true);
  };

  const changeSectionType = (id, newType) => {
    setDraftSections(prev => prev.map(s => (
      s.id === id ? { ...s, type: newType, config: convertSectionConfig(s.type, newType, s.config) } : s
    )));
    setDirty(true);
  };

  const removeSection = (id) => {
    setDraftSections(prev => prev.filter(s => s.id !== id));
    setDirty(true);
  };

  const moveSection = (id, dir) => {
    setDraftSections(prev => {
      const i = prev.findIndex(s => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  };

  const handleSave = () => {
    if (!selectedKey) return;
    saveMutation.mutate({ pageKey: selectedKey, sections: draftSections });
  };

  const handleReset = () => {
    if (!selectedKey) return;
    setDraftSections([]);
    saveMutation.mutate({ pageKey: selectedKey, sections: [] });
  };

  const handleLoadExtraction = (extractionPage) => {
    if (draftSections.length && !window.confirm('Replace the current draft sections with this extracted page\'s content? Unsaved changes will be lost.')) {
      return;
    }
    const defaultCropSide = selectedSlot?.half === 'left' ? 'left' : selectedSlot?.half === 'right' ? 'right' : 'center';
    setDraftSections(framesToSections(extractionPage.frames, defaultCropSide));
    setDirty(true);
    setPickerOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-amber" />
          Magazine Section Builder
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          ADMA 2026 Agricultural Show Magazine — add, remove and reorder manageable ad sections on any page.
          Pages with no sections keep showing their original scanned page, unchanged.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading pages…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-6">
          {/* Page grid */}
          <div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[70vh] overflow-y-auto pr-1">
              {PAGE_SLOTS.map(slot => {
                const count = pageMap[slot.pageKey]?.sections?.length || 0;
                const isSelected = selectedKey === slot.pageKey;
                return (
                  <button
                    key={slot.pageKey}
                    type="button"
                    onClick={() => setSelectedKey(slot.pageKey)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-colors ${isSelected ? 'border-amber' : count ? 'border-emerald-500/60' : 'border-transparent hover:border-border'}`}
                    style={{ aspectRatio: '420/544' }}
                    title={slot.label}
                  >
                    <img
                      src={slot.src}
                      alt={slot.label}
                      className="absolute inset-0 w-full h-full select-none"
                      style={{
                        objectFit: slot.half === 'portrait' ? 'fill' : 'cover',
                        objectPosition: slot.half === 'left' ? 'left center' : slot.half === 'right' ? 'right center' : 'center',
                      }}
                      draggable={false}
                      loading="lazy"
                    />
                    {count > 0 && (
                      <span className="absolute top-0.5 right-0.5 bg-emerald-600 text-white rounded-full text-[9px] font-bold w-4 h-4 flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Green border = page has custom sections configured. Click any page to edit.
            </p>
          </div>

          {/* Editor panel */}
          <div>
            {!selectedSlot ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                Select a page from the grid to add or edit its ad sections.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading font-bold text-sm">{selectedSlot.label}</h2>
                    <p className="text-xs text-muted-foreground">{draftSections.length} section{draftSections.length === 1 ? '' : 's'} configured</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset} disabled={saveMutation.isPending}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset to Original Scan
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={!dirty || saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                      Save
                    </Button>
                  </div>
                </div>

                {/* Live preview */}
                <div className="relative mx-auto rounded-lg overflow-hidden border border-border bg-white" style={{ width: 260, aspectRatio: '420/544' }}>
                  <PagePreview slot={selectedSlot} sections={draftSections} />
                  <button
                    type="button"
                    onClick={() => setFullPreviewOpen(true)}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/55 text-white hover:bg-black/75 transition-colors"
                    title="View full-page preview"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-center text-[11px] text-muted-foreground -mt-2">
                  <button type="button" onClick={() => setFullPreviewOpen(true)} className="underline hover:text-foreground">
                    View full-page preview
                  </button>
                </p>

                {draftSections.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-3 flex items-center justify-between gap-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      This page is still showing its original scanned image. Replace it with new creative, load the real extracted content, or add sections below.
                    </p>
                    <Button size="sm" variant="outline" onClick={() => addSection('image')} className="shrink-0">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Replace Page Image
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  {draftSections.map((section, i) => (
                    <SectionRow
                      key={section.id}
                      section={section}
                      index={i}
                      total={draftSections.length}
                      pageKey={selectedKey}
                      onChange={next => updateSection(section.id, next)}
                      onRemove={() => removeSection(section.id)}
                      onMove={dir => moveSection(section.id, dir)}
                      onChangeType={newType => changeSectionType(section.id, newType)}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Break this page into its real, individually editable elements:</p>
                  <Button size="sm" onClick={() => setPickerOpen(true)} className="shrink-0">
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Load Extracted Content
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {SECTION_TYPES.map(t => (
                    <Button key={t.type} variant="outline" size="sm" onClick={() => addSection(t.type)}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> {t.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Dialog open={fullPreviewOpen} onOpenChange={setFullPreviewOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{selectedSlot?.label}</DialogTitle>
              </DialogHeader>
              {selectedSlot && (
                <div className="mx-auto rounded-lg overflow-hidden border border-border relative bg-white" style={{ width: '100%', maxWidth: 480, aspectRatio: '420/544' }}>
                  <PagePreview slot={selectedSlot} sections={draftSections} />
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Load Extracted Content{selectedSlot ? ` — ${selectedSlot.label}` : ''}</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground -mt-2">
                Pick the extracted page that matches what you're editing — compare against the live thumbnail before choosing.
                This replaces your current draft sections; nothing saves until you click Save.
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Search by page number, advertiser or text…"
                  className="pl-8"
                />
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {filteredExtractionPages.map((p, i) => {
                  const dominant = [...p.frames].filter(f => f.type === 'image').sort((a, b) => b.areaFraction - a.areaFraction)[0];
                  const firstText = p.frames.find(f => f.type === 'text')?.text;
                  return (
                    <button
                      key={`${p.pageName}-${i}`}
                      type="button"
                      onClick={() => handleLoadExtraction(p)}
                      className="relative rounded-lg overflow-hidden border border-border hover:border-amber transition-colors bg-white text-left"
                      style={{ aspectRatio: '420/544' }}
                      title={`Page ${p.pageName} · ${p.frames.length} frame(s)`}
                    >
                      {dominant ? (
                        <img src={dominant.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                      ) : firstText ? (
                        <div className="absolute inset-0 p-1.5 text-[6.5px] leading-tight text-muted-foreground overflow-hidden">{firstText}</div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <FileEdit className="w-5 h-5" />
                        </div>
                      )}
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 text-center">
                        Pg {p.pageName} · {p.frames.length}
                      </span>
                    </button>
                  );
                })}
              </div>
              {filteredExtractionPages.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">No extracted pages match that search.</p>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
