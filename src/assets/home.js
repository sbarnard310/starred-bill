// The homepage: search, a world map of every starred restaurant, destination cards and the wishlist.

const ALL = DATA.restaurants;
const homeState = { stars: 0 };
const cityLink = (r) => withLang(r.cityPath) + "&q=" + encodeURIComponent(r.name);
// Where a restaurant is, e.g. "London", or "Aughton, England" for one listed under a region.
const whereOf = (r) => r.town ? r.town + ", " + pick(r, "cityName") : pick(r, "cityName");
const priceLabel = (r) => r.dinner == null ? t("infoNoPrice")
  : localMoney(r.dinner, r.cur) + " " + (r.dinnerType === "main" ? t("perMain") : r.dinnerType === "spend" ? t("typicalSpend") : t("infoDinner"));
const starCountsOf = (list) => { const n = [0, 1, 2, 3].map((s) => list.filter((r) => r.stars === s).length); return t("starCounts").replace("{3}", n[3]).replace("{2}", n[2]).replace("{1}", n[1]); };

function applyStatic() {
  applyI18n();
  document.title = t("homeTitle");
  $("homeQ").placeholder = t("homeSearchPh");
  $("homeQ").setAttribute("aria-label", t("homeSearchLabel"));
  $("mapCanvas").setAttribute("aria-label", t("mapLabel"));
  $("mapQ").placeholder = t("mapSearchPh");
  $("mapQ").setAttribute("aria-label", t("mapSearchLabel"));
  if (DATA.worldTotal) document.querySelector('[data-i18n="mapHomeText"]').textContent = t("mapHomeWorldText", { n: DATA.worldTotal.toLocaleString("en-GB") });
}
function renderFigures() {
  $("fRestaurants").textContent = ALL.length;
  $("fRestaurantsSub").textContent = starCountsOf(ALL);
  // A destination with no separate city pages (e.g. Hong Kong) counts as one city.
  const cities = DATA.places.filter((p) => p.type === "city").length + DATA.countries.filter((c) => !c.cities.length).length;
  $("fDest").textContent = DATA.countries.length;
  $("fDestSub").textContent = t("citiesN", { n: cities });
  $("fUpdated").textContent = monthYear(DATA.updated);
}

