const CACHE_NAME = 'osm-tiles';

self.addEventListener('fetch', event => {
  // Only intercept GET requests for tile domains
  if (event.request.method === 'GET' && event.request.url.includes('tile.openstreetmap.org')) {

    const fetchFromNetwork = () => {
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
    };

    event.respondWith(
      caches.match(event.request, {
        ignoreSearch: true // Ignore URL params
      }).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse; // Cache hit
        }

        // Try fallback to 'a' subdomain if current request is different
        // Offline maps are saved with 'a' subdomain to ensure consistency
        const urlObj = new URL(event.request.url);
        if (urlObj.hostname !== 'a.tile.openstreetmap.org') {
             const fallbackUrl = event.request.url.replace(urlObj.hostname, 'a.tile.openstreetmap.org');
             return caches.match(fallbackUrl, { ignoreSearch: true }).then(fallbackResponse => {
                 if (fallbackResponse) {
                     return fallbackResponse;
                 }
                 return fetchFromNetwork();
             });
        }

        return fetchFromNetwork();
      })
    );
  }
});
