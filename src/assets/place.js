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
pageVars = () => ({ place: pick(PAGE, "name"), placeIn: cjk() || ko() ? pick(PAGE, "name") : PAGE["inSentence" + (LANGS[LANG].suffixes[0] || "")] || PAGE.inSentence || PAGE.name });

const EXPLORE_SHOWN = 6;
const state = { openRow: null, exploreOpen: new Set(), meal: "dinner", activeCat: "All", activeStars: 0, diet: "", wishOnly: false, changesOnly: false, beenOnly: false, visited: {}, query: params.get("q") || "", sort: "price-asc", wishlist: [], lastUndo: null,
  currency: PAGE.currency, rates: Object.fromEntries(Object.entries(DATA.currencies).map(([k, v]) => [k, v.perUSD])), rateDate: new Date(DATA.rateDate + "T12:00:00Z") };

// ---------- Helpers ----------
const cityNameOf = (r) => pick(r, "cityName");
const areaOf = (r) => {
  const a = pick(r, "area");
  // Restaurants listed under a region or country (e.g. England) already name their town in the area.
  if (!PAGE.showCity || (r.cityType && r.cityType !== "city" && r.cityType !== "district" && a)) return a;
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

function load() {
  const prefs = store.get(PREFS_KEY, {});
  if (prefs.sort) state.sort = prefs.sort;
  if (prefs.meal === "lunch") state.meal = "lunch";
  const saved = (prefs.currency || {})[PAGE.currency];
  if (saved && currencyOptions.includes(saved)) state.currency = saved;
  state.wishlist = loadWishlist();
  state.visited = loadVisited();
}
function save() {
  const prefs = store.get(PREFS_KEY, {});
  prefs.sort = state.sort;
  prefs.meal = state.meal;
  prefs.currency = Object.assign({}, prefs.currency, { [PAGE.currency]: state.currency });
  store.set(PREFS_KEY, prefs);
  setWishlist(state.wishlist);
}

// The "No longer starred" rows, shown only when no star or wishlist filter is on; the recent ones also get grey map pins.
const formerRows = () => state.activeStars || state.wishOnly ? [] : FORMER.filter((r) => (!state.changesOnly || r.change) && (state.activeCat === "All" || r.cuisine === state.activeCat) && queryMatch(r));
function filtered() {
  const rows = RESTAURANTS.filter((r) => starMatch(r) && wishMatch(r) && dietMatch(r) && (state.activeCat === "All" || r.cuisine === state.activeCat) && queryMatch(r));
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
  if (intro || lead) $("heroText").innerHTML = (lead ? esc(lead) : t("heroText")) + (intro ? " " + esc(intro) : "");
  if (EMPTY) {
    const up = PAGE.crumbs.slice().reverse().find((c) => c.n);
    $("heroText").innerHTML = esc(t("emptyPlace")) + (up ? '<br><a class="empty-up" href="' + placeHref(up) + '">' + esc(t("emptySee", { n: up.n, name: pick(up, "name") })) + " " + fwdArrow() + "</a>" : "");
    document.querySelector('[data-i18n="compareTitle"]').textContent = t("formerTitle");
    document.querySelector('[data-i18n="compareText"]').textContent = t("formerNote");
  }
  [["m1Text", "serviceText"], ["m2Text", "sourcesText"], ["m3Text", "starsText"]].forEach(([key, field]) => {
    const own = pick(PAGE, field);
    if (own) document.querySelector('[data-i18n="' + key + '"]').textContent = own;
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
  RESTAURANTS.forEach((r) => { counts[r.cuisine] = (counts[r.cuisine] || 0) + (starMatch(r) && wishMatch(r) && dietMatch(r) ? 1 : 0); });
  const coll = new Intl.Collator(locale());
  const label = cuisineLabeller();
  const cats = Object.keys(counts).sort((a, b) => coll.compare(label(a), label(b)));
  // A search box helps once the list is long; it narrows the chips, not the restaurants.
  $("cuisineQ").hidden = cats.length < 12;
  const q = $("cuisineQ").hidden ? "" : fold($("cuisineQ").value.trim());
  const total = RESTAURANTS.filter((r) => starMatch(r) && wishMatch(r) && dietMatch(r)).length;
  let html = q ? "" : '<span class="chip all' + (state.activeCat === "All" ? " active" : "") + '"><button type="button" data-cat="All" aria-pressed="' + (state.activeCat === "All") + '">' + t("all") + '<span class="count">' + total + "</span></button></span>";
  cats.forEach((c) => {
    if (q && !fold(label(c)).includes(q) && !fold(c).includes(q)) return;
    const on = state.activeCat === c;
    html += '<span class="chip' + (on ? " active" : "") + (counts[c] ? "" : " zero") + '"><button type="button" data-cat="' + esc(c) + '" aria-pressed="' + on + '">' + esc(label(c)) + '<span class="count">' + counts[c] + "</span></button></span>";
  });
  $("chips").innerHTML = html;
}
function renderDietFilter() {
  const base = RESTAURANTS.filter((r) => starMatch(r) && wishMatch(r) && (state.activeCat === "All" || r.cuisine === state.activeCat));
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
  $("filtersCount").textContent = tags.length || "";
  $("activeTags").innerHTML = tags.map(([k, html]) =>
    '<button type="button" class="ftag" data-unfilter="' + k + '" aria-label="' + esc(t("removeFilter", { f: k === "stars" ? t("starsAria", { n: state.activeStars }) : k === "diet" ? dietLabel(state.diet) : (show && k === "show" ? show[1] : cuisineLabeller()(state.activeCat)) })) + '">' + html + '<span aria-hidden="true">×</span></button>').join("") +
    (tags.length ? '<button type="button" class="linkish fclear" data-unfilter="all">' + t("filtersClear") + "</button>" : "");
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
// Inside an opened row on phones: the cuisine (tap to show only that cuisine), Google Maps and "been there".
const actsCell = (r) => '<span class="acts-cell" role="cell">' +
  (r.status ? '<span class="tag">' + esc(cuisineOf(r)) + "</span>" : '<button type="button" class="tag" data-cat="' + esc(r.cuisine) + '">' + esc(cuisineOf(r)) + "</button>") +
  (r.status === "closed" ? "" : '<a class="maps-pill" href="' + mapsUrl(r) + '" target="_blank" rel="noopener" aria-label="' + esc(t("findOnMaps", { name: nameOf(r) })) + '"><svg aria-hidden="true"><use href="#pin"/></svg>Google Maps</a>') +
  beenButton(r) + "</span>";
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
  const src = srcOf(r) && srcTypeOf(r) !== "none" ? ' <a class="src" href="' + esc(srcOf(r)) + '" target="_blank" rel="noopener" title="' + esc(t("srcTitle")) + '">' + (srcTypeOf(r) === "site" ? t("srcSite") : t("srcPress")) + "</a>" : "";
  const checked = PRICES_CHECKED.toLocaleDateString(locale(), { month: cjk() ? "numeric" : "short", year: "numeric" });
  return '<span class="receipt" role="cell"><span class="rc-paper">' +
    '<span class="rc-head" aria-hidden="true">' + esc(t("rcptHead")) + "</span>" +
    (r.notice ? '<span class="notice">' + t("tempClosed") + "</span>" : "") +
    receiptLine(t("mealDinner"), dinner, pick(r, "dinnerNote"), meal === "dinner") +
    receiptLine(t("mealLunch"), lunch, r.noLunch ? "" : pick(r, "lunchNote"), meal === "lunch") +
    receiptLine(t("hWine"), wine ? { text: money(wine, r) } : { dash: true }, wine ? "" : t("rcptNoPairing"), false) +
    (total != null ? '<span class="rc-line rc-total"><span class="rc-k">' + esc(t(L() ? "rcptLunchWine" : "rcptDinnerWine")) + '</span><span class="rc-dots" aria-hidden="true"></span>' + sep + '<span class="rc-v">' + money(total, r) + "</span></span>" : "") +
    '<span class="rc-foot">' + esc(t(serviceLabel(r.country))) + "<br>" + esc(t("rcptChecked", { d: checked })) + (src ? " ·" + src : "") + "</span>" +
    "</span></span>";
}
// The computer table's price column: the chosen meal's price on a cream stub, with the wine pairing under it.
function stub(r) {
  const v = mealValue(r, L() ? "lunch" : "dinner"), wine = wineOf(r);
  return '<span class="stub">' + (v.muted ? '<span class="stub-price muted">–</span><span class="stub-sub">' + esc(v.muted) + "</span>"
    : '<span class="stub-price">' + esc(v.text) + "</span>" + (v.extra ? '<span class="stub-sub">' + esc(v.extra) + "</span>" : "") +
      '<span class="stub-sub">' + (wine ? esc(t("rcptPlusWine", { p: money(wine, r) })) : esc(t("rcptNoPairing"))) + "</span>") + "</span>";
}
// Long lists (France has over 600 restaurants) are drawn in batches as they scroll into view, so a phone isn't asked
// to build them all at once. The "No longer starred" rows follow the last batch.
const LEDGER_STEP = 40;
const ledger = { rows: [], shown: 0, key: "" };
function ledgerRow(r) {
  const on = onWishlist(r);
  return '<div class="row rc-row' + (L() && r.noLunch ? " nolunch" : "") + (state.openRow === r.id ? " open" : "") + '" role="row">' + summaryCell(r) + nameCell(r) +
    '<span class="cat" role="cell"><button type="button" class="tag" data-cat="' + esc(r.cuisine) + '" title="' + esc(t("showOnly", { cat: cuisineOf(r) })) + '">' + esc(cuisineOf(r)) + "</button></span>" +
    '<span class="stars-cell" role="cell">' + starIcons(r.stars) + changeBadge(r) + "</span>" +
    '<span class="rating-cell" role="cell"><span class="mlabel">' + t("hGoogle") + "</span>" + (r.rating ? '<span class="rating num" aria-label="' + esc(t("ratingAria", { r: r.rating.toFixed(1) })) + '"><svg aria-hidden="true"><use href="#gstar"/></svg>' + r.rating.toFixed(1) + "</span>" + (r.reviews ? '<span class="note">' + t("reviews", { n: r.reviews.toLocaleString("en-GB") }) + "</span>" : "") : '<span class="num muted" aria-hidden="true">–</span><span class="note">' + t("noRating") + "</span>") + "</span>" +
    '<span class="notes" role="cell">' + (r.notice ? '<span class="notice">' + t("tempClosed") + "</span>" : "") + esc(noteOf(r) || "–") +
      (srcOf(r) && srcTypeOf(r) !== "none" ? ' <a class="src" href="' + esc(srcOf(r)) + '" target="_blank" rel="noopener" title="' + esc(t("srcTitle")) + '">' + (srcTypeOf(r) === "site" ? t("srcSite") : t("srcPress")) + "</a>" : "") + "</span>" +
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
// What follows the drawn rows: a button for the next batch (also pressed by scrolling near it), or the former ones.
const ledgerTail = () => ledger.rows.length > ledger.shown
  ? '<div class="empty ledger-more" role="row"><span role="cell"><button type="button" class="btn-line" id="ledgerMore">+ ' + esc(t("exploreMore", { n: ledger.rows.length - ledger.shown })) + "</button></span></div>"
  : formerHtml(formerRows());
function moreLedger() {
  const more = document.querySelector("#ledger .ledger-more");
  if (!more) return;
  const from = ledger.shown;
  ledger.shown += LEDGER_STEP * 2;
  more.insertAdjacentHTML("beforebegin", ledger.rows.slice(from, ledger.shown).map(ledgerRow).join(""));
  more.insertAdjacentHTML("afterend", ledgerTail());
  more.remove();
  observeThumbs();
  watchLedgerEnd();
}
const ledgerEnd = "IntersectionObserver" in window ? new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) moreLedger(); }, { rootMargin: "800px 0px" }) : null;
function watchLedgerEnd() {
  if (!ledgerEnd) return;
  ledgerEnd.disconnect();
  const more = $("ledgerMore");
  if (more) ledgerEnd.observe(more);
}
document.addEventListener("click", (e) => { if (e.target.closest("#ledgerMore")) moreLedger(); });
function renderLedger() {
  const rows = filtered();
  // The same filters keep as many rows drawn as before (e.g. after ticking a heart far down the list); new ones start again.
  const key = [state.activeStars, state.activeCat, state.diet, state.wishOnly, state.changesOnly, state.beenOnly, state.query, state.sort].join("|");
  if (key !== ledger.key) { ledger.key = key; ledger.shown = LEDGER_STEP; }
  ledger.rows = rows;
  let html = '<div class="row head" role="row"><span role="columnheader">' + t("hRestaurant") + '</span><span role="columnheader">' + t("hCuisine") + '</span><span role="columnheader">' + t("hStars") + '</span><span role="columnheader">' + t("hGoogle") + '</span><span role="columnheader">' + t(L() ? "hNotesLunch" : "hNotes") + '</span><span role="columnheader" style="text-align:right">' + t("hPrice") + '</span><span role="columnheader" class="sr-only">' + t("hWish") + "</span></div>";
  if (!rows.length && !EMPTY) {
    html += '<div class="empty">' + (state.wishOnly && !RESTAURANTS.some(onWishlist) ? t("emptyWish")
      : t("noMatch") + ' <button type="button" class="linkish" id="clearFilters">' + t("clearFilters") + "</button>") + "</div>";
  }
  html += rows.slice(0, ledger.shown).map(ledgerRow).join("") + ledgerTail();
  const former = formerRows();
  $("ledger").innerHTML = html;
  renderFilterSummary(rows.length);
  observeThumbs();
  watchLedgerEnd();
  updateMap(true);
  $("showing").textContent = t("showing", { a: rows.length, b: RESTAURANTS.length }) + (former.length ? t("showingFormer", { c: former.length }) : "") +
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
    (r.rating ? '<div style="font-size:13px;color:#5A6E62">★ ' + r.rating.toFixed(1) + " " + t("infoGoogle") + "</div>" : "") +
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
function toast(msg, undo) {
  state.lastUndo = undo;
  $("toastMsg").textContent = msg;
  $("undo").hidden = !undo;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; state.lastUndo = null; }, 5000);
}
// The ✓ next to the heart. Signed out, it offers a free account instead (account.js).
function beenButton(r) {
  const on = onBeen(r);
  return '<button type="button" class="been" data-been="' + esc(r.id) + '" aria-pressed="' + on + '" aria-label="' + esc(t(on ? "beenRemove" : "beenAdd", { name: nameOf(r) })) +
    '" title="' + esc(t(on ? "beenRemoveT" : "beenAddT")) + '"><svg aria-hidden="true"><use href="#check"/></svg><span class="been-lbl" aria-hidden="true">' + esc(t("been")) + "</span></button>";
}
function toggleBeen(id) {
  const r = ALL_RESTAURANTS.find((x) => x.id === id);
  const was = onBeen(r);
  if (!toggleVisited(id)) return;
  state.visited = loadVisited();
  toast(t(was ? "toastNotBeen" : "toastBeen", { name: nameOf(r) }), () => { toggleVisited(id); state.visited = loadVisited(); });
  render();
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
    state.currency = el.dataset.currency; save(); renderAll();
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
    render();
  } else if (el.id === "clearFilters") {
    state.activeStars = 0; state.activeCat = "All"; state.diet = ""; state.wishOnly = false; state.changesOnly = false; state.beenOnly = false; state.query = ""; $("q").value = ""; render();
  } else if (el.dataset.cat) {
    state.activeCat = el.dataset.cat; $("cuisineQ").value = ""; render(); choseFilter();
    if (el.classList.contains("tag")) $("compare").scrollIntoView();
  } else if (el.id === "undo") {
    if (state.lastUndo) { state.lastUndo(); state.lastUndo = null; save(); render(); }
    $("toast").hidden = true;
  }
});
$("q").addEventListener("input", (e) => { state.query = e.target.value; renderLedger(); });
wireSearchClear($("q"), () => { state.query = ""; renderLedger(); });
$("sort").addEventListener("change", (e) => { state.sort = e.target.value; save(); renderLedger(); });
$("currencyPick").addEventListener("change", (e) => { state.currency = e.target.value; save(); renderAll(); track("currency", { currency: state.currency }); });
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
  const at = ledger.rows.findIndex((r) => r.id === id);
  ledger.shown = Math.max(ledger.shown, at < 0 ? ledger.rows.length : at + 1);  // former restaurants follow the last row
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
