// A destination page (country, region, city or collection): the price comparison, map and star tiers.
// The build step puts this page's place details and restaurants into #page-data.

const PAGE = DATA.page;
const ALL_RESTAURANTS = DATA.restaurants;
const RESTAURANTS = ALL_RESTAURANTS.filter((r) => !r.status);
const FORMER = ALL_RESTAURANTS.filter((r) => r.status);
const PAGE_CURRENCIES = [...new Set(RESTAURANTS.map((r) => r.cur))];
const currencyOptions = [PAGE.currency].concat(DATA.switchable.filter((c) => c !== PAGE.currency));
pageVars = () => ({ place: pick(PAGE, "name"), placeIn: zh() ? pick(PAGE, "name") : fr() ? PAGE.inSentenceFr : PAGE.inSentence || PAGE.name });

const state = { meal: "dinner", activeCat: "All", activeStars: 0, wishOnly: false, changesOnly: false, query: params.get("q") || "", sort: "price-asc", wishlist: [], lastUndo: null,
  currency: PAGE.currency, rates: Object.fromEntries(Object.entries(DATA.currencies).map(([k, v]) => [k, v.perUSD])), rateDate: new Date(DATA.rateDate + "T12:00:00Z") };

// ---------- Helpers ----------
const cityNameOf = (r) => pick(r, "cityName");
const areaOf = (r) => {
  const a = pick(r, "area");
  // Restaurants listed under a region or country (e.g. England) already name their town in the area.
  if (!PAGE.showCity || (r.cityType && r.cityType !== "city" && a)) return a;
  const c = cityNameOf(r);
  return !a ? c : (a.includes(c) || a.includes(r.cityName)) ? a : a + ", " + c;
};
const noteOf = (r) => L() ? pick(r, "lunchNote") : pick(r, "dinnerNote");
const mapsUrl = (r) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([r.name, r.address || [r.area, r.cityName].filter(Boolean).join(", ")].join(", ")) + (r.placeId ? "&query_place_id=" + encodeURIComponent(r.placeId) : "");
// Exchange: rates are units per US dollar, so any currency converts to any other.
const fx = (from) => state.rates[state.currency] / state.rates[from];
const shown = (r, n) => n == null ? null : r.cur === state.currency ? n : n * fx(r.cur);
// "≈" marks converted prices; with no restaurant given, it asks about the page as a whole.
const approx = (r) => r ? r.cur !== state.currency : PAGE_CURRENCIES.some((c) => c !== state.currency);
function money(n, r) {
  if (n == null) return "";
  const sym = DATA.currencies[state.currency].symbol;
  if (approx(r)) return "≈" + sym + Math.round(n).toLocaleString("en-GB");
  return sym + n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}
// Meal-aware accessors: the Dinner | Lunch switch decides which figures are shown.
const L = () => state.meal === "lunch";
const priceOf = (r) => shown(r, L() ? (r.noLunch ? null : r.lunch) : r.dinner);
const typeOf = (r) => L() ? (r.lunchType || "menu") : r.dinnerType;
const wineOf = (r) => shown(r, L() ? r.lunchWine : r.wine);
const srcOf = (r) => L() ? r.lunchSource : r.source;
const srcTypeOf = (r) => L() ? r.lunchSourceType : r.sourceType;
const isMenu = (r) => typeOf(r) === "menu" && priceOf(r) != null;
const priceRank = (r) => (L() && r.noLunch ? 3 : isMenu(r) ? 0 : priceOf(r) != null ? 1 : 2);
const byPrice = (a, b) => (priceOf(a) || 0) - (priceOf(b) || 0);
const onWishlist = (r) => state.wishlist.includes(r.id);
const starMatch = (r) => !state.activeStars || r.stars === state.activeStars;
const wishMatch = (r) => (!state.wishOnly || onWishlist(r)) && (!state.changesOnly || !!r.change);
const searchText = (r) => [r.name, r.nameZh, r.cuisine, r.cuisineZh, CUISINE_ZH[r.cuisine], r.area, r.areaZh, r.cityName, r.cityNameZh].filter(Boolean).join(" ").toLowerCase();
const queryMatch = (r) => { const q = state.query.trim().toLowerCase(); return !q || searchText(r).includes(q); };
const changeBadge = (r) => !r.change ? "" : '<span class="chg chg-' + (r.change === "down" ? "down" : "up") + '" title="' + esc(t("chgTitle", { note: pick(r, "changeNote"), date: monthYear(r.changeDate) })) + '">' + (r.change === "down" ? "▼ " : "▲ ") + (r.change === "new" ? t("chgNew") + " " : "") + monthYear(r.changeDate) + "</span>";

