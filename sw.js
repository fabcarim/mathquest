// sw.js – MathQuest PWA (v16-dev)
const CACHE_NAME = "mq-v16";
const CORE = [
  "./",
  "./index.html",
  "./styles.css?v=16",
  "./app.js?v=16",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k!==CACHE_NAME).map(k => caches.delete(k)))
    ).then(()=> self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // Network first per HTML, cache first per asset
  if (req.headers.get("accept") && req.headers.get("accept").includes("text/html")) {
    e.respondWith(
      fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c=>c.put(req, copy));
        return res;
      }).catch(()=> caches.match(req).then(r=> r || caches.match("./index.html")))
    );
  } else {
    e.respondWith(
      caches.match(req).then((res)=> res || fetch(req).then(net=>{
        const copy=net.clone(); caches.open(CACHE_NAME).then(c=>c.put(req, copy)); return net;
      }))
    );
  }
});
