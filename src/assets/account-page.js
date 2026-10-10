// The account page: what you've ticked off (stats, milestones, progress by destination), your dining diary (the
// restaurants you've been to, newest first, with the date, what you paid, the menu and your private notes), your wishlist
// (with notes), your preferences (home city, currency, dietary needs) and your data (download, sign out, delete).
// account.js does the signing in, keeps the preferences with the account and runs the diary window.

// The restaurants come from /data/account.json (build_account_pages() in build.py), fetched only once someone is signed in:
// one row of values each, with the place it sits in given as a number in the file's list of places.
let byId = null, loading = null, loadFailed = false;
function loadRestaurants() {
  if (!loading) loading = getData(DATA.accountUrl).then((d) => {
    byId = new Map(d.r.map((a) => {
      const r = {};
      d.cols.forEach((c, i) => { if (a[i] != null && a[i] !== "") r[c] = a[i]; });
      d.cityCols.forEach((c, i) => { if (d.cities[r.city][i] !== "") r[c] = d.cities[r.city][i]; });
      delete r.city;
      r.chain = r.cityPath.split("/").filter(Boolean);  // the place ids from the country down, e.g. uk, england, london
      return [r.id, r];
    }));
    DATA.knownIds = [...byId.keys()];
  }).catch(() => { loadFailed = true; }).then(render);
  return loading;
}
const ui = { confirmDelete: false, message: "", prefNote: "", jumped: false };
const starsOf = (r) => r.stars || r.formerStars || 0;
const pageLink = (r) => withLang(r.cityPath) + "&q=" + encodeURIComponent(r.name);
const whereOf = (r) => [pick(r, "area"), pick(r, "cityName")].filter((x, i, a) => x && a.indexOf(x) === i && !(i && a[0].includes(x))).join(", ");

function renderCrumbs() {
  $("crumbs").innerHTML = '<a href="' + withLang("/") + '">' + esc(t("crumbHome")) + '</a><span aria-current="page">' + esc(t("accTitle")) + "</span>";
  $("destLink").href = withLang("/") + "#destinations";
}

