// /near-me/: finds the visitor (or a place they type), then shows the starred restaurants around them
// on a map and in a list, nearest first. Everything is worked out in the browser: the location is never sent to us.
// The restaurants come from /data/near.json (build_near_me() in build.py).

const NEAR_KEY = "starredbill-near";  // { lat, lng, label }, only when the visitor ticks "Remember this location"
const near = {
  rows: null, here: null, radius: 2, meal: "dinner", stars: 0, diet: "", sort: "near", shown: 30,
  map: null, info: null, markers: [], clusterer: null, you: null, circle: null
};
const RADII_KM = [10, 25, 50, 100, 250], RADII_MI = [5, 15, 30, 60, 150];
const radiusMetres = () => useMiles() ? RADII_MI[near.radius] * 1609.344 : RADII_KM[near.radius] * 1000;
const radiusText = (i) => useMiles() ? RADII_MI[i] + " miles" : RADII_KM[i] + " km";
const DIET_LABELS = { "vegetarian-only": "dietVegOnly", "vegetarian-menu": "dietVegMenu", "vegetarian": "dietVeg", "vegan": "dietVegan", "gluten-free": "dietGf", "halal": "dietHalal", "kosher": "dietKosher" };
const BADGE_DIETS = [["vegetarian-only", "badgeVegOnly", "dietVegOnly"], ["vegetarian-menu", "badgeVegMenu", "dietVegMenu"], ["vegan", "badgeVegan", "dietVegan"]];

shareText = () => "Michelin star restaurants near you, with dinner and lunch prices";

// ---------- Data ----------
const dataReady = fetch(DATA.nearUrl).then((res) => { if (!res.ok) throw new Error(res.status); return res.json(); }).then((d) => {
  near.rows = d.r.map((a) => {
    const r = {};
    d.cols.forEach((c, i) => { r[c] = a[i]; });
    r.diets = String(r.diets || "").split("").map((i) => d.diets[Number(i)]);
    return r;
  });
  return near.rows;
});
const hasDiet = (r, d) => r.diets.includes(d) || (d === "vegetarian" && (r.diets.includes("vegetarian-menu") || r.diets.includes("vegetarian-only")));
const L = () => near.meal === "lunch";
const priceOf = (r) => L() ? (r.lunch > 0 ? r.lunch : null) : (r.dinnerType === "menu" ? r.dinner : null);
const usd = (r) => priceOf(r) == null || !DATA.currencies[r.cur] ? null : priceOf(r) / DATA.currencies[r.cur].perUSD;
const linkOf = (r) => r.id ? r.path + "?q=" + encodeURIComponent(r.name) : r.path;

function matches(r) {
  return (!near.stars || r.stars === near.stars) && (!near.diet || hasDiet(r, near.diet)) && !(L() && r.lunch === -1);
}
function inRange() {
  const max = radiusMetres();
  return near.rows.filter((r) => r.d <= max && matches(r));
}
function sorted(list) {
  const by = {
    near: (a, b) => a.d - b.d,
    cheap: (a, b) => (usd(a) == null) - (usd(b) == null) || (usd(a) || 0) - (usd(b) || 0) || a.d - b.d,
    stars: (a, b) => b.stars - a.stars || a.d - b.d
  };
  return list.slice().sort(by[near.sort]);
}

