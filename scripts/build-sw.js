const workboxBuild = require('workbox-build');

const buildSW = () => {
  return workboxBuild.generateSW({
    globDirectory: 'dist',
    globPatterns: [
      '**/*.{html,json,js,css}',
      '**/*.{png,jpg,jpeg,svg,ico}',
      '**/*.{ttf,woff,woff2,otf}'
    ],
    // Explicitly override globIgnores to allow caching assets in node_modules (e.g., expo-vector-icons)
    globIgnores: [
      '**/sw.js',
      '**/sw.js.map',
      '**/workbox-*.js',
      '**/workbox-*.js.map'
    ],
    swDest: 'dist/sw.js',
    importScripts: ['sw-custom.js', 'map-tile-sw.js'],
    // Increase the limit to cache large bundles
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
    // Handle SPA navigation fallback
    // Note: '/openroutes/index.html' matches the web.basePath in app.json and GitHub Pages repository name.
    // The scheme 'oproutes' is for native deep linking and does not apply here.
    navigateFallback: '/openroutes/index.html',
    // Skip waiting and claim clients immediately
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    // Add runtime caching for external resources if needed
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'google-fonts-stylesheets',
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-webfonts',
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
        },
      },
      {
        urlPattern: /^https:\/\/raw\.githubusercontent\.com/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'github-raw-content',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/github\.com\/.*\/releases\/download\/.*/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'github-releases',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/objects\.githubusercontent\.com/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'github-objects',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
    ],
  });
};

buildSW().then(({count, size}) => {
  console.log(`Generated SW with ${count} precached files, totaling ${size} bytes.`);
}).catch((err) => {
  console.error('Error generating SW:', err);
  process.exit(1);
});
