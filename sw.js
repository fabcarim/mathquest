/* sw.js — MathQuest PWA — v10
   - Navigazioni (document): NETWORK-FIRST con fallback offline (index.html)
   - Asset statici (css/js/icone/manifest): CACHE-FIRST con fill dinamico
*/
const VERSION    = 'v10';
const CACHE_NAME = `mathquest-${VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './styles.css',                 // se NON usi styles.css puoi lasciarlo: fallirà silenziosamente
  './manifest.webmanifest',       // se presente
  './sw.js',
  './icons/icon-192.png',         // se presenti
  './icons/icon-512.png'
];

// Install: precache di base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate: pulizia cache vecchie
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first per navigazioni, cache-first per asset
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // gestisci solo stessa origine (GitHub Pages del tuo repo)
  if (url.origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate' || req.destination === 'document';
  if (isNavigation) {
    // NETWORK FIRST: prova rete, se offline usa index dalla cache
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

  // per tutto il resto (GET) usa CACHE FIRST
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          // salva nella cache gli asset "base"
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

// opzionale: aggiornamento immediato da client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

