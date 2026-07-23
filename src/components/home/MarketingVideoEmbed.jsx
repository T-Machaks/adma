const ALLOWED_ORIGINS = ['youtube.com/embed', 'www.youtube.com/embed', 'player.vimeo.com'];

function isSafeEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    return ALLOWED_ORIGINS.some(o => (u.hostname + u.pathname).includes(o.split('/')[0]) && u.pathname.startsWith('/' + o.split('/').slice(1).join('/')));
  } catch {
    return false;
  }
}

function isDirectVideoUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /\.(mp4|webm|ogg)$/i.test(u.pathname);
  } catch {
    return false;
  }
}

// Configurable landing-page marketing video — supports a YouTube/Vimeo embed URL
// or a direct video file URL. Renders nothing if unset or unsupported (fails closed).
export default function MarketingVideoEmbed({ url }) {
  if (!url) return null;

  if (isDirectVideoUrl(url)) {
    return (
      <div className="px-4 mt-4">
        <div className="max-w-2xl mx-auto aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
          <video src={url} controls className="w-full h-full" />
        </div>
      </div>
    );
  }

  if (isSafeEmbedUrl(url)) {
    return (
      <div className="px-4 mt-4">
        <div className="max-w-2xl mx-auto aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
          <iframe
            src={url}
            title="ADMA Digital — Marketing Video"
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </div>
    );
  }

  return null;
}
