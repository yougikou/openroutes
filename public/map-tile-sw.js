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
        return fetch(event.request).catch(() => {
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