// ---------- Destinations ----------
function destCard(c) {
  return '<article class="dest" id="dest-' + esc(c.id) + '">' +
    '<div class="dest-top"><h3><a href="' + withLang(c.path) + '">' + esc(pick(c, "name")) + "</a></h3></div>" +
    '<p class="dest-meta">' + esc(t("destRestaurants", { n: c.n })) + " · " + esc(starCountsOf(ALL.filter((r) => r.country === c.id))) +
    (c.guide && c.guide[0] + c.guide[1] + c.guide[2] > c.n ? '<br><span class="dest-guide">' + esc(t("destGuide", { n: c.guide[0] + c.guide[1] + c.guide[2] }) + " · " +
      t("starCounts").replace("{3}", c.guide[2]).replace("{2}", c.guide[1]).replace("{1}", c.guide[0])) + "</span>" : "") + "</p>" +
    (c.from ? '<p class="dest-from">' + esc(t("destFrom", { p: localMoney(c.from.price, c.from.cur) })) + ' <span class="dest-from-name">' + esc(pick(c.from, "name")) + "</span></p>" : "") +
    (c.cities.length > 1 || (c.cities[0] && c.cities[0].path !== c.path) ? destAreas(c) : "") +
    '<a class="dest-open" href="' + withLang(c.path) + '">' + esc(t("destOpen", { place: pick(c, "name") })) + " →</a></article>";
}
// A country in the Michelin guide that has no page here yet: its star counts and a button that shows its restaurants on the map.
function soonCard(c) {
  const [one, two, three] = c.stars;
  return '<article class="dest dest-soon" id="dest-' + esc(c.id) + '">' +
    '<div class="dest-top"><h3>' + esc(pick(c, "name")) + '</h3><span class="dest-tag">' + esc(t("destSoon")) + "</span></div>" +
    '<p class="dest-meta">' + esc(t("destRestaurants", { n: one + two + three })) + " · " +
    esc(t("starCounts").replace("{3}", three).replace("{2}", two).replace("{1}", one)) + "</p>" +
    '<button type="button" class="dest-open" data-map-box="' + c.box.join(",") + '">' + esc(t("destSoonMap")) + " →</button></article>";
}
// Countries with no starred restaurant, by region; a few carry a note on why.
function renderNoStars() {
  const regions = DATA.noStars || [];
  const n = regions.reduce((a, g) => a + g.countries.length, 0);
  if (!n) { $("noStars").innerHTML = ""; return; }
  const coll = new Intl.Collator(locale());
  const noted = regions.flatMap((g) => g.countries.filter((c) => c.note)).sort((a, b) => coll.compare(pick(a, "name"), pick(b, "name")));
  $("noStars").innerHTML = '<h3 class="sub-head">' + esc(t("noStarsTitle")) + '</h3><p class="nostar-intro">' + esc(t("noStarsText", { n })) + "</p>" +
    '<div class="nostar-notes">' + noted.map((c) => '<p><strong>' + esc(pick(c, "name")) + "</strong> " + esc(pick(c, "note")) + "</p>").join("") + "</div>" +
    regions.map((g) => '<details class="dest-more nostar-region"><summary>' + esc(pick(g, "name")) + ' <span class="count">' + g.countries.length + "</span></summary>" +
      '<ul class="nostar-list">' + g.countries.slice().sort((a, b) => coll.compare(pick(a, "name"), pick(b, "name")))
        .map((c) => "<li>" + esc(pick(c, "name")) + (c.note ? " *" : "") + "</li>").join("") + "</ul></details>").join("");
}
// Quick jump to a country: A–Z letters (letters with no country are greyed out), or the country names
// themselves in Chinese and Japanese, where names don't start with a letter.
function renderDestJump(sorted) {
  const nav = $("destJump");
  nav.setAttribute("aria-label", t("destJump"));
  const letterOf = (c) => pick(c, "name").normalize("NFD").charAt(0).toUpperCase();
  if (cjk()) {
    nav.className = "dest-jump names";
    nav.innerHTML = sorted.map((c) => '<a href="#dest-' + esc(c.id) + '" data-jump="' + esc(c.id) + '">' + esc(pick(c, "name")) + "</a>").join("");
    return;
  }
  nav.className = "dest-jump";
  const first = {};
  sorted.forEach((c) => { const l = letterOf(c); if (!first[l]) first[l] = c.id; });
  nav.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => first[l]
    ? '<a href="#dest-' + esc(first[l]) + '" data-jump="' + esc(first[l]) + '">' + l + "</a>"
    : '<span aria-hidden="true">' + l + "</span>").join("");
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-jump]");
  if (!a) return;
  e.preventDefault();
  const card = $("dest-" + a.dataset.jump);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "start" });
  card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
  track("dest-jump", { to: a.dataset.jump });
});

