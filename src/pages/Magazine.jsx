import HTMLFlipBook from 'react-pageflip';
import { forwardRef, useRef, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ExternalLink, Play, BookOpen, ArrowLeft, FileText } from 'lucide-react';
import { GuidePage as GuidePageData } from '@/api/entities';
import { track } from '@/lib/tracking';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const M = '/magazines';

// ── Page wrapper required by react-pageflip ──────────────────────────────────
const MagazinePage = forwardRef(function MagazinePage({ children }, ref) {
  return (
    <div ref={ref} className="relative overflow-hidden" style={{ backgroundColor: '#fff' }}>
      <div className="absolute inset-0">{children}</div>
    </div>
  );
});
MagazinePage.displayName = 'MagazinePage';

// ── Shared ───────────────────────────────────────────────────────────────────
function Strip({ label }) {
  return (
    <div className="flex items-center justify-between px-3 py-0.5 shrink-0" style={{ background: '#eab308' }}>
      <span className="text-slate-900 font-black uppercase tracking-widest" style={{ fontSize: 9 }}>{label}</span>
      <span className="text-slate-900 font-bold" style={{ fontSize: 9 }}>{EVENT_CONFIG.website.replace('https://', '')}</span>
    </div>
  );
}

function PNum({ n, right }) {
  return (
    <div className={`absolute bottom-1.5 ${right ? 'right-3' : 'left-3'} text-slate-400`} style={{ fontSize: 8 }}>{n}</div>
  );
}

function AdLink({ href, children, bg = '#fff', color = '#0f172a', onAdClick }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 font-bold transition-opacity hover:opacity-90 active:opacity-75"
      style={{ background: bg, color, fontSize: 11, textDecoration: 'none' }}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onAdClick?.(); }}
    >
      {children}
    </a>
  );
}

