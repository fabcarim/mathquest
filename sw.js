
// sw.js — MathQuest PWA (GitHub Pages) — network-first per HTML
const CACHE_NAME = 'mathquest-v5'; // cambia versione quando aggiorni l'app
const ASSETS = [
  './',                      // root del repo (es. /mathquest/)
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: precache asset di base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
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

// Fetch: network-first per navigazioni (index.html), cache-first per il resto
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // gestiamo solo richieste della stessa origine (il tuo sito GitHub Pages)
  if (url.origin !== self.location.origin) return;

  // Navigazioni: tenta rete prima (così vedi subito gli aggiornamenti dell'index)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          // aggiorna cache dell'index in background
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
          return resp;
        })
        .catch(() => caches.match('./index.html')) // fallback offline
    );
    return;
  }

  // Altri asset: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

