// The homepage: search, a world map of every starred restaurant, destination cards and the wishlist.

// The restaurants (map pins, search and the wishlist) come from /data/home.json (build_home_data() in build.py), fetched as
// the page opens: one row of values each, with the place it sits in given as a number in the file's list of places.
// Until it arrives, the figures and cards use the counts in the page itself.
let ALL = [], LOST = [], homeLoaded = false;
const homeRows = (d) => d.r.map((a) => {
  const r = {};
  d.cols.forEach((c, i) => { if (a[i] != null && a[i] !== "") r[c] = a[i]; });
  d.cityCols.forEach((c, i) => { if (d.cities[r.city][i] !== "") r[c] = d.cities[r.city][i]; });
  delete r.city;
  return r;
});
const homeReady = (window.homeData || Promise.reject()).catch(() => getData(DATA.homeUrl)).then((d) => {
  ALL = homeRows(d);
  LOST = homeRows(d.former).filter(lostPin);
  DATA.knownIds = ALL.map((r) => r.id);
  homeLoaded = true;
});
const homeState = { stars: 0 };
const cityLink = (r) => withLang(r.cityPath) + "&q=" + encodeURIComponent(r.name);
// Where a restaurant is, e.g. "London", or "Aughton, England" for one listed under a region.
const whereOf = (r) => r.town ? r.town + ", " + pick(r, "cityName") : pick(r, "cityName");
const priceLabel = (r) => r.dinner == null ? t("infoNoPrice")
  : localMoney(r.dinner, r.cur) + " " + (r.dinnerType === "main" ? t("perMain") : r.dinnerType === "spend" ? t("typicalSpend") : t("infoDinner"));
// "12 three-star, 30 two-star…" from counts [total, one-star, two-star, three-star].
const starCountText = (n) => t("starCounts").replace("{3}", n[3]).replace("{2}", n[2]).replace("{1}", n[1]);

function applyStatic() {
  applyI18n();
  document.title = t("homeTitle");
  fitPlaceholder($("homeQ"), [t("homeSearchPh"), tHas("homeSearchPhShort")]);
  $("homeQ").setAttribute("aria-label", t("homeSearchLabel"));
  $("mapCanvas").setAttribute("aria-label", t("mapLabel"));
  fitPlaceholder($("mapQ"), [t("mapSearchPh"), tHas("mapSearchPhShort")]);
  $("mapQ").setAttribute("aria-label", t("mapSearchLabel"));
  if (DATA.worldTotal) document.querySelector('[data-i18n="mapHomeText"]').textContent = t("mapHomeWorldText", { n: DATA.worldTotal.toLocaleString("en-GB") });
}
function renderFigures() {
  $("fRestaurants").textContent = DATA.starCounts[0];
  $("fRestaurantsSub").textContent = starCountText(DATA.starCounts);
  // A destination with no separate city pages (e.g. Hong Kong) counts as one city.
  const cities = DATA.places.filter((p) => p.type === "city").length + DATA.countries.filter((c) => !c.cities.length).length;
  $("fDest").textContent = DATA.countries.length;
  $("fDestSub").textContent = t("citiesN", { n: cities });
  $("fUpdated").textContent = monthYear(DATA.updated);
}