// A country's regions and cities fold away under one button, so cards stay short as destinations grow.
const destOpen = new Set();
function destAreas(c) {
  const chip = (p) => '<a class="city-link" href="' + withLang(p.path) + '">' + esc(pick(p, "name")) + '<span class="count">' + p.n + "</span></a>";
  const regions = c.cities.filter((p) => p.type === "region"), cities = c.cities.filter((p) => p.type !== "region");
  const group = (label, list) => !list.length ? "" : (regions.length && cities.length ? '<p class="dest-sub">' + esc(label) + "</p>" : "") +
    '<div class="dest-cities">' + list.map(chip).join("") + "</div>";
  return '<details class="dest-more" data-country="' + esc(c.id) + '"' + (destOpen.has(c.id) ? " open" : "") + '><summary>' + esc(t(regions.length && cities.length ? "destAreas" : regions.length ? "destRegions" : "destCityList")) +
    ' <span class="count">' + c.cities.length + "</span></summary>" + group(t("destRegions"), regions) + group(t("destCityList"), cities) + "</details>";
}
// How the country cards are ordered: "az", "most" (starred restaurants), or 3 / 2 / 1 (most restaurants with that many stars).
let destCont = "";  // the continent shown ("" for all)
let destSort = "az", destDesc = true;  // destDesc: high to low (or A to Z); clicking the chosen button again flips it
// A country's [one-star, two-star, three-star] counts in the whole MICHELIN Guide (our pages may cover only some cities),
// falling back to our own restaurants.
const starsByCountry = (c) => c.box ? c.stars : c.guide || [1, 2, 3].map((s) => ALL.filter((r) => r.country === c.id && r.stars === s).length);
function renderDestSort() {
  const opts = [{ v: "az", label: t("destSortAZ") }, { v: "most", label: t("destSortMost") }]
    .concat([3, 2, 1].map((s) => ({ v: String(s), label: starIcons(s), aria: t("destSortStars", { n: s }) })));
  const az = destDesc ? "A–Z" : "Z–A";
  $("destSort").innerHTML = opts.map((o) => {
    const on = destSort === o.v;
    const latin = t("destSortAZ").includes("A–Z");
    const label = o.v === "az" ? esc(t("destSortAZ").replace("A–Z", az)) : o.aria ? o.label : esc(o.label);
    // The chosen sort shows its direction: ↓ high to low, ↑ low to high (A–Z / Z–A in letters where the label has them).
    const arrow = on && !(o.v === "az" && latin) ? '<span class="sort-dir" aria-hidden="true">' + (destDesc ? "↓" : "↑") + "</span>" : "";
    const aria = (o.aria || "") + (on && o.v !== "az" ? (o.aria ? " " : "") + "(" + t(destDesc ? "destHighLow" : "destLowHigh") + ")" : "");
    return '<button type="button" data-destsort="' + o.v + '" aria-pressed="' + on + '"' + (aria ? ' aria-label="' + esc(o.aria ? aria : o.label + " " + aria) + '"' : "") +
      (on ? ' title="' + esc(t("destFlip")) + '"' : "") + ">" + label + arrow + "</button>";
  }).join("");
}
const CONTINENT_ORDER = ["europe", "asia", "middle-east", "americas", "oceania"];
function renderDestCont(all) {
  const conts = CONTINENT_ORDER.filter((k) => all.some((c) => c.continent === k));
  $("destCont").innerHTML = [""].concat(conts).map((k) => '<button type="button" data-destcont="' + k + '" aria-pressed="' + (destCont === k) + '">' +
    esc(k ? t("continents")[k] : t("all")) + '<span class="count">' + (k ? all.filter((c) => c.continent === k).length : all.length) + "</span></button>").join("");
}
function renderDestinations() {
  const coll = new Intl.Collator(locale());
  const all = DATA.countries.concat(DATA.soon || []);
  renderDestCont(all);
  const az = all.filter((c) => !destCont || c.continent === destCont).sort((a, b) => coll.compare(pick(a, "name"), pick(b, "name")));
  const total = (c) => starsByCountry(c).reduce((a, b) => a + b, 0);
  const key = destSort === "most" ? total : destSort === "az" ? null : (c) => starsByCountry(c)[Number(destSort) - 1];
  // Highest first; ties go to the country with more starred restaurants, then A–Z (the sort keeps the A–Z order).
  const dir = destDesc ? 1 : -1;
  const sorted = key ? az.slice().sort((a, b) => dir * (key(b) - key(a) || total(b) - total(a))) : destDesc ? az : az.slice().reverse();
  renderDestSort();
  $("destGrid").innerHTML = sorted.map((c) => c.box ? soonCard(c) : destCard(c)).join("");
  renderDestJump(az);
  renderNoStars();
  $("collections").innerHTML = !DATA.groups.length ? "" :
    '<h3 class="sub-head">' + t("collectionsTitle") + '</h3><div class="dest-cities">' + DATA.groups.map((g) =>
      '<a class="city-link" href="' + withLang(g.path) + '">' + esc(pick(g, "name")) + '<span class="count">' + g.n + "</span></a>").join("") + "</div>";
}

// ---------- Wishlist ----------
function renderWishlist() {
  const list = loadWishlist().map((id) => ALL.find((r) => r.id === id)).filter(Boolean);
  renderWishCount();
  // Signed out: an invitation to keep the list everywhere. Signed in: where it's kept.
  const where = acctSignedIn()
    ? '<p class="wish-synced">' + esc(t("wishSynced")) + ' <a href="' + withLang("/account/") + '">' + esc(t("acctSee")) + " →</a></p>"
    : '<div class="wish-cta"><p>' + esc(t("wishCtaHome")) + '</p><button type="button" class="cta-btn" data-signin="">' + esc(t("wishCtaBtn")) + "</button></div>";
  if (!list.length) { $("wishList").innerHTML = '<p class="empty-note">' + t("wishEmptyHome") + "</p>" + where; return; }
  $("wishList").innerHTML = where + '<ul class="wish-list">' + list.map((r) =>
    '<li><a class="wl-name" href="' + cityLink(r) + '">' + esc(nameOf(r)) + '</a><span class="wl-meta">' + starIcons(r.stars) + " " + esc(cuisineOf(r)) + " · " + esc(whereOf(r)) + "</span>" +
    '<span class="wl-price num">' + esc(r.dinner == null ? "–" : localMoney(r.dinner, r.cur)) + "</span>" +
    '<button type="button" class="linkish" data-unwish="' + esc(r.id) + '" aria-label="' + esc(t("wishRemove", { name: nameOf(r) })) + '">' + t("wishRemoveShort") + "</button></li>").join("") + "</ul>";
}

