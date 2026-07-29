import { isEmbedVideoUrl, toEmbedUrl } from '@/lib/videoUtils';

// Renders a YouTube/Vimeo embed URL as an iframe, or a direct .mp4/.webm link as a
// native <video> tag — same dual-branch logic Magazine.jsx's VideoAdSection uses,
// pulled out so listing detail pages don't each re-implement it.
export default function EmbeddedVideo({ url, title }) {
  if (!url) return null;
  // toEmbedUrl is a no-op on an already-embed URL, so it's always safe to call —
  // don't assume a youtube.com/vimeo.com URL is already in /embed/ form.
  const embed = isEmbedVideoUrl(url) ? toEmbedUrl(url) : url;
  return (
    <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-sm">
      {isEmbedVideoUrl(embed) ? (
        <iframe
          key={embed}
          src={embed}
          title={title || 'Video'}
          className="w-full h-full"
          style={{ border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video key={embed} src={embed} controls muted playsInline className="w-full h-full object-contain" />
      )}
    </div>
  );
}