// ---------- Destinations ----------
// Every country is one short row, folded by continent, written into the page by home_countries_html() in build.py
// (A to Z, with its counts in data-n and data-s1…3). Sorting reorders those rows inside each continent.
// Countries with no starred restaurant, by region, folded under one heading; a few carry a note on why.
function renderNoStars() {
  const regions = DATA.noStars || [];
  const n = regions.reduce((a, g) => a + g.countries.length, 0);
  if (!n) { $("noStars").innerHTML = ""; return; }
  const coll = new Intl.Collator(locale());
  const noted = regions.flatMap((g) => g.countries.filter((c) => c.note)).sort((a, b) => coll.compare(pick(a, "name"), pick(b, "name")));
  // A country with its own explainer (content/guides) links to it, or to its section of a round-up ("id#section").
  const guideHref = (g) => "/guides/" + esc(g.split("#")[0]) + "/" + (g.includes("#") ? "#" + esc(g.split("#")[1]) : "");
  const named = (c) => c.guide ? '<a href="' + guideHref(c.guide) + '">' + esc(pick(c, "name")) + "</a>" : esc(pick(c, "name"));
  $("noStars").innerHTML = '<details class="dest-more nostar-all"><summary>' + esc(t("noStarsTitle")) + ' <span class="count">' + n + "</span></summary>" +
    '<p class="nostar-intro">' + esc(t("noStarsText", { n })) + "</p>" +
    '<div class="nostar-notes">' + noted.map((c) => '<p><strong>' + named(c) + "</strong> " + esc(pick(c, "note")) + "</p>").join("") + "</div>" +
    regions.map((g) => '<details class="dest-more nostar-region"><summary>' + esc(pick(g, "name")) + ' <span class="count">' + g.countries.length + "</span></summary>" +
      '<ul class="nostar-list">' + g.countries.slice().sort((a, b) => coll.compare(pick(a, "name"), pick(b, "name")))
        .map((c) => "<li>" + named(c) + (c.note ? " *" : "") + "</li>").join("") + "</ul></details>").join("") + "</details>";
}
// How the rows are ordered: "az", "most" (starred restaurants), or 3 / 2 / 1 (most restaurants with that many stars),
// all from the whole MICHELIN Guide, since our pages may cover only some cities.
let destSort = "az", destDesc = true;  // destDesc: high to low (or A to Z); clicking the chosen button again flips it
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
function sortDestRows() {
  const coll = new Intl.Collator(locale());
  const num = (li, k) => Number(li.dataset[k]) || 0;
  const key = destSort === "most" ? (li) => num(li, "n") : destSort === "az" ? null : (li) => num(li, "s" + destSort);
  const dir = destDesc ? 1 : -1;
  document.querySelectorAll("#destGroups .crows").forEach((ul) => {
    const az = [...ul.children].sort((a, b) => coll.compare(a.dataset.name, b.dataset.name));
    // Highest first; ties go to the country with more starred restaurants, then A–Z (the sort keeps the A–Z order).
    const rows = key ? az.sort((a, b) => dir * (key(b) - key(a) || num(b, "n") - num(a, "n"))) : destDesc ? az : az.reverse();
    rows.forEach((li) => ul.appendChild(li));
  });
}
function renderDestinations() {
  renderDestSort();
  sortDestRows();
  renderNoStars();
  $("collections").innerHTML = !DATA.groups.length ? "" :
    '<h3 class="sub-head">' + t("collectionsTitle") + '</h3><div class="dest-cities">' + DATA.groups.map((g) =>
      '<a class="city-link" href="' + withLang(g.path) + '">' + esc(pick(g, "name")) + '<span class="count">' + g.n + "</span></a>").join("") + "</div>";
}
// A country's regions and cities fold away under its row.
document.addEventListener("click", (e) => {
  const b = e.target.closest(".crow-toggle");
  if (!b) return;
  const open = b.getAttribute("aria-expanded") !== "true";
  b.setAttribute("aria-expanded", open);
  $(b.getAttribute("aria-controls")).hidden = !open;
});
// Every continent starts folded (owner's choice, 9 Oct 2026), so the page stays short; a click opens one.
// An address ending #dest-<country> (or #cont-<continent>) opens that country's continent and goes to it.
function openDestHash() {
  const el = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  const cont = el && el.closest(".cont");
  if (!cont) return;
  cont.open = true;
  el.scrollIntoView({ block: "start" });
}
openDestHash();
window.addEventListener("hashchange", openDestHash);
// The ways in, popular destinations, cheapest menus and guides, counted by which was clicked.
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-home]");
  if (a) track("home-link", { to: a.dataset.home });
});

