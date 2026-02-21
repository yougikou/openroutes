self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open('app-shell-v1').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './icon-192.png',
        './icon-512.png',
        './apple-touch-icon.png',
        './manifest.json'
      ]);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});