function load() {
  const prefs = store.get(PREFS_KEY, {});
  if (prefs.sort) state.sort = prefs.sort;
  if (prefs.meal === "lunch") state.meal = "lunch";
  const saved = (prefs.currency || {})[PAGE.currency];
  if (saved && currencyOptions.includes(saved)) state.currency = saved;
  state.wishlist = loadWishlist();
}
function save() {
  const prefs = store.get(PREFS_KEY, {});
  prefs.sort = state.sort;
  prefs.meal = state.meal;
  prefs.currency = Object.assign({}, prefs.currency, { [PAGE.currency]: state.currency });
  store.set(PREFS_KEY, prefs);
  store.set(WISHLIST_KEY, state.wishlist);
}

function filtered() {
  const rows = RESTAURANTS.filter((r) => starMatch(r) && wishMatch(r) && (state.activeCat === "All" || r.cuisine === state.activeCat) && queryMatch(r));
  const coll = new Intl.Collator(locale());
  const sorters = {
    "price-asc": (a, b) => priceRank(a) - priceRank(b) || byPrice(a, b),
    "price-desc": (a, b) => priceRank(a) - priceRank(b) || byPrice(b, a),
    "stars": (a, b) => b.stars - a.stars || priceRank(a) - priceRank(b) || byPrice(b, a),
    "rating": (a, b) => (L() ? (a.noLunch ? 1 : 0) - (b.noLunch ? 1 : 0) : 0) || (b.rating || 0) - (a.rating || 0) || coll.compare(nameOf(a), nameOf(b)),
    "name": (a, b) => coll.compare(nameOf(a), nameOf(b))
  };
  return rows.sort(sorters[state.sort] || sorters["price-asc"]);
}

// ---------- Static text, breadcrumbs and switches ----------
function applyStatic() {
  applyI18n();
  document.title = t("pageTitle");
  if (L()) {
    document.querySelector('[data-i18n="figMin"]').innerHTML = t("figMinLunch");
    document.querySelector('[data-i18n="figMax"]').innerHTML = t("figMaxLunch");
    document.querySelector('[data-i18n="sortPriceAsc"]').innerHTML = t("sortPriceAscLunch");
    document.querySelector('[data-i18n="sortPriceDesc"]').innerHTML = t("sortPriceDescLunch");
  }
  // Text written for this place in content/places replaces the general wording.
  const intro = pick(PAGE, "intro");
  if (intro) $("heroText").innerHTML = t("heroText") + " " + esc(intro);
  [["m1Text", "serviceText"], ["m2Text", "sourcesText"], ["m3Text", "starsText"]].forEach(([key, field]) => {
    const own = pick(PAGE, field);
    if (own) document.querySelector('[data-i18n="' + key + '"]').textContent = own;
  });
  const ex = pick(PAGE, "searchEx");
  $("q").placeholder = ex ? t("searchPhEx", { ex }) : t("searchPh");
  $("q").setAttribute("aria-label", t("searchLabel"));
  $("sort").setAttribute("aria-label", t("sortLabel"));
  $("ledger").setAttribute("aria-label", t("tableLabel"));
  $("cMsg").placeholder = t("cMsgPh");
  $("mapCanvas").setAttribute("aria-label", t("mapLabel"));
  $("crumbs").setAttribute("aria-label", t("crumbsAria"));
  $("currencySwitch").setAttribute("aria-label", t("currencyAria"));
  $("crumbs").innerHTML = '<a href="' + withLang("/") + '">' + t("crumbHome") + "</a>" +
    PAGE.crumbs.map((c) => '<a href="' + withLang(c.path) + '">' + esc(pick(c, "name")) + "</a>").join("") +
    '<span aria-current="page">' + esc(pick(PAGE, "name")) + "</span>";
  $("explore").innerHTML = PAGE.links.map((group) =>
    '<div class="explore-row"><span class="explore-label">' + esc(t(group.label, { country: pick(group, "country") })) + "</span>" +
    group.items.map((p) => p.current
      ? '<span class="place-link" aria-current="page">' + esc(pick(p, "name")) + '<span class="count">' + p.n + "</span></span>"
      : '<a class="place-link" href="' + withLang(p.path) + '">' + esc(pick(p, "name")) + '<span class="count">' + p.n + "</span></a>").join("") + "</div>").join("");
  $("currencySwitch").innerHTML = currencyOptions.map((k) =>
    '<button type="button" data-currency="' + k + '" aria-pressed="' + (k === state.currency) + '">' + DATA.currencies[k].symbol + "</button>").join("");
  const converted = approx();
  $("rateLine").hidden = !converted;
  if (converted) {
    const date = state.rateDate.toLocaleDateString(locale(), { day: "numeric", month: zh() ? "numeric" : "short", year: "numeric" });
    const sym = DATA.currencies[state.currency].symbol;
    $("rateLine").textContent = PAGE_CURRENCIES.length === 1
      ? t("rateLine", { sym, date, home: DATA.currencies[PAGE_CURRENCIES[0]].symbol, rate: (1 / fx(PAGE_CURRENCIES[0])).toFixed(2) })
      : t("rateLineMixed", { sym, date });
  }
}

