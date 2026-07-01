import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function SponsorBannerCarousel({ images, name, tagline, booth, website, logoUrl, badge = 'PLATINUM SPONSOR' }) {
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  const goTo = useCallback((next) => {
    if (transitioning || next === idx) return;
    setTransitioning(true);
    setPrev(idx);
    setIdx(next);
    setTimeout(() => { setPrev(null); setTransitioning(false); }, 500);
  }, [idx, transitioning]);

  useEffect(() => {
    const t = setInterval(() => goTo((idx + 1) % images.length), 4500);
    return () => clearInterval(t);
  }, [idx, images.length, goTo]);

  return (
    <a
      href={website || '#'}
      target="_blank"
      rel="noreferrer"
      className="relative block rounded-xl overflow-hidden mb-3 cursor-pointer group"
      style={{ height: '200px' }}
      onClick={e => { if (e.target.closest('button')) e.preventDefault(); }}
    >
      {/* Previous image (fading out) */}
      {prev !== null && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${images[prev]})`, opacity: 0, transition: 'opacity 0.5s ease' }}
        />
      )}

      {/* Current image */}
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
          style={{ backgroundImage: `url(${src})`, opacity: i === idx ? 1 : 0 }}
        />
      ))}

      {/* Gradient overlay — darker left for text, subtle vignette */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={name}
                className="h-10 w-auto max-w-[100px] object-contain bg-white rounded-lg p-1.5 shrink-0"
              />
            )}
            <span className="text-[10px] font-bold tracking-widest text-amber-400 bg-black/40 px-2 py-1 rounded-full border border-amber-400/30">
              ★ {badge}
            </span>
          </div>
          {booth && (
            <span className="text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg shadow">
              {booth}
            </span>
          )}
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xl font-bold text-white leading-tight drop-shadow">{name}</div>
            {tagline && <div className="text-sm text-white/75 mt-0.5 leading-snug max-w-sm">{tagline}</div>}
          </div>

          {/* Dots + arrows */}
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center transition-colors"
              onClick={() => goTo((idx - 1 + images.length) % images.length)}
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${i === idx ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/60'}`}
                />
              ))}
            </div>
            <button
              className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center transition-colors"
              onClick={() => goTo((idx + 1) % images.length)}
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </a>
  );
}