// ---------- Wishlist ----------
function renderWishlist() {
  if (!homeLoaded) { renderWishCount(); return; }  // drawn once the restaurants arrive
  const list = loadWishlist().map((id) => ALL.find((r) => r.id === id)).filter(Boolean);
  renderWishCount();
  // Signed out: an invitation to keep the list everywhere. Signed in: where it's kept.
  const where = acctSignedIn()
    ? '<p class="wish-synced">' + esc(t("wishSynced")) + ' <a href="' + withLang("/account/") + '">' + esc(t("acctSee")) + " →</a></p>"
    : '<div class="wish-cta"><p>' + esc(t("wishCtaHome")) + '</p><button type="button" class="cta-btn" data-signin="">' + esc(t("wishCtaBtn")) + "</button></div>";
  // Empty, the section shrinks to a line or two (.is-empty in site.css), as the header's heart already leads here.
  $("wishlist").classList.toggle("is-empty", !list.length);
  if (!list.length) { $("wishList").innerHTML = '<p class="empty-note">' + t("wishEmptyHome") + "</p>" + where; return; }
  const compare = list.length >= 2 ? '<p class="wish-compare"><a class="btn-line" href="/compare/">' + esc(t("wishCompare")) + " →</a></p>" : "";
  $("wishList").innerHTML = where + compare + '<ul class="wish-list">' + list.map((r) =>
    '<li><a class="wl-name" href="' + cityLink(r) + '">' + esc(nameOf(r)) + '</a><span class="wl-meta">' + starIcons(r.stars) + " " + esc(cuisineOf(r)) + " · " + esc(whereOf(r)) + "</span>" +
    '<span class="wl-price num">' + esc(r.dinner == null ? "–" : localMoney(r.dinner, r.cur)) + "</span>" +
    '<button type="button" class="linkish" data-unwish="' + esc(r.id) + '" aria-label="' + esc(t("wishRemove", { name: nameOf(r) })) + '">' + t("wishRemoveShort") + "</button></li>").join("") + "</ul>" +
    '<div class="bill-wrap" id="bill"></div>';
  renderBill(list);
}

