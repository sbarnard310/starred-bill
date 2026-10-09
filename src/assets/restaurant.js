// A restaurant's own page (/restaurants/<id>/, build_restaurant_pages() in build.py): the wishlist button, a photo from
// Google beside the name, and a map of the restaurant and the starred restaurants nearby, loaded once it's scrolled near.
// Everything else on the page is written by the build, so it reads the same without this script.
const R = DATA.restaurant;

// ---------- Wishlist ----------
function renderWish() {
  const on = loadWishlist().includes(R.id), b = $("rpWish");
  b.setAttribute("aria-pressed", String(on));
  b.querySelector("span").textContent = on ? "On your wishlist" : "Save to wishlist";
  renderWishCount();
}
$("rpWish").addEventListener("click", () => {
  const list = loadWishlist(), on = list.includes(R.id);
  setWishlist(on ? list.filter((x) => x !== R.id) : list.concat(R.id));
  track("wishlist", { action: on ? "remove" : "add", restaurant: R.id, page: "restaurant" });
  renderWish();
});
window.addEventListener("sb:wishlist", renderWish);
renderWish();

// ---------- Photos ----------
// The first Google Maps photo of the restaurant sits beside the receipt. Google has up to 10; "More photos" shows up to
// GALLERY_MAX more as thumbnails, only once tapped (each photo shown is a paid request to Google, and Google's terms
// don't allow keeping copies, so they load live). Any photo opens full size, with arrows to the others and its credit.
const GALLERY_MAX = 6;
let photos = [];
const credit = (p) => {
  const a = (p.authorAttributions || [])[0];
  return (a ? (a.uri ? '<a href="' + esc(a.uri) + '" target="_blank" rel="noopener">' + esc(a.displayName) + "</a>" : esc(a.displayName)) + " · " : "") + "Google Maps";
};
let shown = 0;
function openPhoto(i) {
  const last = Math.min(photos.length, GALLERY_MAX + 1) - 1;
  shown = (i + last + 1) % (last + 1);
  const p = photos[shown];
  $("photoImg").src = p.getURI({ maxWidth: 1600, maxHeight: 1200 });
  $("photoImg").alt = "Photo " + (shown + 1) + " of " + R.name;
  $("photoCaption").innerHTML = "<strong>" + esc(R.name) + "</strong> · Photo " + (shown + 1) + " of " + (last + 1) + " · " + credit(p);
  $("photoPrev").hidden = $("photoNext").hidden = last < 1;
  if (!$("photoBox").open) $("photoBox").showModal();
}
$("photoBox").addEventListener("click", (e) => {
  if (e.target === $("photoBox") || e.target.closest("#photoClose")) $("photoBox").close();
  else if (e.target.closest("#photoPrev")) openPhoto(shown - 1);
  else if (e.target.closest("#photoNext")) openPhoto(shown + 1);
});
$("photoBox").addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") openPhoto(shown - 1);
  if (e.key === "ArrowRight") openPhoto(shown + 1);
});
$("photoBox").addEventListener("close", () => { $("photoImg").removeAttribute("src"); });

function showGallery(fig, btn) {
  const strip = document.createElement("div");
  strip.className = "rp-gallery";
  photos.slice(1, GALLERY_MAX + 1).forEach((p, k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Open photo " + (k + 2) + " of " + R.name);
    const img = new Image();
    img.alt = "";
    img.decoding = "async";
    img.src = p.getURI({ maxWidth: 400, maxHeight: 400 });
    img.onload = () => b.classList.add("loaded");
    b.appendChild(img);
    b.addEventListener("click", () => openPhoto(k + 1));
    strip.appendChild(b);
  });
  btn.replaceWith(strip);
  track("photos", { restaurant: R.id });
}

async function showPhoto() {
  if (!GOOGLE_MAPS_API_KEY || !R.placeId) return;
  try {
    await loadGoogle();
    const { Place } = await google.maps.importLibrary("places");
    const place = new Place({ id: R.placeId });
    await place.fetchFields({ fields: ["photos"] });
    photos = place.photos || [];
    if (!photos.length) return;
    const fig = document.createElement("figure");
    fig.className = "rp-photo";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "rp-photo-open";
    open.setAttribute("aria-label", "Open the photo of " + R.name + " full size");
    const img = new Image();
    img.alt = "Inside or outside " + R.name;
    img.decoding = "async";
    img.src = photos[0].getURI({ maxWidth: 900, maxHeight: 700 });
    img.onload = () => fig.classList.add("loaded");
    open.appendChild(img);
    open.addEventListener("click", () => openPhoto(0));
    fig.appendChild(open);
    const cap = document.createElement("figcaption");
    cap.innerHTML = "<span>Photo: " + credit(photos[0]) + "</span>";
    if (photos.length > 1) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "rp-more-photos";
      more.textContent = "More photos (" + Math.min(photos.length - 1, GALLERY_MAX) + ")";
      more.addEventListener("click", () => showGallery(fig, more));
      cap.appendChild(more);
    }
    fig.appendChild(cap);
    document.querySelector(".rp-side").prepend(fig);
  } catch (e) { /* no photo: the receipt stands alone */ }
}

