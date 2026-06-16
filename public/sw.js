// MineCon 2026 — Service Worker (stub)
// Caching will be enabled before go-live.
// This stub exists to satisfy PWA installability requirements.

const VERSION = 'minecon-stub-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch — no caching yet.
// Replace with a cache-first strategy before launch.
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
