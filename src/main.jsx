import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        // Recheck for a new SW when the tab comes back into focus...
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update();
        });
        // ...and continuously while the app stays open/foregrounded, so a long-lived
        // PWA session (or a tablet/kiosk that's never switched away from) still picks
        // up a new deploy without needing a manual reload. registration.update() forces
        // an immediate re-fetch of sw.js bypassing the browser's normal ~24h SW-update
        // throttle; combined with skipWaiting()/clients.claim() in sw.js, any real change
        // installs and activates immediately, firing the controllerchange reload below.
        setInterval(() => reg.update(), 60 * 1000);
      })
      .catch(() => {});

    // Auto-update (2026-09-01): reload automatically once a new service worker takes
    // control, with no button/prompt needed — but only at a moment nothing is
    // interrupted, so this can't blow away anything the user has open (e.g. a
    // half-filled "New Auction" dialog) the way reloading unconditionally would.
    // Reloads immediately if the tab is already hidden (nobody's looking), or on the
    // next time it's hidden otherwise (switching apps, locking the phone, switching
    // browser tabs) — never while the app is actively visible. skipWaiting()/
    // clients.claim() in sw.js mean the new SW is already in control by the time this
    // fires; this only decides when it's safe to actually reload the page onto it.
    let reloadPending = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (document.hidden) {
        window.location.reload();
      } else if (!reloadPending) {
        reloadPending = true;
        document.addEventListener('visibilitychange', function onHidden() {
          if (document.hidden) {
            document.removeEventListener('visibilitychange', onHidden);
            window.location.reload();
          }
        });
      }
    });
  });
}
