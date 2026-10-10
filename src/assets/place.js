// A destination page (country, region, city or collection): the price comparison, map and star tiers.
// The build step puts this page's place details and restaurants into #page-data; the biggest places' restaurants
// come in /data/places/<id>.js instead, loaded just before this script. Both are compact rows (pack_restaurants() in build.py).

const unpackRows = (d) => d.r.map((row) => {
  const r = {};
  d.townCols.forEach((c, i) => { const v = d.towns[row[0]][i]; if (v != null) r[c] = v; });
  d.cols.forEach((c, i) => { if (i && row[i] != null) r[c] = row[i]; });
  return r;
});
const PAGE = DATA.page;
const ALL_RESTAURANTS = unpackRows(DATA.rows);
const RESTAURANTS = ALL_RESTAURANTS.filter((r) => !r.status);
const FORMER = ALL_RESTAURANTS.filter((r) => r.status);
// A place with no starred restaurants yet: the page explains, links up to the nearest place that has some,
// and only shows the comparison if there are former starred restaurants to list.
const EMPTY = !RESTAURANTS.length;
const PAGE_CURRENCIES = [...new Set(RESTAURANTS.map((r) => r.cur))];
const currencyOptions = [PAGE.currency].concat(DATA.switchable.filter((c) => c !== PAGE.currency));
// French, Spanish and Italian names carry their preposition ("à Paris", "en España", "a Roma").
// A cuisine page (French in Tokyo) names its city, PAGE.city.
pageVars = () => ({ place: pick(PAGE.city || PAGE, "name"), placeIn: cjk() || ko() ? pick(PAGE, "name") : PAGE["inSentence" + (LANGS[LANG].suffixes[0] || "")] || PAGE.inSentence || PAGE.name });

const EXPLORE_SHOWN = 6;
const state = { openRow: null, exploreOpen: new Set(), meal: "dinner", activeCat: "All", activeStars: 0, diet: "", wishOnly: false, changesOnly: false, beenOnly: false, visited: {}, query: params.get("q") || "", sort: "price-asc", wishlist: [], lastUndo: null, area: "",
  currency: PAGE.currency, rates: Object.fromEntries(Object.entries(DATA.currencies).map(([k, v]) => [k, v.perUSD])), rateDate: new Date(DATA.rateDate + "T12:00:00Z") };

// ---------- Helpers ----------
const cityNameOf = (r) => pick(r, "cityName");
const areaOf = (r) => {
  const a = pick(r, "area");
  // Restaurants listed under a region or country (e.g. England) already name their town in the area.
  // Nor do those filed under the page's own city, beside its neighbourhoods' pages (London's Dalston beside Mayfair).
  if (!PAGE.showCity || r.cityName === PAGE.name || (r.cityType && r.cityType !== "city" && r.cityType !== "district" && a)) return a;
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
  const sym = symbolOf(state.currency);
  // On right-to-left pages a price is wrapped in invisible left-to-right marks, so "≈£73" doesn't turn into "£73≈".
  const ltr = (s) => rtl() ? "\u2066" + s + "\u2069" : s;
  if (approx(r)) return ltr("≈" + sym + Math.round(n).toLocaleString("en-GB"));
  return ltr(sym + n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }));
}
// Meal-aware accessors: the Dinner | Lunch switch decides which figures are shown.
const L = () => state.meal === "lunch";
const priceOf = (r) => shown(r, L() ? (r.noLunch ? null : r.lunch) : r.dinner);
const typeOf = (r) => L() ? (r.lunchType || "menu") : r.dinnerType;
const wineOf = (r) => shown(r, L() ? r.lunchWine : r.wine);
// Where there's no pairing price: "no pairing offered" when the restaurant doesn't do one (noPairing), else "no pairing listed".
const noWineNote = (r) => t(r.noPairing ? "rcptNoPairingOffered" : "rcptNoPairing");
const srcOf = (r) => L() ? r.lunchSource : r.source;
const srcTypeOf = (r) => L() ? r.lunchSourceType : r.sourceType;
const isMenu = (r) => typeOf(r) === "menu" && priceOf(r) != null;
const priceRank = (r) => (L() && r.noLunch ? 3 : isMenu(r) ? 0 : priceOf(r) != null ? 1 : 2);
const byPrice = (a, b) => (priceOf(a) || 0) - (priceOf(b) || 0);
const onWishlist = (r) => state.wishlist.includes(r.id);
const onBeen = (r) => Object.prototype.hasOwnProperty.call(state.visited, r.id);
const starMatch = (r) => !state.activeStars || r.stars === state.activeStars;
const wishMatch = (r) => (!state.wishOnly || onWishlist(r)) && (!state.changesOnly || !!r.change) && (!state.beenOnly || onBeen(r));
// Dietary filter options (from the MICHELIN Guide). "Vegetarian options" also counts restaurants with a vegetarian menu or a vegetarian kitchen.
const DIET_KEYS = [["vegetarian-only", "dietVegOnly"], ["vegetarian-menu", "dietVegMenu"], ["vegetarian", "dietVeg"], ["vegan", "dietVegan"], ["gluten-free", "dietGf"], ["halal", "dietHalal"], ["kosher", "dietKosher"]];
const hasDiet = (r, d) => { const ds = r.diets || []; return ds.includes(d) || (d === "vegetarian" && (ds.includes("vegetarian-menu") || ds.includes("vegetarian-only"))); };
const dietMatch = (r) => !state.diet || hasDiet(r, state.diet);
// A neighbourhood, from the "By neighbourhood" links (build.py browse_html()): the first part of the area ("Ginza" of "Ginza, Chuo").
const areaKey = (r) => String(r.area || "").split(",")[0].trim();
const areaMatch = (r) => !state.area || areaKey(r) === state.area;
// A price limit, from a saved search's link (?max=40000&cur=JPY[&meal=lunch|value][&wine=1]): the menu (plus a wine
// pairing, else about 60% more for one, as Help me pick reckons) at most this much per person. scripts/saved_searches.py
// matches the same way. Only set menus count, as there.
function maxBill(r) {
  const m = state.max, opts = [];
  if (m.meal !== "lunch" && (r.dinnerType || "menu") === "menu" && r.dinner != null) opts.push([r.dinner, r.wine]);
  if (m.meal !== "dinner" && !r.noLunch && r.lunch > 0) opts.push([r.lunch, r.lunchWine]);
  const totals = opts.map(([p, w]) => (p + (m.wine ? (w != null ? w : p * 0.6) : 0)) * state.rates[m.cur] / state.rates[r.cur]);
  return totals.length ? Math.min(...totals) : null;
}
const maxMatch = (r) => { if (!state.max) return true; const b = maxBill(r); return b != null && b <= state.max.b + 0.5; };
const dietLabel = (d) => t((DIET_KEYS.find(([k]) => k === d) || [])[1] || "all");
// Leaf badges for the three that matter most when choosing; the rest are in the filter only.
const BADGES = [["vegetarian-only", "badgeVegOnly", "dietVegOnly"], ["vegetarian-menu", "badgeVegMenu", "dietVegMenu"], ["vegan", "badgeVegan", "dietVegan"]];
const dietBadges = (r) => BADGES.filter(([d]) => (r.diets || []).includes(d) && !(d === "vegetarian-menu" && r.diets.includes("vegetarian-only")))
  .map(([d, short, full]) => '<span class="diet-badge" title="' + esc(t(full)) + '"><svg aria-hidden="true"><use href="#leaf"/></svg><span class="sr-only">' + esc(t(full)) + '</span><span aria-hidden="true">' + esc(t(short)) + "</span></span>").join("");
const searchText = (r) => [r.name, r.chef, ...((r.diets || []).map(dietLabel)), ...BADGES.filter(([d]) => (r.diets || []).includes(d)).map(([, short]) => t(short)), r.nameZh, r.nameJa, r.nameKo, r.cuisine, r.cuisineZh, r.cuisineJa, CUISINE_ZH[r.cuisine], CUISINE_FR[r.cuisine], CUISINE_ES[r.cuisine], CUISINE_IT[r.cuisine], CUISINE_KO[r.cuisine],
  r.area, r.areaZh, r.areaJa, r.areaEs, r.areaIt, r.areaKo, r.cityName, r.cityNameZh, r.cityNameJa, r.cityNameEs, r.cityNameIt, r.cityNameKo, r.areaDa, r.areaSv, r.areaIs, r.areaCa, r.areaTh, r.nameTh,
  pick(r, "name"), pick(r, "area"), pick(r, "cityName"), cuisineOf(r)].filter(Boolean).join(" ").toLowerCase();  // the page language's own names too (München, 新荣记)
const queryMatch = (r) => { const q = state.query.trim().toLowerCase(); return !q || searchText(r).includes(q); };
const changeBadge = (r) => !r.change ? "" : '<span class="chg chg-' + (r.change === "down" ? "down" : "up") + '" title="' + esc(t("chgTitle", { note: pick(r, "changeNote"), date: monthYear(r.changeDate) })) + '">' + (r.change === "down" ? "▼ " : "▲ ") + (r.change === "new" ? t("chgNew") + " " : "") + monthYear(r.changeDate) + "</span>";

