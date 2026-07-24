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

    // When a new SW takes control (skipWaiting fired), reload to apply the update
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}
