// sw.js v18.3 – cache-busting
const VERSION = 'v183';
const CACHE_NAME = `mathquest-${VERSION}`;

const scopeURL = new URL(self.registration.scope);
function asset(url) { return new URL(url, scopeURL).toString(); }

const CORE_ASSETS = [
  asset('./'),
  asset('index.html'),
  asset('styles.css'),
  asset('app.js'),
  asset('manifest.webmanifest')
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(asset('index.html'))));
    return;
  }

  if (sameOrigin) {
    const isCore = CORE_ASSETS.some(u => u === url.toString());
    if (isCore) {
      event.respondWith(
        caches.match(req).then(cached => cached || fetch(req).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return resp;
        }))
      );
      return;
    }
    event.respondWith(
      fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return resp;
      }).catch(() => caches.match(req))
    );
  }
});