function ManagedImageAd({ config, defaultSrc, advertiser, contain = false, defaultUrl }) {
  const imageUrl = config?.image_url || defaultSrc;
  const clickUrl = config?.click_url || defaultUrl;
  const stop = e => e.stopPropagation();
  const imgStyle = { objectFit: contain ? 'contain' : 'fill' };
  const imgClass = contain ? 'w-full select-none' : 'absolute inset-0 w-full h-full select-none';
  const wrapper = contain ? 'absolute inset-0 bg-white flex flex-col items-center justify-center' : 'absolute inset-0';

  if (clickUrl) {
    return (
      <a
        href={clickUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block ${wrapper}`}
        onMouseDown={stop}
        onTouchStart={stop}
        onClick={e => { stop(e); track('', advertiser, 'ad_click', 'magazine'); }}
      >
        <img src={imageUrl} alt={advertiser} className={imgClass} style={imgStyle} draggable={false} />
      </a>
    );
  }
  return (
    <div className={wrapper}>
      <img src={imageUrl} alt={advertiser} className={imgClass} style={imgStyle} draggable={false} />
    </div>
  );
}

// ── PAGE 1: Cover ─────────────────────────────────────────────────────────────
function CoverPage() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'linear-gradient(160deg,#0b1f14 0%,#123821 60%,#0b1f14 100%)' }}>
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ background: '#eab308' }}>
        <span className="text-slate-900 font-black uppercase tracking-widest" style={{ fontSize: 9 }}>Official Exhibition Guide</span>
        <span className="text-slate-900 font-bold uppercase" style={{ fontSize: 9 }}>04–06 June 2026</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-between px-5 py-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle,#eab308 1.5px,transparent 1.5px)', backgroundSize: '20px 20px' }} />
        <div className="w-full flex justify-between items-start">
          <img src={EVENT_CONFIG.logo.transparent} alt={EVENT_CONFIG.eventName} className="object-contain drop-shadow-lg" style={{ width: 52, height: 52 }} />
          <div className="text-right">
            <div className="text-slate-500 uppercase tracking-widest" style={{ fontSize: 8 }}>Vol. 1 · Issue 1</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-amber-400 uppercase tracking-[0.3em] font-bold mb-1" style={{ fontSize: 9 }}>Zimbabwe's Largest</div>
          <div className="font-black leading-none" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 52, color: '#fff', lineHeight: 1 }}>
            ADMA <span style={{ color: '#eab308' }}>AGRI</span>SHOW
          </div>
          <div className="font-black" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 26, color: '#86efac', lineHeight: 1.2 }}>2026</div>
          <div className="text-slate-400 mt-1" style={{ fontSize: 10 }}>Agricultural Machinery, Inputs & Livestock Exhibition</div>
        </div>
        <div className="w-full rounded-lg overflow-hidden" style={{ height: 130, background: 'linear-gradient(135deg,#14532d 0%,#166534 50%,#0f2e1c 100%)' }}>
          <div className="h-full flex items-center justify-center gap-3 opacity-50 px-4">
            {[['🚜','Machinery'],['🐄','Livestock'],['💧','Irrigation']].map(([i,l]) => (
              <div key={l} className="flex flex-col items-center gap-1 flex-1">
                <div className="rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', width: 52, height: 52, fontSize: 22 }}>{i}</div>
                <div className="text-slate-400 text-center" style={{ fontSize: 8 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full rounded-lg px-3 py-2 flex justify-between" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
          {[['231','Exhibitors'],['25','Acres'],['4','Zones']].map(([n,l]) => (
            <div key={l} className="text-center">
              <div className="text-amber-400 font-black" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif' }}>{n}</div>
              <div className="text-slate-400" style={{ fontSize: 8 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-2 shrink-0" style={{ background: '#0b1f14' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-amber-400 font-bold" style={{ fontSize: 10 }}>{EVENT_CONFIG.venue}</div>
            <div className="text-slate-500" style={{ fontSize: 8 }}>Zimbabwe · 04–06 June 2026</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 font-bold" style={{ fontSize: 9 }}>Machinery · Livestock</div>
            <div className="text-slate-500" style={{ fontSize: 8 }}>Inputs · Finance</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PAGE 2: Welcome ───────────────────────────────────────────────────────────
function WelcomePage() {
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Welcome" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-amber-200 pb-2 shrink-0">
          <div className="w-7 h-7 rounded flex items-center justify-center text-white font-black shrink-0" style={{ background: '#166534', fontSize: 12, fontFamily: 'Barlow Condensed,sans-serif' }}>AD</div>
          <div>
            <div className="font-black uppercase text-slate-800" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif' }}>Welcome to {EVENT_CONFIG.eventFullName}</div>
            <div className="text-slate-500" style={{ fontSize: 9 }}>A Message from the Organising Committee</div>
          </div>
        </div>
        <div className="w-full rounded overflow-hidden shrink-0" style={{ height: 75, background: 'linear-gradient(135deg,#14532d 0%,#166534 100%)' }}>
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white opacity-50">
              <div style={{ fontSize: 24 }}>🚜</div>
              <div className="uppercase tracking-widest font-bold" style={{ fontSize: 8 }}>{EVENT_CONFIG.venue}</div>
            </div>
          </div>
        </div>
        <div className="text-slate-600 leading-relaxed flex-1" style={{ fontSize: 9.5 }}>
          <p className="mb-2">Dear Visitor,</p>
          <p className="mb-2">On behalf of the ADMA Organising Committee, it is with great pride and excitement that we welcome you to Zimbabwe's largest agricultural exhibition.</p>
          <p className="mb-2">This year's show brings together over <strong>231 exhibitors</strong> — from machinery dealers and irrigation specialists to livestock breeders, input suppliers, and agri-financiers — all set on 25 acres at <strong>{EVENT_CONFIG.venue}</strong>.</p>
          <p className="mb-2">Zimbabwe's agricultural sector is entering a season of renewed growth. {EVENT_CONFIG.eventName} is the platform where deals are made, partnerships are forged, and the future of our farming community is shaped.</p>
          <p>Whether you are a farmer seeking the latest equipment or an investor exploring agribusiness opportunities — {EVENT_CONFIG.eventName} is the place to be.</p>
        </div>
        <div className="border-t border-slate-100 pt-2 flex items-center justify-between shrink-0">
          <div>
            <div className="font-bold text-slate-800" style={{ fontSize: 10 }}>The {EVENT_CONFIG.eventName}</div>
            <div className="text-amber-600 font-bold" style={{ fontSize: 9 }}>Organising Committee</div>
          </div>
          <div className="text-slate-400 text-right" style={{ fontSize: 8 }}>
            <div>{EVENT_CONFIG.website.replace('https://', '')}</div>
            <div>#ADMAAgriShow2026</div>
          </div>
        </div>
      </div>
      <PNum n={2} />
    </div>
  );
}

// ── PAGE 3: Contents ──────────────────────────────────────────────────────────
function ContentsPage() {
  const items = [
    ['04','Event Overview','Dates, venues & what to expect'],
    ['06','Platinum Sponsors','Our premier exhibition partners'],
    ['08','Exhibition Site Map','Zone guide & stand finder'],
    ['10','Industry Insights','Zimbabwe Agriculture Sector 2026'],
    ['12','Product Spotlights','Must-see equipment on show'],
    ['14','Exhibitor Directory','Full listing of all exhibitors'],
    ['16',`Why ${EVENT_CONFIG.eventName}?`,'Networking & business opportunities'],
  ];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Contents" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2 overflow-hidden">
        <div className="shrink-0">
          <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>{EVENT_CONFIG.eventFullName}</div>
          <div className="font-black uppercase text-slate-900" style={{ fontSize: 22, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1 }}>CONTENTS</div>
          <div className="h-0.5 w-10 mt-1" style={{ background: '#eab308' }} />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {items.map(([num, title, sub]) => (
            <div key={num} className="flex items-start gap-3 py-1.5 border-b border-slate-100">
              <div className="font-black text-amber-500 shrink-0" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif', minWidth: 22 }}>{num}</div>
              <div>
                <div className="font-bold text-slate-800" style={{ fontSize: 10.5 }}>{title}</div>
                <div className="text-slate-400" style={{ fontSize: 8.5 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2.5 shrink-0" style={{ background: 'linear-gradient(135deg,#0f2e1c 0%,#14532d 100%)' }}>
          <div className="text-amber-400 font-bold" style={{ fontSize: 9 }}>Clickable Ads Throughout This Magazine</div>
          <div className="text-slate-300 mt-0.5" style={{ fontSize: 8 }}>Look for the <span style={{ color: '#eab308' }}>↗ Visit Website</span> buttons on sponsor pages to explore exhibitor resources and product demos.</div>
        </div>
      </div>
      <PNum n={3} right />
    </div>
  );
}

// ── PAGE 4: Platinum Sponsors Ad (CLICKABLE CAROUSEL of real sponsor ads) ────
function PlatinumSponsorsCarouselAd() {
  const slides = [
    {
      img: `${M}/sponsor-ads/amcotts.jpg`,
      advertiser: 'Amcotts',
      category: 'Equipment & Tyres',
      model: 'Amcotts',
      headline: 'World-Class Equipment & Industrial Tyres',
      specs: [['Brands', 'XCMG · Shacman'], ['Branches', 'Harare & Bulawayo'], ['Service', 'Genuine Spares']],
      accent: '#dc2626',
      tag: 'Mining · Haulage · Agri',
      cta: { type: 'email', value: 'brett@amcotts.com', label: 'brett@amcotts.com' },
    },
    {
      img: `${M}/sponsor-ads/lozino.jpg`,
      advertiser: 'Lozino',
      category: 'Farm Machinery',
      model: 'Lozino',
      headline: 'Two New Machines This Season',
      specs: [['New', 'Gang Tiller'], ['New', 'Trailed Ridger'], ['Range', 'Planters & Sprayers']],
      accent: '#ea580c',
      tag: 'New Arrivals',
      cta: { type: 'url', value: 'https://www.lozino.co.zw', label: 'lozino.co.zw ↗' },
    },
    {
      img: `${M}/sponsor-ads/caltex.jpg`,
      advertiser: 'Caltex Braford Lubricants',
      category: 'Lubricants & Fluids',
      model: 'Caltex Braford',
      headline: 'Delivering Long-Term Value',
      specs: [['Est.', '20 Years'], ['Product', 'Super Tractor Oil'], ['Product', '1000 THF Fluid']],
      accent: '#0284c7',
      tag: 'Authorized Distributor',
      cta: { type: 'tel', value: '+263716211137', label: 'Harare +263 716 211 137' },
    },
    {
      img: `${M}/sponsor-ads/lovol.jpg`,
      advertiser: 'Lovol · AgriForce',
      category: 'Tractors',
      model: 'Lovol High HP Series',
      headline: 'Built for Every Farmer',
      specs: [['Series', 'High HP'], ['Trait', 'Reliability'], ['Dealer', 'AgriForce']],
      accent: '#1d4ed8',
      tag: 'Reliability',
      cta: null,
    },
  ];

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;
  const s = slides[idx];
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    track('', s.advertiser, 'carousel_view', 'magazine');
  }, [idx]);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIdx(i => (i + 1) % total), 4000);
    return () => clearTimeout(t);
  }, [idx, paused]);

  const stop = e => { e.stopPropagation(); e.preventDefault(); };
  const prev = e => { stop(e); setPaused(true); setIdx(i => (i - 1 + total) % total); };
  const next = e => { stop(e); setPaused(true); setIdx(i => (i + 1) % total); };

  const ctaHref = c => c.type === 'email' ? `mailto:${c.value}` : c.type === 'tel' ? `tel:${c.value}` : c.value;

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ background: '#0a0a0a' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ background: '#166534' }}>
        <span className="text-white font-black tracking-[0.15em]" style={{ fontSize: 12, fontFamily: 'Barlow Condensed,sans-serif' }}>PLATINUM SPONSORS</span>
        <span className="text-white font-bold" style={{ fontSize: 7.5 }}>{EVENT_CONFIG.eventFullName}</span>
      </div>

      {/* Product image — top ~48% */}
      <div className="relative shrink-0 overflow-hidden" style={{ height: '48%', background: '#fff' }}>
        <img
          key={s.img}
          src={s.img}
          alt={s.advertiser}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'top' }}
          draggable={false}
        />
        {/* Dark gradient overlay at bottom for text legibility */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.8) 100%)' }} />
        {/* Category + model over image */}
        <div className="absolute bottom-2 left-3 right-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="rounded px-1.5 py-0.5 text-white font-bold uppercase" style={{ background: s.accent, fontSize: 6.5 }}>{s.category}</span>
            <span className="rounded px-1.5 py-0.5 font-bold uppercase" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: 6.5 }}>{s.tag}</span>
          </div>
          <div className="font-black text-white leading-none" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 20, lineHeight: 1, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{s.advertiser}</div>
          <div className="font-semibold mt-0.5" style={{ fontSize: 9, color: s.accent, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{s.headline}</div>
        </div>
        {/* Prev / Next arrows on image */}
        <button style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 15, cursor: 'pointer' }} onMouseDown={stop} onTouchStart={stop} onClick={prev}>‹</button>
        <button style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 15, cursor: 'pointer' }} onMouseDown={stop} onTouchStart={stop} onClick={next}>›</button>
      </div>

      {/* Accent line */}
      <div className="shrink-0" style={{ height: 3, background: s.accent, transition: 'background 0.4s' }} />

      {/* Specs + nav */}
      <div className="flex-1 flex flex-col justify-between px-4 py-2.5 overflow-hidden">
        <div className="grid grid-cols-3 gap-1.5 shrink-0">
          {s.specs.map(([label, val]) => (
            <div key={label} className="rounded-lg text-center py-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <div className="font-black text-white" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 13, lineHeight: 1 }}>{val}</div>
              <div className="mt-0.5" style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.4)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={e => { stop(e); setPaused(true); setIdx(i); }}
              style={{ height: 5, borderRadius: 3, cursor: 'pointer', transition: 'all 0.3s', width: i === idx ? 18 : 5, background: i === idx ? s.accent : 'rgba(255,255,255,0.2)' }}
            />
          ))}
        </div>

        {/* CTA — only shown when the advertiser printed a real contact channel */}
        {s.cta ? (
          <AdLink
            href={ctaHref(s.cta)}
            bg={s.accent}
            color="#fff"
            onAdClick={() => track('', s.advertiser, 'ad_click', 'magazine')}
          >
            <ExternalLink size={11} /> {s.cta.label}
          </AdLink>
        ) : (
          <div className="text-center" style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{s.advertiser}</div>
        )}
      </div>
    </div>
  );
}

// ── PAGE 5: Event Overview ────────────────────────────────────────────────────
function EventOverviewPage() {
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Event Overview" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="shrink-0">
          <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>{EVENT_CONFIG.eventFullName}</div>
          <div className="font-black text-slate-900 leading-tight" style={{ fontSize: 20, fontFamily: 'Barlow Condensed,sans-serif' }}>EVENT OVERVIEW</div>
          <div className="h-0.5 w-10 mt-0.5" style={{ background: '#eab308' }} />
        </div>
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {[['📅','Dates','04–06 June 2026'],['📍','Venue','ART Farm, Pomona'],['🕐','Hours','08:00 – 17:00'],['🎫','Entry','Free (Registered)']].map(([i,l,v]) => (
            <div key={l} className="rounded-lg p-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 16 }}>{i}</div>
              <div className="text-slate-500 mt-0.5" style={{ fontSize: 8 }}>{l}</div>
              <div className="font-bold text-slate-800" style={{ fontSize: 10 }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg px-3 py-2 grid grid-cols-3 gap-2 shrink-0" style={{ background: 'linear-gradient(135deg,#0f2e1c 0%,#14532d 100%)' }}>
          {[['231','Exhibitors'],['25','Acres'],['4','Zones']].map(([n,l]) => (
            <div key={l} className="text-center">
              <div className="text-amber-400 font-black" style={{ fontSize: 16, fontFamily: 'Barlow Condensed,sans-serif' }}>{n}</div>
              <div className="text-slate-400" style={{ fontSize: 8 }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="shrink-0">
          <div className="text-slate-700 font-bold uppercase tracking-wide mb-1.5" style={{ fontSize: 10 }}>Exhibition Zones</div>
          <div className="flex flex-col gap-1.5">
            {[['#16a34a','A','Main Pavilion','Platinum'],['#eab308','B','Machinery Hall','Gold'],['#94a3b8','C','Suppliers Village','Silver'],['#92400e','D','Field Zone','Bronze']].map(([col,z,n,t]) => (
              <div key={z} className="flex items-center gap-2">
                <div className="rounded shrink-0" style={{ width: 10, height: 10, background: col }} />
                <span className="font-bold text-slate-800" style={{ fontSize: 10 }}>Zone {z} – {n}</span>
                <span className="text-slate-400" style={{ fontSize: 9 }}>· {t} Exhibitors</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg p-2.5 mt-auto shrink-0" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div className="text-amber-800 font-bold" style={{ fontSize: 9.5 }}>What to Expect</div>
          <div className="text-amber-700 mt-0.5" style={{ fontSize: 8.5 }}>Live demos · Livestock auctions · Industry keynotes · Networking · Procurement opportunities</div>
        </div>
      </div>
      <PNum n={5} right />
    </div>
  );
}

// ── PAGE 7: Zimplow (image + real product video) ─────────────────────────────
function VideoAdPage({ config }) {
  const imageUrl = config?.image_url || `${EVENT_CONFIG.s3Base}/gallery-images/e25-1784063469379-nd9qcw.jpg`;
  const videoEmbed = config?.video_url || 'https://www.youtube.com/embed/InVKgq2F8ZU';
  const clickUrl = config?.click_url || 'https://www.zimplow.co.zw';
  const stop = e => { e.stopPropagation(); };
  const playTracked = useRef(false);

  const handlePlay = () => {
    if (playTracked.current) return;
    playTracked.current = true;
    track('', 'Zimplow', 'video_play', 'magazine');
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#000' }}>
      {/* Zimplow header */}
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ background: '#14532d' }}>
        <span className="text-white font-black tracking-[0.2em]" style={{ fontSize: 14, fontFamily: 'Barlow Condensed,sans-serif' }}>ZIMPLOW</span>
        <span className="text-white font-bold" style={{ fontSize: 7.5 }}>{EVENT_CONFIG.eventFullName} · Stand A24</span>
      </div>
      {/* Ad image — clickable */}
      <div className="shrink-0" style={{ height: '48%' }}>
        <a
          href={clickUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full relative"
          onMouseDown={stop}
          onTouchStart={stop}
          onClick={e => { stop(e); track('', 'Zimplow', 'ad_click', 'magazine'); }}
        >
          <img src={imageUrl} alt="Zimplow Mealie Brand implements" className="w-full h-full select-none" style={{ objectFit: 'contain', background: '#fff' }} draggable={false} />
          <div className="absolute bottom-1.5 left-3 right-3 text-white font-bold" style={{ fontSize: 9, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>Mealie Brand — Rugged Implements Since 1939 ↗</div>
        </a>
      </div>
      {/* Video — real product video */}
      <div
        className="flex-1 overflow-hidden"
        onMouseDown={stop} onTouchStart={stop} onPointerDown={stop} onClick={stop}
      >
        <iframe
          key={videoEmbed}
          src={videoEmbed}
          title="Zimplow product video"
          className="w-full h-full"
          style={{ background: '#000', display: 'block', border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={handlePlay}
        />
      </div>
    </div>
  );
}

// ── PAGE 16: Interactive Hotspot Ad (new ad format demo) ─────────────────────
function HotspotAd({ config }) {
  const spots = [
    { id: 'a', x: 30, y: 40, title: 'Built to Last', detail: 'Reinforced chassis rated for heavy daily field use.' },
    { id: 'b', x: 68, y: 28, title: 'Comfort Cab', detail: 'Climate-controlled cab with 360° field visibility.' },
    { id: 'c', x: 50, y: 76, title: 'Finance From', detail: '$450/month — 0% deposit packages available at the show.' },
  ];
  const [active, setActive] = useState(null);
  const viewTracked = useRef(false);
  const stop = e => { e.stopPropagation(); e.preventDefault(); };

  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;
    track('', 'Sample Exhibitor', 'hotspot_ad_view', 'magazine');
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f2e1c 0%,#166534 60%,#0f2e1c 100%)' }}>
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ background: '#eab308' }}>
        <span className="text-slate-900 font-black uppercase tracking-widest" style={{ fontSize: 9 }}>New — Interactive Ad</span>
        <span className="text-slate-900 font-bold" style={{ fontSize: 9 }}>Tap the markers ↓</span>
      </div>

      <div className="relative flex-1" onMouseDown={stop} onTouchStart={stop}>
        <div className="absolute inset-0 flex items-center justify-center opacity-15 select-none" style={{ fontSize: 150 }}>🚜</div>
        <div className="absolute top-2 left-3 text-amber-400 font-black uppercase tracking-widest" style={{ fontSize: 9 }}>Sample Exhibitor</div>

        {spots.map(s => (
          <button
            key={s.id}
            onMouseDown={stop}
            onTouchStart={stop}
            onClick={e => { stop(e); const next = active === s.id ? null : s.id; setActive(next); if (next) track('', 'Sample Exhibitor', 'hotspot_click', 'magazine'); }}
            style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%,-50%)', width: 22, height: 22 }}
            className={`rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform ${active === s.id ? 'bg-white scale-110' : 'bg-amber-400 animate-pulse'}`}
          >
            <span className="font-black" style={{ fontSize: 12, color: active === s.id ? '#eab308' : '#0f172a' }}>{active === s.id ? '×' : '+'}</span>
          </button>
        ))}

        {active && (() => {
          const s = spots.find(x => x.id === active);
          return (
            <div className="absolute inset-x-4 bottom-4 bg-white rounded-xl p-3 shadow-xl" onMouseDown={stop} onTouchStart={stop}>
              <div className="font-black text-slate-900" style={{ fontSize: 13 }}>{s.title}</div>
              <div className="text-slate-600 mt-0.5" style={{ fontSize: 10 }}>{s.detail}</div>
            </div>
          );
        })()}
      </div>

      <div className="p-3 shrink-0">
        <AdLink
          href={config?.click_url || EVENT_CONFIG.website}
          bg="#eab308"
          color="#0f172a"
          onAdClick={() => track('', 'Sample Exhibitor', 'ad_click', 'magazine')}
        >
          <ExternalLink size={11} /> Learn More ↗
        </AdLink>
      </div>
    </div>
  );
}

// ── PAGE 8: Site Plan ─────────────────────────────────────────────────────────
function SitePlanPage() {
  const zones = [['#16a34a','A','MAIN PAVILION','A01–A30','Platinum',30],['#eab308','B','MACHINERY HALL','B01–B80','Gold',80],['#94a3b8','C','SUPPLIERS VILLAGE','C01–C90','Silver',90],['#92400e','D','FIELD ZONE','D01–D80','Bronze',80]];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Exhibition Site Map" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0">
          <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>{EVENT_CONFIG.venue}</div>
          <div className="font-black text-slate-900 leading-tight" style={{ fontSize: 20, fontFamily: 'Barlow Condensed,sans-serif' }}>EXHIBITION SITE PLAN</div>
        </div>
        <div className="rounded-xl overflow-hidden shrink-0" style={{ border: '2px solid #e2e8f0' }}>
          <div className="text-center py-1" style={{ background: '#f8fafc', fontSize: 8, borderBottom: '1px solid #e2e8f0', color: '#475569' }}>▼ MAIN ENTRANCE — ART Farm Road, Pomona</div>
          <div className="grid grid-cols-2 gap-0.5 p-0.5" style={{ background: '#e2e8f0' }}>
            {zones.map(([col,z,n,b,t]) => (
              <div key={z} className="rounded p-2" style={{ background: col + '18', borderLeft: `3px solid ${col}` }}>
                <div className="font-black" style={{ fontSize: 18, color: col, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1 }}>ZONE {z}</div>
                <div className="font-bold text-slate-700" style={{ fontSize: 8.5 }}>{n}</div>
                <div className="text-slate-500" style={{ fontSize: 8 }}>{b}</div>
                <div className="rounded-sm px-1 py-0.5 text-white font-bold mt-1 inline-block" style={{ background: col, fontSize: 7 }}>{t}</div>
              </div>
            ))}
          </div>
          <div className="text-center py-1 text-slate-500" style={{ background: '#f8fafc', fontSize: 8, borderTop: '1px solid #e2e8f0' }}>🅿️ Parking · 🍽️ Catering · 🏥 First Aid · 📱 App Desk</div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 shrink-0">
          {zones.map(([col,z,,n,t,count]) => (
            <div key={z} className="flex items-center gap-2">
              <div className="rounded-sm shrink-0 flex items-center justify-center" style={{ width: 16, height: 16, background: col }}>
                <span className="text-white font-black" style={{ fontSize: 9 }}>{z}</span>
              </div>
              <div>
                <div className="text-slate-700 font-bold" style={{ fontSize: 9 }}>{n} · {t}</div>
                <div className="text-slate-400" style={{ fontSize: 8 }}>{count} stands</div>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2.5 mt-auto shrink-0" style={{ background: '#0f2e1c' }}>
          <div className="text-amber-400 font-bold" style={{ fontSize: 9 }}>📱 Interactive Map in the {EVENT_CONFIG.eventName} App</div>
          <div className="text-slate-400 mt-0.5" style={{ fontSize: 8 }}>Download for real-time stand finder, exhibitor contacts & live demo schedules.</div>
        </div>
      </div>
      <PNum n={8} />
    </div>
  );
}

// ── PAGE 9: Industry Insight ──────────────────────────────────────────────────
function IndustryInsightPage() {
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Industry Insight" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="shrink-0">
          <div className="text-amber-500 uppercase tracking-widest font-bold" style={{ fontSize: 8 }}>Feature Article</div>
          <div className="font-black text-slate-900 leading-tight" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif' }}>ZIMBABWE AGRICULTURE 2026: MECHANISATION, MARKETS & OPPORTUNITY</div>
          <div className="h-0.5 w-12 mt-1" style={{ background: '#eab308' }} />
        </div>
        <div className="grid grid-cols-3 gap-1.5 shrink-0">
          {[['231','Exhibitors\nconfirmed 2026'],['25','Acres of\nshowground'],['↑','Mechanisation\ndemand rising']].map(([n,l]) => (
            <div key={n} className="rounded-lg p-2 text-center" style={{ background: '#0f2e1c' }}>
              <div className="text-amber-400 font-black" style={{ fontSize: 13, fontFamily: 'Barlow Condensed,sans-serif' }}>{n}</div>
              <div className="text-slate-400 whitespace-pre-line" style={{ fontSize: 7.5 }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="text-slate-600 leading-relaxed flex-1" style={{ fontSize: 9.5 }}>
          <p className="mb-2">Zimbabwe's agricultural sector enters 2026 with renewed momentum, driven by growing demand for mechanisation, expanding irrigation infrastructure, and a resurgent livestock trade. Government-backed input support schemes and private-sector financing are reshaping how farmers access tractors, implements, and inputs ahead of the new season.</p>
          <p className="mb-2">Irrigation is a defining growth area — solar-powered pumping and centre-pivot systems are increasingly viewed as essential for climate resilience, as more farmers move away from purely rain-fed production toward year-round, water-secure operations.</p>
          <p><strong>Mechanisation and finance</strong> are the twin themes of this year's show. From entry-level tractors to precision implements, and from agri-insurance to asset finance, {EVENT_CONFIG.eventName} brings the full value chain together — creating robust demand for the machinery, inputs, and services on display.</p>
        </div>
        <div className="rounded-lg p-2.5 shrink-0" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div className="text-amber-800 font-bold" style={{ fontSize: 9 }}>Key Trend: Farm Mechanisation</div>
          <div className="text-amber-700 mt-0.5" style={{ fontSize: 8.5 }}>Demand for tractors, implements and irrigation equipment continues to climb. {EVENT_CONFIG.eventName} is the platform to source, evaluate and procure across all major categories.</div>
        </div>
      </div>
      <PNum n={9} right />
    </div>
  );
}


// ── PAGE 11: Exhibitor Directory ──────────────────────────────────────────────
function ExhibitorDirectoryPage() {
  const list = [
    ['A01','Afritractors'],['A02','Agricon'],['A03','Agriforce'],
    ['A04','Amcotts'],['A05','Amtec'],['A06','Bain'],
    ['A07','Brown Engineering Group'],['A08','Centre Pivot Irrigation'],['A09','Cloverleaf Motors'],
    ['A10','Croco Motors'],
  ];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Exhibitor Directory" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>Main Pavilion · Zone A</div>
            <div className="font-black text-slate-900" style={{ fontSize: 18, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1 }}>PLATINUM EXHIBITORS</div>
          </div>
          <div className="rounded px-2 py-0.5 text-white font-bold" style={{ background: '#16a34a', fontSize: 8 }}>PLATINUM TIER</div>
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          {list.map(([b,n]) => (
            <div key={b} className="flex items-center gap-2 py-1 border-b border-slate-100">
              <div className="rounded px-1.5 py-0.5 font-bold text-white shrink-0" style={{ background: '#16a34a', fontSize: 8, minWidth: 30 }}>{b}</div>
              <div className="text-slate-700 font-medium" style={{ fontSize: 9.5 }}>{n}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2 text-center shrink-0" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div className="text-green-700 font-bold" style={{ fontSize: 8.5 }}>Gold, Silver & Bronze exhibitor directories in the {EVENT_CONFIG.eventName} App</div>
        </div>
      </div>
      <PNum n={11} right />
    </div>
  );
}


// ── PAGE 13: Why Attend ───────────────────────────────────────────────────────
function WhyAttendPage() {
  const reasons = [['🤝','Network','Farmers, dealers & agribusiness leaders'],['🚜','See Equipment','231 exhibitors, live demos'],['📊','Industry Intel','Keynotes from sector leaders'],['💰','Procurement','Compare & close deals on-site'],['📱','Go Digital','App for meetings, QR & schedules'],['🐄','Livestock Auctions','Buy and sell on the show floor']];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label={`Why Attend ${EVENT_CONFIG.eventName}?`} />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="shrink-0 flex items-start justify-between">
          <div>
            <div className="text-amber-500 uppercase tracking-widest font-bold" style={{ fontSize: 8 }}>{EVENT_CONFIG.eventFullName}</div>
            <div className="font-black text-slate-900 leading-tight" style={{ fontSize: 20, fontFamily: 'Barlow Condensed,sans-serif' }}>WHY ATTEND?</div>
            <div className="h-0.5 w-10 mt-0.5" style={{ background: '#eab308' }} />
          </div>
          <img src={EVENT_CONFIG.logo.transparent} alt={EVENT_CONFIG.eventName} className="object-contain" style={{ width: 38, height: 38 }} />
        </div>
        <div className="rounded-xl p-3 shrink-0" style={{ background: 'linear-gradient(135deg,#0f2e1c 0%,#14532d 100%)' }}>
          <div className="text-slate-300 italic" style={{ fontSize: 10 }}>"{EVENT_CONFIG.eventName} is where Zimbabwe's agricultural community comes together — to do business, to learn, and to shape the future of our sector."</div>
          <div className="text-amber-400 font-bold mt-1.5" style={{ fontSize: 9 }}>— {EVENT_CONFIG.eventName} Organising Committee</div>
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1">
          {reasons.map(([i,t,d]) => (
            <div key={t} className="rounded-lg p-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 18 }}>{i}</div>
              <div className="font-bold text-slate-800 mt-1" style={{ fontSize: 10 }}>{t}</div>
              <div className="text-slate-500" style={{ fontSize: 8.5 }}>{d}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2.5 text-center shrink-0" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div className="text-amber-800 font-bold" style={{ fontSize: 11 }}>Register Free — {EVENT_CONFIG.website.replace('https://', '')}</div>
          <div className="text-amber-600" style={{ fontSize: 8.5 }}>Download the {EVENT_CONFIG.eventName} app · #ADMAAgriShow2026</div>
        </div>
      </div>
      <PNum n={13} right />
    </div>
  );
}

// ── PAGE 14: Back Cover ───────────────────────────────────────────────────────
function BackCoverPage() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'linear-gradient(160deg,#0b1f14 0%,#123821 60%,#0b1f14 100%)' }}>
      <div className="flex-1 flex flex-col items-center justify-between px-5 py-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle,#eab308 1.5px,transparent 1.5px)', backgroundSize: '20px 20px' }} />
        <div className="text-center w-full">
          <img src={EVENT_CONFIG.logo.transparent} alt={EVENT_CONFIG.eventName} className="object-contain mx-auto mb-2 drop-shadow-lg" style={{ width: 56, height: 56 }} />
          <div className="font-black text-amber-400" style={{ fontSize: 18, fontFamily: 'Barlow Condensed,sans-serif' }}>ADMA AGRI SHOW 2026</div>
          <div className="text-slate-400" style={{ fontSize: 9.5 }}>Zimbabwe's Largest Agricultural Exhibition</div>
        </div>
        <div className="text-center">
          <div className="font-black text-white" style={{ fontSize: 28, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1.1 }}>See you at<br />the show!</div>
          <div className="text-amber-400 mt-2" style={{ fontSize: 10 }}>04–06 June 2026 · {EVENT_CONFIG.venue}</div>
        </div>
        <div className="w-full rounded-xl p-4" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <div className="flex flex-col gap-1.5">
            {[['📍', `${EVENT_CONFIG.venue}, Zimbabwe`],['🌐', EVENT_CONFIG.website.replace('https://', '')],['📧', EVENT_CONFIG.contactEmail]].map(([i,t]) => (
              <div key={t} className="flex items-center justify-center gap-2 text-slate-300" style={{ fontSize: 9.5 }}><span>{i}</span>{t}</div>
            ))}
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold mt-1" style={{ fontSize: 10 }}>📱 #ADMAAgriShow2026</div>
          </div>
        </div>
        <div className="w-full">
          <div className="text-slate-500 text-center uppercase tracking-widest mb-2" style={{ fontSize: 7 }}>Platinum Sponsors</div>
          <div className="flex justify-center gap-2 flex-wrap">
            {['Afritractors','Agricon','Agriforce','Amcotts','Amtec','Bain'].map(s => (
              <div key={s} className="rounded px-2 py-0.5 text-slate-300 font-bold" style={{ background: 'rgba(255,255,255,0.06)', fontSize: 8 }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ background: '#eab308' }}>
        <span className="text-slate-900 font-black uppercase tracking-widest" style={{ fontSize: 8 }}>{EVENT_CONFIG.eventFullName}</span>
        <span className="text-slate-900 font-bold" style={{ fontSize: 8 }}>{EVENT_CONFIG.website.replace('https://', '')}</span>
      </div>
    </div>
  );
}

// ── Exhibition Guide flip-book viewer ─────────────────────────────────────────
function GuideViewer({ onBack, isMobile }) {
  const bookRef = useRef(null);
  const [bookKey, setBookKey] = useState(isMobile ? 'mb' : 'dk');
  const [currentPage, setCurrentPage] = useState(0);
  const { data: guidePageData = [] } = useQuery({
    queryKey: ['guide-pages'],
    queryFn: () => GuidePageData.list(),
    staleTime: 60_000,
  });
  const cfg = Object.fromEntries(guidePageData.map(p => [String(p.page_num), p]));

  useEffect(() => {
    setBookKey(isMobile ? 'mb' : 'dk');
  }, [isMobile]);

  const onFlip = useCallback(e => setCurrentPage(e.data), []);

  useEffect(() => {
    document.querySelectorAll('video').forEach(v => v.pause());
  }, [currentPage]);

  const flipPrev = () => bookRef.current?.pageFlip().flipPrev();
  const flipNext = () => bookRef.current?.pageFlip().flipNext();

  const TOTAL = 16;
  const spreadLabel = isMobile
    ? `Page ${currentPage + 1} of ${TOTAL}`
    : currentPage === 0 ? 'Cover'
    : currentPage === TOTAL - 2 ? 'Back Cover'
    : currentPage === TOTAL - 1 ? 'New Ad Format'
    : `Pages ${currentPage}–${currentPage + 1} of ${TOTAL}`;

  return (
    <div className="pb-24 pt-2 lg:py-8">
      <div className="px-4 mb-3 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Publications
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-semibold">{EVENT_CONFIG.eventFullName} Exhibition Guide</span>
      </div>

      <div className="w-full" style={{ touchAction: 'pan-y' }}>
        <HTMLFlipBook
          key={bookKey}
          ref={bookRef}
          width={420}
          height={544}
          size="stretch"
          minWidth={200}
          maxWidth={600}
          minHeight={259}
          maxHeight={780}
          maxShadowOpacity={0.5}
          showCover
          mobileScrollSupport
          usePortrait={isMobile}
          onFlip={onFlip}
          flippingTime={650}
          drawShadow
          showPageCorners
          disableFlipByClick={false}
          swipeDistance={30}
          style={{ margin: '0 auto', display: 'block' }}
        >
          <MagazinePage key="p1"><CoverPage /></MagazinePage>
          <MagazinePage key="p2"><WelcomePage /></MagazinePage>
          <MagazinePage key="p3"><ContentsPage /></MagazinePage>
          <MagazinePage key="p4"><PlatinumSponsorsCarouselAd /></MagazinePage>
          <MagazinePage key="p5"><EventOverviewPage /></MagazinePage>
          <MagazinePage key="p6"><ManagedImageAd config={cfg['6']} defaultSrc={`${M}/sponsor-ads/stanserv.jpg`} advertiser="Stanserv Genuine Services" contain defaultUrl="https://www.sgs-stanserv.com" /></MagazinePage>
          <MagazinePage key="p7"><VideoAdPage config={cfg['7']} /></MagazinePage>
          <MagazinePage key="p8"><SitePlanPage /></MagazinePage>
          <MagazinePage key="p9"><IndustryInsightPage /></MagazinePage>
          <MagazinePage key="p10"><ManagedImageAd config={cfg['10']} defaultSrc={`${M}/sponsor-ads/purleigh.jpg`} advertiser="Purleigh Investments" contain defaultUrl="https://www.purleigh.co.zw" /></MagazinePage>
          <MagazinePage key="p11"><ExhibitorDirectoryPage /></MagazinePage>
          <MagazinePage key="p12"><ManagedImageAd config={cfg['12']} defaultSrc={`${M}/sponsor-ads/rocsystems.jpg`} advertiser="ROC Systems" contain defaultUrl="https://www.rocsystemszim.com" /></MagazinePage>
          <MagazinePage key="p13"><ManagedImageAd config={cfg['13']} defaultSrc={`${M}/sponsor-ads/loadagropower.jpg`} advertiser="Load Agropower" contain defaultUrl="https://www.loadagropower.co.zw" /></MagazinePage>
          <MagazinePage key="p14"><WhyAttendPage /></MagazinePage>
          <MagazinePage key="p15"><BackCoverPage /></MagazinePage>
          <MagazinePage key="p16"><HotspotAd config={cfg['16']} /></MagazinePage>
        </HTMLFlipBook>
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 px-4">
        <button onClick={flipPrev} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-sm">
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <span className="text-sm text-muted-foreground font-medium">{spreadLabel}</span>
        <button onClick={flipNext} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-sm">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-3 px-4">
        <BookOpen className="inline w-3.5 h-3.5 mr-1" />
        {isMobile ? 'Swipe left/right or use arrows to turn pages' : 'Click page corners or drag to flip · Double-page spread on desktop'}
      </p>
    </div>
  );
}

// ── Interactive ad units layered into the real ADMA 2026 magazine ────────────
// Each swaps a flat scanned page for an interactive treatment built from that
// same advertiser's real print artwork (cropped from the page they actually
// bought), demonstrating the standard interactive-ad formats: hotspot/banner,
// image carousel, scrolling ticker, flashing/animated badge, and video.

function AmcottsHotspotAd() {
  const pins = [
    { id: 'brands', x: 78, y: 48, title: 'Genuine Brands', detail: 'XCMG · Shacman · Sailun · Powertrac · Maxam T-King — full range of equipment and tyres.' },
    { id: 'workshops', x: 68, y: 80, title: 'Workshops Nationwide', detail: 'Harare — 32 Anthony Road, Msasa. Bulawayo — 11 Bristol Road, North Belmont.' },
    { id: 'contact', x: 18, y: 62, title: 'Get In Touch', detail: 'Brett +263 77 247 1299 · Tinashe +263 77 218 9862 · Shepard +263 77 468 1122' },
  ];
  const [active, setActive] = useState(null);
  const stop = e => { e.stopPropagation(); e.preventDefault(); };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#fff' }} onMouseDown={stop} onTouchStart={stop}>
      <img src={`${M}/sponsor-ads/amcotts.jpg`} alt="Amcotts" className="absolute inset-0 w-full h-full select-none" style={{ objectFit: 'cover' }} draggable={false} />
      <div className="absolute top-2 left-2 rounded px-2 py-0.5 font-bold uppercase" style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 7 }}>Tap the markers ↓</div>
      {pins.map(p => (
        <button
          key={p.id}
          onMouseDown={stop}
          onTouchStart={stop}
          onClick={e => { stop(e); const next = active === p.id ? null : p.id; setActive(next); if (next) track('', 'Amcotts', 'hotspot_click', 'magazine'); }}
          style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%,-50%)', width: 22, height: 22 }}
          className={`rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform ${active === p.id ? 'bg-white scale-110' : 'bg-red-600 animate-pulse'}`}
        >
          <span className="font-black" style={{ fontSize: 12, color: active === p.id ? '#dc2626' : '#fff' }}>{active === p.id ? '×' : '+'}</span>
        </button>
      ))}
      {active && (() => {
        const p = pins.find(x => x.id === active);
        return (
          <div className="absolute inset-x-3 bottom-3 bg-white rounded-xl p-3 shadow-xl" style={{ border: '1px solid #e2e8f0' }}>
            <div className="font-black text-slate-900" style={{ fontSize: 12 }}>{p.title}</div>
            <div className="text-slate-600 mt-0.5" style={{ fontSize: 9.5 }}>{p.detail}</div>
          </div>
        );
      })()}
    </div>
  );
}

function LozinoCarouselAd() {
  const slides = [
    { img: `${M}/sponsor-ads/lozino-1-baler.jpg`, label: 'Baler' },
    { img: `${M}/sponsor-ads/lozino-2-sprayer.jpg`, label: 'Self-Propelled Sprayer' },
    { img: `${M}/sponsor-ads/lozino-3-planter.jpg`, label: 'New: Trailed Planter' },
    { img: `${M}/sponsor-ads/lozino-4-harrow.jpg`, label: 'New: Gang Tiller' },
  ];
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;
  const firstRender = useRef(true);
  const stop = e => { e.stopPropagation(); e.preventDefault(); };

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    track('', 'Lozino', 'carousel_view', 'magazine');
  }, [idx]);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIdx(i => (i + 1) % total), 3200);
    return () => clearTimeout(t);
  }, [idx, paused, total]);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#fff' }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0" style={{ background: '#000' }}>
        <span className="text-white font-black tracking-widest" style={{ fontSize: 12 }}>LOZINO</span>
        <span className="font-bold" style={{ fontSize: 7, color: '#f97316' }}>WITH TWO NEW MACHINES</span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {slides.map((sl, i) => (
          <img
            key={sl.img}
            src={sl.img}
            alt={sl.label}
            className="absolute inset-0 w-full h-full select-none transition-opacity duration-500"
            style={{ objectFit: 'cover', opacity: i === idx ? 1 : 0 }}
            draggable={false}
          />
        ))}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 65%, rgba(0,0,0,0.75) 100%)' }} />
        <div className="absolute bottom-2 left-3 right-3 font-black text-white" style={{ fontSize: 13, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{slides[idx].label}</div>
        <button style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 15 }} onMouseDown={stop} onTouchStart={stop} onClick={e => { stop(e); setPaused(true); setIdx(i => (i - 1 + total) % total); }}>‹</button>
        <button style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 15 }} onMouseDown={stop} onTouchStart={stop} onClick={e => { stop(e); setPaused(true); setIdx(i => (i + 1) % total); }}>›</button>
      </div>
      <div className="flex items-center justify-center gap-2 py-2 shrink-0">
        {slides.map((_, i) => (
          <div key={i} onMouseDown={stop} onTouchStart={stop} onClick={e => { stop(e); setPaused(true); setIdx(i); }} style={{ height: 5, borderRadius: 3, cursor: 'pointer', width: i === idx ? 18 : 5, background: i === idx ? '#f97316' : '#e2e8f0' }} />
        ))}
      </div>
      <AdLink href="https://www.lozino.co.zw" bg="#f97316" color="#fff" onAdClick={() => track('', 'Lozino', 'ad_click', 'magazine')}>
        <ExternalLink size={11} /> lozino.co.zw ↗
      </AdLink>
    </div>
  );
}

function CaltexMarqueeAd() {
  const ticker = "DELIVERING LONG-TERM VALUE  •  Super Tractor Oil SAE 15W-40  •  1000 THF Premium Hydraulic Fluid  •  Harare +263 716 211 137  •  Bulawayo +263 715 316 372  •  Hwange +263 716 141 241  •  Authorized Caltex Distributor  •  ";
  const stop = e => e.stopPropagation();
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#fff' }}>
      <style>{`@keyframes admaTicker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      <a
        href="tel:+263716211137"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0"
        onMouseDown={stop}
        onTouchStart={stop}
        onClick={e => { stop(e); track('', 'Caltex Braford Lubricants', 'ad_click', 'magazine'); }}
      >
        <img src={`${M}/sponsor-ads/caltex.jpg`} alt="Caltex Braford Lubricants" className="absolute inset-0 w-full h-full select-none" style={{ objectFit: 'cover' }} draggable={false} />
      </a>
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden py-1.5" style={{ background: 'rgba(2,132,199,0.92)' }}>
        <div className="whitespace-nowrap font-bold text-white" style={{ fontSize: 11, animation: 'admaTicker 16s linear infinite', width: 'max-content' }}>
          {ticker}{ticker}
        </div>
      </div>
    </div>
  );
}

function PurleighFlashAd() {
  const stop = e => e.stopPropagation();
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#fff' }}>
      <style>{`@keyframes admaFlash { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(1.06); } }`}</style>
      <a
        href="https://www.purleigh.co.zw"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0"
        onMouseDown={stop}
        onTouchStart={stop}
        onClick={e => { stop(e); track('', 'Purleigh Investments', 'ad_click', 'magazine'); }}
      >
        <img src={`${M}/sponsor-ads/purleigh.jpg`} alt="Purleigh Investments" className="absolute inset-0 w-full h-full select-none" style={{ objectFit: 'cover' }} draggable={false} />
      </a>
      <div
        className="absolute rounded-full flex flex-col items-center justify-center text-center shadow-xl"
        style={{ right: 14, bottom: '18%', width: 74, height: 74, background: '#f97316', border: '3px solid #fff', animation: 'admaFlash 1.4s ease-in-out infinite', pointerEvents: 'none' }}
      >
        <span className="font-black text-white leading-none" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 18 }}>2-3</span>
        <span className="font-bold text-white leading-none" style={{ fontSize: 7 }}>YEARS</span>
        <span className="font-bold text-white leading-none" style={{ fontSize: 7 }}>FINANCE</span>
      </div>
    </div>
  );
}