// ---------- Star passport ----------
// Everything here is worked out in the browser from the "been there" list, so nothing new is stored: the totals, a world
// map with a pin for each restaurant, and badges, each ladder showing the ones earned and the next to aim for. Restaurants
// that have since lost their stars or closed still count, with the stars they had. A city is the one the most-stars guide
// counts it under (`town` in account.json, else its place); continents come from DATA.continentOf (build.py).
const cityOf = (r) => r.country + ":" + (r.town || r.cityName);
function passportFigures(been) {
  if (!pass.threes) pass.threes = [...byId.values()].filter((r) => r.stars === 3 && !r.status);
  const live = (p) => pass.threes.filter((r) => r.chain.includes(p.id));
  const f = {
    n: been.length, stars: been.reduce((a, r) => a + starsOf(r), 0), three: been.filter((r) => starsOf(r) === 3).length,
    cities: new Set(been.map(cityOf)).size, countries: new Set(been.map((r) => r.country)).size,
    continents: new Set(been.map((r) => DATA.continentOf[r.country]).filter(Boolean)).size, allContinents: DATA.continents.length,
    levels: new Set(been.map(starsOf).filter(Boolean)).size,
    checker: (reports || []).some((x) => x.status === "used" || x.status === "confirmed"),
  };
  // "Every three-star in London": places with two or more three-star restaurants open today, and how many of them you've been to.
  const beenIds = new Set(been.map((r) => r.id));
  f.sets = DATA.places.filter((p) => p.n3 >= 2 && p.type !== "group").map((p) => {
    const all = live(p);
    return { p, have: all.filter((r) => beenIds.has(r.id)).length, need: all.length };
  }).filter((s) => s.need >= 2 && s.have);
  return f;
}
// Each ladder: [what it counts, stamp's small word, [[how many, badge name]…]]. Names reuse the old milestones' words (ms1–ms6).
const BADGE_LADDERS = [
  ["n", "restaurants", [[1, () => t("ms1")], [10, () => t("ms3")], [25, () => t("ms4")], [50, "50 restaurants"], [100, "100 restaurants"]]],
  ["three", "three-stars", [[1, () => t("ms2")], [5, "5 three-stars"], [10, "10 three-stars"], [25, "25 three-stars"]]],
  ["stars", "stars", [[25, "25 stars collected"], [50, () => t("ms6")], [100, "100 stars collected"], [250, "250 stars collected"]]],
  ["cities", "cities", [[5, "5 cities"], [10, "10 cities"], [25, "25 cities"], [50, "50 cities"]]],
  ["countries", "countries", [[3, () => t("ms5")], [5, "5 countries"], [10, "10 countries"], [20, "20 countries"]]],
  ["continents", "continents", [[2, "2 continents"], [3, "3 continents"], ["all", "A star on every continent"]]],
  ["levels", "levels", [[3, "The full set: a one-, two- and three-star"]]],
];
function badges(f) {
  const got = [], next = [];
  BADGE_LADDERS.forEach(([key, word, steps]) => {
    let nextDone = false;
    steps.forEach(([need, name]) => {
      need = need === "all" ? f.allContinents : need;
      if (key === "continents" && need > f.allContinents) return;
      const b = { stamp: key === "levels" ? "1·2·3" : String(need), word, name: typeof name === "function" ? name() : name, have: Math.min(f[key], need), need };
      if (f[key] >= need) got.push(b);
      else if (!nextDone) { nextDone = true; next.push(b); }
    });
  });
  f.sets.filter((s) => s.have >= s.need).forEach((s) => got.push({ stamp: "3", word: "three-stars", name: "Every three-star in " + s.p.name, have: s.need, need: s.need, star: true }));
  // The closest set still to finish (most of it done, then the fewest left).
  const open = f.sets.filter((s) => s.have < s.need).sort((a, b) => b.have / b.need - a.have / a.need || (a.need - a.have) - (b.need - b.have) || b.p.n - a.p.n)[0];
  if (open) next.push({ stamp: "3", word: "three-stars", name: "Every three-star in " + open.p.name, have: open.have, need: open.need, star: true, href: withLang(open.p.path) });
  (f.checker ? got : next).push({ stamp: "✓", word: "reports", name: t("ms7"), have: f.checker ? 1 : 0, need: 1, check: true });
  return { got, next };
}
function badgeHtml(b, earned) {
  const name = b.href ? '<a href="' + esc(b.href) + '">' + esc(b.name) + "</a>" : esc(b.name);
  return '<li class="badge' + (earned ? " got" : "") + '"><span class="stamp" aria-hidden="true"><b' + (b.stamp.length > 3 ? ' class="long"' : "") + ">" + esc(b.stamp) + (b.star ? '<svg><use href="#star"/></svg>' : "") + "</b><small>" + esc(b.word) + "</small></span>" +
    '<span class="badge-text"><span class="badge-name">' + name + "</span>" +
    (earned ? '<span class="sr-only">' + esc(t("msGot")) + "</span>"
      : '<span class="badge-prog"><span class="bar" aria-hidden="true"><span style="width:' + (b.have / b.need * 100).toFixed(1) + '%"></span></span>' + esc(t("accOf", { n: b.have, total: b.need })) + "</span>") +
    "</span></li>";
}
function passportShareText(f) {
  const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
  const where = f.cities > 1 ? " in " + f.cities + " cities" + (f.countries > 1 ? " and " + f.countries + " countries" : "") : "";
  return "My Michelin star passport: " + plural(f.stars, "star") + " from " + plural(f.n, "restaurant") + (f.three ? " (" + f.three + " three-star)" : "") + where +
    ". I keep mine on The Starred Bill:";
}
function passportSection(been) {
  const f = passportFigures(been), { got, next } = badges(f);
  ui.passport = f;
  const tiles = [[f.n, t("accStatBeen")], [f.stars, t("accStatStars")], [f.three, t("accStatThree")], [f.cities, "Cities"], [f.countries, t("accStatCountries")],
    [f.continents + '<small> of ' + f.allContinents + "</small>", "Continents"]];
  return '<section class="acct-section passport" id="passport"><h2>Your star passport</h2>' +
    (been.length ? "<p>Every restaurant you tick as been there goes in: a pin on your map, its stars in your total, and badges as your collection grows.</p>"
      : "<p>Tick ✓ Been there next to any restaurant you've eaten at and it goes in here: a pin on your map, its stars in your total, and badges as your collection grows.</p>") +
    '<div class="acct-stats six">' + tiles.map(([n, l]) => '<div class="acct-stat"><div class="n">' + n + '</div><div class="l">' + esc(l) + "</div></div>").join("") + "</div>" +
    (been.some((r) => r.lat != null) ? '<div id="passportMapSlot"></div>' : "") +
    (got.length ? '<h3 class="badges-h">Badges earned <span class="count">' + got.length + '</span></h3><ul class="badges">' + got.map((b) => badgeHtml(b, true)).join("") + "</ul>" : "") +
    (next.length ? '<h3 class="badges-h">Next to aim for</h3><ul class="badges">' + next.map((b) => badgeHtml(b, false)).join("") + "</ul>" : "") +
    (been.length ? '<p class="passport-share"><button type="button" class="btn-line" id="passportShare"><svg aria-hidden="true"><use href="#share"/></svg><span>Share my passport</span></button></p>' : "") +
    "</section>";
}

