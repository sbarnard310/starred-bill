// Lets The Starred Bill be installed as an app and open pages already visited when offline.
// build.py fills in VERSION and PRECACHE; each new VERSION replaces the old saved copies.
const VERSION = "{{version}}";
const PRECACHE = {{precache}};
const CACHE = "starredbill-" + VERSION;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("starredbill-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const save = (req, res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // Maps, photos, fonts and exchange rates come from other sites and always go to the network.
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    // Pages: the latest version when online, the last saved copy when offline.
    e.respondWith(fetch(req).then((res) => save(req, res))
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("/"))));
    return;
  }
  // Styles, scripts and icons: their addresses change whenever their contents do, so a saved copy is always current.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))));
});
