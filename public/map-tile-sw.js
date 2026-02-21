const CACHE_NAME = 'osm-tiles';

self.addEventListener('fetch', event => {
  // Only intercept GET requests for tile domains
  if (event.request.method === 'GET' && event.request.url.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(event.request, {
        ignoreSearch: true // Ignore URL params
      }).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse; // Cache hit
        }

        // Network fetch with fallback for offline/error
        return fetch(event.request).then(networkResponse => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'cors' && networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clone the response
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        }).catch(() => {
          // Return transparent placeholder SVG on failure
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        });
      })
    );
  }
});