// ---------- Search ----------
function renderResults() {
  const q = $("homeQ").value.trim().toLowerCase();
  if (!q) { $("results").hidden = true; $("results").innerHTML = ""; return; }
  const has = (...xs) => xs.filter(Boolean).join(" ").toLowerCase().includes(q);
  const places = DATA.places.filter((p) => has(p.name, p.nameZh)).slice(0, 4).map((p) =>
    '<li><a href="' + withLang(p.path) + '"><span>' + esc(pick(p, "name")) + '</span><span class="sub">' + esc(t("destRestaurants", { n: p.n })) + "</span></a></li>");
  const rests = ALL.filter((r) => has(r.name, r.nameZh, r.nameJa, r.cuisine, r.cuisineZh, CUISINE_ZH[r.cuisine], r.town, r.cityName, r.cityNameZh)).slice(0, 8 - places.length).map((r) =>
    '<li><a href="' + cityLink(r) + '"><span>' + esc(nameOf(r)) + " " + starIcons(r.stars) + '</span><span class="sub">' + esc(cuisineOf(r)) + " · " + esc(whereOf(r)) + " · " + esc(priceLabel(r)) + "</span></a></li>");
  const items = places.concat(rests);
  $("results").innerHTML = items.length ? items.join("") : '<li class="none">' + esc(t("searchNone", { q: $("homeQ").value.trim() })) + "</li>";
  $("results").hidden = false;
}