// ---------- Filters ----------
function renderMealFilter() {
  $("mealFilter").innerHTML = [["dinner", t("mealDinner")], ["lunch", t("mealLunch")]].map(([k, l]) =>
    '<button type="button" data-meal="' + k + '" aria-pressed="' + (state.meal === k) + '">' + l + "</button>").join("");
}
function renderShowFilter() {
  $("showFilter").innerHTML =
    '<button type="button" data-show="all" aria-pressed="' + !(state.wishOnly || state.changesOnly) + '">' + t("showAll") + "</button>" +
    '<button type="button" data-show="changes" aria-pressed="' + state.changesOnly + '" title="' + esc(t("showChangesTitle")) + '"><span class="chg-up" aria-hidden="true">▲</span>' + t("showChanges") + '<span class="count">' + RESTAURANTS.filter((r) => r.change).length + "</span></button>" +
    '<button type="button" data-show="wishlist" aria-pressed="' + state.wishOnly + '"><span class="wish-icon">' + heart + "</span>" + t("showWish") + '<span class="count">' + RESTAURANTS.filter(onWishlist).length + "</span></button>";
  renderWishCount();
}
function renderStarFilter() {
  const base = RESTAURANTS.filter(wishMatch);
  const opts = [{ s: 0, label: t("all"), n: base.length }].concat([1, 2, 3].map((s) => ({ s, label: rosettes(s), n: base.filter((r) => r.stars === s).length })));
  $("starFilter").innerHTML = opts.map((o) =>
    '<button type="button" data-stars="' + o.s + '" aria-pressed="' + (state.activeStars === o.s) + '"' + (o.s ? ' aria-label="' + esc(t("starsAria", { n: o.s })) + '"' : "") + ">" + o.label + '<span class="count">' + o.n + "</span></button>").join("");
}
function renderChips() {
  const counts = {};
  RESTAURANTS.forEach((r) => { counts[r.cuisine] = (counts[r.cuisine] || 0) + (starMatch(r) && wishMatch(r) ? 1 : 0); });
  const coll = new Intl.Collator(locale());
  // Each cuisine in the current language; two that translate the same keep the English in brackets.
  const shown = (c) => { const r = ALL_RESTAURANTS.find((x) => x.cuisine === c); return r ? cuisineOf(r) : c; };
  const seen = {};
  Object.keys(counts).forEach((c) => { seen[shown(c)] = (seen[shown(c)] || 0) + 1; });
  const label = (c) => seen[shown(c)] > 1 && shown(c) !== c ? shown(c) + (zh() ? "（" + c + "）" : " (" + c + ")") : shown(c);
  const cats = Object.keys(counts).sort((a, b) => coll.compare(label(a), label(b)));
  const total = RESTAURANTS.filter((r) => starMatch(r) && wishMatch(r)).length;
  let html = '<span class="chip all' + (state.activeCat === "All" ? " active" : "") + '"><button type="button" data-cat="All" aria-pressed="' + (state.activeCat === "All") + '">' + t("all") + '<span class="count">' + total + "</span></button></span>";
  cats.forEach((c) => {
    const on = state.activeCat === c;
    html += '<span class="chip' + (on ? " active" : "") + (counts[c] ? "" : " zero") + '"><button type="button" data-cat="' + esc(c) + '" aria-pressed="' + on + '">' + esc(label(c)) + '<span class="count">' + counts[c] + "</span></button></span>";
  });
  $("chips").innerHTML = html;
}