// The map is made once and moved into each redraw of the page (render() rewrites the page), loaded only as it nears the screen.
const pass = { el: null, map: null, info: null, markers: new Map(), observer: null, framed: "" };
function placePassportMap(been) {
  const slot = $("passportMapSlot");
  if (!slot) return;
  if (!pass.el) {
    pass.el = document.createElement("div");
    pass.el.className = "map-canvas passport-map";
    pass.el.innerHTML = '<p class="map-wait">' + "Loading your map…" + "</p>";
    pass.observer = new IntersectionObserver((seen) => { if (seen.some((x) => x.isIntersecting)) { pass.observer.disconnect(); initPassportMap(); } }, { rootMargin: "300px" });
    pass.observer.observe(pass.el);
  }
  slot.replaceWith(pass.el);
  pass.been = been;
  if (pass.map) drawPassportPins();
}
async function initPassportMap() {
  try {
    await loadGoogle();
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    await google.maps.importLibrary("marker");
    pass.el.innerHTML = "";
    pass.map = new Map(pass.el, { center: { lat: 35, lng: 10 }, zoom: 2, minZoom: 2, mapTypeControl: false, streetViewControl: false, clickableIcons: false, gestureHandling: "cooperative" });
    pass.info = new InfoWindow();
    pass.map.addListener("click", () => pass.info.close());
    drawPassportPins();
  } catch (e) {
    if (!pass.map) pass.el.innerHTML = '<p class="map-wait">Your map couldn\'t load just now. Please reload the page to try again.</p>';
  }
}
function passportCard(r) {
  const day = loadVisited()[r.id];
  return '<div style="font-family:Figtree,system-ui,sans-serif;color:#12261C;max-width:240px;line-height:1.4">' +
    '<a href="' + esc(pageLink(r)) + '" style="font-weight:700;font-size:15px;color:#12261C">' + esc(nameOf(r)) + "</a>" +
    '<div style="color:#B3862B;font-size:13px">' + "✱".repeat(starsOf(r)) + ' <span style="color:#5A6E62">' + esc(whereOf(r)) + (r.status ? " · " + esc(t("formerly")) : "") + "</span></div>" +
    (day ? '<div style="font-size:13px;color:#5A6E62;margin-top:4px">Been ' + esc(dayLabel(day)) + "</div>" : "") + "</div>";
}
// Adds and removes pins to match the list, and frames them all whenever the list changes.
function drawPassportPins() {
  const been = (pass.been || []).filter((r) => r.lat != null && r.lng != null), ids = new Set(been.map((r) => r.id));
  pass.markers.forEach((m, id) => { if (!ids.has(id)) { m.setMap(null); pass.markers.delete(id); } });
  been.forEach((r) => {
    if (pass.markers.has(r.id)) return;
    const m = new google.maps.Marker({ map: pass.map, position: { lat: r.lat, lng: r.lng }, title: nameOf(r),
      icon: r.status ? pinIcon(starsOf(r), false, true) : pinIcon(r.stars), zIndex: r.status ? 1 : 100 + r.stars * 10 });
    m.addListener("click", () => { pass.info.setContent(passportCard(r)); pass.info.open({ map: pass.map, anchor: m }); });
    pass.markers.set(r.id, m);
  });
  const key = [...ids].sort().join(",");
  if (key === pass.framed || !been.length) return;
  pass.framed = key;
  if (been.length === 1) { pass.map.setCenter({ lat: been[0].lat, lng: been[0].lng }); pass.map.setZoom(12); return; }
  const box = new google.maps.LatLngBounds();
  been.forEach((r) => box.extend({ lat: r.lat, lng: r.lng }));
  pass.map.fitBounds(box, 40);
  google.maps.event.addListenerOnce(pass.map, "idle", () => { if (pass.map.getZoom() > 13) pass.map.setZoom(13); });
}
// On phones the share sheet (the text carries the link), elsewhere the text and link are copied.
async function sharePassport(btn) {
  const text = passportShareText(ui.passport), url = "https://starredbill.com/";
  if (navigator.share) {
    try { await navigator.share({ text: text + " " + url }); track("share", { what: "passport", via: "sheet" }); } catch (e) {}
    return;
  }
  try { await navigator.clipboard.writeText(text + " " + url); } catch (e) { return; }
  track("share", { what: "passport", via: "copy" });
  btn.querySelector("span").textContent = "Copied: paste it anywhere";
  setTimeout(() => { if (btn.isConnected) btn.querySelector("span").textContent = "Share my passport"; }, 2500);
}

