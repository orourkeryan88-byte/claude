/* Southline CRM — service worker.
 * Network-first for the app itself (always fresh), cache fallback offline,
 * cache-first for fonts/icons. Lets the CRM install and open like a native app. */
const CACHE = "southline-crm-v1";
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
  // API calls (other origins, e.g. the Render server) go straight to the network.
  if (url.origin !== location.origin) return;

  if (/\.(png|woff2?|ttf)$/.test(url.pathname)) {
    // cache-first for static assets
    e.respondWith(
      caches.match(e.request).then((hit) => hit ||
        fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; }))
    );
    return;
  }
  // network-first for the app shell, cached copy when offline
  e.respondWith(
    fetch(e.request)
      .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
  );
});