// ---------- Table ----------
function nameCell(r) {
  const initial = (nameOf(r).replace(/^(The|Restaurant)\s+/i, "")[0] || "?").toUpperCase();
  const thumb = '<span class="thumb" aria-hidden="true"' + (r.placeId && !r.status ? ' data-pid="' + esc(r.placeId) + '" data-name="' + esc(nameOf(r)) + '"' : "") + ">" + esc(initial) + "</span>";
  const alt = altNameOf(r);
  return '<span class="name" role="cell">' + thumb + '<span class="name-text">' + esc(nameOf(r)) +
    (r.status === "closed" ? "" : '<a class="map" href="' + mapsUrl(r) + '" target="_blank" rel="noopener" aria-label="' + esc(t("findOnMaps", { name: nameOf(r) })) + '" title="' + esc(t("findOnMapsTitle")) + '"><svg aria-hidden="true"><use href="#pin"/></svg></a>') +
    (alt ? '<span class="alt-name" lang="' + (zh() ? "en" : "zh-Hant") + '">' + esc(alt) + "</span>" : "") +
    (areaOf(r) ? '<span class="area">' + esc(areaOf(r)) + "</span>" : "") + '<span class="credit"></span></span></span>';
}
function renderLedger() {
  const rows = filtered();
  const max = Math.max(...RESTAURANTS.filter(isMenu).map(priceOf), 1);
  let html = '<div class="row head" role="row"><span role="columnheader">' + t("hRestaurant") + '</span><span role="columnheader">' + t("hCuisine") + '</span><span role="columnheader">' + t("hStars") + '</span><span role="columnheader">' + t("hGoogle") + '</span><span role="columnheader">' + t(L() ? "hNotesLunch" : "hNotes") + '</span><span role="columnheader" style="text-align:right">' + t("hPrice") + '</span><span role="columnheader" style="text-align:right">' + t("hWine") + '</span><span role="columnheader" class="sr-only">' + t("hWish") + "</span></div>";
  if (!rows.length) {
    html += '<div class="empty">' + (state.wishOnly && !RESTAURANTS.some(onWishlist) ? t("emptyWish")
      : t("noMatch") + ' <button type="button" class="linkish" id="clearFilters">' + t("clearFilters") + "</button>") + "</div>";
  }
  rows.forEach((r) => {
    const on = onWishlist(r);
    html += '<div class="row' + (L() && r.noLunch ? " nolunch" : "") + '" role="row">' + nameCell(r) +
      '<span class="cat" role="cell"><button type="button" class="tag" data-cat="' + esc(r.cuisine) + '" title="' + esc(t("showOnly", { cat: cuisineOf(r) })) + '">' + esc(cuisineOf(r)) + "</button></span>" +
      '<span class="stars-cell" role="cell">' + rosettes(r.stars) + changeBadge(r) + "</span>" +
      '<span class="rating-cell" role="cell"><span class="mlabel">' + t("hGoogle") + "</span>" + (r.rating ? '<span class="rating num" aria-label="' + esc(t("ratingAria", { r: r.rating.toFixed(1) })) + '"><svg aria-hidden="true"><use href="#gstar"/></svg>' + r.rating.toFixed(1) + "</span>" + (r.reviews ? '<span class="note">' + t("reviews", { n: r.reviews.toLocaleString("en-GB") }) + "</span>" : "") : '<span class="num muted">–</span>') + "</span>" +
      '<span class="notes" role="cell">' + (r.notice ? '<span class="notice">' + t("tempClosed") + "</span>" : "") + esc(noteOf(r) || "–") +
        (srcOf(r) && srcTypeOf(r) !== "none" ? ' <a class="src" href="' + esc(srcOf(r)) + '" target="_blank" rel="noopener" title="' + esc(t("srcTitle")) + '">' + (srcTypeOf(r) === "site" ? t("srcSite") : t("srcPress")) + "</a>" : "") + "</span>" +
      '<span class="dinner" role="cell"><span class="mlabel">' + t("hPrice") + '</span><span class="bar"><span style="width:' + (isMenu(r) ? (priceOf(r) / max * 100).toFixed(1) : 0) + '%"></span></span><span class="dprice">' +
        (priceOf(r) == null ? '<span class="num muted">–</span><span class="note">' + t(L() && r.noLunch ? "noLunch" : "notListed") + "</span>"
          : '<span class="num">' + money(priceOf(r), r) + "</span>" + (typeOf(r) === "main" ? '<span class="note">' + t("perMain") + "</span>" : typeOf(r) === "spend" ? '<span class="note">' + t("typicalSpend") + "</span>" : "")) + "</span></span>" +
      '<span class="wine num' + (wineOf(r) ? "" : " muted") + '" role="cell"><span class="mlabel">' + t("hWine") + "</span>" + (wineOf(r) ? money(wineOf(r), r) : "–") + "</span>" +
      '<span class="wish-cell" role="cell"><button type="button" class="wish" data-wish="' + esc(r.id) + '" aria-pressed="' + on + '" aria-label="' + esc(t(on ? "wishRemove" : "wishAdd", { name: nameOf(r) })) + '" title="' + esc(t(on ? "wishRemoveT" : "wishAddT")) + '">' + heart + "</button></span>" +
      "</div>";
  });
  const former = state.activeStars || state.wishOnly ? [] : FORMER.filter((r) => (!state.changesOnly || r.change) && (state.activeCat === "All" || r.cuisine === state.activeCat) && queryMatch(r));
  if (former.length) {
    const label = { lost: t("stLost"), closed: t("stClosed"), changed: t("stChanged") };
    html += '<div class="row divider" role="row"><span role="cell"><strong>' + t("formerTitle") + '</strong><span class="note">' + t("formerNote") + "</span></span></div>";
    former.sort((a, b) => nameOf(a).localeCompare(nameOf(b))).forEach((r) => {
      html += '<div class="row former" role="row">' + nameCell(r) +
        '<span class="cat" role="cell"><span class="tag">' + esc(cuisineOf(r)) + "</span></span>" +
        '<span class="stars-cell" role="cell">' + rosettes(r.formerStars) + '<span class="note">' + t("formerly") + "</span></span>" +
        '<span class="rating-cell" role="cell"><span class="num muted">–</span></span>' +
        '<span class="notes" role="cell"><span class="status-pill status-' + esc(r.status) + '">' + (r.change === "down" ? "▼ " : "") + (label[r.status] || label.changed) + "</span>" + esc(pick(r, "statusNote")) + "</span>" +
        '<span class="dinner" role="cell"><span class="dprice"><span class="num muted">–</span></span></span>' +
        '<span class="wine num muted" role="cell">–</span><span class="wish-cell" role="cell"></span></div>';
    });
  }
  $("ledger").innerHTML = html;
  observeThumbs();
  updateMap(true);
  $("showing").textContent = t("showing", { a: rows.length, b: RESTAURANTS.length }) + (former.length ? t("showingFormer", { c: former.length }) : "");
}