// ---------- Finding the visitor ----------
function status(text, isError) {
  $("nearStatus").innerHTML = text;
  $("nearStatus").classList.toggle("error", !!isError);
}
function busy(on) {
  $("locateBtn").disabled = on;
  $("locateBtn").querySelector("span").textContent = on ? "Finding you…" : "Use my location";
}
function locate() {
  if (!navigator.geolocation) { status("This browser can't share your location. Type a town or postcode instead.", true); return; }
  busy(true);
  status("");
  navigator.geolocation.getCurrentPosition((pos) => {
    busy(false);
    setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your location" });
    track("near-me", { page: "near-me", via: "location" });
  }, (err) => {
    busy(false);
    status(err.code === 1
      ? "Location access is turned off for this page. Allow it in your browser's settings, or type a town or postcode instead."
      : "Couldn't find your location just now. Try again, or type a town or postcode instead.", true);
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
}
async function searchPlace(q) {
  q = q.trim();
  if (!q) { $("placeQ").focus(); return; }
  status("Looking for " + esc(q) + "…");
  try {
    await loadGoogle();
    const { Place } = await google.maps.importLibrary("places");
    const { places } = await Place.searchByText({ textQuery: q, fields: ["displayName", "formattedAddress", "location"], maxResultCount: 1 });
    if (!places || !places.length) { status("Couldn't find “" + esc(q) + "”. Try a town or city name, or a full postcode.", true); return; }
    const p = places[0];
    setHere({ lat: p.location.lat(), lng: p.location.lng(), label: p.formattedAddress || p.displayName });
    // Only how the place was found is counted, never what was typed.
    track("near-me", { page: "near-me", via: "search" });
  } catch (e) {
    status("The place search isn't working just now. Try “Use my location” instead.", true);
  }
}
async function setHere(here, remembered) {
  near.here = here;
  near.shown = 30;
  try { await dataReady; } catch (e) { status("The restaurant list couldn't load just now. Please refresh the page.", true); return; }
  near.rows.forEach((r) => { r.d = metresBetween(here, r); });
  status("Showing starred restaurants near <strong>" + esc(here.label) + "</strong>.");
  $("results").hidden = false;
  renderRemember(!!remembered || !!store.get(NEAR_KEY, null));
  // Nothing within the chosen distance: widen it to the first distance that has something.
  if (!inRange().length) {
    const i = (useMiles() ? RADII_MI : RADII_KM).findIndex((x, k) => near.rows.some((r) => r.d <= (useMiles() ? x * 1609.344 : x * 1000) && matches(r)) && k > near.radius);
    if (i > -1) near.radius = i;
  }
  renderFilters();
  render(true);
  if (!remembered) $("results").scrollIntoView({ behavior: "smooth", block: "start" });
}
function renderRemember(on) {
  $("rememberLine").hidden = false;
  $("rememberLine").innerHTML = '<label><input type="checkbox" id="rememberBox"' + (on ? " checked" : "") + "> Remember this location on this device</label>" +
    (on ? " <span>Saved in this browser only.</span>" : "");
  if (on) store.set(NEAR_KEY, near.here);
}

// ---------- Filters ----------
function renderFilters() {
  $("fRadius").innerHTML = RADII_KM.map((x, i) => '<option value="' + i + '"' + (i === near.radius ? " selected" : "") + ">" + radiusText(i) + "</option>").join("");
  $("fMeal").innerHTML = [["dinner", "Dinner"], ["lunch", "Lunch"]].map(([k, l]) => '<button type="button" data-meal="' + k + '" aria-pressed="' + (near.meal === k) + '">' + l + "</button>").join("");
  $("fStars").innerHTML = [0, 1, 2, 3].map((s) => '<button type="button" data-stars="' + s + '" aria-pressed="' + (near.stars === s) + '"' +
    (s ? ' aria-label="' + esc(t("starsAria", { n: s })) + '"' : "") + ">" + (s ? starIcons(s) : "All") + "</button>").join("");
  $("fDiet").innerHTML = '<option value="">Any</option>' + Object.keys(DIET_LABELS).map((d) => '<option value="' + d + '"' + (near.diet === d ? " selected" : "") + ">" + esc(t(DIET_LABELS[d])) + "</option>").join("");
  $("fSort").innerHTML = [["near", "Nearest first"], ["cheap", "Cheapest first"], ["stars", "Most stars first"]].map(([k, l]) => '<option value="' + k + '"' + (near.sort === k ? " selected" : "") + ">" + l + "</option>").join("");
}
$("fRadius").addEventListener("change", (e) => { near.radius = Number(e.target.value); near.shown = 30; render(true); });
$("fDiet").addEventListener("change", (e) => { near.diet = e.target.value; near.shown = 30; render(true); });
$("fSort").addEventListener("change", (e) => { near.sort = e.target.value; near.shown = 30; render(false); });
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.meal) { near.meal = b.dataset.meal; renderFilters(); render(false); }
  else if (b.dataset.stars) { near.stars = Number(b.dataset.stars); renderFilters(); render(true); }
  else if (b.dataset.focus != null) { focusRow(near.rows[Number(b.dataset.focus)]); }
  else if (b.dataset.widen) { near.radius = Number(b.dataset.widen); renderFilters(); render(true); }
  else if (b.dataset.wish) {
    const list = loadWishlist(), id = b.dataset.wish;
    const on = list.includes(id);
    setWishlist(on ? list.filter((x) => x !== id) : list.concat(id));
    track("wishlist", { action: on ? "remove" : "add", restaurant: id, page: "near-me" });
  } else if (b.id === "nearMore") { near.shown += 30; renderList(); }
  else if (b.id === "forgetBtn") { store.set(NEAR_KEY, null); renderRemember(false); }
});
document.addEventListener("change", (e) => {
  if (e.target.id !== "rememberBox") return;
  if (e.target.checked) store.set(NEAR_KEY, near.here); else store.set(NEAR_KEY, null);
  renderRemember(e.target.checked);
});
window.addEventListener("sb:wishlist", () => { renderWishCount(); if (near.here) renderList(); });

