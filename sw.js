/* MathQuest SW v12.2 */
const CACHE_NAME = 'mq-v12-2';
const CORE_ASSETS = [
  '/',
  '/mathquest/',
  '/mathquest/index.html',
  '/mathquest/styles.css',
  '/mathquest/app.js',
  '/mathquest/manifest.webmanifest',
  '/mathquest/icons/icon-192.png',
  '/mathquest/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(CORE_ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/mathquest/index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});