// ---------- Headline figures and star tiers ----------
function renderFigures() {
  const all = RESTAURANTS;
  $("fCount").textContent = all.length;
  const n = [0, 1, 2, 3].map((s) => all.filter((r) => r.stars === s).length);
  $("fCountSub").textContent = t("starCounts").replace("{3}", n[3]).replace("{2}", n[2]).replace("{1}", n[1]);
  const sorted = all.filter(isMenu).sort(byPrice);
  if (!sorted.length) { $("fMin").textContent = $("fMax").textContent = "–"; $("fMinSub").textContent = $("fMaxSub").textContent = ""; return; }
  const lo = sorted[0], hi = sorted[sorted.length - 1];
  $("fMin").textContent = money(priceOf(lo), lo); $("fMinSub").textContent = nameOf(lo);
  $("fMax").textContent = money(priceOf(hi), hi); $("fMaxSub").textContent = nameOf(hi);
}
function renderTiers() {
  const tiers = [1, 2, 3].map((s) => {
    const list = RESTAURANTS.filter((r) => r.stars === s);
    const prices = list.filter(isMenu).map(priceOf);
    const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const rated = list.filter((r) => r.rating);
    return { s, n: list.length, priced: prices.length, avg, min: Math.min(...prices), max: Math.max(...prices), rating: rated.length ? rated.reduce((a, r) => a + r.rating, 0) / rated.length : null };
  });
  const top = Math.max(...tiers.map((x) => x.avg), 1);
  const names = t("tierNames");
  $("tiers").innerHTML = tiers.map((x, i) => {
    const prev = i > 0 && tiers[i - 1].priced && x.priced ? x.avg - tiers[i - 1].avg : null;
    return '<div class="tier"><div class="top"><h3>' + names[x.s - 1] + "</h3>" + rosettes(x.s) + "</div>" +
      (x.priced
        ? '<div class="avg">' + money(x.avg) + "<small>" + t(L() ? "avgLunch" : "avgDinner") + "</small></div>" +
          '<div class="bar"><span style="width:' + (x.avg / top * 100).toFixed(1) + '%"></span></div>' +
          "<dl><dt>" + t("tRestaurants") + "</dt><dd>" + x.n + "</dd><dt>" + t("tRange") + "</dt><dd>" + money(x.min) + "–" + money(x.max) + "</dd><dt>" + t("tRating") + "</dt><dd>" + (x.rating ? x.rating.toFixed(1) : "–") + "</dd>" +
          (prev !== null ? "<dt>" + t("tVs", { n: x.s - 1 }) + "</dt><dd>" + (prev >= 0 ? "+" : "−") + money(Math.abs(prev)).replace("≈", "") + "</dd>" : "") + "</dl>"
        : '<p style="color: var(--muted)">' + (x.n ? t("tNoPrices") : t("tNone", { tier: names[x.s - 1] })) + "</p>") + "</div>";
  }).join("");
}

