
// sw.js — MathQuest PWA (cache-first) per GitHub Pages
const CACHE_NAME = 'mathquest-v2';
const ASSETS = [
  './',                      // root del repo (es. /mathquest/)
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Installa e mette in cache gli asset di base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Pulisce le cache vecchie quando aggiorniamo la versione
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

// Strategia cache-first per richieste stessa origine
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo richieste della stessa origine (il tuo sito GitHub Pages)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        // Se in cache, rispondi subito; altrimenti vai in rete
        return (
          cached ||
          fetch(event.request).catch(() => {
            // Fallback di base: se è una navigazione e siamo offline,
            // prova a servire index.html (utile per app a pagina singola)
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          })
        );
      })
    );
  }
});

