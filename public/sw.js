// Saver Partner — Service Worker
// Network-first strategy: always try network, fall back to cache
// This prevents stale cache from blocking app loads

const CACHE = 'saver-partner-v1';

self.addEventListener('install', () => {
  // Skip waiting so new SW activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Clear ALL old caches on activation
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  // Never intercept Firebase, auth, or API calls
  const url = e.request.url;
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.includes('identitytoolkit') ||
    url.includes('razorpay') ||
    url.includes('nominatim')
  ) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        // Network failed — try cache
        caches.match(e.request).then(cached => cached || fetch(e.request))
      )
  );
});
