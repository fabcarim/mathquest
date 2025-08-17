// sw.js v18 – cache essenziale
const CACHE_NAME = 'mathquest-v18';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=18',
  './app.js?v=18',
  './manifest.webmanifest?v=18'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(()=>caches.match('./index.html')))
  );
});