// ---------- Google: photos and map ----------
const loadPlaces = () => loadGoogle().then(() => google.maps.importLibrary("places"));
const photoCache = new Map();
function fetchPhoto(placeId) {
  if (!photoCache.has(placeId)) {
    photoCache.set(placeId, (async () => {
      const { Place } = await loadPlaces();
      const place = new Place({ id: placeId });
      await place.fetchFields({ fields: ["photos"] });
      const photo = place.photos && place.photos[0];
      if (!photo) return null;
      const author = (photo.authorAttributions || [])[0];
      return { uri: photo.getURI({ maxWidth: 200, maxHeight: 200 }), big: photo.getURI({ maxWidth: 1400, maxHeight: 1000 }),
        author: author ? author.displayName : "", authorUri: author ? author.uri : "" };
    })().catch(() => null));
  }
  return photoCache.get(placeId);
}
async function applyPhoto(el) {
  const info = await fetchPhoto(el.dataset.pid);
  if (!info || !el.isConnected || el.querySelector("img")) return;
  const img = new Image();
  img.alt = "";
  img.decoding = "async";
  img.src = info.uri;
  img.onload = () => el.classList.add("has-photo");
  el.appendChild(img);
  // A loaded photo opens larger when tapped.
  el.removeAttribute("aria-hidden");
  el.setAttribute("role", "button");
  el.tabIndex = 0;
  el.setAttribute("aria-label", t("photoView", { name: el.dataset.name }));
  el.dataset.zoom = "1";
  const credit = el.parentElement.querySelector(".credit");
  if (credit) credit.innerHTML = t("photo") + ": " + (info.author ? (info.authorUri ? '<a href="' + esc(info.authorUri) + '" target="_blank" rel="noopener">' + esc(info.author) + "</a>" : esc(info.author)) + " · " : "") + "Google Maps";
}
const thumbObserver = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { thumbObserver.unobserve(e.target); applyPhoto(e.target); } });
}, { rootMargin: "300px 0px" }) : null;
function observeThumbs() {
  if (!GOOGLE_MAPS_API_KEY || !thumbObserver) return;
  document.querySelectorAll(".thumb[data-pid]").forEach((el) => thumbObserver.observe(el));
}

