import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

// Service worker safety:
// If an old/broken SW is installed, it can cache-bust the app into a blank screen.
// We proactively unregister any existing SW and clear caches once, then register our current SW.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const hadOldRegistrations = registrations.length > 0;

      await Promise.all(registrations.map(r => r.unregister()));

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      // eslint-disable-next-line no-console
      console.log('SW registered:', reg.scope);

      // If we removed an older SW, reload once so the app can re-fetch cleanly.
      if (hadOldRegistrations && !sessionStorage.getItem('sw_reset_done')) {
        sessionStorage.setItem('sw_reset_done', '1');
        window.location.reload();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('SW setup failed:', err);
    }
  });
}
