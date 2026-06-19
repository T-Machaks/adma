import HTMLFlipBook from 'react-pageflip';
import { forwardRef, useRef, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ExternalLink, Play, BookOpen, ArrowLeft, FileText } from 'lucide-react';
import { GuidePage as GuidePageData } from '@/api/entities';
import { track } from '@/lib/tracking';

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
    <div className="flex items-center justify-between px-3 py-0.5 shrink-0" style={{ background: '#f59e0b' }}>
      <span className="text-slate-900 font-black uppercase tracking-widest" style={{ fontSize: 9 }}>{label}</span>
      <span className="text-slate-900 font-bold" style={{ fontSize: 9 }}>minecon.global</span>
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

function ManagedImageAd({ config, defaultSrc, advertiser, contain = false }) {
  const imageUrl = config?.image_url || defaultSrc;
  const clickUrl = config?.click_url;
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
    <div className="absolute inset-0 flex flex-col" style={{ background: 'linear-gradient(160deg,#080f1e 0%,#1e293b 60%,#080f1e 100%)' }}>
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ background: '#f59e0b' }}>
        <span className="text-slate-900 font-black uppercase tracking-widest" style={{ fontSize: 9 }}>Official Exhibition Guide</span>
        <span className="text-slate-900 font-bold uppercase" style={{ fontSize: 9 }}>October 2026</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-between px-5 py-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle,#f59e0b 1.5px,transparent 1.5px)', backgroundSize: '20px 20px' }} />
        <div className="w-full flex justify-between items-start">
          <img src="/minecon-logo.png" alt="MineCon" className="object-contain drop-shadow-lg" style={{ width: 52, height: 52 }} />
          <div className="text-right">
            <div className="text-slate-500 uppercase tracking-widest" style={{ fontSize: 8 }}>Vol. 1 · Issue 1</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-amber-400 uppercase tracking-[0.3em] font-bold mb-1" style={{ fontSize: 9 }}>Southern Africa's Premier</div>
          <div className="font-black leading-none" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 58, color: '#fff', lineHeight: 1 }}>
            MINE<span style={{ color: '#f59e0b' }}>CON</span>
          </div>
          <div className="font-black" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 26, color: '#94a3b8', lineHeight: 1.2 }}>2026</div>
          <div className="text-slate-400 mt-1" style={{ fontSize: 10 }}>Mining & Construction Exhibition</div>
        </div>
        <div className="w-full rounded-lg overflow-hidden" style={{ height: 130, background: 'linear-gradient(135deg,#1e3a5f 0%,#334155 50%,#1a2744 100%)' }}>
          <div className="h-full flex items-center justify-center gap-3 opacity-50 px-4">
            {[['🚛','Heavy Vehicles'],['⛏️','Mining'],['🏗️','Construction']].map(([i,l]) => (
              <div key={l} className="flex flex-col items-center gap-1 flex-1">
                <div className="rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', width: 52, height: 52, fontSize: 22 }}>{i}</div>
                <div className="text-slate-400 text-center" style={{ fontSize: 8 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full rounded-lg px-3 py-2 flex justify-between" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          {[['80+','Exhibitors'],['2,000+','Visitors'],['4','Zones']].map(([n,l]) => (
            <div key={l} className="text-center">
              <div className="text-amber-400 font-black" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif' }}>{n}</div>
              <div className="text-slate-400" style={{ fontSize: 8 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-2 shrink-0" style={{ background: '#080f1e' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-amber-400 font-bold" style={{ fontSize: 10 }}>Artfarm Grounds, Pomona</div>
            <div className="text-slate-500" style={{ fontSize: 8 }}>Harare, Zimbabwe · October 2026</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 font-bold" style={{ fontSize: 9 }}>Mining · Construction</div>
            <div className="text-slate-500" style={{ fontSize: 8 }}>Innovation · Services</div>
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
          <div className="w-7 h-7 rounded flex items-center justify-center text-white font-black shrink-0" style={{ background: '#f59e0b', fontSize: 12, fontFamily: 'Barlow Condensed,sans-serif' }}>MC</div>
          <div>
            <div className="font-black uppercase text-slate-800" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif' }}>Welcome to MineCon 2026</div>
            <div className="text-slate-500" style={{ fontSize: 9 }}>A Message from the Organising Committee</div>
          </div>
        </div>
        <div className="w-full rounded overflow-hidden shrink-0" style={{ height: 75, background: 'linear-gradient(135deg,#1e293b 0%,#334155 100%)' }}>
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white opacity-50">
              <div style={{ fontSize: 24 }}>⛏️</div>
              <div className="uppercase tracking-widest font-bold" style={{ fontSize: 8 }}>Artfarm Grounds · Harare</div>
            </div>
          </div>
        </div>
        <div className="text-slate-600 leading-relaxed flex-1" style={{ fontSize: 9.5 }}>
          <p className="mb-2">Dear Visitor,</p>
          <p className="mb-2">On behalf of the MineCon 2026 Organising Committee, it is with great pride and excitement that we welcome you to Southern Africa's most anticipated mining and construction exhibition.</p>
          <p className="mb-2">This inaugural event brings together over <strong>80 exhibitors</strong> — from heavy equipment manufacturers and mining technology innovators to financial service providers and environmental solution specialists — all under one roof at <strong>Artfarm Grounds, Pomona, Harare</strong>.</p>
          <p className="mb-2">Zimbabwe's mining sector is experiencing a renaissance. MineCon 2026 is the platform where deals are made, partnerships are forged, and the future of our industry is shaped.</p>
          <p>Whether you are an operator seeking the latest equipment or an investor exploring mineral wealth potential — MineCon 2026 is the place to be.</p>
        </div>
        <div className="border-t border-slate-100 pt-2 flex items-center justify-between shrink-0">
          <div>
            <div className="font-bold text-slate-800" style={{ fontSize: 10 }}>The MineCon 2026</div>
            <div className="text-amber-600 font-bold" style={{ fontSize: 9 }}>Organising Committee</div>
          </div>
          <div className="text-slate-400 text-right" style={{ fontSize: 8 }}>
            <div>minecon.global</div>
            <div>#MineCon2026</div>
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
    ['06','Diamond Sponsors','Our premier exhibition partners'],
    ['08','Exhibition Site Map','Zone guide & booth finder'],
    ['10','Industry Insights','Zimbabwe Mining Sector 2026'],
    ['12','Product Spotlights','Must-see equipment on show'],
    ['14','Exhibitor Directory','Full listing of all exhibitors'],
    ['16','Why MineCon?','Networking & business opportunities'],
  ];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Contents" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2 overflow-hidden">
        <div className="shrink-0">
          <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>MineCon 2026</div>
          <div className="font-black uppercase text-slate-900" style={{ fontSize: 22, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1 }}>CONTENTS</div>
          <div className="h-0.5 w-10 mt-1" style={{ background: '#f59e0b' }} />
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
        <div className="rounded-lg p-2.5 shrink-0" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
          <div className="text-amber-400 font-bold" style={{ fontSize: 9 }}>Clickable Ads Throughout This Magazine</div>
          <div className="text-slate-300 mt-0.5" style={{ fontSize: 8 }}>Look for the <span style={{ color: '#f59e0b' }}>↗ Visit Website</span> buttons on sponsor pages to explore exhibitor resources and product demos.</div>
        </div>
      </div>
      <PNum n={3} right />
    </div>
  );
}

// ── PAGE 4: SANY Ad (CLICKABLE) ───────────────────────────────────────────────
function SANYCarouselAd({ config }) {
  const slides = [
    {
      img: '/magazines/sany/excavator.jpg',
      imgPos: 'center center',
      category: 'Excavators',
      model: 'SY135C',
      headline: 'Built for Every Job Site',
      specs: [['Op. Weight', '13,800 kg'], ['Engine', '70.5 kW'], ['Bucket', '0.52 m³']],
      accent: '#C8102E',
      tag: 'World #1',
    },
    {
      img: '/magazines/sany/concrete-pump.jpg',
      imgPos: 'center 40%',
      category: 'Concrete Pump Trucks',
      model: 'SYG5445THB',
      headline: 'The World Pump King',
      specs: [['Boom Reach', '66 m'], ['Output', '180 m³/h'], ['Sections', '6-fold']],
      accent: '#dc2626',
      tag: 'World #1',
    },
    {
      img: '/magazines/sany/electric-truck.jpg',
      imgPos: 'center center',
      category: 'Electric Trucks',
      model: 'SANY 350kWh',
      headline: 'Build a Lower-Carbon World',
      specs: [['Battery', '350 kWh'], ['Range', '300+ km'], ['Payload', '31 t']],
      accent: '#0ea5e9',
      tag: 'Zero Emission',
    },
    {
      img: '/magazines/sany/service.png',
      imgPos: 'center center',
      category: 'After-Sales Service',
      model: 'Go with SANY',
      headline: 'No More Waiting',
      specs: [['Response', 'Same Day'], ['Parts', 'Rapid Ship'], ['Uptime', '99%+']],
      accent: '#f59e0b',
      tag: 'Africa-wide',
    },
  ];

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;
  const s = slides[idx];
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    track('', 'SANY Group', 'carousel_view', 'magazine');
  }, [idx]);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIdx(i => (i + 1) % total), 4000);
    return () => clearTimeout(t);
  }, [idx, paused]);

  const stop = e => { e.stopPropagation(); e.preventDefault(); };
  const prev = e => { stop(e); setPaused(true); setIdx(i => (i - 1 + total) % total); };
  const next = e => { stop(e); setPaused(true); setIdx(i => (i + 1) % total); };

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ background: '#0a0a0a' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* SANY red header */}
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ background: '#C8102E' }}>
        <span className="text-white font-black tracking-[0.2em]" style={{ fontSize: 14, fontFamily: 'Barlow Condensed,sans-serif' }}>SANY</span>
        <span className="text-white font-bold" style={{ fontSize: 7.5 }}>MineCon 2026 · Booth A07</span>
      </div>

      {/* Product image — top ~48% */}
      <div className="relative shrink-0 overflow-hidden" style={{ height: '48%' }}>
        <img
          key={s.img}
          src={s.img}
          alt={s.model}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: s.imgPos }}
          draggable={false}
        />
        {/* Dark gradient overlay at bottom for text legibility */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.75) 100%)' }} />
        {/* Category + model over image */}
        <div className="absolute bottom-2 left-3 right-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="rounded px-1.5 py-0.5 text-white font-bold uppercase" style={{ background: s.accent, fontSize: 6.5 }}>{s.category}</span>
            <span className="rounded px-1.5 py-0.5 font-bold uppercase" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: 6.5 }}>{s.tag}</span>
          </div>
          <div className="font-black text-white leading-none" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 22, lineHeight: 1, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{s.model}</div>
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

        {/* CTA */}
        <AdLink
          href={config?.click_url || 'https://www.sanyglobal.com'}
          bg="#C8102E"
          color="#fff"
          onAdClick={() => track('', 'SANY Group', 'ad_click', 'magazine')}
        >
          <ExternalLink size={11} /> sanyglobal.com — Quality Changes the World ↗
        </AdLink>
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
          <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>MineCon 2026</div>
          <div className="font-black text-slate-900 leading-tight" style={{ fontSize: 20, fontFamily: 'Barlow Condensed,sans-serif' }}>EVENT OVERVIEW</div>
          <div className="h-0.5 w-10 mt-0.5" style={{ background: '#f59e0b' }} />
        </div>
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {[['📅','Dates','October 2026'],['📍','Venue','Artfarm, Pomona'],['🕐','Hours','08:00 – 18:00'],['🎫','Entry','Free (Registered)']].map(([i,l,v]) => (
            <div key={l} className="rounded-lg p-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 16 }}>{i}</div>
              <div className="text-slate-500 mt-0.5" style={{ fontSize: 8 }}>{l}</div>
              <div className="font-bold text-slate-800" style={{ fontSize: 10 }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg px-3 py-2 grid grid-cols-3 gap-2 shrink-0" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
          {[['80+','Exhibitors'],['2,000+','Visitors'],['4','Zones']].map(([n,l]) => (
            <div key={l} className="text-center">
              <div className="text-amber-400 font-black" style={{ fontSize: 16, fontFamily: 'Barlow Condensed,sans-serif' }}>{n}</div>
              <div className="text-slate-400" style={{ fontSize: 8 }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="shrink-0">
          <div className="text-slate-700 font-bold uppercase tracking-wide mb-1.5" style={{ fontSize: 10 }}>Exhibition Zones</div>
          <div className="flex flex-col gap-1.5">
            {[['#3b82f6','A','Main Hall','Diamond'],['#eab308','B','Exhibition Hall','Gold'],['#94a3b8','C','Suppliers Zone','Chrome'],['#c2824a','D','Solutions Zone','Copper']].map(([col,z,n,t]) => (
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
          <div className="text-amber-700 mt-0.5" style={{ fontSize: 8.5 }}>Live demos · Industry keynotes · Networking · Technology showcases · Procurement opportunities</div>
        </div>
      </div>
      <PNum n={5} right />
    </div>
  );
}

// ── PAGE 7: Jetmaster ────────────────────────────────────────────────────────
function JetmasterAdPage({ config }) {
  const imageUrl = config?.image_url || '/magazines/ads/ad-jetmaster.jpg';
  const videoSrc = config?.video_url || 'https://minecon.s3.af-south-1.amazonaws.com/videos/jetmaster-grill.mp4';
  const stop = e => { e.stopPropagation(); };
  const playTracked = useRef(false);

  const handlePlay = () => {
    if (playTracked.current) return;
    playTracked.current = true;
    track('', 'Jetmaster', 'video_play', 'magazine');
  };

  const handleEnded = () => {
    track('', 'Jetmaster', 'video_complete', 'magazine');
    // Allow re-tracking if the video is watched again from the start
    playTracked.current = false;
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#000' }}>
      {/* Ad image — top 56%, optionally clickable */}
      <div className="shrink-0" style={{ height: '56%' }}>
        {config?.click_url ? (
          <a
            href={config.click_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full"
            onMouseDown={stop}
            onTouchStart={stop}
            onClick={e => { stop(e); track('', 'Jetmaster', 'ad_click', 'magazine'); }}
          >
            <img src={imageUrl} alt="Jetmaster Fireplaces & Braais" className="w-full h-full select-none" style={{ objectFit: 'fill' }} draggable={false} />
          </a>
        ) : (
          <img src={imageUrl} alt="Jetmaster Fireplaces & Braais" className="w-full h-full select-none" style={{ objectFit: 'fill' }} draggable={false} />
        )}
      </div>
      {/* Video — bottom 44% */}
      <div
        className="flex-1 overflow-hidden"
        onMouseDown={stop} onTouchStart={stop} onPointerDown={stop} onClick={stop}
      >
        <video
          src={videoSrc}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full"
          style={{ background: '#000', display: 'block' }}
          onPlay={handlePlay}
          onEnded={handleEnded}
        />
      </div>
    </div>
  );
}

// ── PAGE 8: Site Plan ─────────────────────────────────────────────────────────
function SitePlanPage() {
  const zones = [['#3b82f6','A','MAIN HALL','A01–A16','Diamond',16],['#eab308','B','EXHIBITION HALL','B01–B24','Gold',24],['#94a3b8','C','SUPPLIERS ZONE','C01–C20','Chrome',20],['#c2824a','D','SOLUTIONS ZONE','D01–D30','Copper',30]];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Exhibition Site Map" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0">
          <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>Artfarm Grounds, Pomona</div>
          <div className="font-black text-slate-900 leading-tight" style={{ fontSize: 20, fontFamily: 'Barlow Condensed,sans-serif' }}>EXHIBITION SITE PLAN</div>
        </div>
        <div className="rounded-xl overflow-hidden shrink-0" style={{ border: '2px solid #e2e8f0' }}>
          <div className="text-center py-1" style={{ background: '#f8fafc', fontSize: 8, borderBottom: '1px solid #e2e8f0', color: '#475569' }}>▼ MAIN ENTRANCE — Artfarm Road, Pomona</div>
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
        <div className="rounded-lg p-2.5 mt-auto shrink-0" style={{ background: '#0f172a' }}>
          <div className="text-amber-400 font-bold" style={{ fontSize: 9 }}>📱 Interactive Map in the MineCon App</div>
          <div className="text-slate-400 mt-0.5" style={{ fontSize: 8 }}>Download for real-time booth finder, exhibitor contacts & live demo schedules.</div>
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
          <div className="font-black text-slate-900 leading-tight" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif' }}>ZIMBABWE MINING SECTOR 2026: GROWTH, TECHNOLOGY & OPPORTUNITY</div>
          <div className="h-0.5 w-12 mt-1" style={{ background: '#f59e0b' }} />
        </div>
        <div className="grid grid-cols-3 gap-1.5 shrink-0">
          {[['$12B+','Mineral export\ntarget 2026'],['↑18%','Chrome output\nyear-on-year'],['↑12%','Gold production\nvs 2024']].map(([n,l]) => (
            <div key={n} className="rounded-lg p-2 text-center" style={{ background: '#0f172a' }}>
              <div className="text-amber-400 font-black" style={{ fontSize: 13, fontFamily: 'Barlow Condensed,sans-serif' }}>{n}</div>
              <div className="text-slate-400 whitespace-pre-line" style={{ fontSize: 7.5 }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="text-slate-600 leading-relaxed flex-1" style={{ fontSize: 9.5 }}>
          <p className="mb-2">Zimbabwe's mining sector entered 2026 on a trajectory of impressive growth, driven by surging global demand for critical minerals and a renewed focus on modernising operations. The government's <strong>National Development Strategy 2</strong> targets $12 billion in annual mineral export revenue — reshaping investment patterns across the sector.</p>
          <p className="mb-2">The critical minerals boom — lithium, cobalt, manganese — is putting Zimbabwe on the global map. The Great Dyke belt, one of the world's largest platinum group metal deposits, continues to attract international mining houses seeking stable supply chains for the EV battery revolution.</p>
          <p><strong>Digitalisation</strong> is the defining theme of 2026. From autonomous haul trucks and AI-driven ore sorting to IoT monitoring of tailings dams, Zimbabwean miners are embracing technology at an accelerating pace — creating robust demand for equipment and services on show at MineCon.</p>
        </div>
        <div className="rounded-lg p-2.5 shrink-0" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div className="text-amber-800 font-bold" style={{ fontSize: 9 }}>Key Trend: Equipment Modernisation</div>
          <div className="text-amber-700 mt-0.5" style={{ fontSize: 8.5 }}>57% of surveyed operations plan to upgrade major equipment in 2026–2027. MineCon is the platform to source, evaluate and procure across all major categories.</div>
        </div>
      </div>
      <PNum n={9} right />
    </div>
  );
}


// ── PAGE 11: Exhibitor Directory ──────────────────────────────────────────────
function ExhibitorDirectoryPage() {
  const list = [
    ['A01','Steel Warehouse Holdings'],['A02','Isuzu Zimbabwe'],['A03','Viking'],
    ['A04','Agricon Equipment'],['A05','ICC'],['A06','Redan'],
    ['A07','SANY Group'],['A08','R&S Diesel Professionals'],['A09','National Propshaft Centre'],
    ['A10','Nicnel'],['A11','AM Mach'],['A12','Better Brands'],
    ['A13','Zimplow Holdings'],['A14','Great Dyke'],['A15','Tsapo'],['A16','LiuGong Zimbabwe'],
  ];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Exhibitor Directory" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>Main Hall · Zone A</div>
            <div className="font-black text-slate-900" style={{ fontSize: 18, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1 }}>DIAMOND EXHIBITORS</div>
          </div>
          <div className="rounded px-2 py-0.5 text-white font-bold" style={{ background: '#3b82f6', fontSize: 8 }}>DIAMOND TIER</div>
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          {list.map(([b,n]) => (
            <div key={b} className="flex items-center gap-2 py-1 border-b border-slate-100">
              <div className="rounded px-1.5 py-0.5 font-bold text-white shrink-0" style={{ background: '#3b82f6', fontSize: 8, minWidth: 30 }}>{b}</div>
              <div className="text-slate-700 font-medium" style={{ fontSize: 9.5 }}>{n}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2 text-center shrink-0" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div className="text-blue-700 font-bold" style={{ fontSize: 8.5 }}>Gold, Chrome & Copper exhibitor directories in the MineCon App</div>
        </div>
      </div>
      <PNum n={11} right />
    </div>
  );
}


// ── PAGE 13: Why Attend ───────────────────────────────────────────────────────
function WhyAttendPage() {
  const reasons = [['🤝','Network','2,000+ industry professionals'],['🏭','See Equipment','80+ exhibitors, live demos'],['📊','Industry Intel','Keynotes from sector leaders'],['💰','Procurement','Compare & close deals on-site'],['📱','Go Digital','App for meetings, QR & schedules'],['🌍','Connect Africa','Southern African supply chain']];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Why Attend MineCon?" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="shrink-0 flex items-start justify-between">
          <div>
            <div className="text-amber-500 uppercase tracking-widest font-bold" style={{ fontSize: 8 }}>MineCon 2026</div>
            <div className="font-black text-slate-900 leading-tight" style={{ fontSize: 20, fontFamily: 'Barlow Condensed,sans-serif' }}>WHY ATTEND?</div>
            <div className="h-0.5 w-10 mt-0.5" style={{ background: '#f59e0b' }} />
          </div>
          <img src="/minecon-logo.png" alt="MineCon" className="object-contain" style={{ width: 38, height: 38 }} />
        </div>
        <div className="rounded-xl p-3 shrink-0" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
          <div className="text-slate-300 italic" style={{ fontSize: 10 }}>"MineCon is where Zimbabwe's mining and construction industry comes together — to do business, to learn, and to shape the future of our sector."</div>
          <div className="text-amber-400 font-bold mt-1.5" style={{ fontSize: 9 }}>— MineCon 2026 Organising Committee</div>
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
          <div className="text-amber-800 font-bold" style={{ fontSize: 11 }}>Register Free — minecon.global</div>
          <div className="text-amber-600" style={{ fontSize: 8.5 }}>Download the MineCon 2026 app · #MineCon2026</div>
        </div>
      </div>
      <PNum n={13} right />
    </div>
  );
}

// ── PAGE 14: Back Cover ───────────────────────────────────────────────────────
function BackCoverPage() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'linear-gradient(160deg,#080f1e 0%,#1e293b 60%,#080f1e 100%)' }}>
      <div className="flex-1 flex flex-col items-center justify-between px-5 py-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle,#f59e0b 1.5px,transparent 1.5px)', backgroundSize: '20px 20px' }} />
        <div className="text-center w-full">
          <img src="/minecon-logo.png" alt="MineCon" className="object-contain mx-auto mb-2 drop-shadow-lg" style={{ width: 56, height: 56 }} />
          <div className="font-black text-amber-400" style={{ fontSize: 18, fontFamily: 'Barlow Condensed,sans-serif' }}>MINECON 2026</div>
          <div className="text-slate-400" style={{ fontSize: 9.5 }}>Southern Africa's Mining & Construction Exhibition</div>
        </div>
        <div className="text-center">
          <div className="font-black text-white" style={{ fontSize: 28, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1.1 }}>See you at<br />the show!</div>
          <div className="text-amber-400 mt-2" style={{ fontSize: 10 }}>October 2026 · Artfarm Grounds, Pomona, Harare</div>
        </div>
        <div className="w-full rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex flex-col gap-1.5">
            {[['📍','Artfarm Grounds, Pomona, Harare, Zimbabwe'],['🌐','minecon.global'],['📧','info@minecon.global']].map(([i,t]) => (
              <div key={t} className="flex items-center justify-center gap-2 text-slate-300" style={{ fontSize: 9.5 }}><span>{i}</span>{t}</div>
            ))}
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold mt-1" style={{ fontSize: 10 }}>📱 #MineCon2026</div>
          </div>
        </div>
        <div className="w-full">
          <div className="text-slate-500 text-center uppercase tracking-widest mb-2" style={{ fontSize: 7 }}>Diamond Sponsors</div>
          <div className="flex justify-center gap-2 flex-wrap">
            {['SANY','Zimplow','Isuzu ZW','Steel WH','LiuGong','Agricon'].map(s => (
              <div key={s} className="rounded px-2 py-0.5 text-slate-300 font-bold" style={{ background: 'rgba(255,255,255,0.06)', fontSize: 8 }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ background: '#f59e0b' }}>
        <span className="text-slate-900 font-black uppercase tracking-widest" style={{ fontSize: 8 }}>MineCon 2026</span>
        <span className="text-slate-900 font-bold" style={{ fontSize: 8 }}>minecon.global</span>
      </div>
    </div>
  );
}

// ── MineCon Guide flip-book viewer ───────────────────────────────────────────
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

  const TOTAL = 15;
  const spreadLabel = isMobile
    ? `Page ${currentPage + 1} of ${TOTAL}`
    : currentPage === 0 ? 'Cover'
    : currentPage >= TOTAL - 1 ? 'Back Cover'
    : `Pages ${currentPage}–${currentPage + 1} of ${TOTAL}`;

  return (
    <div className="pb-24 pt-2">
      <div className="px-4 mb-3 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Publications
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-semibold">MineCon 2026 Exhibition Guide</span>
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
          <MagazinePage key="p1"><CoverPage /></MagazinePage>
          <MagazinePage key="p2"><WelcomePage /></MagazinePage>
          <MagazinePage key="p3"><ContentsPage /></MagazinePage>
          <MagazinePage key="p4"><SANYCarouselAd config={cfg['4']} /></MagazinePage>
          <MagazinePage key="p5"><EventOverviewPage /></MagazinePage>
          <MagazinePage key="p6"><ManagedImageAd config={cfg['6']} defaultSrc="/magazines/ads/ad-elimobil.jpg" advertiser="Elimobil" /></MagazinePage>
          <MagazinePage key="p7"><JetmasterAdPage config={cfg['7']} /></MagazinePage>
          <MagazinePage key="p8"><SitePlanPage /></MagazinePage>
          <MagazinePage key="p9"><IndustryInsightPage /></MagazinePage>
          <MagazinePage key="p10"><ManagedImageAd config={cfg['10']} defaultSrc="/magazines/ads/ad-zambezi.jpg" advertiser="Zambezi Gas & Coal" /></MagazinePage>
          <MagazinePage key="p11"><ExhibitorDirectoryPage /></MagazinePage>
          <MagazinePage key="p12"><ManagedImageAd config={cfg['12']} defaultSrc="/magazines/ads/ad-zimtile.jpg" advertiser="Zimtile" /></MagazinePage>
          <MagazinePage key="p13"><ManagedImageAd config={cfg['13']} defaultSrc="/magazines/ads/ad-woodlot.jpg" advertiser="Woodlot Timbers" contain /></MagazinePage>
          <MagazinePage key="p14"><WhyAttendPage /></MagazinePage>
          <MagazinePage key="p15"><BackCoverPage /></MagazinePage>
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

// ── ADMA 2026 flip book (pre-rendered page images) ───────────────────────────
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
  const admaPages = (() => {
    const list = [];
    list.push({ src: '/magazines/adma-pages/page-001.jpg', half: 'portrait' });
    for (let i = 2; i <= 43; i++) {
      const n = String(i).padStart(3, '0');
      list.push({ src: `/magazines/adma-pages/page-${n}.jpg`, half: 'left' });
      list.push({ src: `/magazines/adma-pages/page-${n}.jpg`, half: 'right' });
    }
    list.push({ src: '/magazines/adma-pages/page-044.jpg', half: 'portrait' });
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
    <div className="pb-24 pt-2">
      <div className="px-4 mb-3 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Publications
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-semibold">ADMA 2026 Agricultural Show Magazine</span>
        <a
          href="/magazines/adma-2026.pdf"
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

// ── Tobacco Today flip book ───────────────────────────────────────────────────
function TobaccoTodayFlipBook({ onBack, isMobile }) {
  const bookRef = useRef(null);
  const [bookKey, setBookKey] = useState(isMobile ? 'mb' : 'dk');
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setBookKey(isMobile ? 'mb' : 'dk');
  }, [isMobile]);

  // Page 1 (cover) and page 17 (back) are portrait singles.
  // Pages 2–16 are landscape double-spreads; split each into left + right halves.
  const ttPages = (() => {
    const list = [];
    list.push({ src: '/magazines/tobacco-today-pages/page-001.jpg', half: 'portrait' });
    for (let i = 2; i <= 16; i++) {
      const n = String(i).padStart(3, '0');
      list.push({ src: `/magazines/tobacco-today-pages/page-${n}.jpg`, half: 'left' });
      list.push({ src: `/magazines/tobacco-today-pages/page-${n}.jpg`, half: 'right' });
    }
    list.push({ src: '/magazines/tobacco-today-pages/page-017.jpg', half: 'portrait' });
    return list;
  })();

  const TOTAL = ttPages.length;
  const onFlip = useCallback(e => setCurrentPage(e.data), []);
  const flipPrev = () => bookRef.current?.pageFlip().flipPrev();
  const flipNext = () => bookRef.current?.pageFlip().flipNext();

  const spreadLabel = isMobile
    ? `Page ${currentPage + 1} of ${TOTAL}`
    : currentPage === 0 ? 'Cover'
    : currentPage >= TOTAL - 1 ? 'Back Cover'
    : `Pages ${currentPage}–${currentPage + 1} of ${TOTAL}`;

  return (
    <div className="pb-24 pt-2">
      <div className="px-4 mb-3 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Publications
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-semibold">Zimbabwe Tobacco Today — Issue 60 · June 2026</span>
        <a
          href="/magazines/tobacco-today-2026-q2.pdf"
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
          {ttPages.map((p, i) => (
            <MagazinePage key={`tt-p${i}`}>
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

// ── MineCon Magazine (stubbed — cover only) ───────────────────────────────────
function MineConMagazineCover() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#080c14' }}>
      {/* Masthead */}
      <div className="shrink-0 px-4 py-2 flex items-center justify-between" style={{ background: '#f59e0b' }}>
        <span className="font-black uppercase tracking-[0.15em] text-slate-900" style={{ fontSize: 17, fontFamily: 'Barlow Condensed,sans-serif' }}>MINECON</span>
        <span className="font-black uppercase tracking-widest text-slate-900" style={{ fontSize: 8 }}>MAGAZINE</span>
      </div>
      {/* Issue line */}
      <div className="px-4 py-1.5 shrink-0 flex justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-slate-500" style={{ fontSize: 7.5 }}>Issue 1 · October 2026</span>
        <span className="text-slate-500" style={{ fontSize: 7.5 }}>minecon.global</span>
      </div>
      {/* Hero */}
      <div className="flex-1 relative overflow-hidden" style={{ background: 'linear-gradient(175deg,#0d1829 0%,#162140 50%,#0b1322 100%)' }}>
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle,#f59e0b 1px,transparent 1px)', backgroundSize: '18px 18px' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 90%,rgba(245,158,11,0.10) 0%,transparent 70%)' }} />
        <div className="absolute top-5 inset-x-5">
          <div className="text-amber-400 font-bold uppercase tracking-[0.2em] mb-2" style={{ fontSize: 7.5 }}>Cover Feature</div>
          <div className="text-white font-black leading-none" style={{ fontSize: 24, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1 }}>
            ZIMBABWE'S<br />MINING<br />RENAISSANCE
          </div>
          <div className="h-0.5 w-10 mt-3" style={{ background: '#f59e0b' }} />
          <div className="text-slate-400 mt-2.5 leading-relaxed" style={{ fontSize: 8 }}>
            Critical minerals, new investment &amp;<br />the technology reshaping our sector
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-12 opacity-[0.08]">
          <img src="/minecon-logo.png" alt="" className="w-20 h-20 object-contain" />
        </div>
        <div className="absolute bottom-3 inset-x-5 space-y-1.5">
          {['Lithium Rush: What It Means for Zimbabwe','Top 20 Mining Companies to Watch 2026','Technology Special: AI on the Mine Floor'].map(line => (
            <div key={line} className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold leading-tight flex-shrink-0" style={{ fontSize: 7.5 }}>▸</span>
              <span className="text-slate-300 leading-tight" style={{ fontSize: 7.5 }}>{line}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Footer */}
      <div className="px-4 py-2 shrink-0 flex items-center justify-between" style={{ background: '#05080f', borderTop: '2px solid #f59e0b' }}>
        <span className="text-amber-400 font-bold uppercase tracking-wide" style={{ fontSize: 8 }}>Inaugural Edition</span>
        <span className="text-slate-500" style={{ fontSize: 7.5 }}>October 2026</span>
      </div>
    </div>
  );
}

function MineConMagazineViewer({ onBack }) {
  return (
    <div className="pb-24 pt-2">
      <div className="px-4 mb-4 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Publications
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-semibold">MineCon Magazine — Issue 1</span>
      </div>
      <div className="flex flex-col items-center px-4">
        <div className="relative rounded-xl overflow-hidden shadow-2xl w-full" style={{ maxWidth: 300, aspectRatio: '3/4' }}>
          <MineConMagazineCover />
        </div>
        <div className="mt-6 max-w-xs text-center space-y-1">
          <p className="text-sm font-semibold">First Edition — Coming Soon</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The MineCon Magazine is under production. The inaugural issue will feature industry interviews, product spotlights, and in-depth mining sector analysis.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Magazine library (home screen) ───────────────────────────────────────────
function MagazineLibrary({ onSelect }) {
  const publications = [
    {
      id: 'guide',
      title: 'MineCon 2026',
      subtitle: 'Official Exhibition Guide',
      tag: 'Interactive Flip Book · 15 pages',
      type: 'flipbook',
      cover: (
        <div className="absolute inset-0 flex flex-col overflow-hidden">
          {/* Top ~55% — dramatic dark "mine site" photo zone */}
          <div className="relative shrink-0" style={{ height: '55%', background: 'linear-gradient(175deg,#0d1f3c 0%,#111820 40%,#1a1208 70%,#0a0c0e 100%)' }}>
            {/* Subtle amber equipment-light glow */}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 35% 70%, rgba(245,158,11,0.13) 0%, transparent 70%)' }} />
            {/* Tyre-track texture lines */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(170deg, transparent, transparent 6px, rgba(255,255,255,0.06) 6px, rgba(255,255,255,0.06) 7px)', backgroundSize: '100% 100%' }} />
            {/* MineCon logo — centred, 50% of the top zone height */}
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/minecon-logo.png" alt="MineCon" className="object-contain drop-shadow-lg" style={{ height: '50%', maxWidth: '85%' }} />
            </div>
            {/* "EXHIBITION" overlaid on photo, bottom of dark zone */}
            <div className="absolute bottom-1 left-3">
              <div className="font-black text-white leading-none" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 22, lineHeight: 1, letterSpacing: '-0.01em', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>EXHIBITION</div>
            </div>
          </div>
          {/* Bottom ~45% — light zone with large bold text (Zambezi white area) */}
          <div className="flex-1 flex flex-col justify-between px-3 py-2" style={{ background: '#f5f0e8' }}>
            {/* "GUIDE" in massive text like "VALUE COAL" */}
            <div className="font-black leading-none" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 34, color: '#0a0c0e', lineHeight: 0.9, letterSpacing: '-0.02em' }}>
              GUIDE <span style={{ color: '#f59e0b' }}>2026</span>
            </div>
            {/* Pipe-separated categories like "Cobbles | Peas | Nuts | Duff" */}
            <div className="font-black text-slate-700" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 25.5, letterSpacing: '0.01em', lineHeight: 1 }}>
              Mining &nbsp;|&nbsp; Construction &nbsp;|&nbsp; Innovation
            </div>
            {/* Body copy like Zambezi */}
            <div className="text-slate-600 leading-tight" style={{ fontSize: 15, fontStyle: 'italic' }}>
              Zimbabwe's premier mining &amp; construction exhibition. Connect, discover and procure.
            </div>
            {/* Footer info like Zambezi contact row */}
            <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: '#d1c9b8' }}>
              <span className="font-bold text-slate-800" style={{ fontSize: 7 }}>October 2026</span>
              <span className="text-slate-500" style={{ fontSize: 7 }}>Artfarm · Pomona · Harare</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'minecon-magazine',
      title: 'MineCon Magazine',
      subtitle: 'Industry Publication',
      tag: 'Coming Soon · Issue 1 · Oct 2026',
      type: 'magazine',
      cover: <MineConMagazineCover />,
    },
    {
      id: 'adma',
      title: 'ADMA 2026',
      subtitle: 'Agricultural Show Magazine',
      tag: 'Interactive Flip Book · 86 pages',
      type: 'flipbook',
      cover: (
        <img
          src="/magazines/adma-pages/page-001.jpg"
          alt="ADMA 2026 cover"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
        />
      ),
    },
    {
      id: 'tobacco-today',
      title: 'Tobacco Today',
      subtitle: 'Issue 60 · June 2026',
      tag: 'Interactive Flip Book · 32 pages',
      type: 'flipbook',
      cover: (
        <img
          src="/magazines/tobacco-today-pages/page-001.jpg"
          alt="Zimbabwe Tobacco Today cover"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
        />
      ),
    },
  ];

  return (
    <div className="pb-24 pt-2 px-4">
      <div className="mb-5">
        <h1 className="font-heading text-xl font-black uppercase tracking-wide">Publications</h1>
        <p className="text-sm text-muted-foreground">Magazines, guides and resources for MineCon 2026</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
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

  if (view === 'guide')            return <GuideViewer           onBack={() => setView(null)} isMobile={isMobile} />;
  if (view === 'minecon-magazine') return <MineConMagazineViewer onBack={() => setView(null)} />;
  if (view === 'adma')             return <ADMAFlipBook          onBack={() => setView(null)} isMobile={isMobile} />;
  if (view === 'tobacco-today')    return <TobaccoTodayFlipBook  onBack={() => setView(null)} isMobile={isMobile} />;
  return <MagazineLibrary onSelect={setView} />;
}
