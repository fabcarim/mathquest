// sw.js — MathQuest PWA (GitHub Pages) — v7
// Strategia: network-first per navigazioni, cache-first per asset
const VERSION = 'v7';
const CACHE_NAME = `mathquest-${VERSION}`;

const PRECACHE_URLS = [
  './',                     // root del repo, es: /mathquest/
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './sw.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: precache degli asset di base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: elimina le cache precedenti
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first per le navigazioni (documenti), cache-first per il resto
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // gestiamo solo la stessa origine (il tuo sito Pages)
  if (url.origin !== self.location.origin) return;

  // NAVIGAZIONI (index.html / SPA): network-first con fallback offline
  const isNav = req.mode === 'navigate' || req.destination === 'document';
  if (isNav) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          // aggiorna cache dell'index in background
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // ASSET STATICI (CSS/icone/manifest/js): cache-first
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          // metti in cache solo risposte valide
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
// navigator.serviceWorker.controller.postMessage({type:'SKIP_WAITING'})
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