// ---------- Cards, list and map ----------
const priceText = (r) => {
  if (!r.id) return "Price not on the site yet";
  const p = priceOf(r);
  if (L()) return r.lunch === -1 ? "No lunch" : p == null ? "Lunch price not listed" : localMoney(p, r.cur) + " lunch";
  if (r.dinner == null) return "Price not listed yet";
  return localMoney(r.dinner, r.cur) + " " + (r.dinnerType === "main" ? "per main course" : r.dinnerType === "spend" ? "typical spend" : "dinner");
};
const badges = (r) => BADGE_DIETS.filter(([d]) => r.diets.includes(d) && !(d === "vegetarian-menu" && r.diets.includes("vegetarian-only")))
  .map(([, short, full]) => '<span class="diet-badge" title="' + esc(t(full)) + '"><svg aria-hidden="true"><use href="#leaf"/></svg>' + esc(t(short)) + "</span>").join("");
const idx = (r) => near.rows.indexOf(r);

function card(label, r, extra) {
  if (!r) return "";
  return '<button type="button" class="near-card" data-focus="' + idx(r) + '"><span class="nc-label">' + label + '</span><span class="nc-name">' + esc(r.name) + " " + starIcons(r.stars) + "</span>" +
    '<span class="nc-meta">' + esc(extra || distanceText(r.d) + " away") + "</span></button>";
}
function renderCards(list) {
  const all = near.rows.filter((r) => r.d != null);
  const nearest = (s) => all.filter((r) => r.stars === s && (!near.diet || hasDiet(r, near.diet))).sort((a, b) => a.d - b.d)[0];
  // The nearest restaurant that matches the filters, even when it's beyond the chosen distance.
  const byNear = list.length ? list.slice().sort((a, b) => a.d - b.d) : all.filter(matches).sort((a, b) => a.d - b.d);
  const cheapest = list.filter((r) => usd(r) != null).sort((a, b) => usd(a) - usd(b))[0];
  const count = '<div class="near-card near-total"><span class="nc-label">Within ' + radiusText(near.radius) + '</span><span class="nc-big">' + list.length + "</span>" +
    '<span class="nc-meta">' + (list.length === 1 ? "starred restaurant" : "starred restaurants") + "</span></div>";
  $("nearCards").innerHTML = count + card("Nearest", byNear[0]) +
    card(L() ? "Cheapest lunch" : "Cheapest dinner", cheapest, cheapest ? priceText(cheapest) + " · " + distanceText(cheapest.d) : "") +
    (near.stars && near.stars !== 2 ? "" : card("Nearest two-star", nearest(2))) + (near.stars && near.stars !== 3 ? "" : card("Nearest three-star", nearest(3)));
}
function render(refit) {
  if (!near.here) return;
  const list = inRange();
  renderCards(list);
  renderList();
  drawMap(list, refit);
}
function renderList() {
  const list = sorted(inRange());
  const shown = list.slice(0, near.shown);
  const wish = loadWishlist();
  if (!list.length) {
    const closest = near.rows.filter(matches).sort((a, b) => a.d - b.d)[0];
    const next = (useMiles() ? RADII_MI : RADII_KM).findIndex((x, k) => k > near.radius && closest && closest.d <= (useMiles() ? x * 1609.344 : x * 1000));
    $("nearCount").innerHTML = "No starred restaurants within " + radiusText(near.radius) + " that match." +
      (closest ? " The nearest is <strong>" + esc(closest.name) + "</strong>, " + distanceText(closest.d) + " away." : "") +
      (next > -1 ? ' <button type="button" class="linkish" data-widen="' + next + '">Show everything within ' + radiusText(next) + "</button>" : "");
  } else {
    $("nearCount").textContent = list.length + (list.length === 1 ? " starred restaurant" : " starred restaurants") + " within " + radiusText(near.radius) +
      (near.sort === "near" ? ", nearest first" : near.sort === "cheap" ? ", cheapest first" : ", most stars first");
  }
  $("nearRows").innerHTML = shown.map((r) => {
    const on = r.id && wish.includes(r.id);
    return '<li class="near-row">' +
      '<div class="nr-main"><a class="nr-name" href="' + esc(linkOf(r)) + '">' + esc(r.name) + "</a> " + starIcons(r.stars) +
      '<span class="nr-where">' + esc(r.cuisine) + " · " + esc(r.where) + "</span>" +
      (r.chef ? '<span class="nr-chef">' + esc(t("chefLabel", { name: r.chef })) + "</span>" : "") +
      (badges(r) ? '<span class="diet-badges">' + badges(r) + "</span>" : "") +
      '<span class="nr-price">' + esc(priceText(r)) + (!L() && r.lunch > 0 ? ' · <span class="nr-lunch">' + esc(localMoney(r.lunch, r.cur)) + " lunch</span>" : "") + "</span></div>" +
      '<div class="nr-side"><span class="nr-d">' + distanceText(r.d) + "</span>" +
      '<button type="button" class="nr-pin" data-focus="' + idx(r) + '" aria-label="Show ' + esc(r.name) + ' on the map" title="Show on the map"><svg aria-hidden="true"><use href="#pin"/></svg></button>' +
      (r.id ? '<button type="button" class="wish' + (on ? " on" : "") + '" data-wish="' + esc(r.id) + '" aria-pressed="' + !!on + '" aria-label="' + esc(t(on ? "wishRemove" : "wishAdd", { name: r.name })) + '">' + heart + "</button>" : "") +
      "</div></li>";
  }).join("");
  $("nearMore").hidden = list.length <= near.shown;
  $("nearMore").textContent = "Show " + Math.min(30, list.length - near.shown) + " more";
}

