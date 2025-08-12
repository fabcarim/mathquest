
// sw.js — refresh sicuro dell'index su GitHub Pages
const CACHE_NAME = 'mathquest-v3'; // <-- cambia versione per forzare update
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : undefined)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo stessa origine
  if (url.origin !== self.location.origin) return;

  // Per le navigazioni (index.html) usa NETWORK-FIRST: così prendi subito la versione nuova
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          // aggiorna la cache in background
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Per il resto cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

