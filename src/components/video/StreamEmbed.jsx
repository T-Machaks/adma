import { Video } from 'lucide-react';

const ALLOWED_ORIGINS = [
  'youtube.com/embed',
  'www.youtube.com/embed',
  'player.vimeo.com',
  'zoom.us/j',
  'app.zoom.us',
];

function isSafeUrl(url) {
  try {
    const u = new URL(url);
    return (u.protocol === 'https:') && ALLOWED_ORIGINS.some(o => (u.hostname + u.pathname).includes(o.split('/')[0]) && (o.includes('/') ? u.pathname.startsWith('/' + o.split('/').slice(1).join('/')) : true));
  } catch {
    return false;
  }
}

export default function StreamEmbed({ url, title = 'Live Session' }) {
  if (!url) {
    return (
      <div className="aspect-video bg-slate-900 flex items-center justify-center rounded-xl">
        <div className="text-center">
          <Video className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">Stream not yet available</p>
          <p className="text-slate-600 text-xs mt-1">Check back when the session goes live</p>
        </div>
      </div>
    );
  }

  if (!isSafeUrl(url)) {
    return (
      <div className="aspect-video bg-slate-900 flex items-center justify-center rounded-xl">
        <p className="text-slate-500 text-sm">Stream URL not supported</p>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black">
      <iframe
        src={url}
        title={title}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      />
    </div>
  );
}