// ---------- The wishlist as one bill ----------
// Every saved restaurant's meal (and wine pairing, if chosen) on one till receipt, with each country's usual service, tax and tips
// estimated on top (SERVICE in common.js). Lunch and wine prices come from /data/bill.json, loaded the first time it's needed.
const BILL_KEY = "starredbill-bill";
const bill = Object.assign({ meal: "dinner", wine: false, cur: "" }, (() => { try { return JSON.parse(localStorage.getItem(BILL_KEY)) || {}; } catch (e) { return {}; } })());
let billData = null, billLoading = null;
const saveBill = () => { try { localStorage.setItem(BILL_KEY, JSON.stringify(bill)); } catch (e) { /* private window: the choice lasts for this visit */ } };
const billRate = (from) => DATA.currencies[bill.cur].perUSD / DATA.currencies[from].perUSD;
const billMoney = (n, approx) => (approx ? "≈" : "") + localMoney(approx ? Math.round(n) : Math.round(n * 100) / 100, bill.cur);
const billSep = '<span class="sr-only">, </span>';
function billItem(r) {
  const b = (billData && billData.r[r.id]) || [null, "menu", 0, null, null, 0];
  const lunch = bill.meal === "lunch";
  const price = lunch ? (b[2] ? null : b[0]) : r.dinner, type = lunch ? (b[1] || "menu") : (r.dinnerType || "menu");
  const why = lunch && b[2] ? "billNoLunch" : price == null ? "billNoPrice" : type === "main" ? "billPerMain" : "";
  const wine = bill.wine ? (lunch ? b[4] : b[3]) : null;
  const own = why ? 0 : price + (wine || 0), rate = billRate(r.cur);
  // A typical spend (mainland China) is what diners report paying, service and all, so nothing is added to it.
  const [kind, pct] = type === "spend" ? ["spend", 0] : SERVICE[r.country] || ["before", 0];
  return { r, why, amount: own * rate, extra: kind === "spend" ? 0 : own * rate * serviceAdd(r.country), approx: r.cur !== bill.cur, noWine: bill.wine && !why && wine == null && (b[5] ? "rcptNoPairingOffered" : "rcptNoPairing"), kind, pct };
}
function renderBill(list) {
  const box = $("bill");
  if (!box) return;
  if (!billData) {
    if (!billLoading) billLoading = fetch("/data/bill.json").then((res) => res.json()).then((d) => { billData = d; renderWishlist(); }).catch(() => { billData = { r: {} }; renderWishlist(); });
    box.innerHTML = "";
    return;
  }
  const curs = [...new Set(list.map((r) => r.cur))];
  const choices = DATA.switchable.slice();
  if (curs.length === 1 && !choices.includes(curs[0])) choices.unshift(curs[0]);
  if (!choices.includes(bill.cur)) bill.cur = curs.length === 1 && choices.includes(curs[0]) ? curs[0] : choices.includes("GBP") ? "GBP" : choices[0];
  const items = list.map(billItem), counted = items.filter((x) => !x.why);
  const approx = counted.some((x) => x.approx);
  const sub = counted.reduce((a, x) => a + x.amount, 0), extra = counted.reduce((a, x) => a + x.extra, 0);
  const kindNote = (x) => x.kind === "included" ? t("billIncluded") : x.kind === "tax" ? t("billTax") : x.kind === "spend" ? t("typicalSpend") : !x.pct ? "" :
    t({ before: "billBefore", plusplus: "billPlus", taxtip: "billTaxTip", tip: "billTip" }[x.kind], { p: x.pct.toLocaleString("en-GB") });
  const line = (x) => '<span class="rc-line bill-line' + (x.why ? " out" : "") + '"><span class="rc-k">' + esc(nameOf(x.r)) + '</span><span class="rc-dots" aria-hidden="true"></span>' + billSep +
    '<span class="rc-v' + (x.why ? " muted" : "") + '">' + (x.why ? "–" : billMoney(x.amount, x.approx)) + "</span>" + billSep +
    '<span class="rc-note">' + esc([whereOf(x.r), x.why ? t(x.why) : kindNote(x), x.noWine ? t(x.noWine) : ""].filter(Boolean).join(" · ")) + "</span></span>";
  const seg = (attr, opts, on) => '<div class="seg" role="group">' + opts.map(([v, label]) => '<button type="button" data-' + attr + '="' + esc(v) + '" aria-pressed="' + (v === on) + '">' + esc(label) + "</button>").join("") + "</div>";
  box.innerHTML = '<h3 class="sub-head">' + esc(t("billTitle")) + '</h3><p class="bill-intro">' + esc(t("billIntro")) + "</p>" +
    '<div class="bill-controls">' + seg("billmeal", [["dinner", t("mealDinner")], ["lunch", t("mealLunch")]], bill.meal) +
    '<label class="bill-wine"><input type="checkbox" id="billWine"' + (bill.wine ? " checked" : "") + "> " + esc(t("billWine")) + "</label>" +
    seg("billcur", choices.map((c) => [c, DATA.currencies[c].symbol.trim()]), bill.cur) + "</div>" +
    '<div class="receipt bill"><span class="rc-paper">' +
    '<span class="rc-head" aria-hidden="true">' + esc(t("billHead", { meal: t(bill.meal === "lunch" ? "mealLunch" : "mealDinner") })) + "</span>" +
    items.map(line).join("") +
    (counted.length ? '<span class="rc-line rc-sub"><span class="rc-k">' + esc(t("billSubtotal")) + '</span><span class="rc-dots" aria-hidden="true"></span>' + billSep + '<span class="rc-v">' + billMoney(sub, approx) + "</span></span>" +
      '<span class="rc-line"><span class="rc-k">' + esc(t("billExtras")) + '</span><span class="rc-dots" aria-hidden="true"></span>' + billSep + '<span class="rc-v">' + billMoney(extra, approx) + "</span></span>" +
      '<span class="rc-line rc-total"><span class="rc-k">' + esc(t("billTotal")) + '</span><span class="rc-dots" aria-hidden="true"></span>' + billSep + '<span class="rc-v">' + billMoney(sub + extra, approx) + "</span></span>" : "") +
    '<span class="rc-foot">' + esc(t("billCount", { a: counted.length, b: items.length, n: items.length })) + "<br>" + esc(t("billFoot")) + (approx ? "<br>" + esc(t("billConverted")) : "") + "</span>" +
    "</span></div>";
}
document.addEventListener("change", (e) => { if (e.target.id === "billWine") { bill.wine = e.target.checked; saveBill(); renderWishlist(); } });

