import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

const PRE_ROLL_DURATION = 10;

export default function PreRollSlot({ ad, onComplete }) {
  const [secondsLeft, setSecondsLeft] = useState(PRE_ROLL_DURATION);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(interval);
          onComplete?.();
          return 0;
        }
        if (s === PRE_ROLL_DURATION - 3) setCanSkip(true);
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onComplete]);

  if (!ad) {
    onComplete?.();
    return null;
  }

  return (
    <div className="aspect-video rounded-xl overflow-hidden relative bg-slate-900">
      {ad.image_url ? (
        <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${ad.bg || 'from-slate-700 to-slate-900'}`}
        >
          <div className="text-center px-6">
            {ad.logo_url && <img src={ad.logo_url} alt={ad.sponsor_name} className="h-16 object-contain mx-auto mb-4" />}
            <p className="text-white font-heading text-2xl font-bold">{ad.title}</p>
            {ad.subtitle && <p className="text-white/70 text-sm mt-2">{ad.subtitle}</p>}
          </div>
        </div>
      )}

      {/* Overlay controls */}
      <div className="absolute inset-0 flex flex-col">
        <div className="flex items-center justify-between p-3">
          <span className="text-[10px] font-bold uppercase text-white/60 bg-black/40 px-2 py-1 rounded">
            Advertisement
          </span>
          {ad.cta_url && (
            <a
              href={ad.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-white bg-black/50 hover:bg-black/70 px-2.5 py-1 rounded-lg transition-colors"
            >
              Learn more <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center justify-between p-3">
          <p className="text-white/60 text-xs">Stream starts in {secondsLeft}s</p>
          {canSkip ? (
            <button
              onClick={onComplete}
              className="text-xs font-semibold text-white bg-black/50 hover:bg-black/70 border border-white/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              Skip Ad
            </button>
          ) : (
            <span className="text-xs text-white/40">Skip in {PRE_ROLL_DURATION - 3 - (PRE_ROLL_DURATION - secondsLeft)}s</span>
          )}
        </div>
      </div>
    </div>
  );
}