function ZimplowVideoInsert() {
  const stop = e => e.stopPropagation();
  const playTracked = useRef(false);
  const handlePlay = () => {
    if (playTracked.current) return;
    playTracked.current = true;
    track('', 'Zimplow', 'video_play', 'magazine');
  };
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#000' }}>
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0" style={{ background: '#14532d' }}>
        <span className="text-white font-black tracking-widest" style={{ fontSize: 11, fontFamily: 'Barlow Condensed,sans-serif' }}>ZIMPLOW</span>
        <span className="rounded px-1.5 py-0.5 font-bold uppercase" style={{ background: '#eab308', color: '#0f172a', fontSize: 6.5 }}>Digital Exclusive</span>
      </div>
      <div className="shrink-0" style={{ height: '38%' }}>
        <a
          href="https://www.zimplow.co.zw"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full"
          onMouseDown={stop}
          onTouchStart={stop}
          onClick={e => { stop(e); track('', 'Zimplow', 'ad_click', 'magazine'); }}
        >
          <img src={`${EVENT_CONFIG.s3Base}/gallery-images/e25-1784063469379-nd9qcw.jpg`} alt="Zimplow Mealie Brand implements" className="w-full h-full select-none" style={{ objectFit: 'contain', background: '#fff' }} draggable={false} />
        </a>
      </div>
      <div className="flex-1 overflow-hidden" onMouseDown={stop} onTouchStart={stop} onPointerDown={stop} onClick={stop}>
        <iframe
          src="https://www.youtube.com/embed/InVKgq2F8ZU"
          title="Zimplow product video"
          className="w-full h-full"
          style={{ background: '#000', display: 'block', border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={handlePlay}
        />
      </div>
      <div className="px-2 py-1 shrink-0 text-center" style={{ background: '#0b1f14', fontSize: 7, color: 'rgba(255,255,255,0.5)' }}>Mealie Brand — Rugged Implements Since 1939 · Stand A24</div>
    </div>
  );
}

const INTERACTIVE_AD_COMPONENTS = {
  amcotts: AmcottsHotspotAd,
  lozino: LozinoCarouselAd,
  caltex: CaltexMarqueeAd,
  purleigh: PurleighFlashAd,
  'zimplow-video': ZimplowVideoInsert,
};

// ── ADMA 2026 flip book (pre-rendered page images from the official magazine) ─
function ADMAFlipBook({ onBack, isMobile }) {
  const bookRef = useRef(null);
  const [bookKey, setBookKey] = useState(isMobile ? 'mb' : 'dk');
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setBookKey(isMobile ? 'mb' : 'dk');
  }, [isMobile]);

  // PDF pages 2-43 are landscape double-spreads (3047×1984) containing two magazine
  // pages side-by-side. Split each into left+right halves via objectPosition so the
  // flipbook shows proper portrait pages. PDF pages 1 and 44 are portrait singles.
  // A handful of real advertiser pages are upgraded to interactive units (hotspot,
  // carousel, marquee, flashing badge) instead of a flat scan, plus one digital-
  // exclusive video insert, to show the format is capable of interactive ads.
  const INTERACTIVE_PAGES = { '004-left': 'amcotts', '005-left': 'lozino', '009-left': 'caltex', '010-left': 'purleigh' };
  const admaPages = (() => {
    const list = [];
    list.push({ src: `${M}/adma-pages/page-001.jpg`, half: 'portrait' });
    list.push({ interactive: 'zimplow-video' });
    for (let i = 2; i <= 43; i++) {
      const n = String(i).padStart(3, '0');
      list.push({ src: `${M}/adma-pages/page-${n}.jpg`, half: 'left', interactive: INTERACTIVE_PAGES[`${n}-left`] });
      list.push({ src: `${M}/adma-pages/page-${n}.jpg`, half: 'right', interactive: INTERACTIVE_PAGES[`${n}-right`] });
    }
    list.push({ src: `${M}/adma-pages/page-044.jpg`, half: 'portrait' });
    return list;
  })();

  const TOTAL = admaPages.length; // 86
  const onFlip = useCallback(e => setCurrentPage(e.data), []);
  const flipPrev = () => bookRef.current?.pageFlip().flipPrev();
  const flipNext = () => bookRef.current?.pageFlip().flipNext();

  const spreadLabel = isMobile
    ? `Page ${currentPage + 1} of ${TOTAL}`
    : currentPage === 0 ? 'Cover'
    : currentPage >= TOTAL - 1 ? 'Back Cover'
    : `Pages ${currentPage}–${currentPage + 1} of ${TOTAL}`;

  return (
    <div className="pb-24 pt-2 lg:py-8">
      <div className="px-4 mb-3 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Publications
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-semibold">ADMA 2026 Agricultural Show Magazine</span>
        <a
          href={`${M}/adma-2026.pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" /> PDF
        </a>
      </div>

      <div className="w-full" style={{ touchAction: 'pan-y' }}>
        <HTMLFlipBook
          key={bookKey}
          ref={bookRef}
          width={420}
          height={544}
          size="stretch"
          minWidth={200}
          maxWidth={500}
          minHeight={259}
          maxHeight={660}
          maxShadowOpacity={0.5}
          showCover
          mobileScrollSupport
          usePortrait={isMobile}
          onFlip={onFlip}
          flippingTime={650}
          drawShadow
          showPageCorners
          disableFlipByClick={false}
          swipeDistance={30}
          style={{ margin: '0 auto', display: 'block' }}
        >
          {admaPages.map((p, i) => (
            <MagazinePage key={`adma-p${i}`}>
              {p.interactive ? (
                (() => { const Comp = INTERACTIVE_AD_COMPONENTS[p.interactive]; return <Comp />; })()
              ) : (
                <img
                  src={p.src}
                  alt={`Page ${i + 1}`}
                  className="absolute inset-0 w-full h-full select-none"
                  style={{
                    objectFit: p.half === 'portrait' ? 'fill' : 'cover',
                    objectPosition: p.half === 'left' ? 'left center' : p.half === 'right' ? 'right center' : 'center',
                  }}
                  loading={i < 8 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              )}
            </MagazinePage>
          ))}
        </HTMLFlipBook>
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 px-4">
        <button onClick={flipPrev} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-sm">
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <span className="text-sm text-muted-foreground font-medium">{spreadLabel}</span>
        <button onClick={flipNext} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-sm">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-3 px-4">
        <BookOpen className="inline w-3.5 h-3.5 mr-1" />
        {isMobile ? 'Swipe left/right or use arrows to turn pages' : 'Click page corners or drag to flip · Double-page spread on desktop'}
      </p>
    </div>
  );
}

// ── Magazine library (home screen) ───────────────────────────────────────────
function MagazineLibrary({ onSelect }) {
  const publications = [
    {
      id: 'adma',
      title: 'ADMA 2026',
      subtitle: 'Official Show Magazine',
      tag: 'Interactive Flip Book · 87 pages',
      type: 'flipbook',
      cover: (
        <img
          src={`${M}/adma-pages/page-001.jpg`}
          alt="ADMA 2026 cover"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
        />
      ),
    },
    {
      id: 'guide',
      title: EVENT_CONFIG.eventFullName,
      subtitle: 'Official Exhibition Guide',
      tag: 'Interactive Flip Book · 16 pages',
      type: 'flipbook',
      cover: (
        <div className="absolute inset-0 flex flex-col overflow-hidden">
          {/* Top ~55% — dramatic dark "farm at dusk" photo zone */}
          <div className="relative shrink-0" style={{ height: '55%', background: 'linear-gradient(175deg,#0d3c1f 0%,#111820 40%,#1a1208 70%,#0a0c0e 100%)' }}>
            {/* Subtle amber equipment-light glow */}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 35% 70%, rgba(234,179,8,0.13) 0%, transparent 70%)' }} />
            {/* Furrow-line texture */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(170deg, transparent, transparent 6px, rgba(255,255,255,0.06) 6px, rgba(255,255,255,0.06) 7px)', backgroundSize: '100% 100%' }} />
            {/* ADMA logo — centred, 50% of the top zone height */}
            <div className="absolute inset-0 flex items-center justify-center">
              <img src={EVENT_CONFIG.logo.transparent} alt={EVENT_CONFIG.eventName} className="object-contain drop-shadow-lg" style={{ height: '50%', maxWidth: '85%' }} />
            </div>
            {/* "EXHIBITION" overlaid on photo, bottom of dark zone */}
            <div className="absolute bottom-1 left-3">
              <div className="font-black text-white leading-none" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 22, lineHeight: 1, letterSpacing: '-0.01em', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>EXHIBITION</div>
            </div>
          </div>
          {/* Bottom ~45% — light zone with large bold text */}
          <div className="flex-1 flex flex-col justify-between px-3 py-2" style={{ background: '#f5f0e8' }}>
            <div className="font-black leading-none" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 34, color: '#0a0c0e', lineHeight: 0.9, letterSpacing: '-0.02em' }}>
              GUIDE <span style={{ color: '#eab308' }}>2026</span>
            </div>
            <div className="font-black text-slate-700" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 22, letterSpacing: '0.01em', lineHeight: 1 }}>
              Machinery &nbsp;|&nbsp; Livestock &nbsp;|&nbsp; Inputs
            </div>
            <div className="text-slate-600 leading-tight" style={{ fontSize: 15, fontStyle: 'italic' }}>
              Zimbabwe's largest agricultural exhibition. Connect, discover and procure.
            </div>
            <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: '#d1c9b8' }}>
              <span className="font-bold text-slate-800" style={{ fontSize: 7 }}>04–06 June 2026</span>
              <span className="text-slate-500" style={{ fontSize: 7 }}>ART Farm · Pomona · Harare</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="pb-24 pt-2 px-4">
      <div className="mb-5">
        <h1 className="font-heading text-xl font-black uppercase tracking-wide">Publications</h1>
        <p className="text-sm text-muted-foreground">Industry publications, event guides and magazines</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {publications.map(pub => (
          <button
            key={pub.id}
            onClick={() => onSelect(pub.id)}
            className="group text-left rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            {/* Cover thumbnail */}
            <div className="relative w-full" style={{ aspectRatio: '210/297' }}>
              {pub.cover}
            </div>

            {/* Info footer */}
            <div className="p-3">
              <div className="font-heading font-black text-base leading-tight">{pub.title}</div>
              <div className="text-sm text-foreground/80 font-medium leading-tight">{pub.subtitle}</div>
              <div className="flex items-center gap-1.5 mt-2">
                {pub.type === 'flipbook'
                  ? <BookOpen className="w-3 h-3 text-amber-500 shrink-0" />
                  : <FileText className="w-3 h-3 text-green-600 shrink-0" />}
                <span className="text-xs text-muted-foreground">{pub.tag}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
export default function Magazine() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [view, setView] = useState(null); // null | 'guide' | 'adma'

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (view === 'guide') return <GuideViewer onBack={() => setView(null)} isMobile={isMobile} />;
  if (view === 'adma')  return <ADMAFlipBook onBack={() => setView(null)} isMobile={isMobile} />;
  return <MagazineLibrary onSelect={setView} />;
}
