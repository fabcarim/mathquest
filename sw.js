// sw.js v18.2 – Service Worker robusto per GitHub Pages
const VERSION = 'v182';
const CACHE_NAME = `mathquest-${VERSION}`;

// Costruisce URL assoluti degli asset in base allo scope del SW (funziona su user o project pages)
const scopeURL = new URL(self.registration.scope);
function asset(url) {
  return new URL(url, scopeURL).toString();
}

// Asset core senza querystring (il versioning lo fa CACHE_NAME)
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

// Strategy:
// - GET same-origin: cache-first per i CORE_ASSETS; altrimenti network-with-cache-fallback
// - Navigazioni (HTML): network-first con fallback a index.html (offline)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigazione (clic link / ricarica pagina)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(asset('index.html')))
    );
    return;
  }

  if (sameOrigin) {
    // CORE: cache first
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

    // Altri file same-origin: network → cache fallback
    event.respondWith(
      fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return resp;
      }).catch(() => caches.match(req))
    );
  }
  // Cross-origin: lascia passare (CDN ecc.)
});