// ---------- World map ----------
// Filled pins are restaurants with prices on this site; outlined pins are every other starred restaurant
// in the MICHELIN Guide, loaded from /data/world.json once the map starts.
const world = { map: null, info: null, markers: [], clusterer: null, loaded: false };
const infoBox = (body) => '<div style="font-family:Figtree,system-ui,sans-serif;color:#12261C;max-width:240px;line-height:1.4">' + body + "</div>";
function infoHtml(r) {
  return infoBox('<div style="font-weight:700;font-size:15px">' + esc(nameOf(r)) + "</div>" +
    (altNameOf(r) ? '<div style="font-size:12px;color:#5A6E62">' + esc(altNameOf(r)) + "</div>" : "") +
    '<div style="color:#B3862B;font-size:13px">' + "✱".repeat(r.stars) + ' <span style="color:#5A6E62">' + esc(cuisineOf(r)) + " · " + esc(whereOf(r)) + "</span></div>" +
    '<div style="margin-top:6px;font-size:13px">' + esc(priceLabel(r)) + "</div>" +
    (r.rating ? '<div style="font-size:13px;color:#5A6E62">★ ' + r.rating.toFixed(1) + " " + t("infoGoogle") + "</div>" : "") +
    '<a href="' + cityLink(r) + '" style="display:inline-block;margin-top:6px;color:#1E6142;font-weight:600;font-size:13px">' + esc(t("infoCompare", { place: pick(r, "cityName") })) + " →</a>");
}
function worldInfoHtml(w) {
  const link = (href, label) => '<a href="' + esc(href) + '" target="_blank" rel="noopener" style="color:#1E6142;font-weight:600;font-size:13px;margin-right:12px">' + esc(label) + " ↗</a>";
  return infoBox('<div style="font-weight:700;font-size:15px">' + esc(w.name) + "</div>" +
    '<div style="color:#B3862B;font-size:13px">' + "✱".repeat(w.stars) + ' <span style="color:#5A6E62">' + esc(w.cuisine) + " · " + esc(w.where) + "</span></div>" +
    '<div style="margin-top:6px;font-size:13px;color:#5A6E62">' + esc(t("infoNoPricesYet")) + "</div>" +
    '<div style="margin-top:6px">' + link("https://guide.michelin.com/en" + w.path, t("infoMichelin")) +
    link("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(w.name + ", " + w.where), "Google Maps") + "</div>");
}
function clusterIcon(count) {
  const size = count < 10 ? 34 : count < 100 ? 42 : count < 1000 ? 50 : 58;
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + size + "' height='" + size + "' viewBox='0 0 50 50'><circle cx='25' cy='25' r='23' fill='#1E6142' fill-opacity='.92' stroke='#ffffff' stroke-width='3'/></svg>";
  return { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg), scaledSize: new google.maps.Size(size, size), anchor: new google.maps.Point(size / 2, size / 2) };
}
async function initWorldMap() {
  try {
    await loadGoogle();
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    const { Marker } = await google.maps.importLibrary("marker");
    $("mapCanvas").innerHTML = "";
    $("mapCanvas").style.display = "block";
    world.map = new Map($("mapCanvas"), { center: { lat: 35, lng: 40 }, zoom: 2, minZoom: 2, mapTypeControl: false, streetViewControl: false, clickableIcons: false, gestureHandling: "cooperative" });
    world.info = new InfoWindow();
    // Tapping anywhere on the map closes an open restaurant card.
    world.map.addListener("click", () => world.info.close());
    world.markers = ALL.filter((r) => r.lat != null && r.lng != null).map((r) => {
      const m = new Marker({ position: { lat: r.lat, lng: r.lng }, title: nameOf(r), icon: pinIcon(r.stars), zIndex: 100 + r.stars * 10 });
      m.addListener("click", () => openCard(m));
      m.r = r; m.stars = r.stars;
      m.where = [r.town || r.cityName, (DATA.countries.find((c) => c.id === r.country) || {}).name].filter(Boolean).join(", ");
      m.find = fold([r.name, r.nameZh, r.nameJa, r.town, r.cityName, r.cityNameZh, m.where, r.cuisine].join(" "));
      return m;
    });
    if (window.markerClusterer) {
      world.clusterer = new markerClusterer.MarkerClusterer({
        map: world.map,
        renderer: { render: ({ count, position }) => new Marker({ position, icon: clusterIcon(count), label: { text: String(count), color: "#ffffff", fontSize: "13px", fontWeight: "700" }, zIndex: 1000 + count }) }
      });
    }
    updateWorldMap(true);
    if (world.box) showBox(world.box);
    // "Near me" waits for the full world list, so it can include restaurants without prices yet.
    world.near = addNearMe(world.map, () => (world.loading || Promise.resolve()).catch(() => {}).then(() =>
      world.markers.filter((m) => !homeState.stars || m.stars === homeState.stars).map((m) => ({
        lat: m.getPosition().lat(), lng: m.getPosition().lng(), stars: m.stars, name: () => m.r ? nameOf(m.r) : m.w.name,
        open: () => { world.map.setCenter(m.getPosition()); if (world.map.getZoom() < 16) world.map.setZoom(16); openCard(m, true); }
      }))));
    // Arriving from a destination page's "see what's near you" link.
    if (params.get("near") === "1") {
      params.delete("near");
      history.replaceState(null, "", location.pathname + (params.toString() ? "?" + params : "") + location.hash);
      $("map").scrollIntoView({ block: "start", behavior: "instant" });
      world.near.locate();
    }
    if (DATA.worldUrl) {
      world.loading = fetch(DATA.worldUrl).then((res) => res.json());
      const data = await world.loading;
      const icons = { 1: pinIcon(1, true), 2: pinIcon(2, true), 3: pinIcon(3, true) };
      world.markers = world.markers.concat(data.r.map(([name, stars, lat, lng, cuisine, where, path]) => {
        const w = { name, stars, cuisine, where, path };
        const m = new Marker({ position: { lat, lng }, title: name, icon: icons[stars], zIndex: stars * 10 });
        m.addListener("click", () => openCard(m));
        m.w = w; m.stars = stars; m.where = where;
        m.find = fold(name + " " + where + " " + cuisine);
        return m;
      }));
      world.loaded = true;
      renderMapStars(); renderMapLegend(); updateWorldMap(false);
    }
  } catch (e) {
    if (!world.map) $("mapCanvas").innerHTML = '<p class="map-wait">' + t("mapError") + "</p>";
  }
}
function updateWorldMap(fit) {
  if (!world.map) return;
  const shown = world.markers.filter((m) => !homeState.stars || m.stars === homeState.stars);
  world.info.close();
  if (world.clusterer) { world.clusterer.clearMarkers(); world.clusterer.addMarkers(shown); }
  else world.markers.forEach((m) => m.setMap(shown.includes(m) ? world.map : null));
  $("mapStatus").textContent = shown.length ? t("mapShowing", { n: shown.length.toLocaleString("en-GB") }) : t("mapNone");
  if (fit && shown.length > 1) {
    const b = new google.maps.LatLngBounds();
    shown.forEach((m) => b.extend(m.getPosition()));
    world.map.fitBounds(b, 40);
  }
}
// Frames a country's restaurants on the map: [south, west, north, east]. A single restaurant is shown up close.
function showBox(box) {
  world.box = null;
  const [s, w, n, e] = box;
  if (s === n && w === e) { world.map.setCenter({ lat: s, lng: w }); world.map.setZoom(13); }
  else world.map.fitBounds({ south: s, west: w, north: n, east: e }, 40);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-destsort]");
  const cont = e.target.closest("[data-destcont]");
  if (cont) {
    destCont = cont.dataset.destcont;
    renderDestinations();
    track("dest-continent", { to: destCont || "all" });
    return;
  }
  if (!b) return;
  if (b.dataset.destsort === destSort) destDesc = !destDesc;
  else { destSort = b.dataset.destsort; destDesc = true; }
  renderDestinations();
  track("dest-sort", { by: destSort, order: destDesc ? "desc" : "asc" });
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-map-box]");
  if (!b) return;
  const box = b.dataset.mapBox.split(",").map(Number);
  $("map").scrollIntoView({ block: "start", behavior: "smooth" });
  if (world.map) showBox(box); else world.box = box;  // the map loads as it scrolls into view
});
// Opens a restaurant's card. From a search result the pin may still be inside a cluster, so the card is placed by position.
function openCard(m, fromSearch) {
  world.info.setContent(m.r ? infoHtml(m.r) : worldInfoHtml(m.w));
  if (fromSearch) {
    world.info.setOptions({ pixelOffset: new google.maps.Size(0, -38) });
    world.info.setPosition(m.getPosition());
    world.info.open({ map: world.map });
  } else {
    world.info.setOptions({ pixelOffset: null });
    world.info.open({ anchor: m, map: world.map });
  }
}

