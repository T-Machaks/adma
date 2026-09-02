import { useEffect } from 'react';

const SITE_URL = 'https://admadigital.co.zw';
const DEFAULT_IMAGE = 'https://adma-zw.s3.af-south-1.amazonaws.com/marketing-images/adma-logo-500x500.png';

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!data) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

// Sets this page's <title>, meta description, Open Graph/Twitter tags, self-referencing
// canonical, and (optionally) a JSON-LD block — all client-side, since this is a
// client-rendered SPA and every route otherwise falls back to index.html's single
// generic set of tags (see index.html's own comments). Google's indexer does execute
// this JS and picks up the result; server/routes/og.js additionally pre-renders the
// exhibitor-detail case for crawlers that don't (WhatsApp, Facebook, etc.) — this hook
// still runs there too, so both mechanisms agree once the client takes over.
//
// path defaults to the current location so most callers only need to pass path when
// linking to a specific sub-resource (e.g. a detail page building its own canonical from
// route params). Everything reverts to index.html's defaults on unmount isn't necessary
// — the next page's own useSEO call (or this same effect re-running) overwrites it, and
// a full page load always starts from index.html's static defaults again.
export function useSEO({ title, description, path, image, jsonLd, noindex = false }) {
  useEffect(() => {
    // Most callers pass a short page name ("Exhibitors") and get the brand suffix for
    // free; the home page passes its own full title (already brand-inclusive) and is
    // left as-is rather than doubling up "ADMA Digital... — ADMA Digital".
    const fullTitle = !title ? 'ADMA Digital' : title.includes('ADMA Digital') ? title : `${title} — ADMA Digital`;
    document.title = fullTitle;

    const canonicalUrl = `${SITE_URL}${path ?? window.location.pathname}`;
    upsertLink('canonical', canonicalUrl);

    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
      upsertMeta('name', 'twitter:description', description);
    }
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('property', 'og:url', canonicalUrl);
    if (image) {
      upsertMeta('property', 'og:image', image);
      upsertMeta('name', 'twitter:image', image);
    } else {
      upsertMeta('property', 'og:image', DEFAULT_IMAGE);
      upsertMeta('name', 'twitter:image', DEFAULT_IMAGE);
    }

    let robotsMeta = document.head.querySelector('meta[name="robots"]');
    if (noindex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex, follow');
    } else if (robotsMeta) {
      robotsMeta.remove();
    }

    upsertJsonLd('adma-page-jsonld', jsonLd || null);
  }, [title, description, path, image, jsonLd, noindex]);
}