function infoHtml(r) {
  return '<div style="font-family:Figtree,system-ui,sans-serif;color:#12261C;max-width:240px;line-height:1.4">' +
    '<div style="font-weight:700;font-size:15px">' + esc(r.name) + "</div>" +
    '<div style="color:#B3862B;font-size:13px">' + "✱".repeat(r.stars) + ' <span style="color:#5A6E62">' + esc(r.cuisine) + " · " + esc(r.where) + "</span></div>" +
    (r.chef ? '<div style="font-size:12px;color:#5A6E62">' + esc(t("chefLabel", { name: r.chef })) + "</div>" : "") +
    '<div style="margin-top:6px;font-size:13px">' + esc(priceText(r)) + " · " + distanceText(r.d) + " away</div>" +
    '<a href="' + esc(linkOf(r)) + '" style="display:inline-block;margin-top:6px;color:#1E6142;font-weight:600;font-size:13px">' + (r.id ? "Compare prices →" : "See it in the MICHELIN Guide ↗") + "</a></div>";
}
async function ensureMap() {
  if (near.map) return near.map;
  await loadGoogle();
  const { Map, InfoWindow, Circle } = await google.maps.importLibrary("maps");
  await google.maps.importLibrary("marker");
  $("nearMap").innerHTML = "";
  $("nearMap").style.display = "block";
  near.map = new Map($("nearMap"), { center: near.here, zoom: 10, mapTypeControl: false, streetViewControl: false, clickableIcons: false, gestureHandling: "cooperative" });
  near.info = new InfoWindow();
  near.map.addListener("click", () => near.info.close());
  near.circle = new Circle({ map: near.map, clickable: false, strokeColor: "#1E6142", strokeOpacity: .5, strokeWeight: 1.5, fillColor: "#1E6142", fillOpacity: .05 });
  if (window.markerClusterer) {
    near.clusterer = new markerClusterer.MarkerClusterer({ map: near.map,
      renderer: { render: ({ count, position }) => new google.maps.Marker({ position, label: { text: String(count), color: "#ffffff", fontSize: "13px", fontWeight: "700" }, zIndex: 1000 + count,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: count < 10 ? 16 : 20, fillColor: "#1E6142", fillOpacity: .92, strokeColor: "#ffffff", strokeWeight: 3 } }) } });
  }
  return near.map;
}
async function drawMap(list, refit) {
  try {
    const map = await ensureMap();
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26'><circle cx='13' cy='13' r='12' fill='#1A73E8' fill-opacity='.2'/><circle cx='13' cy='13' r='7' fill='#1A73E8' stroke='#ffffff' stroke-width='3'/></svg>";
    if (!near.you) near.you = new google.maps.Marker({ map, zIndex: 5000, clickable: false, title: "You are here",
      icon: { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg), scaledSize: new google.maps.Size(26, 26), anchor: new google.maps.Point(13, 13) } });
    near.you.setPosition(near.here);
    near.circle.setCenter(near.here);
    near.circle.setRadius(radiusMetres());
    near.info.close();
    if (near.clusterer) near.clusterer.clearMarkers(); else near.markers.forEach((m) => m.setMap(null));
    near.markers = list.map((r) => {
      const m = new google.maps.Marker({ position: { lat: r.lat, lng: r.lng }, title: r.name, icon: pinIcon(r.stars, !r.id), zIndex: 100 + r.stars * 10 });
      m.r = r;
      m.addListener("click", () => { near.info.setContent(infoHtml(r)); near.info.setOptions({ pixelOffset: null }); near.info.open({ anchor: m, map }); });
      return m;
    });
    if (near.clusterer) near.clusterer.addMarkers(near.markers); else near.markers.forEach((m) => m.setMap(map));
    if (refit) {
      // Frame the circle, or the nearest few restaurants when they're all much closer than its edge.
      const b = new google.maps.LatLngBounds(near.here);
      const closest = list.slice().sort((a, c) => a.d - c.d).slice(0, 8);
      if (closest.length >= 8 && closest[7].d < radiusMetres() / 3) closest.forEach((r) => b.extend(r));
      else b.union(near.circle.getBounds());
      map.fitBounds(b, 30);
    }
  } catch (e) {
    $("nearMap").innerHTML = '<p class="map-wait">The map couldn\'t load just now. The list beside it still works.</p>';
  }
}
function focusRow(r) {
  if (!r || !near.map) return;
  $("nearMap").scrollIntoView({ behavior: "smooth", block: "center" });
  near.map.panTo(r);
  if (near.map.getZoom() < 14) near.map.setZoom(14);
  near.info.setContent(infoHtml(r));
  near.info.setOptions({ pixelOffset: new google.maps.Size(0, -38) });
  near.info.setPosition(r);
  near.info.open({ map: near.map });
}

// ---------- Start ----------
function renderStatic() {
  applyI18n();
  fitPlaceholder($("placeQ"), ["Type a town, city or postcode", "Town, city or postcode", "Town or postcode"]);
  renderWishCount();
  $("destLink").href = withLang("/") + "#destinations";
}
renderStatic();
document.addEventListener("click", (e) => { const el = e.target.closest("button[data-lang]"); if (el) { setLang(el.dataset.lang); renderStatic(); } });
$("locateBtn").addEventListener("click", locate);
$("placeForm").addEventListener("submit", (e) => { e.preventDefault(); $("placeQ").blur(); searchPlace($("placeQ").value); });
const saved = store.get(NEAR_KEY, null);
const params0 = new URLSearchParams(location.search);
if (params0.get("q")) { $("placeQ").value = params0.get("q"); searchPlace(params0.get("q")); }
else if (params0.get("locate") === "1") locate();
else if (saved && typeof saved.lat === "number") setHere(saved, true);
