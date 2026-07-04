/* Southline Admin — service worker.
 * Network-first for the page (always fresh), cache fallback offline,
 * cache-first for icons. Lets the owner admin install as its own app. */
const CACHE = "southline-admin-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin !== location.origin) return; // API calls to Render go straight to network
  if (/\.(png|woff2?|ttf)$/.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then((hit) => hit ||
      fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; })));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
  );
});