// The currency chosen for this country's pages on this device, else a member's own currency (loadProfile()), else the local one.
function startCurrency() {
  const saved = (store.get(PREFS_KEY, {}).currency || {})[PAGE.currency], home = homeCurrency();
  return saved && currencyOptions.includes(saved) ? saved : home && currencyOptions.includes(home) ? home : PAGE.currency;
}
// Preferences arriving from the account (signing in, or a change on another device).
window.addEventListener("sb:profile", (e) => {
  if (e.detail.from !== "sync" || startCurrency() === state.currency) return;
  state.currency = startCurrency(); renderAll();
});
function load() {
  const prefs = store.get(PREFS_KEY, {});
  if (prefs.sort) state.sort = prefs.sort;
  if (prefs.meal === "lunch") state.meal = "lunch";
  state.currency = startCurrency();
  state.wishlist = loadWishlist();
  state.visited = loadVisited();
  fromSearchLink();
}
// A saved search's link (saved-search.js, the emails' "See every match"): ?stars=2&cuisine=Japanese&diet=vegan&area=Ginza
// &meal=lunch&max=40000&cur=JPY&wine=1 opens the list with those filters on. Anything this page doesn't have is ignored.
function fromSearchLink() {
  const s = Number(params.get("stars")), cat = params.get("cuisine"), diet = params.get("diet"), area = params.get("area");
  if ([1, 2, 3].includes(s)) state.activeStars = s;
  if (cat && RESTAURANTS.some((r) => r.cuisine === cat)) state.activeCat = cat;
  if (diet && DIET_KEYS.some(([k]) => k === diet)) state.diet = diet;
  if (area && RESTAURANTS.some((r) => areaKey(r) === area)) state.area = area;
  const meal = params.get("meal"), max = Number(params.get("max")), cur = params.get("cur");
  if (meal === "lunch") state.meal = "lunch";
  if (max > 0 && state.rates[cur]) state.max = { b: max, cur, meal: ["lunch", "value"].includes(meal) ? meal : "dinner", wine: params.get("wine") === "1" };
}
// "Save this search": the filters chosen (not the wishlist, been-there or new-stars views, nor the search box, which are
// about the visitor's own lists or a name) go to saved-search.js through account.js, with the price limit asked there.
const savable = () => !EMPTY && !!(state.activeStars || state.activeCat !== "All" || state.diet || state.area || state.max);
window.searchToSave = () => {
  const q = { p: PAGE.id, s: state.activeStars ? [state.activeStars] : [], k: state.activeCat !== "All" ? state.activeCat : "", d: state.diet, a: state.area };
  const link = new URLSearchParams();
  if (state.activeStars) link.set("stars", state.activeStars);
  if (q.k) link.set("cuisine", q.k);
  if (q.d) link.set("diet", q.d);
  if (q.a) link.set("area", q.a);
  const summary = [state.area, pick(PAGE.city || PAGE, "name"), state.activeStars ? t("starsAria", { n: state.activeStars }) : "", q.k ? cuisineLabeller()(q.k) : "",
    PAGE.type === "cuisine" ? pick(PAGE, "name") : "", q.d ? dietLabel(q.d) : ""].filter(Boolean);
  // A price limit already on (it came from a saved search's link) is offered again as the window's starting point.
  const m = state.max;
  return {
    from: "destination", query: q, summary, page: location.pathname + (link.toString() ? "?" + link.toString() : ""),
    en: { place: PAGE.city ? PAGE.city.name : PAGE.name, food: PAGE.type === "cuisine" && !q.k ? PAGE.name : q.k },
    budget: { currencies: currencyOptions.filter((c) => DATA.currencies[c]), cur: m ? m.cur : state.currency, meal: m ? m.meal : state.meal, max: m ? m.b : 0, wine: m ? m.wine : false }
  };
};
function save() {
  const prefs = store.get(PREFS_KEY, {});
  prefs.sort = state.sort;
  prefs.meal = state.meal;
  prefs.currency = Object.assign({}, prefs.currency, { [PAGE.currency]: state.currency });
  store.set(PREFS_KEY, prefs);
  setWishlist(state.wishlist);
}

// The "No longer starred" rows, shown only when no star or wishlist filter is on; the recent ones also get grey map pins.
const formerRows = () => state.activeStars || state.wishOnly || state.max ? [] : FORMER.filter((r) => (!state.changesOnly || r.change) && areaMatch(r) && (state.activeCat === "All" || r.cuisine === state.activeCat) && queryMatch(r));
function filtered() {
  const rows = RESTAURANTS.filter((r) => starMatch(r) && wishMatch(r) && dietMatch(r) && areaMatch(r) && maxMatch(r) && (state.activeCat === "All" || r.cuisine === state.activeCat) && queryMatch(r));
  const coll = new Intl.Collator(locale());
  const sorters = {
    "price-asc": (a, b) => priceRank(a) - priceRank(b) || byPrice(a, b),
    "price-desc": (a, b) => priceRank(a) - priceRank(b) || byPrice(b, a),
    "stars": (a, b) => b.stars - a.stars || priceRank(a) - priceRank(b) || byPrice(b, a),
    "rating": (a, b) => (L() ? (a.noLunch ? 1 : 0) - (b.noLunch ? 1 : 0) : 0) || (fewReviews(a) ? 1 : 0) - (fewReviews(b) ? 1 : 0) || (b.rating || 0) - (a.rating || 0) || coll.compare(nameOf(a), nameOf(b)),
    "name": (a, b) => coll.compare(nameOf(a), nameOf(b))
  };
  return rows.sort(sorters[state.sort] || sorters["price-asc"]);
}

shareText = () => t("shareTextPlace");
// Another destination's address in this page's language when it has one (/fr/france/lyon/), else its English one
// (carrying the visitor's language, for pages further on that offer it).
const placeHref = (p) => LANG !== "en" && (p.langs || []).includes(LANG) ? "/" + LANG + p.path : LANG_PREF === "en" ? p.path : withLang(p.path);