// ---------- Map ----------
async function initMap() {
  const el = $("rpMap");
  try {
    await loadGoogle();
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    const { Marker } = await google.maps.importLibrary("marker");
    el.hidden = false;
    const map = new Map(el, { center: { lat: R.lat, lng: R.lng }, zoom: 15, mapTypeControl: false, streetViewControl: false, clickableIcons: false, gestureHandling: "cooperative" });
    const info = new InfoWindow();
    map.addListener("click", () => info.close());
    const bounds = new google.maps.LatLngBounds();
    const here = new Marker({ map, position: { lat: R.lat, lng: R.lng }, title: R.name, icon: pinIcon(R.stars), zIndex: 1000 });
    here.addListener("click", () => { info.setContent('<div style="font-family:Figtree,system-ui,sans-serif;font-weight:700;font-size:15px;color:#12261C">' + esc(R.name) + "</div>"); info.open({ anchor: here, map }); });
    bounds.extend(here.getPosition());
    DATA.nearby.forEach((q) => {
      const m = new Marker({ map, position: { lat: q.lat, lng: q.lng }, title: q.name, icon: pinIcon(q.stars), zIndex: q.stars * 10 });
      m.addListener("click", () => {
        info.setContent('<div style="font-family:Figtree,system-ui,sans-serif;color:#12261C;max-width:220px;line-height:1.4"><div style="font-weight:700;font-size:15px">' + esc(q.name) + "</div>" +
          (q.dinner ? '<div style="font-size:13px">Dinner ' + esc(q.dinner) + "</div>" : "") +
          '<a href="' + esc(q.href) + '" style="display:inline-block;margin-top:6px;color:#1E6142;font-weight:600;font-size:13px">Prices and details</a></div>');
        info.open({ anchor: m, map });
      });
      bounds.extend(m.getPosition());
    });
    if (DATA.nearby.length) map.fitBounds(bounds, 48);
  } catch (e) {
    el.hidden = true;
  }
}
function startMapWhenNear() {
  if (!GOOGLE_MAPS_API_KEY || R.lat == null) return;
  const target = $("nearby");
  let started = false;
  const check = () => {
    if (started || target.getBoundingClientRect().top > window.innerHeight + 400) return;
    started = true;
    window.removeEventListener("scroll", check);
    initMap();
  };
  window.addEventListener("scroll", check, { passive: true });
  check();
}
showPhoto();
startMapWhenNear();

// ---------- Prices in another currency ----------
// The page is written in the restaurant's own currency; the buttons under the answer show every price on it in pounds,
// euros or dollars too (marked ≈, at the rates in currencies.json). The price history keeps the original figures
// (data-nocx), as today's rate would misstate past prices. The choice is kept for the next restaurant page.
const CUR_KEY = "starredbill-rp-currency";
const pageCur = DATA.cur;
const symbolFor = (c) => c === "USD" ? "$" : symbolOf(c);
const priceRe = new RegExp("(^|[^A-Za-z])(" + symbolFor(pageCur).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[\\u00a0 ]") + ")([0-9][0-9,]*(?:\\.[0-9]+)?)", "g");
const priced = [];
function collectPrices() {
  const roots = [document.querySelector(".rp-hero"), $("restaurantMain")];
  roots.forEach((root) => {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) =>
      n.parentElement.closest("[data-nocx], script, style, svg, .rp-cur") || !priceRe.test(n.nodeValue) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let n;
    while ((n = walk.nextNode())) { priceRe.lastIndex = 0; priced.push({ node: n, text: n.nodeValue }); }
  });
}
function showCurrency(c) {
  const rate = DATA.currencies[c].perUSD / DATA.currencies[pageCur].perUSD;
  priced.forEach((p) => {
    const shownText = c === pageCur ? p.text : p.text.replace(priceRe, (m, pre, sym, num, at, all) =>
      pre + (/(roughly|about) $/.test(all.slice(0, at + pre.length)) ? "" : "≈") + symbolFor(c) + Math.round(Number(num.replace(/,/g, "")) * rate).toLocaleString("en-GB"));
    // In dollars, the page's own "(about US$…)" after each price would say the same thing twice.
    p.node.nodeValue = c === "USD" && pageCur !== "USD" ? shownText.replace(/ \(about US\$[\d,]+\)/g, "") : shownText;
  });
  $("rpCur").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cur === c)));
}
(function wireCurrency() {
  const list = [pageCur].concat((DATA.switchable || []).filter((c) => c !== pageCur && DATA.currencies[c]));
  if (list.length < 2) return;
  collectPrices();
  const box = $("rpCur");
  box.innerHTML = '<span class="rp-cur-label">Prices in</span>' + list.map((c) => '<button type="button" data-cur="' + c + '" aria-pressed="false">' + esc(symbolFor(c).trim()) + "</button>").join("");
  box.hidden = false;
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-cur]");
    if (!b) return;
    showCurrency(b.dataset.cur);
    store.set(CUR_KEY, b.dataset.cur);
    track("currency", { currency: b.dataset.cur, page: "restaurant" });
  });
  const saved = store.get(CUR_KEY, pageCur);
  showCurrency(list.includes(saved) ? saved : pageCur);
})();

// "Seen a different price?" opens an email; counted as a contact like the destination pages' form.
document.querySelectorAll("[data-report]").forEach((a) => a.addEventListener("click", () => track("contact", { topic: "price" })));
