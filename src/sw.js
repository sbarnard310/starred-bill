// Lets The Starred Bill be installed as an app and open pages already visited when offline.
// build.py fills in VERSION and PRECACHE; each new VERSION replaces the old saved copies.
const VERSION = "{{version}}";
const PRECACHE = {{precache}};
const CACHE = "starredbill-" + VERSION;

// A file whose address carries "?v=" is only saved if its contents match that version (the first 10 characters of
// their SHA-1, from build.py). For a few minutes after an update, GitHub's servers can still hand out the previous
// file under the new address; saving that copy would leave the app broken until the next update.
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function matches(res, v) {
  try { return hex(await crypto.subtle.digest("SHA-1", await res.clone().arrayBuffer())).startsWith(v); } catch (err) { return false; }
}
// Fetches a file and saves it if it's the right one; a wrong one is asked for again past the browser's own cache, and kept only if that's right.
async function fetchAndSave(req) {
  const url = new URL(req.url || req, location.href), v = url.searchParams.get("v");
  let res = await fetch(req);
  if (v && res.ok && !(await matches(res, v))) {
    const again = await fetch(url.href, { cache: "reload" }).catch(() => null);
    if (again && again.ok) res = again;
    if (!(await matches(res, v))) return res;  // shown this once, not saved
  }
  if (res.ok) { const copy = res.clone(); await caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
}

self.addEventListener("install", (e) => {
  e.waitUntil(Promise.all(PRECACHE.map((u) => fetchAndSave(u).catch(() => null))).then(() => self.skipWaiting()));
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
    // "no-cache" asks the server every time (instead of the browser's 10-minute copy), so updates show on the next open.
    // A failed fetch is tried once more as the browser asked for it (a blip, or a browser that refuses the "no-cache"
    // copy of a page request), then falls back to this page's saved copy. The homepage stands in only when the browser
    // is offline: online, the browser's own error shows (and a reload fixes it), never the homepage under another
    // page's address, as happened to some visitors on 9 Oct 2026 while the site moved to Cloudflare.
    e.respondWith(fetch(req, { cache: "no-cache" }).catch(() => fetch(req)).then((res) => save(req, res))
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || (self.navigator && self.navigator.onLine === false ? caches.match("/") : null))
        .then((hit) => hit || Response.error())));
    return;
  }
  // Styles, scripts and icons: their addresses change whenever their contents do, so a saved (checked) copy is always current.
  e.respondWith(caches.match(req).then((hit) => hit || fetchAndSave(req)));
});