// ---------- Static text, breadcrumbs and switches ----------
function applyStatic() {
  applyI18n();
  // The build writes the title in each of the page's languages (page_titles() in build.py), with search words in it.
  document.title = (PAGE.titles && PAGE.titles[LANG]) || t("pageTitle");
  if (L()) {
    document.querySelector('[data-i18n="figMin"]').innerHTML = t("figMinLunch");
    document.querySelector('[data-i18n="figMax"]').innerHTML = t("figMaxLunch");
    document.querySelector('[data-i18n="sortPriceAsc"]').innerHTML = t("sortPriceAscLunch");
    document.querySelector('[data-i18n="sortPriceDesc"]').innerHTML = t("sortPriceDescLunch");
  }
  // Text written for this place in content/places replaces the general wording.
  // A place's own English opening (PAGE.lead, e.g. Boston's "Yes, one…") takes the general sentence's place.
  const intro = pick(PAGE, "intro"), lead = LANG === "en" && PAGE.lead;
  // Places people search for by a shorter name (NYC, SF, LA: SEARCH_NAMES in build.py) introduce it in the English heading
  // or intro, "New York (NYC)", and say just "NYC" after that.
  const searchIn = LANG === "en" && PAGE.searchIn ? { placeIn: PAGE.searchIn } : null;
  if (searchIn) document.querySelector('[data-i18n="heroTitle"]').innerHTML = t("heroTitle", { placeIn: PAGE.searchHeading });
  if (intro || lead || searchIn) $("heroText").innerHTML = (lead ? esc(lead) : t("heroText", searchIn)) + (intro ? " " + esc(intro) : "");
  // A cuisine page keeps the eyebrow, heading and intro the build wrote for it (cuisine_texts() in build.py).
  if (DATA.own) {
    document.querySelector('[data-i18n="heroEyebrow"]').textContent = DATA.own.eyebrow;
    document.querySelector('[data-i18n="heroTitle"]').innerHTML = DATA.own.h1;
    $("heroText").textContent = DATA.own.heroText;
  }
  if (EMPTY) {
    const up = PAGE.crumbs.slice().reverse().find((c) => c.n);
    $("heroText").innerHTML = esc(t("emptyPlace")) + (up ? '<br><a class="empty-up" href="' + placeHref(up) + '">' + esc(t("emptySee", { n: up.n, name: pick(up, "name") })) + " " + fwdArrow() + "</a>" : "");
    document.querySelector('[data-i18n="compareTitle"]').textContent = t("formerTitle");
    document.querySelector('[data-i18n="compareText"]').textContent = t("formerNote");
  }
  // A star source line written in with its link to the MICHELIN Guide (data-own, link_michelin_guide() in build.py) stays.
  [["m1Text", "serviceText"], ["m2Text", "sourcesText"], ["m3Text", "starsText"]].forEach(([key, field]) => {
    const own = pick(PAGE, field), el = document.querySelector('[data-i18n="' + key + '"]');
    if (own && el) el.textContent = own;
  });
  const ex = pick(PAGE, "searchEx");
  fitPlaceholder($("q"), [ex ? t("searchPhEx", { ex }) : null, t("searchPh"), tHas("searchPhShort")]);
  $("q").setAttribute("aria-label", t("searchLabel"));
  $("sort").setAttribute("aria-label", t("sortLabel"));
  $("ledger").setAttribute("aria-label", t("tableLabel"));
  $("cMsg").placeholder = t("cMsgPh");
  $("cuisineQ").placeholder = t("cuisineSearchPh");
  $("sheetClose").setAttribute("aria-label", t("sheetClose"));
  $("mapCanvas").setAttribute("aria-label", t("mapLabel"));
  $("crumbs").setAttribute("aria-label", t("crumbsAria"));
  $("currencySwitch").setAttribute("aria-label", t("currencyAria"));
  $("currencyPick").setAttribute("aria-label", t("currencyAria"));
  $("crumbs").innerHTML = '<a href="' + withLang("/") + '">' + t("crumbHome") + "</a>" +
    PAGE.crumbs.map((c) => '<a href="' + placeHref(c) + '">' + esc(pick(c, "name")) + "</a>").join("") +
    '<span aria-current="page">' + esc(pick(PAGE, "name")) + "</span>";
  // Places without stars yet sit in a fold, so long lists (e.g. England's counties) stay tidy.
  // Every other row shows its first few (the busiest, plus this page) and a "+ 6 more" button for the rest.
  const placeLink = (p, extra) => (p.current
    ? '<span class="place-link" aria-current="page">' + esc(pick(p, "name")) + '<span class="count">' + p.n + "</span></span>"
    : '<a class="place-link' + (p.n ? "" : " zero") + (extra ? " extra" : "") + '" href="' + placeHref(p) + '">' + esc(pick(p, "name")) + '<span class="count">' + p.n + "</span></a>");
  $("explore").innerHTML = PAGE.links.map((group, gi) => {
    if (group.more) return '<details class="explore-more"><summary>' + esc(t(group.label)) + ' <span class="count">' + group.items.length + "</span></summary>" +
      '<div class="explore-row">' + group.items.map((p) => placeLink(p)).join("") + "</div></details>";
    const hidden = group.items.length > EXPLORE_SHOWN + 1 ? group.items.filter((p, i) => i >= EXPLORE_SHOWN && !p.current).length : 0;
    const open = state.exploreOpen.has(gi);
    return '<div class="explore-row' + (open ? " open" : "") + '"><span class="explore-label">' + esc(t(group.label, { country: pick(group, "country") })) + "</span>" +
      group.items.map((p, i) => placeLink(p, hidden && i >= EXPLORE_SHOWN)).join("") +
      // When an "All areas" fold follows, it already lists the rest.
      (hidden && !(PAGE.links[gi + 1] || {}).more ? '<button type="button" class="explore-toggle" data-explore="' + gi + '" aria-expanded="' + open + '">' +
        (open ? "– " + esc(t("exploreFewer")) : "+ " + esc(t("exploreMore", { n: hidden }))) + "</button>" : "") + "</div>";
  }).join("");
  $("currencySwitch").innerHTML = currencyOptions.map((k) =>
    '<button type="button" data-currency="' + k + '" aria-pressed="' + (k === state.currency) + '">' + DATA.currencies[k].symbol + "</button>").join("");
  // Phones: the same choice as a picker beside Dinner/Lunch, showing just the symbol; the list also gives each code.
  const symOf = (k) => DATA.currencies[k].symbol.trim();
  $("currencyPick").innerHTML = currencyOptions.map((k) =>
    '<option value="' + k + '"' + (k === state.currency ? " selected" : "") + ">" + esc(symOf(k) === k ? k : symOf(k) + " " + k) + "</option>").join("");
  $("curSym").textContent = symOf(state.currency);
  const converted = approx();
  $("rateLine").hidden = !converted;
  if (converted) {
    const date = state.rateDate.toLocaleDateString(locale(), { day: "numeric", month: cjk() ? "numeric" : "short", year: "numeric" });
    const sym = DATA.currencies[state.currency].symbol;
    $("rateLine").textContent = PAGE_CURRENCIES.length === 1
      ? t("rateLine", { sym, date, home: symbolOf(PAGE_CURRENCIES[0]), rate: (1 / fx(PAGE_CURRENCIES[0])).toFixed(2) })
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
    '<button type="button" data-show="all" aria-pressed="' + !(state.wishOnly || state.changesOnly || state.beenOnly) + '">' + t("showAll") + "</button>" +
    '<button type="button" data-show="changes" aria-pressed="' + state.changesOnly + '" title="' + esc(t("showChangesTitle")) + '"><span class="chg-up" aria-hidden="true">▲</span>' + t("showChanges") + '<span class="count">' + RESTAURANTS.filter((r) => r.change).length + "</span></button>" +
    '<button type="button" data-show="wishlist" aria-pressed="' + state.wishOnly + '"><span class="wish-icon">' + heart + "</span>" + t("showWish") + '<span class="count">' + RESTAURANTS.filter(onWishlist).length + "</span></button>" +
    (acctSignedIn() ? '<button type="button" data-show="been" aria-pressed="' + state.beenOnly + '"><span class="been-icon"><svg aria-hidden="true"><use href="#check"/></svg></span>' + t("showBeen") + '<span class="count">' + RESTAURANTS.filter(onBeen).length + "</span></button>" : "");
  renderWishCount();
}
function renderStarFilter() {
  const base = RESTAURANTS.filter((r) => wishMatch(r) && dietMatch(r));
  const opts = [{ s: 0, label: t("all"), n: base.length }].concat([1, 2, 3].map((s) => ({ s, label: starIcons(s), n: base.filter((r) => r.stars === s).length })));
  $("starFilter").innerHTML = opts.map((o) =>
    '<button type="button" data-stars="' + o.s + '" aria-pressed="' + (state.activeStars === o.s) + '"' + (o.s ? ' aria-label="' + esc(t("starsAria", { n: o.s })) + '"' : "") + ">" + o.label + '<span class="count">' + o.n + "</span></button>").join("");
}
const fold = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
// Each cuisine in the current language; two that translate the same keep the English in brackets.
function cuisineLabeller() {
  const shown = (c) => { const r = ALL_RESTAURANTS.find((x) => x.cuisine === c); return r ? cuisineOf(r) : c; };
  const seen = {};
  [...new Set(RESTAURANTS.map((r) => r.cuisine))].forEach((c) => { seen[shown(c)] = (seen[shown(c)] || 0) + 1; });
  return (c) => seen[shown(c)] > 1 && shown(c) !== c ? shown(c) + (cjk() ? "（" + c + "）" : " (" + c + ")") : shown(c);
}
function renderChips() {
  const counts = {};
  RESTAURANTS.forEach((r) => { counts[r.cuisine] = (counts[r.cuisine] || 0) + (starMatch(r) && wishMatch(r) && dietMatch(r) && areaMatch(r) ? 1 : 0); });
  const coll = new Intl.Collator(locale());
  const label = cuisineLabeller();
  const cats = Object.keys(counts).sort((a, b) => coll.compare(label(a), label(b)));
  // A search box helps once the list is long; it narrows the chips, not the restaurants.
  $("cuisineQ").hidden = cats.length < 12;
  const q = $("cuisineQ").hidden ? "" : fold($("cuisineQ").value.trim());
  const total = RESTAURANTS.filter((r) => starMatch(r) && wishMatch(r) && dietMatch(r) && areaMatch(r)).length;
  let html = q ? "" : '<span class="chip all' + (state.activeCat === "All" ? " active" : "") + '"><button type="button" data-cat="All" aria-pressed="' + (state.activeCat === "All") + '">' + t("all") + '<span class="count">' + total + "</span></button></span>";
  cats.forEach((c) => {
    if (q && !fold(label(c)).includes(q) && !fold(c).includes(q)) return;
    const on = state.activeCat === c;
    html += '<span class="chip' + (on ? " active" : "") + (counts[c] ? "" : " zero") + '"><button type="button" data-cat="' + esc(c) + '" aria-pressed="' + on + '">' + esc(label(c)) + '<span class="count">' + counts[c] + "</span></button></span>";
  });
  $("chips").innerHTML = html;
}
function renderDietFilter() {
  const base = RESTAURANTS.filter((r) => starMatch(r) && wishMatch(r) && areaMatch(r) && (state.activeCat === "All" || r.cuisine === state.activeCat));
  // Options no restaurant on this page offers are left out, so a small page isn't padded with zeros.
  const opts = DIET_KEYS.map(([d, key]) => ({ d, label: t(key), n: base.filter((r) => hasDiet(r, d)).length, any: RESTAURANTS.some((r) => hasDiet(r, d)) })).filter((o) => o.any || state.diet === o.d);
  $("dietGroup").hidden = !opts.length;
  $("dietFilter").innerHTML = '<button type="button" data-diet="" aria-pressed="' + !state.diet + '">' + t("all") + '<span class="count">' + base.length + "</span></button>" +
    opts.map((o) => '<button type="button" data-diet="' + o.d + '" aria-pressed="' + (state.diet === o.d) + '">' + (BADGES.some(([b]) => b === o.d) ? '<svg class="leaf" aria-hidden="true"><use href="#leaf"/></svg>' : "") + esc(o.label) + '<span class="count">' + o.n + "</span></button>").join("");
}
// What each drop-down button says, the removable tags under the bar, and the phone panel's "Show 12 restaurants" button.
function renderFilterSummary(n) {
  const show = state.wishOnly ? ["wishlist", t("showWish")] : state.changesOnly ? ["changes", t("showChanges")] : state.beenOnly ? ["been", t("showBeen")] : null;
  const stars = state.activeStars ? starIcons(state.activeStars) : null;
  const cat = state.activeCat !== "All" ? esc(cuisineLabeller()(state.activeCat)) : null;
  const diet = state.diet ? esc(dietLabel(state.diet)) : null;
  const set = (id, html, on) => { $(id).innerHTML = html; $(id).closest(".filter-group").classList.toggle("on", on); };
  set("showVal", show ? esc(show[1]) : t("all"), !!show);
  set("starsVal", stars || t("all"), !!stars);
  set("cuisineVal", cat || t("all"), !!cat);
  set("dietVal", diet || t("all"), !!diet);
  const tags = [];
  if (show) tags.push(["show", esc(show[1])]);
  if (stars) tags.push(["stars", '<span aria-label="' + esc(t("starsAria", { n: state.activeStars })) + '">' + stars + "</span>"]);
  if (cat) tags.push(["cat", cat]);
  if (diet) tags.push(["diet", diet]);
  if (state.area) tags.push(["area", esc(state.area)]);
  const maxText = state.max ? "≤ " + symbolOf(state.max.cur) + Math.round(state.max.b).toLocaleString("en-GB") + (state.max.wine ? " + 🍷" : "") : "";
  if (state.max) tags.push(["max", esc(maxText)]);
  $("filtersCount").textContent = tags.length || "";
  $("activeTags").innerHTML = tags.map(([k, html]) =>
    '<button type="button" class="ftag' + (k === "area" || k === "max" ? " ftag-own" : "") + '" data-unfilter="' + k + '" aria-label="' + esc(t("removeFilter", { f: k === "stars" ? t("starsAria", { n: state.activeStars }) : k === "diet" ? dietLabel(state.diet) : k === "area" ? state.area : k === "max" ? maxText : (show && k === "show" ? show[1] : cuisineLabeller()(state.activeCat)) })) + '">' + html + '<span aria-hidden="true">×</span></button>').join("") +
    (tags.length ? '<button type="button" class="linkish fclear" data-unfilter="all">' + t("filtersClear") + "</button>" : "") +
    (savable() ? '<button type="button" class="linkish fsave" data-save-search=""><svg aria-hidden="true"><use href="#bell"/></svg>' + esc(t("saveSearch")) + "</button>" : "");
  $("activeTags").hidden = !tags.length;
  $("sheetDone").textContent = t("filtersShowN", { n });
}

// Computers: Show, Stars and Cuisine open as drop-downs. Phones: they sit in a panel that slides up.
const phoneWidth = matchMedia("(max-width: 720px)");
function closeDrops(except) {
  document.querySelectorAll(".filter-group.open").forEach((g) => {
    if (g === except) return;
    g.classList.remove("open"); g.querySelector(".fdrop-btn").setAttribute("aria-expanded", "false");
  });
}
function toggleDrop(g) {
  if (document.body.classList.contains("sheet-open")) return;
  const open = !g.classList.contains("open");
  closeDrops(g);
  g.classList.toggle("open", open);
  g.querySelector(".fdrop-btn").setAttribute("aria-expanded", String(open));
  if (open && g.dataset.group === "cuisine" && !$("cuisineQ").hidden) $("cuisineQ").focus();
}
function openSheet() {
  closeDrops();
  document.body.classList.add("sheet-open");
  $("fgroups").setAttribute("role", "dialog"); $("fgroups").setAttribute("aria-modal", "true");
  $("sheetBackdrop").hidden = false;
  $("filtersBtn").setAttribute("aria-expanded", "true");
  $("sheetClose").focus();
}
function closeSheet() {
  if (!document.body.classList.contains("sheet-open")) return;
  document.body.classList.remove("sheet-open");
  $("fgroups").removeAttribute("role"); $("fgroups").removeAttribute("aria-modal");
  $("sheetBackdrop").hidden = true;
  $("filtersBtn").setAttribute("aria-expanded", "false");
  $("filtersBtn").focus();
}
// A choice made in a computer drop-down closes it; in the phone panel the panel stays open until "Show … restaurants".
// (Checked before the click re-draws the buttons, which takes them out of the page.)
let choseInDrop = false;
document.addEventListener("click", (e) => { choseInDrop = !!e.target.closest(".fdrop-panel button"); }, true);
function choseFilter() { if (choseInDrop && !document.body.classList.contains("sheet-open")) closeDrops(); }
$("filtersBtn").addEventListener("click", openSheet);
$("sheetClose").addEventListener("click", closeSheet);
$("sheetDone").addEventListener("click", () => { closeSheet(); $("compare").scrollIntoView(); });
$("sheetBackdrop").addEventListener("click", closeSheet);
document.querySelectorAll(".fdrop-btn").forEach((b) => b.addEventListener("click", () => toggleDrop(b.closest(".filter-group"))));
$("cuisineQ").addEventListener("input", renderChips);
document.addEventListener("click", (e) => { if (e.target.isConnected && !e.target.closest(".filter-group")) closeDrops(); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (document.body.classList.contains("sheet-open")) { closeSheet(); return; }
  const g = document.querySelector(".filter-group.open");
  if (g) { closeDrops(); g.querySelector(".fdrop-btn").focus(); }
});
phoneWidth.addEventListener("change", () => { closeSheet(); closeDrops(); });

// ---------- Table ----------
function nameCell(r) {
  const initial = (nameOf(r).replace(/^(The|Restaurant)\s+/i, "")[0] || "?").toUpperCase();
  const thumb = '<span class="thumb" aria-hidden="true"' + (r.placeId && !r.status ? ' data-pid="' + esc(r.placeId) + '" data-name="' + esc(nameOf(r)) + '"' : "") + ">" + esc(initial) + "</span>";
  const alt = altNameOf(r);
  const pin = r.status === "closed" ? "" : '<a class="map" href="' + mapsUrl(r) + '" target="_blank" rel="noopener" aria-label="' + esc(t("findOnMaps", { name: nameOf(r) })) + '" title="' + esc(t("findOnMapsTitle")) + '"><svg aria-hidden="true"><use href="#pin"/></svg></a>';
  // The map pin stays on the line with the name's last word (or last character, for names without spaces) when the name wraps.
  const name = nameOf(r), cut = name.includes(" ") ? name.lastIndexOf(" ") + 1 : Math.max(name.length - 1, 0);
  return '<span class="name" role="cell">' + thumb + '<span class="name-text"><span class="nm-txt">' + esc(name.slice(0, cut)) + '<span class="nm-end">' + esc(name.slice(cut)) + pin + "</span></span>" +
    (alt ? '<span class="alt-name" lang="' + altLangOf(r) + '">' + esc(alt) + "</span>" : "") +
    (areaOf(r) ? '<span class="area">' + esc(areaOf(r)) + "</span>" : "") +
    (r.chef ? '<span class="chef-line">' + esc(t("chefLabel", { name: r.chef })) + "</span>" : "") +
    // A restaurant with its own page (build_restaurant_pages() in build.py) links to it.
    (r.page && !r.status ? '<a class="page-link" href="' + esc(r.page) + '">' + esc(t("rpLink")) + " " + fwdArrow() + "</a>" : "") +
    (r.status ? "" : (r.diets || []).some((d) => BADGES.some(([b]) => b === d)) ? '<span class="diet-badges">' + dietBadges(r) + "</span>" : "") +
    '<span class="credit"></span></span></span>';
}
// Phones: each restaurant is a two-line row (name and area · cuisine; stars and price) that opens to show the rest.
// On computers this cell is hidden and the full table shows instead.
function priceHtml(p, type, r, missing) {
  return p == null ? '<span class="num muted">–</span>' + (missing ? '<span class="note">' + t(missing) + "</span>" : "")
    : '<span class="num">' + money(p, r) + "</span>" + (type === "main" ? '<span class="note">' + t("perMain") + "</span>" : type === "spend" ? '<span class="note">' + t("typicalSpend") + "</span>" : "");
}
function summaryCell(r) {
  const former = !!r.status;
  const label = { lost: t("stLost"), closed: t("stClosed"), changed: t("stChanged") };
  const sub = former ? '<span class="status-pill status-' + esc(r.status) + '">' + (label[r.status] || label.changed) + "</span>" + esc(areaOf(r) || "")
    : (r.notice ? '<span class="notice">' + t("tempClosed") + "</span>" : "") + esc([areaOf(r), cuisineOf(r)].filter(Boolean).join(" · "));
  const right = former ? '<span class="sum-stars">' + starIcons(r.formerStars) + "</span>"
    : '<span class="sum-stars">' + (r.change ? '<span class="chg-' + (r.change === "down" ? "down" : "up") + '" aria-hidden="true">' + (r.change === "down" ? "▼" : "▲") + "</span>" : "") + starIcons(r.stars) + "</span>" +
      '<span class="sum-price">' + priceHtml(priceOf(r), typeOf(r), r, L() && r.noLunch ? "noLunch" : "notListed") + "</span>";
  return '<span class="sum-cell" role="cell"><button type="button" class="sum" data-row="' + esc(r.id) + '" aria-expanded="' + (state.openRow === r.id) + '">' +
    '<span class="sum-name" dir="auto">' + esc(nameOf(r)) + '</span><span class="sum-sub">' + sub + "</span>" + right + "</button></span>";
}
// Inside an opened row on phones: the cuisine (tap to show only that cuisine), Google Maps, "been there" and the report link.
const actsCell = (r) => '<span class="acts-cell" role="cell">' +
  (r.status ? '<span class="tag">' + esc(cuisineOf(r)) + "</span>" : '<button type="button" class="tag" data-cat="' + esc(r.cuisine) + '">' + esc(cuisineOf(r)) + "</button>") +
  (r.status === "closed" ? "" : '<a class="maps-pill" href="' + mapsUrl(r) + '" target="_blank" rel="noopener" aria-label="' + esc(t("findOnMaps", { name: nameOf(r) })) + '"><svg aria-hidden="true"><use href="#pin"/></svg>Google Maps</a>') +
  beenButton(r) + tripButton(r) + reportButton(r) + "</span>";
function toggleRow(btn) {
  const row = btn.closest(".row"), id = btn.dataset.row, before = row.getBoundingClientRect().top;
  const open = state.openRow !== id;
  document.querySelectorAll("#ledger .row.open").forEach((x) => { x.classList.remove("open"); x.querySelector(".sum").setAttribute("aria-expanded", "false"); });
  state.openRow = open ? id : null;
  row.classList.toggle("open", open);
  btn.setAttribute("aria-expanded", String(open));
  // Closing a row above this one would pull it up the screen, so keep it where the finger was.
  const moved = row.getBoundingClientRect().top - before;
  if (moved) window.scrollBy(0, moved);
  // The "tap a restaurant" hint goes once someone has opened one.
  if (open && !$("tapHint").hidden) { $("tapHint").hidden = true; store.set(PREFS_KEY, Object.assign(store.get(PREFS_KEY, {}), { tapHint: 1 })); }
}
if (store.get(PREFS_KEY, {}).tapHint) $("tapHint").hidden = true;
// A closed row opens from a tap anywhere on it (photo included) except its heart; an open one closes from its top line.
document.addEventListener("click", (e) => {
  const row = e.target.closest("#ledger .row"), b = row && row.querySelector(".sum");
  if (!b || !b.offsetParent) return;
  if (e.target.closest(".sum") || e.target === row || (!row.classList.contains("open") && !e.target.closest("a, button"))) toggleRow(b);
});

// ---------- Till receipt (phones) and torn-off stub (computers) ----------
const sep = '<span class="sr-only">, </span>';
// What a meal costs on its own: the figure, or why there isn't one.
function mealValue(r, meal) {
  const lunch = meal === "lunch";
  if (lunch && r.noLunch) return { muted: t("rcptDinnerOnly") };
  const n = shown(r, lunch ? r.lunch : r.dinner);
  if (n == null) return { muted: t("notListed") };
  const type = lunch ? (r.lunchType || "menu") : r.dinnerType;
  return { n, text: money(n, r), type, extra: type === "main" ? t("perMain") : type === "spend" ? t("typicalSpend") : "" };
}
// Where the price came from: the restaurant's website or a review (linked), or a member's report, checked against the
// restaurant's site before we used it, with the month they saw the price (sourceDate, e.g. "2026-10").
function srcHtml(r) {
  const type = srcTypeOf(r), url = srcOf(r);
  let label = type === "site" ? t("srcSite") : t("srcPress");
  if (type === "member") {
    const m = /^(\d{4})-(\d{2})/.exec((L() ? r.lunchSourceDate : r.sourceDate) || "");
    label = m ? t("srcMember", { d: new Date(+m[1], +m[2] - 1, 1).toLocaleDateString(locale(), { month: cjk() ? "numeric" : "short", year: "numeric" }) })
      : t("srcMember", { d: "" }).replace(/[\s,，:：（）()]+$/, "");
    if (!url) return ' <span class="src">' + esc(label) + "</span>";
  }
  return url && type !== "none" ? ' <a class="src" href="' + esc(url) + '" target="_blank" rel="noopener" title="' + esc(t("srcTitle")) + '">' + esc(label) + "</a>" : "";
}
// "Report a price or change": members tell us what they paid, or that it has closed or has a new chef (account.js, report.js).
const reportButton = (r) => r.status ? "" : '<button type="button" class="report-btn" data-report-id="' + esc(r.id) + '" data-report-name="' + esc(r.name) +
  '" data-report-cur="' + esc(r.cur) + '" data-report-meal="' + (L() ? "lunch" : "dinner") + '">' + esc(t("reportBtn")) + "</button>";
// "Add to a trip": a member puts the restaurant into one of their trips or lists (account.js, trips-add.js, /trips/).
const tripButton = (r) => r.status ? "" : '<button type="button" class="report-btn trip-btn" data-trip-add="' + esc(r.id) + '" data-trip-name="' + esc(r.name) + '">' + esc(t("tripAddBtn")) + "</button>";
function receiptLine(label, v, note, on) {
  const notes = [v.extra, note].filter(Boolean).join(" · ");
  return '<span class="rc-line' + (on ? " on" : "") + '"><span class="rc-k">' + esc(label) + '</span><span class="rc-dots" aria-hidden="true"></span>' +
    (v.dash ? '<span class="rc-v muted" aria-hidden="true">–</span>' : sep + '<span class="rc-v' + (v.muted ? " muted" : "") + '">' + esc(v.muted || v.text) + "</span>") +
    (notes ? sep + '<span class="rc-note">' + esc(notes) + "</span>" : "") + "</span>";
}
function receipt(r) {
  const meal = L() ? "lunch" : "dinner";
  const dinner = mealValue(r, "dinner"), lunch = mealValue(r, "lunch"), chosen = L() ? lunch : dinner;
  const wine = wineOf(r);
  const total = chosen.n != null && chosen.type === "menu" && wine ? chosen.n + wine : null;
  const src = srcHtml(r);
  const checked = PRICES_CHECKED.toLocaleDateString(locale(), { month: cjk() ? "numeric" : "short", year: "numeric" });
  return '<span class="receipt" role="cell"><span class="rc-paper">' +
    '<span class="rc-head" aria-hidden="true">' + esc(t("rcptHead")) + "</span>" +
    (r.notice ? '<span class="notice">' + t("tempClosed") + "</span>" : "") +
    receiptLine(t("mealDinner"), dinner, pick(r, "dinnerNote"), meal === "dinner") +
    receiptLine(t("mealLunch"), lunch, r.noLunch ? "" : pick(r, "lunchNote"), meal === "lunch") +
    receiptLine(t("hWine"), wine ? { text: money(wine, r) } : { dash: true }, wine ? "" : noWineNote(r), false) +
    (total != null ? '<span class="rc-line rc-total"><span class="rc-k">' + esc(t(L() ? "rcptLunchWine" : "rcptDinnerWine")) + '</span><span class="rc-dots" aria-hidden="true"></span>' + sep + '<span class="rc-v">' + money(total, r) + "</span></span>" : "") +
    '<span class="rc-foot">' + esc(t(serviceLabel(r.country))) + "<br>" + esc(t("rcptChecked", { d: checked })) + (src ? " ·" + src : "") + "</span>" +
    "</span></span>";
}
// The computer table's price column: the chosen meal's price on a cream stub, with the wine pairing under it.
function stub(r) {
  const v = mealValue(r, L() ? "lunch" : "dinner"), wine = wineOf(r);
  return '<span class="stub">' + (v.muted ? '<span class="stub-price muted">–</span><span class="stub-sub">' + esc(v.muted) + "</span>"
    : '<span class="stub-price">' + esc(v.text) + "</span>" + (v.extra ? '<span class="stub-sub">' + esc(v.extra) + "</span>" : "") +
      '<span class="stub-sub">' + (wine ? esc(t("rcptPlusWine", { p: money(wine, r) })) : esc(noWineNote(r))) + "</span>") + "</span>";
}
// Destination lists show their first 10 restaurants, then a button for the rest ("Show all 84 restaurants"), so the map,
// prices by stars and FAQ below stay in reach. Searching or any filter shows every match, as do lists of 12 or fewer.
// A long list is drawn in batches, one per frame, so a phone isn't asked to build France's 600 rows at once; the
// "No longer starred" rows and the "Show fewer" button follow the last batch.
const LIST_FOLD = 10, LIST_FOLD_MAX = 12, LEDGER_STEP = 40;
const nextFrame = (fn) => document.hidden ? setTimeout(fn, 0) : requestAnimationFrame(fn);  // frames pause in a hidden tab
const ledger = { rows: [], drawn: 0, key: "", expanded: false, job: 0 };
const narrowed = () => !!(state.query.trim() || state.activeStars || state.activeCat !== "All" || state.diet || state.wishOnly || state.changesOnly || state.beenOnly || state.area);
const foldable = () => !narrowed() && ledger.rows.length > LIST_FOLD_MAX;
const folded = () => foldable() && !ledger.expanded;
const ledgerTarget = () => folded() ? LIST_FOLD : ledger.rows.length;
function ledgerRow(r) {
  const on = onWishlist(r);
  return '<div class="row rc-row' + (L() && r.noLunch ? " nolunch" : "") + (state.openRow === r.id ? " open" : "") + '" role="row">' + summaryCell(r) + nameCell(r) +
    '<span class="cat" role="cell"><button type="button" class="tag" data-cat="' + esc(r.cuisine) + '" title="' + esc(t("showOnly", { cat: cuisineOf(r) })) + '">' + esc(cuisineOf(r)) + "</button></span>" +
    '<span class="stars-cell" role="cell">' + starIcons(r.stars) + changeBadge(r) + "</span>" +
    '<span class="rating-cell" role="cell"><span class="mlabel">' + t("hGoogle") + "</span>" + (r.rating ? '<span class="rating num' + (fewReviews(r) ? " few" : "") + '" aria-label="' + esc(t("ratingAria", { r: r.rating.toFixed(1) })) + '"><svg aria-hidden="true"><use href="#gstar"/></svg>' + r.rating.toFixed(1) + "</span>" + (r.reviews ? '<span class="note">' + t("reviews", { n: r.reviews.toLocaleString("en-GB") }) + fewNote(r) + "</span>" : "") : '<span class="num muted" aria-hidden="true">–</span><span class="note">' + t("noRating") + "</span>") + "</span>" +
    '<span class="notes" role="cell">' + (r.notice ? '<span class="notice">' + t("tempClosed") + "</span>" : "") + esc(noteOf(r) || "–") +
      srcHtml(r) + tripButton(r) + reportButton(r) + "</span>" +
    '<span class="dinner" role="cell"><span class="mlabel">' + t("hPrice") + "</span>" + stub(r) + "</span>" + receipt(r) + actsCell(r) +
    '<span class="wish-cell" role="cell">' + beenButton(r) + '<button type="button" class="wish" data-wish="' + esc(r.id) + '" aria-pressed="' + on + '" aria-label="' + esc(t(on ? "wishRemove" : "wishAdd", { name: nameOf(r) })) + '" title="' + esc(t(on ? "wishRemoveT" : "wishAddT")) + '">' + heart + "</button></span>" +
    "</div>";
}
function formerHtml(former) {
  if (!former.length) return "";
  const label = { lost: t("stLost"), closed: t("stClosed"), changed: t("stChanged") };
  return '<div class="row divider" role="row"><span role="cell"><strong>' + t("formerTitle") + '</strong><span class="note">' + t("formerNote") + "</span></span></div>" +
    former.sort((a, b) => nameOf(a).localeCompare(nameOf(b))).map((r) =>
      '<div class="row former' + (state.openRow === r.id ? " open" : "") + '" role="row">' + summaryCell(r) + nameCell(r) +
      '<span class="cat" role="cell"><span class="tag">' + esc(cuisineOf(r)) + "</span></span>" +
      '<span class="stars-cell" role="cell">' + starIcons(r.formerStars) + '<span class="note">' + t("formerly") + "</span></span>" +
      '<span class="rating-cell" role="cell"><span class="num muted">–</span></span>' +
      '<span class="notes" role="cell"><span class="status-pill status-' + esc(r.status) + '">' + (r.change === "down" ? "▼ " : "") + (label[r.status] || label.changed) + "</span>" + esc(pick(r, "statusNote")) + "</span>" +
      '<span class="dinner" role="cell"><span class="stub"><span class="stub-price muted">–</span></span></span>' +
      actsCell(r) + '<span class="wish-cell" role="cell">' + beenButton(r) + "</span></div>").join("");
}
// What follows the last row: the "Show all" button while folded, else the former restaurants and the "Show fewer" button.
function ledgerTail() {
  const btn = foldable() ? '<div class="ledger-more" role="row"><span role="cell"><button type="button" class="btn-line" id="ledgerMore" aria-controls="ledger" aria-expanded="' + !folded() + '">' +
    esc(folded() ? t("listAll", { n: ledger.rows.length }) : t("exploreFewer")) + "</button></span></div>" : "";
  return '<div class="ledger-tail" role="rowgroup">' + (folded() ? "" : formerHtml(formerRows())) + btn + "</div>";
}
// Adds the next batch of rows (and, after the last one, the tail), then asks for another frame until the list is complete.
function fillLedger(job) {
  if (job !== ledger.job) return;
  const end = Math.min(ledgerTarget(), ledger.drawn + LEDGER_STEP);
  $("ledger").insertAdjacentHTML("beforeend", ledger.rows.slice(ledger.drawn, end).map(ledgerRow).join("") + (end >= ledgerTarget() ? ledgerTail() : ""));
  ledger.drawn = end;
  observeThumbs();
  if (end < ledgerTarget()) nextFrame(() => fillLedger(job));
}
function toggleLedger() {
  ledger.expanded = folded();
  track("list-more", { open: ledger.expanded ? "all" : "fewer" });
  if (ledger.expanded) {
    // The new rows go on under the first ten, and keyboard focus moves to the first of them.
    const first = ledger.drawn;
    $("ledger").querySelector(".ledger-tail").remove();
    fillLedger(++ledger.job);
    const row = $("ledger").querySelectorAll(".rc-row")[first];
    const to = row && [...row.querySelectorAll("a[href], button")].find((el) => el.offsetParent);  // phones show .sum, computers the name's links
    if (to) to.focus({ preventScroll: true });
    return;
  }
  renderLedger();
  // Back to the top of the list, so the visitor isn't left where the long list ended: a jump to just below it (a long
  // glide past the footer is dizzying), then a short smooth scroll the rest of the way.
  const sec = $("compare"), top = sec.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(sec).scrollMarginTop) || 0);
  if (scrollY > top + innerHeight) window.scrollTo({ top: top + innerHeight, behavior: "instant" });
  window.scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  const btn = $("ledgerMore");
  if (btn) btn.focus({ preventScroll: true });
}
document.addEventListener("click", (e) => { if (e.target.closest("#ledgerMore")) toggleLedger(); });
function renderLedger() {
  const rows = filtered();
  ledger.rows = rows;
  // The same filters redraw as many rows at once as before (e.g. after ticking a heart far down the list), so the page
  // doesn't jump; new ones draw the first batch now and the rest a frame at a time.
  const key = [state.activeStars, state.activeCat, state.diet, state.wishOnly, state.changesOnly, state.beenOnly, state.area, state.query, state.sort].join("|");
  const keep = key === ledger.key ? ledger.drawn : 0;
  ledger.key = key;
  ledger.drawn = Math.min(ledgerTarget(), Math.max(keep, LEDGER_STEP));
  ledger.job++;
  let html = '<div class="row head" role="row"><span role="columnheader">' + t("hRestaurant") + '</span><span role="columnheader">' + t("hCuisine") + '</span><span role="columnheader">' + t("hStars") + '</span><span role="columnheader">' + t("hGoogle") + '</span><span role="columnheader">' + t(L() ? "hNotesLunch" : "hNotes") + '</span><span role="columnheader" style="text-align:right">' + t("hPrice") + '</span><span role="columnheader" class="sr-only">' + t("hWish") + "</span></div>";
  if (!rows.length && !EMPTY) {
    html += '<div class="empty">' + (state.wishOnly && !RESTAURANTS.some(onWishlist) ? t("emptyWish")
      : t("noMatch") + ' <button type="button" class="linkish" id="clearFilters">' + t("clearFilters") + "</button>") + "</div>";
  }
  html += rows.slice(0, ledger.drawn).map(ledgerRow).join("") + (ledger.drawn >= ledgerTarget() ? ledgerTail() : "");
  $("ledger").innerHTML = html;
  renderFilterSummary(rows.length);
  observeThumbs();
  if (ledger.drawn < ledgerTarget()) { const job = ledger.job; nextFrame(() => fillLedger(job)); }
  updateMap(true);
  renderLedgerFoot();
}
// The line under the list: how many are showing, "been there" progress and the wishlist note.
function renderLedgerFoot() {
  const former = formerRows();
  $("showing").textContent = t("showing", { a: ledger.rows.length, b: RESTAURANTS.length }) + (former.length ? t("showingFormer", { c: former.length }) : "") +
    (acctSignedIn() && RESTAURANTS.some(onBeen) ? " · " + t("beenProgress", { n: RESTAURANTS.filter(onBeen).length, total: RESTAURANTS.length }) : "");
  $("wishNote").innerHTML = acctSignedIn() ? esc(t("wishNoteIn"))
    : esc(t("wishNoteOut")) + ' <button type="button" class="linkish" data-signin="">' + esc(t("wishNoteSignIn")) + "</button>";
  if (state.wishlist.length >= 2) $("wishNote").insertAdjacentHTML("beforeend", ' · <a href="/compare/">' + esc(t("wishCompare")) + " →</a>");
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
    return '<div class="tier"><div class="top"><h3>' + names[x.s - 1] + "</h3>" + starIcons(x.s) + "</div>" +
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
  document.querySelectorAll(".thumb[data-pid]:not([data-watched])").forEach((el) => { el.dataset.watched = "1"; thumbObserver.observe(el); });
}