// ---------- Search ----------
function renderResults() {
  const q = $("homeQ").value.trim().toLowerCase();
  if (!q) { $("results").hidden = true; $("results").innerHTML = ""; return; }
  const has = (...xs) => xs.filter(Boolean).join(" ").toLowerCase().includes(q);
  const places = DATA.places.filter((p) => has(p.name, p.nameZh)).slice(0, 4).map((p) =>
    '<li><a href="' + withLang(p.path) + '"><span>' + esc(pick(p, "name")) + '</span><span class="sub">' + esc(t("destRestaurants", { n: p.n })) + "</span></a></li>");
  const rests = ALL.filter((r) => has(r.name, r.nameZh, r.nameJa, r.cuisine, r.cuisineZh, CUISINE_ZH[r.cuisine], r.town, r.cityName, r.cityNameZh, r.chef)).slice(0, 8 - places.length).map((r) =>
    '<li><a href="' + cityLink(r) + '"><span>' + esc(nameOf(r)) + " " + starIcons(r.stars) + '</span><span class="sub">' + (r.chef && r.chef.toLowerCase().includes(q) ? esc(t("chefLabel", { name: r.chef })) + " · " : "") + esc(cuisineOf(r)) + " · " + esc(whereOf(r)) + " · " + esc(priceLabel(r)) + "</span></a></li>");
  const items = places.concat(rests);
  $("results").innerHTML = items.length ? items.join("") : '<li class="none">' + esc(t("searchNone", { q: $("homeQ").value.trim() })) + "</li>";
  $("results").hidden = false;
}