const mapState = { map: null, info: null, markers: new Map(), near: null };
function infoHtml(r) {
  const price = priceOf(r) == null ? t(L() && r.noLunch ? "noLunch" : "infoNoPrice") : money(priceOf(r), r) + " " + (typeOf(r) === "main" ? t("perMain") : typeOf(r) === "spend" ? t("typicalSpend") : t(L() ? "infoLunch" : "infoDinner"));
  return '<div style="font-family:Figtree,system-ui,sans-serif;color:#12261C;max-width:240px;line-height:1.4">' +
    '<div style="font-weight:700;font-size:15px">' + esc(nameOf(r)) + "</div>" +
    (altNameOf(r) ? '<div style="font-size:12px;color:#5A6E62">' + esc(altNameOf(r)) + "</div>" : "") +
    '<div style="color:#B3862B;font-size:13px">' + "✱".repeat(r.stars) + ' <span style="color:#5A6E62">' + esc(cuisineOf(r)) + " · " + esc(areaOf(r)) + "</span></div>" +
    '<div style="margin-top:6px;font-size:13px">' + esc(price) + (wineOf(r) ? " · " + t("infoWine") + " " + money(wineOf(r), r) : "") + "</div>" +
    (r.rating ? '<div style="font-size:13px;color:#5A6E62">★ ' + r.rating.toFixed(1) + " " + t("infoGoogle") + "</div>" : "") +
    (r.change ? '<div style="font-size:12px;color:' + (r.change === "down" ? "#A33A2E" : "#1E6142") + '">' + esc(pick(r, "changeNote") + ", " + monthYear(r.changeDate)) + "</div>" : "") +
    '<a href="' + mapsUrl(r) + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;color:#1E6142;font-weight:600;font-size:13px">' + t("infoOpen") + "</a></div>";
}
async function initMap() {
  try {
    await loadGoogle();
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    const { Marker } = await google.maps.importLibrary("marker");
    const placed = RESTAURANTS.filter((r) => r.lat != null && r.lng != null);
    $("mapCanvas").innerHTML = "";
    $("mapCanvas").style.display = "block";
    mapState.map = new Map($("mapCanvas"), { center: placed.length ? { lat: placed[0].lat, lng: placed[0].lng } : { lat: 20, lng: 0 }, zoom: 11, mapTypeControl: false, streetViewControl: false, clickableIcons: false, gestureHandling: "cooperative" });
    mapState.info = new InfoWindow();
    // Tapping anywhere on the map closes an open restaurant card.
    mapState.map.addListener("click", () => mapState.info.close());
    placed.forEach((r) => {
      const m = new Marker({ position: { lat: r.lat, lng: r.lng }, title: nameOf(r), icon: pinIcon(r.stars), zIndex: r.stars * 10 });
      m.addListener("click", () => { mapState.info.setContent(infoHtml(r)); mapState.info.open({ anchor: m, map: mapState.map }); });
      mapState.markers.set(r.id, m);
    });
    // "Near me" looks among the pins the filters are showing; if none is close, it points to the world map instead.
    mapState.near = addNearMe(mapState.map, () => placed.filter((r) => mapState.markers.get(r.id).getMap()).map((r) => ({
      lat: r.lat, lng: r.lng, stars: r.stars, name: () => nameOf(r),
      open: () => { const m = mapState.markers.get(r.id); mapState.map.setCenter(m.getPosition()); if (mapState.map.getZoom() < 15) mapState.map.setZoom(15); google.maps.event.trigger(m, "click"); }
    })), { radius: 30000, far: withLang("/") + "&near=1#map" });
    updateMap(true);
  } catch (e) {
    $("mapCanvas").innerHTML = '<p class="map-wait">' + t("mapError") + "</p>";
  }
}
function updateMap(fit) {
  if (!mapState.map) return;
  const visible = new Set(filtered().map((r) => r.id));
  const bounds = new google.maps.LatLngBounds();
  let n = 0;
  mapState.markers.forEach((m, id) => {
    const on = visible.has(id);
    if ((m.getMap() != null) !== on) m.setMap(on ? mapState.map : null);
    if (on) { bounds.extend(m.getPosition()); n++; }
  });
  mapState.info.close();
  $("mapStatus").textContent = n ? t("mapShowing", { n }) : t("mapNone");
  if (fit && n > 1) mapState.map.fitBounds(bounds, 40);
  else if (fit && n === 1) { mapState.map.setCenter(bounds.getCenter()); mapState.map.setZoom(15); }
}
function startMapWhenNear() {
  $("map").hidden = $("mapNav").hidden = !GOOGLE_MAPS_API_KEY;
  if (!GOOGLE_MAPS_API_KEY) return;
  let started = false;
  const start = () => { if (started) return; started = true; window.removeEventListener("scroll", check); initMap(); };
  const check = () => { if ($("map").getBoundingClientRect().top < window.innerHeight + 400) start(); };
  window.addEventListener("scroll", check, { passive: true });
  if (location.hash === "#map") start();
  check();
}
// The floating "Map" button: shows once you're into the list, until the map itself is on screen.
function wireJumpToMap() {
  const btn = $("jumpMap");
  if ($("map").hidden) return;
  const sync = () => { btn.hidden = !(window.scrollY > window.innerHeight * 0.6 && $("map").getBoundingClientRect().top > window.innerHeight * 0.8); };
  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  btn.addEventListener("click", (e) => { e.preventDefault(); btn.hidden = true; $("map").scrollIntoView({ block: "start" }); history.replaceState(null, "", location.pathname + location.search + "#map"); });
  btn.setAttribute("aria-label", t("jumpMapAria"));
  sync();
}

// ---------- Exchange rates ----------
async function loadRates() {
  try {
    const d = await fetch("https://open.er-api.com/v6/latest/USD").then((r) => r.json());
    const codes = Object.keys(DATA.currencies);
    if (d && d.rates && codes.every((c) => d.rates[c])) {
      codes.forEach((c) => { state.rates[c] = d.rates[c]; });
      state.rateDate = new Date(d.time_last_update_unix * 1000);
      renderAll();
    }
  } catch (e) { /* keep the fallback rates */ }
}

// ---------- Render and events ----------
function render() { renderMealFilter(); renderShowFilter(); renderStarFilter(); renderChips(); renderLedger(); }
function renderAll() { applyStatic(); render(); renderFigures(); renderTiers(); renderLegend(RESTAURANTS); }

