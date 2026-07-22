import { useQuery } from '@tanstack/react-query';
import { AdSlot } from '@/api/entities';
import { ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { track } from '@/lib/tracking';

const INTERVAL = 6000;

// Sitewide full-width strip banner, rendered once in AppShell above the mobile
// install-bar/bottom-nav — appears on every attendee page, mobile and desktop.
export default function FooterAdBanner() {
  const { data: allSlots = [] } = useQuery({
    queryKey: ['adslots-active'],
    queryFn: () => AdSlot.listActive(),
  });

  const banners = allSlots.filter(s => s.placement === 'footer-strip' && s.active);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), INTERVAL);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return null;

  const ad = banners[Math.min(idx, banners.length - 1)];

  const handleClick = () => track(ad.exhibitor_id, ad.exhibitor_name || ad.company, 'ad_click', 'footer_strip');

  const content = (
    <div className={`relative w-full flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r ${ad.bg || 'from-slate-700 to-slate-900'} overflow-hidden`}>
      <span className="absolute top-1 right-2 text-[9px] font-bold uppercase text-white/40">Sponsored</span>
      {ad.logo_url && (
        <img src={ad.logo_url} alt={ad.company || ''} className="h-7 object-contain flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">{ad.headline}</p>
        {ad.sub && <p className="text-white/60 text-[10px] truncate">{ad.sub}</p>}
      </div>
      {ad.url && (
        <span
          style={{ color: ad.accent || '#f59e0b' }}
          className="flex-shrink-0 flex items-center gap-1 text-xs font-bold"
        >
          {ad.label || 'Learn more'} <ExternalLink className="w-3 h-3" />
        </span>
      )}
    </div>
  );

  if (!ad.url) return content;

  return (
    <a href={ad.url} target="_blank" rel="noopener noreferrer" onClick={handleClick} className="block hover:opacity-95 transition-opacity">
      {content}
    </a>
  );
}