// ---------- Map search ----------
// Accent- and case-insensitive matching, so "epicure" finds "Épicure".
const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
let mapHits = [];
function mapSearch() {
  const q = fold($("mapQ").value.trim());
  if (!q || !world.map) { $("mapResults").hidden = true; $("mapResults").innerHTML = ""; mapHits = []; return; }
  // Countries and cities with matching names, largest first, then restaurants.
  const groups = {};
  world.markers.forEach((m) => {
    const parts = m.where.split(", ");
    const country = parts[parts.length - 1];
    [[country, "country"], [m.where, "city"]].forEach(([label, kind]) => {
      if (!fold(label).includes(q) || (kind === "city" && parts.length < 2)) return;
      (groups[label] = groups[label] || { label, kind, markers: [] }).markers.push(m);
    });
  });
  const places = Object.values(groups).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "country" ? -1 : 1) || b.markers.length - a.markers.length).slice(0, 4);
  const rests = world.markers.filter((m) => m.find.includes(q))
    .sort((a, b) => (fold(a.r ? a.r.name : a.w.name).startsWith(q) ? 0 : 1) - (fold(b.r ? b.r.name : b.w.name).startsWith(q) ? 0 : 1) || b.stars - a.stars)
    .slice(0, 8 - places.length);
  mapHits = places.map((g) => ({ place: g })).concat(rests.map((m) => ({ marker: m })));
  $("mapResults").innerHTML = mapHits.length ? mapHits.map((h, i) => h.place
    ? '<li><a href="#map" data-hit="' + i + '"><span>' + esc(h.place.label) + '</span><span class="sub">' + esc(t("destRestaurants", { n: h.place.markers.length })) + "</span></a></li>"
    : '<li><a href="#map" data-hit="' + i + '"><span>' + esc(h.marker.r ? nameOf(h.marker.r) : h.marker.w.name) + " " + starIcons(h.marker.stars) + '</span><span class="sub">' +
      esc(h.marker.where) + "</span></a></li>").join("")
    : '<li class="none">' + esc(t("searchNone", { q: $("mapQ").value.trim() })) + "</li>";
  $("mapResults").hidden = false;
}
function showHit(i) {
  const h = mapHits[i];
  if (!h) return;
  $("mapResults").hidden = true;
  if (homeState.stars) { homeState.stars = 0; renderMapStars(); updateWorldMap(false); }
  world.info.close();
  if (h.place) {
    const b = new google.maps.LatLngBounds();
    h.place.markers.forEach((m) => b.extend(m.getPosition()));
    if (h.place.markers.length === 1) { world.map.setCenter(b.getCenter()); world.map.setZoom(15); } else world.map.fitBounds(b, 40);
  } else {
    world.map.setCenter(h.marker.getPosition());
    world.map.setZoom(16);
    openCard(h.marker, true);
  }
  $("map").scrollIntoView({ block: "start" });
}