let toastTimer;
function toast(msg, undo) {
  state.lastUndo = undo;
  $("toastMsg").textContent = msg;
  $("undo").hidden = !undo;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; state.lastUndo = null; }, 5000);
}
function toggleWish(id) {
  const r = RESTAURANTS.find((x) => x.id === id);
  state.wishlist = loadWishlist();
  if (onWishlist(r)) {
    state.wishlist = state.wishlist.filter((x) => x !== id);
    toast(t("toastRemoved", { name: nameOf(r) }), () => { state.wishlist.push(id); });
  } else {
    state.wishlist.push(id);
    toast(t("toastAdded", { name: nameOf(r) }), null);
  }
  save(); render();
}

// ---------- Larger photos ----------
async function openPhoto(el) {
  const info = await fetchPhoto(el.dataset.pid);
  if (!info) return;
  $("photoImg").src = info.big;
  $("photoImg").alt = el.dataset.name;
  $("photoCaption").innerHTML = "<strong>" + esc(el.dataset.name) + "</strong>" + (info.author ? " · " + t("photo") + ": " +
    (info.authorUri ? '<a href="' + esc(info.authorUri) + '" target="_blank" rel="noopener">' + esc(info.author) + "</a>" : esc(info.author)) : "") + " · Google Maps";
  $("photoClose").setAttribute("aria-label", t("photoClose"));
  $("photoBox").showModal();
}
document.addEventListener("click", (e) => {
  const zoom = e.target.closest(".thumb[data-zoom]");
  if (zoom) { openPhoto(zoom); return; }
});
document.addEventListener("keydown", (e) => {
  const zoom = e.target.closest && e.target.closest(".thumb[data-zoom]");
  if (zoom && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openPhoto(zoom); }
});
$("photoBox").addEventListener("click", (e) => { if (e.target === $("photoBox") || e.target.closest("#photoClose")) $("photoBox").close(); });
$("photoBox").addEventListener("close", () => { $("photoImg").removeAttribute("src"); });

document.addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (!el || el.closest("#photoBox")) return;
  if (el.dataset.lang) {
    setLang(el.dataset.lang);
    renderAll();
    if (mapState.map) { mapState.markers.forEach((m, id) => m.setTitle(nameOf(RESTAURANTS.find((r) => r.id === id)))); }
    if (mapState.near) mapState.near.relabel();
    $("jumpMap").setAttribute("aria-label", t("jumpMapAria"));
  } else if (el.dataset.meal) {
    state.meal = el.dataset.meal; save(); renderAll();
  } else if (el.dataset.currency) {
    state.currency = el.dataset.currency; save(); renderAll();
  } else if (el.dataset.wish) {
    toggleWish(el.dataset.wish);
  } else if (el.dataset.show) {
    state.wishOnly = el.dataset.show === "wishlist"; state.changesOnly = el.dataset.show === "changes"; render();
  } else if (el.dataset.stars) {
    state.activeStars = Number(el.dataset.stars); render();
  } else if (el.id === "clearFilters") {
    state.activeStars = 0; state.activeCat = "All"; state.wishOnly = false; state.changesOnly = false; state.query = ""; $("q").value = ""; render();
  } else if (el.dataset.cat) {
    state.activeCat = el.dataset.cat; render();
    if (el.classList.contains("tag")) $("compare").scrollIntoView();
  } else if (el.id === "undo") {
    if (state.lastUndo) { state.lastUndo(); state.lastUndo = null; save(); render(); }
    $("toast").hidden = true;
  }
});
$("q").addEventListener("input", (e) => { state.query = e.target.value; renderLedger(); });
wireSearchClear($("q"), () => { state.query = ""; renderLedger(); });
$("sort").addEventListener("change", (e) => { state.sort = e.target.value; save(); renderLedger(); });
$("contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("cName").value.trim(), email = $("cEmail").value.trim(), msg = $("cMsg").value.trim();
  $("cNameErr").textContent = name ? "" : t("errName");
  $("cEmailErr").textContent = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : t("errEmail");
  $("cMsgErr").textContent = msg ? "" : t("errMsg");
  if (!name || $("cEmailErr").textContent || !msg) { $("formStatus").textContent = ""; return; }
  $("formStatus").textContent = t("sent", { name });
  e.target.reset();
});
// Keep the header count right when the wishlist changes in another tab.
window.addEventListener("storage", (e) => { if (e.key === WISHLIST_KEY) { state.wishlist = loadWishlist(); render(); } });

// ---------- Start ----------
load();
$("sort").value = state.sort;
$("q").value = state.query;
renderAll();
if (state.query) $("compare").scrollIntoView();
startMapWhenNear();
wireJumpToMap();
loadRates();