const mapState = { map: null, info: null, markers: new Map(), lost: new Map(), near: null };
function infoHtml(r) {
  const price = priceOf(r) == null ? t(L() && r.noLunch ? "noLunch" : "infoNoPrice") : money(priceOf(r), r) + " " + (typeOf(r) === "main" ? t("perMain") : typeOf(r) === "spend" ? t("typicalSpend") : t(L() ? "infoLunch" : "infoDinner"));
  return '<div style="font-family:Figtree,system-ui,sans-serif;color:#12261C;max-width:240px;line-height:1.4">' +
    '<div style="font-weight:700;font-size:15px">' + esc(nameOf(r)) + "</div>" +
    (altNameOf(r) ? '<div style="font-size:12px;color:#5A6E62">' + esc(altNameOf(r)) + "</div>" : "") +
    '<div style="color:#B3862B;font-size:13px">' + "✱".repeat(r.stars) + ' <span style="color:#5A6E62">' + esc(cuisineOf(r)) + " · " + esc(areaOf(r)) + "</span></div>" +
    (r.chef ? '<div style="font-size:12px;color:#5A6E62">' + esc(t("chefLabel", { name: r.chef })) + "</div>" : "") +
    (BADGES.some(([d]) => (r.diets || []).includes(d)) ? '<div style="font-size:12px;color:#1E6142;font-weight:600;margin-top:2px">🌿 ' + BADGES.filter(([d]) => r.diets.includes(d) && !(d === "vegetarian-menu" && r.diets.includes("vegetarian-only"))).map(([, , full]) => esc(t(full))).join(" · ") + "</div>" : "") +
    '<div style="margin-top:6px;font-size:13px">' + esc(price) + (wineOf(r) ? " · " + t("infoWine") + " " + money(wineOf(r), r) : "") + "</div>" +
    (r.rating ? '<div style="font-size:13px;color:#5A6E62">★ ' + r.rating.toFixed(1) + " " + t("infoGoogle") + (fewReviews(r) ? ' · <span title="' + esc(t("fewTitle")) + '">' + esc(t("fewReviews")) + "</span>" : "") + "</div>" : "") +
    (r.change ? '<div style="font-size:12px;color:' + (r.change === "down" ? "#A33A2E" : "#1E6142") + '">' + esc(pick(r, "changeNote") + ", " + monthYear(r.changeDate)) + "</div>" : "") +
    '<a href="' + mapsUrl(r) + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;color:#1E6142;font-weight:600;font-size:13px">' + t("infoOpen") + "</a></div>";
}
function lostInfoHtml(r) {
  const label = { lost: t("stLost"), changed: t("stChanged") };
  return '<div style="font-family:Figtree,system-ui,sans-serif;color:#12261C;max-width:240px;line-height:1.4">' +
    '<div style="font-weight:700;font-size:15px">' + esc(nameOf(r)) + "</div>" +
    (altNameOf(r) ? '<div style="font-size:12px;color:#5A6E62">' + esc(altNameOf(r)) + "</div>" : "") +
    '<div style="color:#8B938E;font-size:13px">' + "✱".repeat(r.formerStars) + ' <span style="color:#5A6E62">' + esc(t("formerly")) + " · " + esc(cuisineOf(r)) + " · " + esc(areaOf(r)) + "</span></div>" +
    '<div style="margin-top:6px;font-size:13px"><strong style="color:#A33A2E">' + esc(label[r.status] || label.changed) + "</strong>" +
    (pick(r, "statusNote") ? " · " + esc(pick(r, "statusNote")) : "") + "</div>" +
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
    FORMER.filter(lostPin).forEach((r) => {
      const m = new Marker({ position: { lat: r.lat, lng: r.lng }, title: nameOf(r), icon: pinIcon(r.formerStars, false, true), zIndex: 1 });
      m.addListener("click", () => { mapState.info.setContent(lostInfoHtml(r)); mapState.info.open({ anchor: m, map: mapState.map }); });
      mapState.lost.set(r.id, m);
    });
    // "Near me" looks among the pins the filters are showing; if none is close, it points to the world map instead.
    mapState.near = addNearMe(mapState.map, () => placed.filter((r) => mapState.markers.get(r.id).getMap()).map((r) => ({
      lat: r.lat, lng: r.lng, stars: r.stars, name: () => nameOf(r),
      open: () => { const m = mapState.markers.get(r.id); mapState.map.setCenter(m.getPosition()); if (mapState.map.getZoom() < 15) mapState.map.setZoom(15); google.maps.event.trigger(m, "click"); }
    })), { radius: 30000, far: "/near-me/?locate=1" });
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
  // Grey pins follow the "No longer starred" rows, but don't count towards "Showing n" or the framing.
  const former = new Set(formerRows().map((r) => r.id));
  mapState.lost.forEach((m, id) => m.setMap(former.has(id) ? mapState.map : null));
  mapState.info.close();
  $("mapStatus").textContent = n ? t("mapShowing", { n }) : t("mapNone");
  if (fit && n > 1) mapState.map.fitBounds(bounds, 40);
  else if (fit && n === 1) { mapState.map.setCenter(bounds.getCenter()); mapState.map.setZoom(15); }
}
function startMapWhenNear() {
  $("map").hidden = $("mapNav").hidden = !GOOGLE_MAPS_API_KEY || EMPTY;
  if (!GOOGLE_MAPS_API_KEY || EMPTY) return;
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
function render() { renderMealFilter(); renderShowFilter(); renderStarFilter(); renderChips(); renderDietFilter(); renderLedger(); }
function renderAll() { applyStatic(); render(); renderFigures(); renderTiers(); renderLegend(RESTAURANTS); if (FORMER.some(lostPin)) $("mapLegend").insertAdjacentHTML("beforeend", legendLost()); }

let toastTimer;
// `act` adds a second button, { label, run }, e.g. "Add to diary" after ticking "been there"; the toast then stays a little longer.
function toast(msg, undo, act) {
  state.lastUndo = undo;
  state.toastAct = act ? act.run : null;
  $("toastMsg").textContent = msg;
  $("undo").hidden = !undo;
  $("toastAct").hidden = !act;
  if (act) $("toastAct").textContent = act.label;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; state.lastUndo = null; state.toastAct = null; }, act ? 8000 : 5000);
}
// The ✓ next to the heart. Signed out, it offers a free account instead (account.js).
function beenButton(r) {
  const on = onBeen(r);
  return '<button type="button" class="been" data-been="' + esc(r.id) + '" aria-pressed="' + on + '" aria-label="' + esc(t(on ? "beenRemove" : "beenAdd", { name: nameOf(r) })) +
    '" title="' + esc(t(on ? "beenRemoveT" : "beenAddT")) + '"><svg aria-hidden="true"><use href="#check"/></svg><span class="been-lbl" aria-hidden="true">' + esc(t("been")) + "</span></button>";
}
// Ticking a heart or "been there" redraws just that row where the list itself doesn't change (France's full list takes a
// phone over a second to redraw), and keeps keyboard focus on the button.
function renderRow(id, sel) {
  const sum = [...document.querySelectorAll("#ledger .rc-row .sum")].find((b) => b.dataset.row === id);
  const r = RESTAURANTS.find((x) => x.id === id);
  if (!sum || !r || state.wishOnly || state.beenOnly) return render();
  const row = sum.closest(".row"), had = row.contains(document.activeElement);
  row.insertAdjacentHTML("afterend", ledgerRow(r));
  const fresh = row.nextElementSibling;
  row.remove();
  renderShowFilter(); renderLedgerFoot(); observeThumbs();
  const btn = had && [...fresh.querySelectorAll(sel)].find((b) => b.offsetParent);
  if (btn) btn.focus();
}
// Ticking off the 1st, 5th, 10th, 25th, 50th or 100th starred restaurant says so, in languages that have the words
// (others keep the plain message); the account page has the full stats and badges.
const BEEN_MILESTONES = [1, 5, 10, 25, 50, 100];
function beenMilestone() {
  const n = Object.keys(state.visited).length, key = n === 1 ? "toastBeenFirst" : "toastBeenN";
  const has = (I18N[LANG] && I18N[LANG][key]) || (LANG === "yue" && I18N.zh[key]);
  return BEEN_MILESTONES.includes(n) && has ? key : "toastBeen";
}
function toggleBeen(id) {
  const r = ALL_RESTAURANTS.find((x) => x.id === id);
  const was = onBeen(r);
  if (!toggleVisited(id)) return;
  state.visited = loadVisited();
  toast(t(was ? "toastNotBeen" : beenMilestone(), { name: nameOf(r), n: Object.keys(state.visited).length }), () => { toggleVisited(id); state.visited = loadVisited(); },
    was ? null : { label: t("diaryAdd"), run: () => openDiary(id, { name: nameOf(r), cur: r.cur }) });
  renderRow(id, ".been");
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
  save(); renderRow(id, ".wish");
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
    if (setLang(el.dataset.lang)) return;  // each language has its own address, which is now opening
    renderAll();
    if (mapState.map) { mapState.markers.forEach((m, id) => m.setTitle(nameOf(RESTAURANTS.find((r) => r.id === id)))); }
    if (mapState.near) mapState.near.relabel();
    $("jumpMap").setAttribute("aria-label", t("jumpMapAria"));
  } else if (el.dataset.explore) {
    const gi = Number(el.dataset.explore);
    if (state.exploreOpen.has(gi)) state.exploreOpen.delete(gi); else state.exploreOpen.add(gi);
    applyStatic();
  } else if (el.dataset.meal) {
    state.meal = el.dataset.meal; save(); renderAll();
  } else if (el.dataset.currency) {
    state.currency = el.dataset.currency; save(); renderAll(); prefChosen("currency", state.currency);
  } else if (el.dataset.wish) {
    toggleWish(el.dataset.wish);
  } else if (el.dataset.been) {
    toggleBeen(el.dataset.been);
  } else if (el.dataset.show) {
    state.wishOnly = el.dataset.show === "wishlist"; state.changesOnly = el.dataset.show === "changes"; state.beenOnly = el.dataset.show === "been"; render(); choseFilter();
  } else if (el.dataset.stars) {
    state.activeStars = Number(el.dataset.stars); render(); choseFilter();
  } else if (el.dataset.diet != null) {
    state.diet = el.dataset.diet; render(); choseFilter();
  } else if (el.dataset.unfilter) {
    const k = el.dataset.unfilter;
    if (k === "show" || k === "all") { state.wishOnly = false; state.changesOnly = false; state.beenOnly = false; }
    if (k === "stars" || k === "all") state.activeStars = 0;
    if (k === "cat" || k === "all") state.activeCat = "All";
    if (k === "diet" || k === "all") state.diet = "";
    if (k === "area" || k === "all") state.area = "";
    if (k === "max" || k === "all") state.max = null;
    render();
  } else if (el.id === "clearFilters") {
    state.activeStars = 0; state.activeCat = "All"; state.diet = ""; state.wishOnly = false; state.changesOnly = false; state.beenOnly = false; state.area = ""; state.max = null; state.query = ""; $("q").value = ""; render();
  } else if (el.dataset.cat) {
    state.activeCat = el.dataset.cat; $("cuisineQ").value = ""; render(); choseFilter();
    if (el.classList.contains("tag")) $("compare").scrollIntoView();
  } else if (el.id === "toastAct") {
    const run = state.toastAct;
    $("toast").hidden = true; state.toastAct = null; state.lastUndo = null;
    if (run) run();
  } else if (el.id === "undo") {
    if (state.lastUndo) { state.lastUndo(); state.lastUndo = null; save(); render(); }
    $("toast").hidden = true;
  }
});
// "By cuisine" and "By neighbourhood" (build.py browse_html()): each link shows just those restaurants in the list, every
// other filter cleared so it matches the count beside the link, then scrolls up to the list (#compare, the link's address without scripts).
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-browse]");
  if (!a) return;
  e.preventDefault();
  state.activeStars = 0; state.diet = ""; state.wishOnly = false; state.changesOnly = false; state.beenOnly = false; state.query = ""; $("q").value = "";
  state.activeCat = a.dataset.browse === "cuisine" ? a.dataset.value : "All";
  state.area = a.dataset.browse === "area" ? a.dataset.value : "";
  state.max = null;
  render();
  $("compare").scrollIntoView();
  track("browse", { by: a.dataset.browse });
});
$("q").addEventListener("input", (e) => { state.query = e.target.value; renderLedger(); });
wireSearchClear($("q"), () => { state.query = ""; renderLedger(); });
$("sort").addEventListener("change", (e) => { state.sort = e.target.value; save(); renderLedger(); });
$("currencyPick").addEventListener("change", (e) => { state.currency = e.target.value; save(); renderAll(); track("currency", { currency: state.currency }); prefChosen("currency", state.currency); });
$("contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("cName").value.trim(), msg = $("cMsg").value.trim(), topic = $("cTopic");
  $("cNameErr").textContent = name ? "" : t("errName");
  $("cMsgErr").textContent = msg ? "" : t("errMsg");
  if (!name || !msg) { $("formStatus").textContent = ""; return; }
  // No server to send it, so it opens the visitor's own email app with the message filled in.
  const subject = topic.options[topic.selectedIndex].text + " · The Starred Bill";
  const body = msg + "\n\n" + name + "\n" + location.origin + location.pathname;
  location.href = "mailto:hello@starredbill.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  $("formStatus").textContent = t("sent", { name });
  track("contact", { topic: topic.value });
});
// Keep the header count right when the wishlist changes in another tab.
window.addEventListener("storage", (e) => { if (e.key === WISHLIST_KEY || e.key === VISITED_KEY) { state.wishlist = loadWishlist(); state.visited = loadVisited(); render(); } });
// The account brought lists down, or someone signed in or out.
const refreshLists = (e) => { if (e.type === "sb:account" || e.detail.from === "sync") { state.wishlist = loadWishlist(); state.visited = loadVisited(); if (!acctSignedIn()) state.beenOnly = false; render(); } };
["sb:wishlist", "sb:visited", "sb:account"].forEach((ev) => window.addEventListener(ev, refreshLists));

