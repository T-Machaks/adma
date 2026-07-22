import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, PauseCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AdSlot } from '@/api/entities';
import { track } from '@/lib/tracking';

const KEYFRAMES = `
  @keyframes adProgress { from { width: 0 } to { width: 100% } }
  @keyframes adFadeIn   { from { opacity: 0; transform: translateX(6px) } to { opacity: 1; transform: translateX(0) } }
`;

const INTERVAL = 4500;

export default function AdBannerCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const { data: dynamicSlots = [] } = useQuery({
    queryKey: ['adslots-active'],
    queryFn: () => AdSlot.listActive(),
  });

  // Only carousel-placement slots belong here — video-banner/footer-strip slots share the
  // same table but render elsewhere. Capped at 4 rotating slots per the spec.
  const slots = dynamicSlots.filter(s => !s.placement || s.placement === 'carousel').slice(0, 4);

  useEffect(() => { setCurrent(0); }, [slots.length]);

  useEffect(() => {
    if (paused || slots.length === 0) return;
    const t = setTimeout(() => setCurrent(c => (c + 1) % slots.length), INTERVAL);
    return () => clearTimeout(t);
  }, [current, paused, slots.length]);

  if (slots.length === 0) return null;

  const ad = slots[current] ?? slots[0];
  const accent = ad.accent || '#f59e0b';
  const isBg     = ad.image_type === 'bg'     && ad.image_url;
  const isCutout = ad.image_type === 'cutout' && ad.image_url;

  const goTo = (i, e) => { e.preventDefault(); e.stopPropagation(); setPaused(true); setCurrent(i); };
  const prev = (e) => goTo((current - 1 + slots.length) % slots.length, e);
  const next = (e) => goTo((current + 1) % slots.length, e);
  const handleClick = () => {
    if (ad.exhibitor_id) track(ad.exhibitor_id, ad.exhibitor_name, 'ad_click', 'home_carousel');
  };

  const card = (
    <div
      className={`relative w-full rounded-2xl overflow-hidden cursor-pointer group bg-gradient-to-br ${ad.bg} min-h-[156px] lg:min-h-[280px] xl:min-h-[320px]`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Background layer ── */}

      {/* Full-bleed photo */}
      {isBg && (
        <>
          <img
            key={`bg-${current}`}
            src={ad.image_url}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: ad.image_pos || 'center', animation: 'adFadeIn 0.4s ease-out' }}
          />
          {/* Scrim: strong on left + bottom for text, lighter top-right */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.65) 100%)' }}
          />
        </>
      )}

      {/* Right-side product cutout (white-bg PNG, multiply removes white) */}
      {isCutout && (
        <>
          {/* Subtle texture on the gradient */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '10px 10px' }}
          />
          <img
            key={`cut-${current}`}
            src={ad.image_url}
            alt=""
            draggable={false}
            className="absolute right-0 bottom-0 pointer-events-none"
            style={{
              height: '108%',
              width: '54%',
              objectFit: 'contain',
              objectPosition: 'right bottom',
              mixBlendMode: 'multiply',
              opacity: 0.92,
              animation: 'adFadeIn 0.4s ease-out',
            }}
          />
          {/* Fade from left gradient into the cutout area */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.08) 45%, transparent 70%)' }}
          />
        </>
      )}

      {/* No image: texture overlay only */}
      {!isBg && !isCutout && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '10px 10px' }}
        />
      )}

      {/* ── Content (keyed for fade-in on slide change) ── */}
      <div
        key={current}
        className="relative flex flex-col gap-2.5 lg:gap-4 p-4 lg:p-8 min-h-[156px] lg:min-h-[280px] xl:min-h-[320px]"
        style={{
          animation: 'adFadeIn 0.3s ease-out',
          // Cutout: keep text in left 56% so it doesn't overlap the product image
          paddingRight: isCutout ? '46%' : undefined,
        }}
      >
        {/* Top: logo + company + counter */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 lg:w-14 lg:h-14 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center flex-shrink-0 shadow overflow-hidden">
              {ad.logo_url
                ? <img src={ad.logo_url} alt={ad.company} className="w-9 h-9 lg:w-12 lg:h-12 object-contain" />
                : <span className="font-bold text-lg text-foreground">{ad.company[0]}</span>
              }
            </div>
            <div>
              <p className="text-white font-bold text-sm lg:text-lg leading-none drop-shadow-sm">{ad.company}</p>
              <p className="text-white/55 text-[10px] lg:text-xs mt-0.5 font-medium">{ad.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {paused && <PauseCircle className="w-3 h-3 text-white/30" />}
            <span className="text-[10px] lg:text-xs font-bold tabular-nums text-white/35 select-none">
              {current + 1}&thinsp;/&thinsp;{slots.length}
            </span>
          </div>
        </div>

        {/* Headline + sub */}
        <div className="flex-1">
          <p className="text-white font-heading font-bold text-base lg:text-2xl xl:text-3xl leading-snug drop-shadow-sm">{ad.headline}</p>
          {ad.sub && <p className="text-white/55 text-xs lg:text-sm mt-0.5">{ad.sub}</p>}
        </div>

        {/* Bottom: stat + tags + CTA */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {ad.stat && (
              <span
                className="text-[11px] lg:text-sm font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: `${accent}38`, border: `1px solid ${accent}65` }}
              >
                {ad.stat}
              </span>
            )}
            {(ad.tags || []).map(tag => (
              <span key={tag} className="text-[10px] lg:text-xs text-white/50 bg-white/12 px-1.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <span
            className="flex-shrink-0 text-[11px] lg:text-sm font-bold text-white/85 px-2.5 lg:px-4 py-1 lg:py-2 rounded-lg transition-colors group-hover:bg-white/25"
            style={{ background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            Visit ↗
          </span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10">
        <div
          key={`prog-${current}-${paused}`}
          className="h-full rounded-full"
          style={paused
            ? { width: '0%', background: accent }
            : { background: accent, animation: `adProgress ${INTERVAL}ms linear forwards` }
          }
        />
      </div>

      {/* ── Dot indicators ── */}
      <div className="absolute bottom-1.5 lg:bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {slots.map((_, i) => (
          <button
            key={i}
            onClick={e => goTo(i, e)}
            className={`rounded-full transition-all duration-300 h-1 lg:h-1.5 ${i === current ? 'w-4 lg:w-6' : 'w-1.5 lg:w-2'}`}
            style={{ background: i === current ? accent : 'rgba(255,255,255,0.28)' }}
          />
        ))}
      </div>

      {/* ── Prev / Next (appear on hover) ── */}
      <button
        onClick={prev}
        className="absolute left-0 top-0 bottom-0 w-9 lg:w-14 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <div className="w-6 h-6 lg:w-10 lg:h-10 rounded-full bg-black/35 hover:bg-black/55 flex items-center justify-center transition-colors">
          <ChevronLeft className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-white" />
        </div>
      </button>
      <button
        onClick={next}
        className="absolute right-0 top-0 bottom-0 w-9 lg:w-14 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <div className="w-6 h-6 lg:w-10 lg:h-10 rounded-full bg-black/35 hover:bg-black/55 flex items-center justify-center transition-colors">
          <ChevronRight className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-white" />
        </div>
      </button>
    </div>
  );

  return (
    <div className="px-4 mb-4 max-w-2xl lg:max-w-6xl mx-auto">
      <style>{KEYFRAMES}</style>
      {ad.internal
        ? <a href={ad.url} onClick={handleClick}>{card}</a>
        : <a href={ad.url} target="_blank" rel="noreferrer" onClick={handleClick}>{card}</a>
      }
    </div>
  );
}