// ---------- World map ----------
// Filled pins are restaurants with prices on this site; outlined pins are every other starred restaurant
// in the MICHELIN Guide, loaded from /data/world.json once the map starts. Grey pins (world.lost, never clustered)
// are restaurants that recently lost their stars, shown only when no star filter is on.
const world = { map: null, info: null, markers: [], lost: [], clusterer: null, loaded: false };
const infoBox = (body) => '<div style="font-family:Figtree,system-ui,sans-serif;color:#12261C;max-width:240px;line-height:1.4">' + body + "</div>";
function infoHtml(r) {
  return infoBox('<div style="font-weight:700;font-size:15px">' + esc(nameOf(r)) + "</div>" +
    (altNameOf(r) ? '<div style="font-size:12px;color:#5A6E62">' + esc(altNameOf(r)) + "</div>" : "") +
    '<div style="color:#B3862B;font-size:13px">' + "✱".repeat(r.stars) + ' <span style="color:#5A6E62">' + esc(cuisineOf(r)) + " · " + esc(whereOf(r)) + "</span></div>" +
    '<div style="margin-top:6px;font-size:13px">' + esc(priceLabel(r)) + "</div>" +
    (r.rating ? '<div style="font-size:13px;color:#5A6E62">★ ' + r.rating.toFixed(1) + " " + t("infoGoogle") + (fewReviews(r) ? ' · <span title="' + esc(t("fewTitle")) + '">' + esc(t("fewReviews")) + "</span>" : "") + "</div>" : "") +
    '<a href="' + cityLink(r) + '" style="display:inline-block;margin-top:6px;color:#1E6142;font-weight:600;font-size:13px">' + esc(t("infoCompare", { place: pick(r, "cityName") })) + " →</a>");
}
function lostInfoHtml(r) {
  const label = { lost: t("stLost"), changed: t("stChanged") };
  return infoBox('<div style="font-weight:700;font-size:15px">' + esc(nameOf(r)) + "</div>" +
    (altNameOf(r) ? '<div style="font-size:12px;color:#5A6E62">' + esc(altNameOf(r)) + "</div>" : "") +
    '<div style="color:#8B938E;font-size:13px">' + "✱".repeat(r.formerStars) + ' <span style="color:#5A6E62">' + esc(t("formerly")) + " · " + esc(cuisineOf(r)) + " · " + esc(whereOf(r)) + "</span></div>" +
    '<div style="margin-top:6px;font-size:13px"><strong style="color:#A33A2E">' + esc(label[r.status] || label.changed) + "</strong>" +
    (pick(r, "statusNote") ? " · " + esc(pick(r, "statusNote")) : "") + "</div>" +
    '<a href="' + cityLink(r) + '" style="display:inline-block;margin-top:6px;color:#1E6142;font-weight:600;font-size:13px">' + esc(pick(r, "cityName")) + " →</a>");
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
    await homeReady;
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
    world.lost = LOST.map((r) => {
      const m = new Marker({ position: { lat: r.lat, lng: r.lng }, title: nameOf(r), icon: pinIcon(r.formerStars, false, true), zIndex: 1 });
      m.addListener("click", () => openCard(m));
      m.r = r; m.lost = true; m.stars = 0;
      m.where = [r.town || r.cityName, (DATA.countries.find((c) => c.id === r.country) || {}).name].filter(Boolean).join(", ");
      m.find = fold([r.name, r.nameZh, r.nameJa, r.town, r.cityName, m.where].join(" "));
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
      world.loading = getData(DATA.worldUrl);
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
  world.lost.forEach((m) => m.setMap(homeState.stars ? null : world.map));
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
  world.info.setContent(m.lost ? lostInfoHtml(m.r) : m.r ? infoHtml(m.r) : worldInfoHtml(m.w));
  if (fromSearch) {
    world.info.setOptions({ pixelOffset: new google.maps.Size(0, m.lost ? -30 : -38) });
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
  const rests = world.markers.concat(world.lost).filter((m) => m.find.includes(q))
    .sort((a, b) => (fold(a.r ? a.r.name : a.w.name).startsWith(q) ? 0 : 1) - (fold(b.r ? b.r.name : b.w.name).startsWith(q) ? 0 : 1) || b.stars - a.stars)
    .slice(0, 8 - places.length);
  mapHits = places.map((g) => ({ place: g })).concat(rests.map((m) => ({ marker: m })));
  $("mapResults").innerHTML = mapHits.length ? mapHits.map((h, i) => h.place
    ? '<li><a href="#map" data-hit="' + i + '"><span>' + esc(h.place.label) + '</span><span class="sub">' + esc(t("destRestaurants", { n: h.place.markers.length })) + "</span></a></li>"
    : '<li><a href="#map" data-hit="' + i + '"><span>' + esc(h.marker.r ? nameOf(h.marker.r) : h.marker.w.name) + " " + (h.marker.lost ? "" : starIcons(h.marker.stars)) + '</span><span class="sub">' +
      esc(h.marker.where + (h.marker.lost ? " · " + t("formerTitle") : "")) + "</span></a></li>").join("")
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
const pinStars = () => world.loaded ? world.markers.map((m) => ({ stars: m.stars })) : homeLoaded ? ALL
  : [1, 2, 3].flatMap((s) => Array(DATA.starCounts[s]).fill({ stars: s }));  // the page's own counts until the restaurants arrive
function renderMapStars() {
  const list = pinStars();
  const opts = [{ s: 0, label: t("all"), n: list.length }].concat([1, 2, 3].map((s) => ({ s, label: starIcons(s), n: list.filter((r) => r.stars === s).length })));
  $("mapStars").innerHTML = opts.map((o) =>
    '<button type="button" data-mapstars="' + o.s + '" aria-pressed="' + (homeState.stars === o.s) + '"' + (o.s ? ' aria-label="' + esc(t("starsAria", { n: o.s })) + '"' : "") + ">" + o.label + '<span class="count">' + o.n.toLocaleString("en-GB") + "</span></button>").join("");
}
function renderMapLegend() {
  renderLegend(pinStars());
  $("mapLegend").insertAdjacentHTML("beforeend", "<li>" + legendPin(1, true) + "<span>" + esc(t("legendHollow")) + "</span></li>" + (LOST.length ? legendLost() : ""));
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
    world.markers.concat(world.lost).forEach((m) => { if (m.r) m.setTitle(nameOf(m.r)); });
    if (world.near) world.near.relabel();
  } else if (el.dataset.mapstars) {
    homeState.stars = Number(el.dataset.mapstars); renderMapStars(); updateWorldMap(true);
  } else if (el.dataset.billmeal || el.dataset.billcur) {
    if (el.dataset.billmeal) bill.meal = el.dataset.billmeal; else bill.cur = el.dataset.billcur;
    saveBill(); renderWishlist();
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
homeReady.then(() => {
  renderWishlist(); renderMapLegend();
  if (document.activeElement === $("homeQ")) renderResults();
}).catch(() => {});
if (GOOGLE_MAPS_API_KEY) initWorldMap(); else $("map").hidden = true;
