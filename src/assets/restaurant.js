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

// ---------- Photo ----------
// The first Google Maps photo of the restaurant, with its credit, beside the receipt on computers and above it on phones.
async function showPhoto() {
  if (!GOOGLE_MAPS_API_KEY || !R.placeId) return;
  try {
    await loadGoogle();
    const { Place } = await google.maps.importLibrary("places");
    const place = new Place({ id: R.placeId });
    await place.fetchFields({ fields: ["photos"] });
    const photo = place.photos && place.photos[0];
    if (!photo) return;
    const author = (photo.authorAttributions || [])[0];
    const fig = document.createElement("figure");
    fig.className = "rp-photo";
    const img = new Image();
    img.alt = "Inside or outside " + R.name;
    img.decoding = "async";
    img.src = photo.getURI({ maxWidth: 900, maxHeight: 700 });
    img.onload = () => fig.classList.add("loaded");
    fig.appendChild(img);
    const cap = document.createElement("figcaption");
    cap.innerHTML = "Photo: " + (author ? (author.uri ? '<a href="' + esc(author.uri) + '" target="_blank" rel="noopener">' + esc(author.displayName) + "</a>" : esc(author.displayName)) + " · " : "") + "Google Maps";
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
