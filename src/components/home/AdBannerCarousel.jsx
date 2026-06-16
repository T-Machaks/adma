import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { track } from '@/lib/tracking';
import { ADS } from '@/lib/adBanners';

export default function AdBannerCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent(c => (c + 1) % ADS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const ad = ADS[current];
  const prev = () => setCurrent(c => (c - 1 + ADS.length) % ADS.length);
  const next = () => setCurrent(c => (c + 1) % ADS.length);

  const content = (
    <div className={`relative w-full h-24 bg-gradient-to-r ${ad.bg} rounded-xl overflow-hidden cursor-pointer select-none`}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }} />
      <div className="relative h-full flex items-center px-4 gap-3">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border border-white/20 overflow-hidden">
          {ad.logo_url
            ? <img src={ad.logo_url} alt={ad.company} className="w-11 h-11 object-contain" />
            : <span className="font-heading text-xl font-bold text-foreground">{ad.company[0]}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70" style={{ color: ad.accent }}>{ad.label}</p>
          <p className="text-white font-heading font-bold text-base leading-tight">{ad.headline}</p>
          <p className="text-white/70 text-[11px] truncate mt-0.5">{ad.sub}</p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); prev(); }} className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-white" />
          </button>
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); next(); }} className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
        {ADS.map((_, i) => (
          <button key={i} onClick={e => { e.preventDefault(); e.stopPropagation(); setCurrent(i); }}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white w-3' : 'bg-white/40'}`} />
        ))}
      </div>
    </div>
  );

  const handleClick = () => {
    if (ad.exhibitor_id) {
      track(ad.exhibitor_id, ad.exhibitor_name, 'ad_click', 'home_carousel');
    }
  };

  if (ad.internal) {
    return (
      <div className="px-4 mb-4 max-w-2xl mx-auto">
        <a href={ad.url} onClick={handleClick}>{content}</a>
      </div>
    );
  }

  return (
    <div className="px-4 mb-4 max-w-2xl mx-auto">
      <a href={ad.url} target="_blank" rel="noreferrer" onClick={handleClick}>{content}</a>
    </div>
  );
}
