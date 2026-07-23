// ADMA Digital — Service Worker with offline support
// Strategy:
//   Shell (/, manifest, logos, icons) → pre-cached on install
//   /assets/* (hashed JS/CSS)        → cache-first (immutable)
//   /api/*                           → network-first, fall back to cached data
//   images                           → stale-while-revalidate
//   navigation                       → network, fall back to cached shell

const VERSION     = 'adma-2026-07-01-a';
const SHELL_CACHE = `shell-${VERSION}`;
const DATA_CACHE  = `data-${VERSION}`;
const IMG_CACHE   = `img-${VERSION}`;
const ALL_CACHES  = [SHELL_CACHE, DATA_CACHE, IMG_CACHE];

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/adma-logo.png',
  '/adma-logo-transparent.png',
  '/adma-favicon-192.png',
  '/adma-favicon-512.png',
  '/favicon.ico',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !ALL_CACHES.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Skip browser-extension and chrome-extension URLs
  if (!url.protocol.startsWith('http')) return;

  // ── API: network-first, fall back to cached response ───────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // ── Hashed assets (/assets/...): cache-first, they never change ─────────
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // ── Images (local or remote CDN): stale-while-revalidate ────────────────
  if (
    request.destination === 'image' ||
    url.hostname.includes('s3.af-south-1.amazonaws.com') ||
    url.hostname.includes('agrishow.co.zw') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(staleWhileRevalidate(request, IMG_CACHE));
    return;
  }

  // ── Google Fonts CSS: stale-while-revalidate ─────────────────────────────
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

  // ── Navigation (page loads): network, fall back to SPA shell ────────────
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          // Cache fresh HTML responses
          if (res.ok) {
            caches.open(SHELL_CACHE).then(c => c.put(request, res.clone()));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match('/'))
        )
    );
    return;
  }

  // ── Everything else: network-first with cache fallback ───────────────────
  event.respondWith(networkFirst(request, SHELL_CACHE));
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return structured offline JSON for API calls
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ offline: true, data: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  // Always try to refresh in background
  const networkFetch = fetch(request)
    .then(response => {
      if (response.ok || response.type === 'opaque') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  // Return cached immediately if available, otherwise wait for network
  return cached ?? networkFetch;
}
