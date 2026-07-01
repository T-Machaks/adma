import { useQuery } from '@tanstack/react-query';
import { AdSlot } from '@/api/entities';
import { ExternalLink, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function VideoAdBanner() {
  const { data: allSlots = [] } = useQuery({
    queryKey: ['adslots-active'],
    queryFn: () => AdSlot.listActive(),
  });

  const banners = allSlots.filter(s => s.placement === 'video-banner' && s.active);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 8000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return null;

  const ad = banners[idx];

  return (
    <div className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-r ${ad.bg || 'from-slate-700 to-slate-900'} overflow-hidden`}>
      <span className="absolute top-1 right-2 text-[9px] font-bold uppercase text-white/40">Sponsored</span>
      <Sparkles className="w-4 h-4 text-amber flex-shrink-0" />
      {ad.logo_url && (
        <img src={ad.logo_url} alt={ad.sponsor_name} className="h-6 object-contain flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">{ad.title}</p>
        {ad.subtitle && <p className="text-white/60 text-[10px] truncate">{ad.subtitle}</p>}
      </div>
      {ad.cta_url && (
        <a
          href={ad.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: ad.accent || '#f59e0b' }}
          className="flex-shrink-0 flex items-center gap-1 text-xs font-bold hover:underline"
        >
          {ad.cta_label || 'Learn more'} <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
