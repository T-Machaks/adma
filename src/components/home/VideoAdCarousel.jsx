import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdSlot } from '@/api/entities';
import { isEmbedVideoUrl } from '@/lib/videoUtils';
import { track } from '@/lib/tracking';
import { Volume2, VolumeX, ExternalLink } from 'lucide-react';

const DURATION_MS = { '15s': 15000, '30s': 30000, '60s': 60000 };

// Sitewide video-ad playlist, rendered once on the home page below the image carousel.
// All active 'video-carousel' slots play back-to-back, looping continuously: direct MP4
// files advance on their real onEnded event, YouTube/Vimeo embeds (whose completion we
// can't observe without loading their JS APIs) advance on a timer derived from the ad's
// duration tag instead.
export default function VideoAdCarousel() {
  const { data: allSlots = [] } = useQuery({
    queryKey: ['adslots-active'],
    queryFn: () => AdSlot.listActive(),
  });

  const ads = allSlots
    .filter(s => s.placement === 'video-carousel' && s.active && s.video_url)
    .sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''));

  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  // Modulo-safe: avoids needing a reset effect when ads.length shrinks/grows between renders.
  const ad = ads.length ? ads[idx % ads.length] : undefined;
  const embed = ad ? isEmbedVideoUrl(ad.video_url) : false;

  const advance = () => setIdx(i => (i + 1) % ads.length);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!ad || !embed) return undefined;
    timerRef.current = setTimeout(advance, DURATION_MS[ad.duration_tag] || 15000);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, ad?.id, embed]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, idx]);

  if (!ads.length || !ad) return null;

  const handleClick = () => {
    if (ad.exhibitor_id) track(ad.exhibitor_id, ad.exhibitor_name || ad.company, 'ad_click', 'home_carousel');
  };

  return (
    <div className="px-4 mb-4 max-w-2xl lg:max-w-6xl mx-auto">
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
        <span className="absolute top-2 left-2 z-10 text-[9px] font-bold uppercase text-white/70 bg-black/40 px-2 py-0.5 rounded-full">Sponsored</span>
        {ads.length > 1 && (
          <span className="absolute top-2 right-2 z-10 text-[10px] font-bold text-white/70 bg-black/40 px-2 py-0.5 rounded-full">
            {idx + 1}/{ads.length}
          </span>
        )}

        {embed ? (
          <iframe
            key={ad.id}
            src={`${ad.video_url}${ad.video_url.includes('?') ? '&' : '?'}autoplay=1&mute=1`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media"
            title={ad.company}
          />
        ) : (
          <video
            key={ad.id}
            ref={videoRef}
            src={ad.video_url}
            autoPlay
            muted={muted}
            playsInline
            onEnded={advance}
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}

        {!embed && (
          <button
            onClick={() => setMuted(m => !m)}
            className="absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
        )}

        {ad.url && (
          <a
            href={ad.url}
            target="_blank"
            rel="noreferrer"
            onClick={handleClick}
            className="absolute bottom-2 left-2 z-10 flex items-center gap-1 text-[11px] font-bold text-white bg-black/50 hover:bg-black/70 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {ad.headline || 'Learn more'} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