// ---------- Reports ----------
// The member's reports of a price, closure or new chef ("Report a price or change", report.js) and how we got on
// checking each (scripts/reports.py sets the status and note). One we used, or that confirmed our page was right,
// earns the Price checker milestone (ms7). The account page is English only.
let reports = null, reportsLoading = false;
function loadReports() {
  if (reports || reportsLoading || !account.client || !account.user) return;
  reportsLoading = true;
  account.client.from("reports").select("id,restaurant_id,restaurant_name,kind,meal,menu_name,price,currency,seen_on,chef,details,status,review_note,created_at")
    .order("created_at", { ascending: false }).limit(200)
    .then(({ data, error }) => { reports = error ? [] : data || []; }, () => { reports = []; })
    .then(() => { reportsLoading = false; render(); });
}
const REPORT_STATUS = { new: "Waiting to be checked", used: "Used on the site: thank you", confirmed: "Checked: our page already had it right", "not-used": "We couldn't confirm it" };
const REPORT_MEAL = { dinner: "Dinner", lunch: "Lunch", wine: "Wine pairing", other: "Menu" };
function reportWhat(x) {
  if (x.kind === "closed") return "Has closed";
  if (x.kind === "chef") return "New head chef: " + (x.chef || "");
  if (x.kind === "other") return "Something else";
  const price = x.price == null ? "" : DATA.currencies && DATA.currencies[x.currency] ? localMoney(Number(x.price), x.currency) : (x.currency || "") + " " + x.price;
  return (x.menu_name || REPORT_MEAL[x.meal] || "Price") + " " + price + (x.seen_on ? ", seen " + new Date(x.seen_on + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
}
function reportsSection() {
  if (!reports || !reports.length) return "";
  return '<section class="acct-section" id="reports"><h2>Your reports <span class="count">' + reports.length + "</span></h2>" +
    "<p>Thank you for keeping prices fresh. We check each report against the restaurant's own website before changing anything.</p>" +
    '<ul class="acct-list">' + reports.map((x) => {
      const r = byId.get(x.restaurant_id);
      const name = r ? '<a class="al-name" href="' + pageLink(r) + '">' + esc(nameOf(r)) + "</a>" : '<span class="al-name">' + esc(x.restaurant_name || x.restaurant_id) + "</span>";
      return '<li><div class="al-main">' + name + '<span class="al-meta">' + esc(reportWhat(x)) + " · sent " +
        esc(new Date(x.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })) + "</span></div>" +
        '<span class="rep-status ' + esc(x.status) + '">' + esc(REPORT_STATUS[x.status] || x.status) + "</span>" +
        (x.review_note ? '<p class="rep-note">' + esc(x.review_note) + "</p>" : "") + "</li>";
    }).join("") + "</ul></section>";
}

// Progress for each country, region, city or district you've been to at least once.
function progress(been) {
  const rows = DATA.places.map((p) => {
    const n = been.filter((r) => !r.status && r.chain.includes(p.id)).length;
    return { p, n };
  }).filter((x) => x.n && x.p.n).sort((a, b) => b.n - a.n || a.p.n - b.p.n).slice(0, 12);
  if (!rows.length) return "";
  return '<section class="acct-section"><h2>' + esc(t("accWhere")) + '</h2><ul class="progress">' + rows.map(({ p, n }) =>
    '<li><a href="' + withLang(p.path) + '">' + esc(pick(p, "name")) + '</a><span class="bar" aria-hidden="true"><span style="width:' + Math.min(100, n / p.n * 100).toFixed(1) + '%"></span></span><span class="num">' +
    esc(t("accOf", { n, total: p.n })) + "</span></li>").join("") + "</ul></section>";
}

// "12 Sep 2026" from "2026-09-12" (read as a calendar day, so no time zone moves it).
const dayLabel = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const infoOf = (r) => ({ name: nameOf(r), cur: r.cur });
// What was paid, in the currency it was paid in ("£195 per person").
function paidLabel(d) {
  if (d.paid == null) return "";
  const price = d.cur && DATA.currencies[d.cur] ? localMoney(d.paid, d.cur) : (d.cur ? d.cur + " " : "") + d.paid.toLocaleString("en-GB");
  return t("accPerPerson", { price });
}
// The diary's details line and note, under the name.
function diaryDetails(d) {
  const line = [d.menu, paidLabel(d)].filter(Boolean).join(" · ");
  return (line ? '<span class="de-line">' + esc(line) + "</span>" : "") + (d.note ? '<span class="de-note">' + esc(d.note) + "</span>" : "");
}
// What they've paid in all, in the currency they've paid in most often (others converted at today's rates).
function spentLine(been, diary) {
  const paid = been.map((r) => diary[r.id]).filter((d) => d && d.paid != null && DATA.currencies[d.cur]);
  if (!paid.length) return "";
  const count = {};
  paid.forEach((d) => { count[d.cur] = (count[d.cur] || 0) + 1; });
  const cur = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
  const total = paid.reduce((a, d) => a + d.paid / DATA.currencies[d.cur].perUSD * DATA.currencies[cur].perUSD, 0);
  const mixed = paid.some((d) => d.cur !== cur);
  return '<p class="de-spent">' + esc(t("accSpent", { n: paid.length, total: localMoney(Math.round(total), cur) })) + (mixed ? ' <span class="de-mixed">' + esc(t("accSpentMixed")) + "</span>" : "") + "</p>";
}

function diaryList(been) {
  const visited = loadVisited(), diary = loadDiary();
  const items = been.slice().sort((a, b) => String(visited[b.id] || "").localeCompare(String(visited[a.id] || "")) || nameOf(a).localeCompare(nameOf(b)));
  return '<section class="acct-section" id="diary"><h2>' + esc(t("accDiaryTitle")) + ' <span class="count">' + been.length + "</span></h2>" +
    (items.length ? "<p>" + esc(t("accDiaryText")) + "</p>" + spentLine(been, diary) : "") +
    (!items.length ? '<p class="empty-note">' + esc(t("accBeenEmpty")) + "</p>" : '<ul class="acct-list diary-list">' + items.map((r) => {
      const d = diary[r.id] || {}, day = visited[r.id];
      return '<li><span class="de-date' + (day ? "" : " none") + '">' + esc(day ? dayLabel(day) : t("accNoDate")) + "</span>" +
        '<div class="al-main"><a class="al-name" href="' + pageLink(r) + '">' + esc(nameOf(r)) + "</a>" +
        '<span class="al-meta">' + starIcons(starsOf(r)) + (r.status ? " " + esc(t("formerly")) : "") + " · " + esc(whereOf(r)) + "</span>" + diaryDetails(d) + "</div>" +
        '<span class="al-acts"><button type="button" class="linkish" data-diary="' + esc(r.id) + '">' + esc(t(day || d.paid != null || d.menu || d.note ? "accEdit" : "accAddDetails")) + "</button>" +
        '<button type="button" class="linkish" data-unbeen="' + esc(r.id) + '">' + esc(t("accRemove")) + "</button></span></li>";
    }).join("") + "</ul>") + "</section>";
}

// Notes on restaurants that are no longer on either list (a "been there" unticked on a destination page keeps its details).
function otherNotes() {
  const visited = loadVisited(), wish = new Set(loadWishlist()), diary = loadDiary();
  const list = Object.keys(diary).filter((id) => !(id in visited) && !wish.has(id)).map((id) => byId.get(id)).filter(Boolean);
  if (!list.length) return "";
  return '<section class="acct-section"><h2>' + esc(t("accOtherNotes")) + "</h2><p>" + esc(t("accOtherNotesText")) + '</p><ul class="acct-list">' + list.map((r) =>
    '<li><div class="al-main"><a class="al-name" href="' + pageLink(r) + '">' + esc(nameOf(r)) + '</a><span class="al-meta">' + starIcons(starsOf(r)) + " · " + esc(whereOf(r)) + "</span>" + diaryDetails(diary[r.id]) + "</div>" +
    '<span class="al-acts"><button type="button" class="linkish" data-diary="' + esc(r.id) + '">' + esc(t("accEditNote")) + "</button>" +
    '<button type="button" class="linkish" data-undiary="' + esc(r.id) + '">' + esc(t("accRemove")) + "</button></span></li>").join("") + "</ul></section>";
}

function wishList() {
  const list = loadWishlist().map((id) => byId.get(id)).filter(Boolean);
  const visited = loadVisited(), diary = loadDiary();
  return '<section class="acct-section"><h2>' + esc(t("accWishTitle")) + ' <span class="count">' + list.length + "</span></h2>" +
    (list.length >= 2 ? '<p class="wish-compare"><a class="btn-line" href="/compare/">' + esc(t("wishCompare")) + " →</a></p>" : "") +
    (!list.length ? '<p class="empty-note">' + esc(t("accWishEmpty")) + "</p>" : '<ul class="acct-list">' + list.map((r) =>
      '<li><div class="al-main"><a class="al-name" href="' + pageLink(r) + '">' + esc(nameOf(r)) + "</a>" +
      '<span class="al-meta">' + starIcons(starsOf(r)) + " · " + esc(whereOf(r)) + (r.dinner != null ? " · " + esc(localMoney(r.dinner, r.cur)) : "") + "</span>" +
      (diary[r.id] && diary[r.id].note && !(r.id in visited) ? '<span class="de-note">' + esc(diary[r.id].note) + "</span>" : "") + "</div>" +
      '<span class="al-acts">' + (r.id in visited ? "" : '<button type="button" class="linkish" data-diary="' + esc(r.id) + '">' + esc(t(diary[r.id] && diary[r.id].note ? "accEditNote" : "accAddNote")) + "</button>") +
      (r.id in visited ? '<span class="al-been"><svg aria-hidden="true"><use href="#check"/></svg>' + esc(t("been")) + "</span>"
        : '<button type="button" class="linkish" data-markbeen="' + esc(r.id) + '">' + esc(t("accMarkBeen")) + "</button>") +
      '<button type="button" class="linkish" data-unwish="' + esc(r.id) + '">' + esc(t("accRemove")) + "</button></span></li>").join("") + "</ul>") + "</section>";
}

// ---------- Your preferences ----------
// Saved as they change (setProfile() in common.js; account.js sends them to the account). The home city is any destination
// with starred restaurants, found by typing; currency and dietary needs are the choices Help me pick offers.
const PREF_DIETS = [["", "No dietary needs"], ["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["gluten-free", "Gluten-free"], ["halal", "Halal"], ["kosher", "Kosher"]];
// "London, United Kingdom": a place with its country, from the country's address (the path's first part).
const placeLabel = (p) => {
  const top = "/" + p.path.split("/")[1] + "/";
  const country = top !== p.path && DATA.places.find((q) => q.path === top);
  return p.name + (country ? ", " + country.name : "");
};
function prefsSection() {
  const pr = loadProfile(), home = pr.home && DATA.places.find((p) => p.id === pr.home);
  const sel = (id, opts, val) => '<select id="' + id + '">' + opts.map(([k, label]) => '<option value="' + esc(k) + '"' + (k === (val || "") ? " selected" : "") + ">" + esc(label) + "</option>").join("") + "</select>";
  const curs = [["", "Each restaurant's own currency"]].concat(HOME_CURRENCIES.map((c) => [c, DATA.currencies[c].symbol.trim() + " " + c]));
  return '<section class="acct-section" id="preferences"><h2>Your preferences</h2>' +
    "<p>Set these once and every page starts from them, on any device you sign in on: Near me opens on your home city, " +
    "prices show in your currency, and Help me pick fills in your currency and dietary needs. Leave any of them blank to choose each time.</p>" +
    '<div class="prefs"><div class="pref-home"><label for="prefHome">Home city</label>' +
    '<input id="prefHome" type="search" autocomplete="off" placeholder="Type a city, region or country" value="' + esc(home ? placeLabel(home) : pr.homeName || "") + '">' +
    '<ul class="pref-list" id="prefHomeList" hidden></ul></div>' +
    '<div><label for="prefCur">Currency</label>' + sel("prefCur", curs, pr.currency) + "</div>" +
    '<div><label for="prefDiet">Dietary needs</label>' + sel("prefDiet", PREF_DIETS, pr.diet) + "</div>" +
    '<p class="pref-note' + (ui.prefNote ? " ok" : "") + '" id="prefNote" aria-live="polite">' + (ui.prefNote ? esc(ui.prefNote) : "") + "</p></div>" +
    // Halal, kosher and gluten-free can reveal religion or health, so saving one is the member's explicit choice (privacy notice).
    '<p class="pref-small">Dietary needs such as halal, kosher or gluten-free can say something about your religion or health. We keep yours only because you choose it, ' +
    'and use it only to start Help me pick. See our <a href="/privacy/">privacy notice</a>.</p></section>';
}
function savePrefs(change, note) {
  setProfile(Object.assign({}, loadProfile(), change));
  ui.prefNote = note;
  const n = $("prefNote");
  if (n) { n.textContent = note; n.classList.add("ok"); }
  track("preferences", { set: Object.keys(change)[0], via: "account" });
}
function homeMatches(q) {
  q = q.trim().toLowerCase();
  if (q.length < 2) return [];
  const starts = (p) => p.name.toLowerCase().startsWith(q) ? 0 : 1;
  return DATA.places.filter((p) => p.name.toLowerCase().includes(q)).sort((a, b) => starts(a) - starts(b) || b.n - a.n).slice(0, 8);
}
function showHomeList() {
  const list = $("prefHomeList"), found = homeMatches($("prefHome").value);
  list.hidden = !found.length;
  list.innerHTML = found.map((p) => '<li><button type="button" data-home="' + esc(p.id) + '">' + esc(placeLabel(p)) + " <small>" + p.n + " starred</small></button></li>").join("");
}

function dataSection() {
  return '<section class="acct-section"><h2>' + esc(t("accData")) + "</h2><p>" + esc(t("accDataText")) + '</p><div class="acct-actions">' +
    '<button type="button" class="btn-line" id="dlData">' + esc(t("accDownload")) + "</button>" +
    '<button type="button" class="btn-line" id="signOutBtn">' + esc(t("accSignOut")) + "</button>" +
    '<button type="button" class="btn-line danger" id="deleteBtn">' + esc(t("accDelete")) + "</button></div>" +
    (ui.confirmDelete ? '<div class="acct-confirm" role="alertdialog" aria-labelledby="delQ"><p id="delQ">' + esc(t("accDeleteConfirm")) + '</p><div class="acct-actions">' +
      '<button type="button" class="btn-line danger solid" id="deleteYes">' + esc(t("accDeleteYes")) + '</button><button type="button" class="btn-line" id="deleteNo">' + esc(t("accDeleteNo")) + "</button></div></div>" : "") +
    '<p class="acct-privacy"><a href="' + withLang("/privacy/") + '">' + esc(t("acctPrivacy")) + "</a></p></section>";
}

function render() {
  applyI18n();
  document.title = t("accTitle") + " · The Starred Bill";
  renderCrumbs();
  renderWishCount();
  const msg = ui.message ? '<p class="acct-message" role="status">' + esc(ui.message) + "</p>" : "";
  if (!account.ready) { $("acctLede").textContent = ""; $("acctBody").innerHTML = '<p class="acct-loading">' + esc(t("accLoading")) + "</p>"; return; }
  if (!acctSignedIn()) {
    $("acctLede").textContent = t("accOutText");
    $("acctBody").innerHTML = msg + '<button type="button" class="cta-btn" data-signin="">' + esc(t("acctSignIn")) + "</button>";
    return;
  }
  $("acctLede").textContent = t("accSignedInAs", { email: account.user.email || "" });
  if (!byId) {
    // The account page is English only.
    $("acctBody").innerHTML = msg + '<p class="acct-loading">' + (loadFailed ? "Your restaurants couldn't load just now. Please reload the page to try again." : esc(t("accLoading"))) + "</p>";
    if (!loadFailed) loadRestaurants();
    return;
  }
  loadReports();
  const visited = loadVisited();
  const been = Object.keys(visited).map((id) => byId.get(id)).filter(Boolean);
  $("acctBody").innerHTML = msg + passportSection(been) + yearSection(been) + progress(been) + diaryList(been) + wishList() + otherNotes() + reportsSection() + prefsSection() + emailsSection() + dataSection();
  placePassportMap(been);
  drawYearCard(been);
  if (/^#(preferences|emails)$/.test(location.hash) && !ui.jumped && $(location.hash.slice(1))) { ui.jumped = true; $(location.hash.slice(1)).scrollIntoView(); }
  if (location.hash === "#reports" && reports && !ui.jumpedReports) { ui.jumpedReports = true; if ($("reports")) $("reports").scrollIntoView(); }
}

function downloadData() {
  const visited = loadVisited(), wish = loadWishlist(), diary = loadDiary();
  const nameFor = (id) => (byId.get(id) || {}).name || id;
  const d = (id) => diary[id] || {};
  const out = {
    account: account.user.email, exported: new Date().toISOString(), site: "https://starredbill.com",
    wishlist: wish.map((id) => ({ id, name: nameFor(id), note: d(id).note || null })),
    beenThere: Object.keys(visited).map((id) => ({ id, name: nameFor(id), date: visited[id] || null,
      paidPerPerson: d(id).paid != null ? d(id).paid : null, currency: d(id).paid != null ? d(id).cur || null : null, menu: d(id).menu || null, note: d(id).note || null })),
    otherNotes: Object.keys(diary).filter((id) => !(id in visited) && !wish.includes(id)).map((id) => Object.assign({ id, name: nameFor(id) }, diary[id])),
    reports: (reports || []).map((x) => ({ restaurant: x.restaurant_name || x.restaurant_id, what: reportWhat(x), details: x.details, sent: x.created_at, status: REPORT_STATUS[x.status] || x.status, ourNote: x.review_note || null })),
    preferences: { homeCity: loadProfile().homeName || null, currency: loadProfile().currency || null, dietaryNeeds: loadProfile().diet || null },
    starEmails: alerts.row ? { newStarsNearYou: alerts.row.near_home, ceremonySummaries: alerts.row.countries.map((c) => (alertCountry(c) || [c, c])[1]) } : null,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = "starred-bill-my-data.json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

document.addEventListener("click", async (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  if (el.dataset.lang) { setLang(el.dataset.lang); render(); return; }
  if (el.dataset.home) {
    const p = DATA.places.find((x) => x.id === el.dataset.home);
    $("prefHome").value = placeLabel(p);
    $("prefHomeList").hidden = true;
    savePrefs({ home: p.id, homeName: p.name }, "Saved. Near me will open on " + p.name + ".");
    return;
  }
  if (el.dataset.diary) { const r = byId.get(el.dataset.diary); openDiary(el.dataset.diary, r ? infoOf(r) : {}); return; }
  if (el.dataset.unbeen || el.dataset.undiary) {
    // Removing it from the diary deletes its details too, so ask first when it has any.
    const id = el.dataset.unbeen || el.dataset.undiary, diary = loadDiary(), r = byId.get(id);
    if (diary[id] && !confirm(t(el.dataset.unbeen ? "accRemoveDiary" : "accRemoveNote", { name: r ? nameOf(r) : id }))) return;
    if (diary[id]) { delete diary[id]; setDiary(diary); }
    if (el.dataset.unbeen) { const v = loadVisited(); delete v[id]; setVisited(v); }
    render(); return;
  }
  if (el.dataset.markbeen) {
    // Ticked off from the wishlist: straight on to the diary, for the date and what they paid.
    const id = el.dataset.markbeen, r = byId.get(id);
    if (toggleVisited(id)) { render(); openDiary(id, r ? infoOf(r) : {}); }
    return;
  }
  if (el.dataset.unwish) { setWishlist(loadWishlist().filter((x) => x !== el.dataset.unwish)); render(); return; }
  if (el.id === "passportShare") { sharePassport(el); return; }
  if (el.id === "dlData") { downloadData(); return; }
  if (el.id === "signOutBtn") { ui.message = ""; await signOut(); return; }
  if (el.id === "deleteBtn") { ui.confirmDelete = true; render(); $("deleteYes").focus(); return; }
  if (el.id === "deleteNo") { ui.confirmDelete = false; render(); return; }
  if (el.id === "deleteYes") {
    el.disabled = true;
    const ok = await deleteAccount();
    ui.confirmDelete = false;
    ui.message = t(ok ? "accDeleted" : "accDeleteFail");
    render();
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "prefCur") savePrefs({ currency: e.target.value }, e.target.value ? "Saved. Prices will show in " + DATA.currencies[e.target.value].symbol.trim() + " wherever we can." : "Saved. Prices will show in each restaurant's own currency.");
  if (e.target.id === "prefDiet") savePrefs({ diet: e.target.value }, e.target.value ? "Saved. Help me pick will start with " + PREF_DIETS.find(([k]) => k === e.target.value)[1].toLowerCase() + " selected." : "Saved. Help me pick will start with no dietary filter.");
});
document.addEventListener("input", (e) => {
  if (e.target.id !== "prefHome") return;
  // Clearing the box clears the home city.
  if (!e.target.value.trim()) { $("prefHomeList").hidden = true; if (loadProfile().home) savePrefs({ home: "", homeName: "" }, "Saved. No home city: Near me will ask where you are."); return; }
  showHomeList();
});
document.addEventListener("click", (e) => { if ($("prefHomeList") && !e.target.closest(".pref-home")) $("prefHomeList").hidden = true; });
document.addEventListener("keydown", (e) => {
  if (e.target.id === "prefHome" && e.key === "Enter") { e.preventDefault(); const b = document.querySelector("#prefHomeList button"); if (b) b.click(); }
  if (e.target.id === "prefHome" && e.key === "Escape") $("prefHomeList").hidden = true;
});
window.addEventListener("sb:account", () => { if (!acctSignedIn()) reports = null; });
// The diary window saves without a "sync" mark, so its own changes redraw the page too.
["sb:account", "sb:wishlist", "sb:visited", "sb:profile", "sb:diary"].forEach((ev) => window.addEventListener(ev, (e) => { if (e.type === "sb:account" || e.type === "sb:diary" || e.detail.from === "sync") render(); }));
window.addEventListener("storage", (e) => { if (e.key === WISHLIST_KEY || e.key === VISITED_KEY || e.key === DIARY_KEY) render(); });

render();
