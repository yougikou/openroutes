// Minimal Service Worker to satisfy PWA installability criteria
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Check if it's a map tile request (OpenStreetMap)
  if (url.hostname.includes('openstreetmap.org')) {
    event.respondWith(
      fetch(event.request.url, {
        mode: 'cors'
      })
    );
  }
});
