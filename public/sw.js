const CACHE_NAME = 'nutrivision-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Initial caching deferred for dynamic assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass non-GET requests natively
  if (event.request.method !== 'GET') return;

  // Do NOT cache Vite dev dependencies, hot module reloads, or TSX files
  const url = new URL(event.request.url);
  if (
    url.pathname.includes('/@') || 
    url.pathname.endsWith('.tsx') || 
    url.pathname.endsWith('.ts') || 
    url.pathname.includes('/node_modules/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
