/* sw.js — MathQuest PWA (GitHub Pages) — v9
   Strategia:
   - Navigazioni (documenti): NETWORK-FIRST con fallback offline
   - Asset statici (css/js/icone/manifest): CACHE-FIRST con fill della cache
*/
const VERSION    = 'v9';
const CACHE_NAME = `mathquest-${VERSION}`;

const PRECACHE = [
  './',                    // root del repo (es. /mathquest/)
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './sw.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: precache degli asset base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate: elimina le cache precedenti
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first per navigazioni, cache-first per il resto
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Gestiamo solo stessa origine (il tuo sito GitHub Pages)
  if (url.origin !== self.location.origin) return;

  // NAVIGAZIONI (documenti/SPA): NETWORK-FIRST
  const isNavigation = req.mode === 'navigate' || req.destination === 'document';
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          // aggiorna la cache dell'index in background
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // STATICI: CACHE-FIRST con riempimento della cache
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return resp;
        });
      })
    );
  }
});

// Aggiornamento immediato opzionale dal client:
// navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' })
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