// ---------- Start ----------
// The full list build.py wrote into the page for search engines stays in it, out of sight, when the folded list is drawn.
(() => {
  const pre = document.querySelector("#ledger .prerender");
  if (!pre) return;
  const keep = document.createElement("div");
  keep.hidden = true;
  keep.appendChild(pre);
  $("ledger").after(keep);
})();
load();
$("sort").value = state.sort;
$("q").value = state.query;
renderAll();
if (state.query) $("compare").scrollIntoView();
// A link to one restaurant (e.g. /uk/england/london/#r=core-by-clare-smyth, from a guide's table) opens its row in the list.
function openFromHash() {
  const m = location.hash.match(/^#r=(.+)$/);
  const id = m && decodeURIComponent(m[1]);
  if (!id || !ALL_RESTAURANTS.some((r) => r.id === id)) return;
  state.openRow = id;
  // The whole list is drawn at once, so the row (or a former restaurant after the last one) is there to scroll to.
  ledger.expanded = true;
  ledger.drawn = ledger.rows.length;
  renderLedger();
  // The list is redrawn when exchange rates arrive, so the row is looked up afresh each time.
  const row = () => { const b = [...document.querySelectorAll("#ledger .sum")].find((x) => x.dataset.row === id); return b && b.closest(".row"); };
  const go = () => { const r = row(); if (r) { r.classList.add("linked"); r.scrollIntoView({ block: "center", behavior: "instant" }); } };  // not smooth: a long smooth scroll gets cut short as the page loads
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  go();
  // Again once the page has finished loading, as fonts and pictures above it move it down; then the highlight fades.
  if (document.readyState !== "complete") window.addEventListener("load", () => setTimeout(go, 50), { once: true });
  setTimeout(() => { const r = row(); if (r) r.classList.remove("linked"); }, 3000);
}
openFromHash();
window.addEventListener("hashchange", openFromHash);
if (EMPTY) {
  document.body.classList.add("empty-page");
  $("stars").hidden = true;
  document.querySelector('.nav a[href="#stars"]').hidden = true;
  $("compare").hidden = !FORMER.length;
  document.querySelector('.nav a[href="#compare"]').hidden = !FORMER.length;
}
startMapWhenNear();
wireJumpToMap();
loadRates();
