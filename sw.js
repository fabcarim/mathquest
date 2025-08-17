// sw.js v17 – cache essenziale e sicura
const CACHE_NAME = 'mathquest-v17';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=17',
  './app.js?v=17',
  './manifest.webmanifest?v=17'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
});
self.addEventListener('fetch', (e)=>{
  const req=e.request;
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(resp=>{
      // facoltativo: cache dinamica solo GET same-origin
      try{
        const url = new URL(req.url);
        if(req.method==='GET' && url.origin===location.origin){
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c=>c.put(req, clone));
        }
      }catch(_){}
      return resp;
    }).catch(()=>caches.match('./index.html')))
  );
});
