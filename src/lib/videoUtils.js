// Detects whether a video URL is a third-party embed (YouTube/Vimeo, rendered via
// <iframe>) as opposed to a direct file URL (our own S3-hosted MP4 or any other direct
// link, rendered via a native <video> tag).
export function isEmbedVideoUrl(url) {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return /(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)vimeo\.com$/i.test(hostname);
  } catch {
    return false;
  }
}

// Adds the platform's native loop parameters to an embed URL, for the case where a
// single video ad plays alone — lets the player loop internally so we never have to
// detect "ended" or remount anything ourselves. YouTube requires `playlist=<id>` in
// addition to `loop=1` for looping a single video to actually work.
export function toLoopingEmbedUrl(embedUrl) {
  try {
    const u = new URL(embedUrl);
    if (/(^|\.)youtube\.com$/i.test(u.hostname)) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      u.searchParams.set('loop', '1');
      if (id) u.searchParams.set('playlist', id);
      return u.toString();
    }
    if (/(^|\.)vimeo\.com$/i.test(u.hostname)) {
      u.searchParams.set('loop', '1');
      return u.toString();
    }
    return embedUrl;
  } catch {
    return embedUrl;
  }
}

// Best-effort normalisation of a pasted YouTube/Vimeo "watch"/share URL into its
// embeddable form. Already-embeddable URLs (or anything else, e.g. a direct .mp4 link)
// pass through unchanged.
export function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (/(^|\.)youtu\.be$/i.test(u.hostname)) {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    if (/(^|\.)youtube\.com$/i.test(u.hostname)) {
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    if (/(^|\.)vimeo\.com$/i.test(u.hostname) && !/player\.vimeo\.com/i.test(u.hostname)) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : url;
    }
    return url;
  } catch {
    return url;
  }
}