// Star counts for the filter and legend: every pin once the world list has loaded, otherwise just ours.
const pinStars = () => world.loaded ? world.markers.map((m) => ({ stars: m.stars })) : ALL;
function renderMapStars() {
  const list = pinStars();
  const opts = [{ s: 0, label: t("all"), n: list.length }].concat([1, 2, 3].map((s) => ({ s, label: starIcons(s), n: list.filter((r) => r.stars === s).length })));
  $("mapStars").innerHTML = opts.map((o) =>
    '<button type="button" data-mapstars="' + o.s + '" aria-pressed="' + (homeState.stars === o.s) + '"' + (o.s ? ' aria-label="' + esc(t("starsAria", { n: o.s })) + '"' : "") + ">" + o.label + '<span class="count">' + o.n.toLocaleString("en-GB") + "</span></button>").join("");
}
function renderMapLegend() {
  renderLegend(pinStars());
  $("mapLegend").insertAdjacentHTML("beforeend", '<li><span class="pin-num hollow" style="--pin:' + MAP_PIN_COLOURS[1] + '" aria-hidden="true">1</span><span>' + esc(t("legendHollow")) + "</span></li>");
}

// ---------- Render and events ----------
function renderAll() { applyStatic(); renderFigures(); renderDestinations(); renderWishlist(); renderMapStars(); renderMapLegend(); renderResults(); }

document.addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (!el) {
    if (!e.target.closest(".home-search")) { $("results").hidden = true; $("mapResults").hidden = true; }
    return;
  }
  if (el.dataset.lang) {
    setLang(el.dataset.lang);
    renderAll();
    world.markers.forEach((m) => { if (m.r) m.setTitle(nameOf(m.r)); });
    if (world.near) world.near.relabel();
  } else if (el.dataset.mapstars) {
    homeState.stars = Number(el.dataset.mapstars); renderMapStars(); updateWorldMap(true);
  } else if (el.dataset.unwish) {
    setWishlist(loadWishlist().filter((x) => x !== el.dataset.unwish)); renderWishlist();
  }
});
$("homeQ").addEventListener("input", renderResults);
wireSearchClear($("homeQ"), renderResults);
$("mapQ").addEventListener("input", mapSearch);
$("mapQ").addEventListener("focus", mapSearch);
$("mapQ").addEventListener("keydown", (e) => {
  if (e.key === "Escape") $("mapResults").hidden = true;
  if (e.key === "Enter") { e.preventDefault(); showHit(0); }
});
wireSearchClear($("mapQ"), mapSearch);
$("mapResults").addEventListener("click", (e) => { const a = e.target.closest("[data-hit]"); if (a) { e.preventDefault(); showHit(Number(a.dataset.hit)); } });
$("homeQ").addEventListener("focus", renderResults);
$("homeQ").addEventListener("keydown", (e) => { if (e.key === "Escape") { $("results").hidden = true; } });
window.addEventListener("storage", (e) => { if (e.key === WISHLIST_KEY) renderWishlist(); });
["sb:wishlist", "sb:account"].forEach((ev) => window.addEventListener(ev, (e) => { if (e.type === "sb:account" || e.detail.from === "sync") renderWishlist(); }));

renderAll();
if (GOOGLE_MAPS_API_KEY) initWorldMap(); else $("map").hidden = true;
// Keep a country's list open when the page redraws (e.g. after a language change).
document.addEventListener("toggle", (e) => {
  const d = e.target;
  if (d.classList && d.classList.contains("dest-more")) d.open ? destOpen.add(d.dataset.country) : destOpen.delete(d.dataset.country);
}, true);
