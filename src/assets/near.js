// /near-me/: finds the visitor (or a place they type), then shows the starred restaurants around them
// on a map and in a list, nearest first. Everything is worked out in the browser: the location is never sent to us.
// The restaurants come from /data/near.json and their opening hours from /data/hours.json (build_near_me() in build.py).
// "Along a route" (trip mode) lists the ones near the way from one place to another, in the order you'd pass them.

const NEAR_KEY = "starredbill-near";  // { lat, lng, label, seen: { id: stars }, seenAt }, only when the visitor ticks "Remember this location"
// Travel times and road routes use Google's Routes API, which has to be allowed for the site's key in Google Cloud.
// Until it is, travel times stay hidden and a route follows the straight line between the two places.
const ROUTES_API = false;
const near = {
  rows: null, hours: null, here: null, radius: 2, meal: "dinner", stars: 0, diet: "", day: "", sort: "near", shown: 30,
  trip: null, times: { drive: {}, transit: {} }, timeMode: "", timesBusy: false, fresh: [],
  map: null, info: null, markers: [], clusterer: null, you: null, end: null, circle: null, line: null
};
const RADII_KM = [10, 25, 50, 100, 250], RADII_MI = [5, 15, 30, 60, 150];
// How far off the route a restaurant may be, in trip mode.
const OFF_KM = [5, 10, 25, 50], OFF_MI = [3, 6, 15, 30];
const radii = () => near.trip ? (useMiles() ? OFF_MI : OFF_KM) : (useMiles() ? RADII_MI : RADII_KM);
const toMetres = (x) => useMiles() ? x * 1609.344 : x * 1000;
const radiusMetres = () => toMetres(radii()[near.radius]);
const radiusText = (i) => radii()[i] + (useMiles() ? " miles" : " km");
const DIET_LABELS = { "vegetarian-only": "dietVegOnly", "vegetarian-menu": "dietVegMenu", "vegetarian": "dietVeg", "vegan": "dietVegan", "gluten-free": "dietGf", "halal": "dietHalal", "kosher": "dietKosher" };
const BADGE_DIETS = [["vegetarian-only", "badgeVegOnly", "dietVegOnly"], ["vegetarian-menu", "badgeVegMenu", "dietVegMenu"], ["vegan", "badgeVegan", "dietVegan"]];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const today = () => (new Date().getDay() + 6) % 7;  // Monday is 0, as in hours.json
const dayName = (d) => d === today() ? "today" : d === (today() + 1) % 7 ? "tomorrow" : DAYS[d];
const TIME_MODES = { drive: ["DRIVING", "by car", "driving"], transit: ["TRANSIT", "by public transport", "transit"] };
const TIMES_FOR = 10;  // travel times for the nearest 10 only, as Google charges for each one

shareText = () => near.trip ? "Michelin star restaurants along the way from " + near.trip.fromLabel + " to " + near.trip.toLabel
  : "Michelin star restaurants near you, with dinner and lunch prices";
shareUrl = () => location.origin + location.pathname + (near.trip ? "?from=" + encodeURIComponent(near.trip.fromQ) + "&to=" + encodeURIComponent(near.trip.toQ) : "");

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
// Opening hours load alongside; until they arrive (or if they can't) the list simply shows none.
fetch(DATA.hoursUrl).then((res) => res.ok ? res.json() : null).then((d) => {
  if (!d) return;
  near.hours = {};
  Object.entries(d.h).forEach(([id, week]) => { near.hours[id] = week.split(";").map((day) => day ? day.split(",").map((s) => s.split("-")) : []); });
  near.hoursChecked = d.checked;
  if (near.here) { renderFilters(); render(false); }
}).catch(() => {});

const hasDiet = (r, d) => r.diets.includes(d) || (d === "vegetarian" && (r.diets.includes("vegetarian-menu") || r.diets.includes("vegetarian-only")));
const L = () => near.meal === "lunch";
const priceOf = (r) => L() ? (r.lunch > 0 ? r.lunch : null) : (r.dinnerType === "menu" ? r.dinner : null);
const usd = (r) => priceOf(r) == null || !DATA.currencies[r.cur] ? null : priceOf(r) / DATA.currencies[r.cur].perUSD;
const linkOf = (r) => r.id ? r.path + "?q=" + encodeURIComponent(r.name) : r.path;

// Opening hours: a day's sittings as [["1200", "1430"], …], [] when closed, or null when the MICHELIN Guide lists none.
const sittings = (r, day) => near.hours && r.id && near.hours[r.id] ? near.hours[r.id][day] : null;
// A sitting starting before 3pm counts as lunch; one running past 6pm (or past midnight) as dinner.
const servesMeal = ([a, b], meal) => meal === "lunch" ? Number(a) < 1500 : Number(a) >= 1500 || Number(b) > 1800 || Number(b) <= Number(a);
// The MICHELIN Guide often records only a day's first sitting, so a day showing lunch alone may well serve dinner too.
// Which days a restaurant opens is reliable; its times are trusted only for a day with two sittings, or a dinner one.
const trusted = (s) => s.length > 1 || (s.length === 1 && servesMeal(s[0], "dinner"));
function openFor(r, day, meal) {
  const s = sittings(r, day);
  if (s == null) return null;
  if (!s.length) return false;
  return trusted(s) ? s.some((x) => servesMeal(x, meal)) : true;
}
const clock = (hhmm) => hhmm === "0000" || hhmm === "2400" ? "midnight" : hhmm.slice(0, 2) + ":" + hhmm.slice(2);
const timesOn = (s) => s && trusted(s) ? s.map(([a, b]) => clock(a) + "–" + clock(b)).join(", ") : "";
function hoursText(r) {
  const day = near.day === "" ? today() : near.day, s = sittings(r, day);
  if (s == null) return "";
  const when = dayName(day);
  if (!s.length) return "Closed " + when;
  return "Open " + when + (timesOn(s) ? " " + timesOn(s) : "");
}

function matches(r) {
  return (!near.stars || r.stars === near.stars) && (!near.diet || hasDiet(r, near.diet)) && !(L() && r.lunch === -1) &&
    (near.day === "" || openFor(r, near.day, near.meal) === true);
}
function inRange() {
  const max = radiusMetres();
  return near.rows.filter((r) => r.d <= max && matches(r));
}
function sorted(list) {
  const by = {
    near: near.trip ? (a, b) => a.along - b.along || a.d - b.d : (a, b) => a.d - b.d,
    cheap: (a, b) => (usd(a) == null) - (usd(b) == null) || (usd(a) || 0) - (usd(b) || 0) || a.d - b.d,
    stars: (a, b) => b.stars - a.stars || a.d - b.d
  };
  return list.slice().sort(by[near.sort]);
}
// How far a restaurant is: from you, or in trip mode how far off the route and how far along it.
const awayText = (r) => near.trip ? distanceText(r.d) + " off the route · " + distanceText(r.along) + " in" : distanceText(r.d) + " away";

// Newly starred: won stars or gained one in the last 12 months.
function recentlyStarred(r) {
  if (!r.id || (r.change !== "new" && r.change !== "up") || !r.changed) return false;
  const d = new Date();
  const since = (d.getFullYear() - 1) + "-" + String(d.getMonth() + 1).padStart(2, "0");
  return r.changed >= since;
}
const monthText = (ym) => { const [y, m] = ym.split("-"); return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" }); };

// ---------- Finding the visitor ----------
function status(text, isError) {
  $("nearStatus").innerHTML = text;
  $("nearStatus").classList.toggle("error", !!isError);
}
function busy(on) {
  $("locateBtn").disabled = on;
  $("locateBtn").querySelector("span").textContent = on ? "Finding you…" : "Use my location";
}
function position() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject({ code: 0 }); return; }
    navigator.geolocation.getCurrentPosition((pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your location" }), reject,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  });
}
const positionError = (err) => !navigator.geolocation ? "This browser can't share your location. Type a town or postcode instead."
  : err.code === 1 ? "Location access is turned off for this page. Allow it in your browser's settings, or type a town or postcode instead."
  : "Couldn't find your location just now. Try again, or type a town or postcode instead.";
async function locate() {
  busy(true);
  status("");
  try {
    const here = await position();
    busy(false);
    setHere(here);
    track("near-me", { page: "near-me", via: "location" });
  } catch (err) {
    busy(false);
    status(positionError(err), true);
  }
}
async function findPlace(q) {
  await loadGoogle();
  const { Place } = await google.maps.importLibrary("places");
  const { places } = await Place.searchByText({ textQuery: q, fields: ["displayName", "formattedAddress", "location"], maxResultCount: 1 });
  if (!places || !places.length) return null;
  const p = places[0];
  return { lat: p.location.lat(), lng: p.location.lng(), label: p.formattedAddress || p.displayName };
}
async function searchPlace(q) {
  q = q.trim();
  if (!q) { $("placeQ").focus(); return; }
  status("Looking for " + esc(q) + "…");
  try {
    const here = await findPlace(q);
    if (!here) { status("Couldn't find “" + esc(q) + "”. Try a town or city name, or a full postcode.", true); return; }
    setHere(here);
    // Only how the place was found is counted, never what was typed.
    track("near-me", { page: "near-me", via: "search" });
  } catch (e) {
    status("The place search isn't working just now. Try “Use my location” instead.", true);
  }
}
async function setHere(here, remembered) {
  if (near.trip) leaveTrip();
  near.here = here;
  near.shown = 30;
  near.times = { drive: {}, transit: {} };
  try { await dataReady; } catch (e) { status("The restaurant list couldn't load just now. Please refresh the page.", true); return; }
  near.rows.forEach((r) => { r.d = metresBetween(here, r); r.along = null; });
  status("Showing starred restaurants near <strong>" + esc(here.label) + "</strong>.");
  $("results").hidden = false;
  near.fresh = remembered ? sinceLastLook(store.get(NEAR_KEY, null)) : [];
  renderRemember(!!remembered || !!store.get(NEAR_KEY, null));
  widenIfEmpty();
  renderFilters();
  render(true);
  if (!remembered) $("results").scrollIntoView({ behavior: "smooth", block: "start" });
}
// Nothing within the chosen distance: widen it to the first distance that has something.
function widenIfEmpty() {
  if (inRange().length) return;
  const i = radii().findIndex((x, k) => k > near.radius && near.rows.some((r) => r.d <= toMetres(x) && matches(r)));
  if (i > -1) near.radius = i;
}

// ---------- Remembering a location, and what's new there since ----------
// With a remembered location the browser also keeps the stars of every restaurant within 100 km (60 miles),
// so the next visit can say which ones have won or gained a star since.
const LOOK_METRES = 100000;
function seenNow() {
  const seen = {};
  near.rows.forEach((r) => { if (r.id && r.d <= LOOK_METRES) seen[r.id] = r.stars; });
  return seen;
}
// The comparison is with the stars as they were before today, so it holds through the day's reloads.
const isoDay = () => new Date().toISOString().slice(0, 10);
function lastLook(saved) {
  if (!saved) return null;
  return saved.seenAt === isoDay() ? (saved.prev ? { seen: saved.prev, at: saved.prevAt } : null) : saved.seen ? { seen: saved.seen, at: saved.seenAt } : null;
}
function sinceLastLook(saved) {
  const last = lastLook(saved);
  if (!last) return [];
  return near.rows.filter((r) => r.id && r.d <= LOOK_METRES && (r.change === "new" || r.change === "up") &&
    (last.seen[r.id] == null ? r.changed && last.at && r.changed >= last.at.slice(0, 7) : last.seen[r.id] < r.stars));
}
function remember() {
  const old = store.get(NEAR_KEY, null), moved = !old || metresBetween(old, near.here) > 20000;
  let prev = moved ? null : old.prev, prevAt = moved ? null : old.prevAt;
  if (!moved && old.seen && old.seenAt !== isoDay()) { prev = old.seen; prevAt = old.seenAt; }
  store.set(NEAR_KEY, { lat: near.here.lat, lng: near.here.lng, label: near.here.label, seen: seenNow(), seenAt: isoDay(), prev, prevAt });
}
function renderRemember(on) {
  if (near.trip) { $("rememberLine").hidden = true; return; }
  $("rememberLine").hidden = false;
  $("rememberLine").innerHTML = '<label><input type="checkbox" id="rememberBox"' + (on ? " checked" : "") + "> Remember this location on this device</label>" +
    (on ? " <span>Saved in this browser only. Next time, we'll show you any restaurant near here that has won a star since.</span>"
      : " <span>Next time, we'll show you any restaurant near here that has won a star since.</span>");
  if (on) remember();
}

// ---------- Along a route ----------
function openTrip(show) {
  $("tripForm").hidden = !show;
  $("tripToggle").setAttribute("aria-expanded", String(show));
  if (show) ($("tripFrom").value ? $("tripTo") : $("tripFrom")).focus();
}
function leaveTrip() {
  near.trip = null;
  near.radius = 2;
  if (near.line) near.line.setMap(null);
  if (near.end) near.end.setMap(null);
  history.replaceState(null, "", location.pathname);
}
// Points every few kilometres along the great circle between two places, for when there's no road route.
function straightLine(a, b) {
  const rad = Math.PI / 180, n = Math.max(2, Math.ceil(metresBetween(a, b) / 5000));
  const [la1, lo1, la2, lo2] = [a.lat * rad, a.lng * rad, b.lat * rad, b.lng * rad];
  const d = metresBetween(a, b) / 6371000;
  if (d < 1e-9) return [a, b];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
    const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
    const z = A * Math.sin(la1) + B * Math.sin(la2);
    pts.push({ lat: Math.atan2(z, Math.hypot(x, y)) / rad, lng: Math.atan2(y, x) / rad });
  }
  return pts;
}
async function roadRoute(a, b) {
  const { Route } = await google.maps.importLibrary("routes");
  const { routes } = await Route.computeRoutes({ origin: { lat: a.lat, lng: a.lng }, destination: { lat: b.lat, lng: b.lng }, travelMode: "DRIVING",
    fields: ["path", "distanceMeters", "durationMillis"] });
  if (!routes || !routes.length) return null;
  const val = (p, k) => typeof p[k] === "function" ? p[k]() : p[k];
  return { path: routes[0].path.map((p) => ({ lat: val(p, "lat"), lng: val(p, "lng") })), metres: routes[0].distanceMeters, millis: routes[0].durationMillis };
}
// Each restaurant's distance from the route (r.d) and how far along it that point is (r.along).
function measureRoute(path) {
  // Thin the path to a point every 500 metres or so, keeping both ends.
  const pts = [path[0]];
  for (let i = 1; i < path.length; i++) if (metresBetween(pts[pts.length - 1], path[i]) > 500 || i === path.length - 1) pts.push(path[i]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + metresBetween(pts[i - 1], pts[i]));
  const pad = toMetres(radii()[radii().length - 1]) / 111000 + 0.1;
  const box = pts.reduce((b, p) => [Math.min(b[0], p.lat), Math.max(b[1], p.lat), Math.min(b[2], p.lng), Math.max(b[3], p.lng)], [90, -90, 180, -180]);
  near.rows.forEach((r) => {
    r.d = Infinity; r.along = null;
    if (r.lat < box[0] - pad || r.lat > box[1] + pad) return;
    const kx = Math.cos(r.lat * Math.PI / 180) * 111320, ky = 110574;
    if ((r.lng - box[3]) * kx > pad * 111000 || (box[2] - r.lng) * kx > pad * 111000) return;
    for (let i = 1; i < pts.length; i++) {
      const ax = (pts[i - 1].lng - r.lng) * kx, ay = (pts[i - 1].lat - r.lat) * ky, bx = (pts[i].lng - r.lng) * kx, by = (pts[i].lat - r.lat) * ky;
      const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
      const f = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
      const off = Math.hypot(ax + f * dx, ay + f * dy);
      if (off < r.d) { r.d = off; r.along = cum[i - 1] + f * (cum[i] - cum[i - 1]); }
    }
  });
  return cum[cum.length - 1];
}
async function planTrip(fromQ, toQ) {
  fromQ = fromQ.trim(); toQ = toQ.trim();
  if (!toQ) { $("tripTo").focus(); return; }
  status(fromQ ? "Looking for " + esc(fromQ) + " and " + esc(toQ) + "…" : "Finding you, and looking for " + esc(toQ) + "…");
  let from, to;
  try {
    from = fromQ ? await findPlace(fromQ) : await position().catch((err) => { throw { located: err }; });
    to = await findPlace(toQ);
  } catch (err) {
    status(err && err.located ? positionError(err.located) : "The place search isn't working just now. Please try again in a moment.", true);
    return;
  }
  if (!from || !to) { status("Couldn't find “" + esc(!from ? fromQ : toQ) + "”. Try a town or city name, or a full postcode.", true); return; }
  let road = null;
  if (ROUTES_API) { try { road = await roadRoute(from, to); } catch (e) { road = null; } }
  try { await dataReady; } catch (e) { status("The restaurant list couldn't load just now. Please refresh the page.", true); return; }
  const fromLabel = fromQ ? from.label.split(",")[0] : "your location", toLabel = to.label.split(",")[0];
  near.trip = { from, to, fromQ: fromQ || "", toQ, fromLabel, toLabel, path: road ? road.path : straightLine(from, to), road: !!road };
  near.here = from;
  near.radius = 2;
  near.shown = 30;
  near.fresh = [];
  const metres = measureRoute(near.trip.path);
  status("Showing starred restaurants along the way from <strong>" + esc(fromLabel) + "</strong> to <strong>" + esc(toLabel) + "</strong>: " +
    (road ? distanceText(road.metres) + " by road, about " + durationText(road.millis) + " driving."
      : distanceText(metres) + " as the crow flies. Roads wind, so we measure from the straight line between the two."));
  if (fromQ) history.replaceState(null, "", location.pathname + "?from=" + encodeURIComponent(fromQ) + "&to=" + encodeURIComponent(toQ));
  else history.replaceState(null, "", location.pathname + "?to=" + encodeURIComponent(toQ));
  $("results").hidden = false;
  renderRemember(false);
  widenIfEmpty();
  renderFilters();
  render(true);
  $("results").scrollIntoView({ behavior: "smooth", block: "start" });
  track("near-me", { page: "near-me", via: "route", road: !!road });
}

// ---------- Travel times for the nearest few ----------
function durationText(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  return min < 60 ? min + " min" : Math.floor(min / 60) + " hr" + (min % 60 ? " " + (min % 60) + " min" : "");
}
async function travelTimes(mode) {
  if (near.timesBusy || near.trip) return;
  near.timeMode = mode;
  const want = sorted(inRange()).filter((r) => r.id).sort((a, b) => a.d - b.d).slice(0, TIMES_FOR).filter((r) => !(r.id in near.times[mode]));
  renderList();
  if (!want.length) return;
  near.timesBusy = true;
  renderTimesBar();
  try {
    await loadGoogle();
    const { RouteMatrix } = await google.maps.importLibrary("routes");
    const { matrix } = await RouteMatrix.computeRouteMatrix({ origins: [{ lat: near.here.lat, lng: near.here.lng }],
      destinations: want.map((r) => ({ lat: r.lat, lng: r.lng })), travelMode: TIME_MODES[mode][0], fields: ["durationMillis", "condition"] });
    matrix.rows[0].items.forEach((item, i) => {
      near.times[mode][want[i].id] = item && item.condition !== "ROUTE_NOT_FOUND" && item.durationMillis != null ? item.durationMillis : -1;
    });
    track("near-me", { page: "near-me", via: "times", mode });
  } catch (e) {
    near.timesError = true;
  }
  near.timesBusy = false;
  renderTimesBar();
  renderList();
}
function renderTimesBar() {
  const bar = $("nearTimes");
  if (!ROUTES_API || near.trip || !near.here) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.innerHTML = '<span>Travel times for the nearest ' + TIMES_FOR + ':</span><span class="seg">' +
    Object.keys(TIME_MODES).map((k) => '<button type="button" data-times="' + k + '" aria-pressed="' + (near.timeMode === k) + '">' +
      (k === "drive" ? "By car" : "Public transport") + "</button>").join("") + "</span>" +
    (near.timesBusy ? ' <span class="nt-note">Working them out…</span>' : near.timesError ? ' <span class="nt-note">Travel times aren\'t available just now.</span>' : "");
}
const directions = (r) => "https://www.google.com/maps/dir/?api=1&destination=" + r.lat + "," + r.lng +
  (near.timeMode === "transit" ? "&travelmode=transit" : "&travelmode=driving");
function timeText(r) {
  const ms = near.timeMode && r.id ? near.times[near.timeMode][r.id] : null;
  if (ms == null) return "";
  return ms < 0 ? "No route " + TIME_MODES[near.timeMode][1] : durationText(ms) + " " + TIME_MODES[near.timeMode][1];
}

// ---------- Filters ----------
function renderFilters() {
  $("fRadius").previousElementSibling.textContent = near.trip ? "Off the route" : "Within";
  $("fRadius").innerHTML = radii().map((x, i) => '<option value="' + i + '"' + (i === near.radius ? " selected" : "") + ">" + (near.trip ? "Up to " : "") + radiusText(i) + "</option>").join("");
  $("fMeal").innerHTML = [["dinner", "Dinner"], ["lunch", "Lunch"]].map(([k, l]) => '<button type="button" data-meal="' + k + '" aria-pressed="' + (near.meal === k) + '">' + l + "</button>").join("");
  $("fStars").innerHTML = [0, 1, 2, 3].map((s) => '<button type="button" data-stars="' + s + '" aria-pressed="' + (near.stars === s) + '"' +
    (s ? ' aria-label="' + esc(t("starsAria", { n: s })) + '"' : "") + ">" + (s ? starIcons(s) : "All") + "</button>").join("");
  // Open on: any day, today, tomorrow, then the rest of the week in order.
  const days = [0, 1, 2, 3, 4, 5, 6].map((k) => (today() + k) % 7);
  $("fDay").innerHTML = '<option value="">Any day</option>' + days.map((d) => '<option value="' + d + '"' + (near.day === d ? " selected" : "") + ">" +
    (d === today() ? "Today" : d === (today() + 1) % 7 ? "Tomorrow" : DAYS[d]) + "</option>").join("");
  $("fDay").disabled = !near.hours;
  $("fDiet").innerHTML = '<option value="">Any</option>' + Object.keys(DIET_LABELS).map((d) => '<option value="' + d + '"' + (near.diet === d ? " selected" : "") + ">" + esc(t(DIET_LABELS[d])) + "</option>").join("");
  $("fSort").innerHTML = [["near", near.trip ? "In route order" : "Nearest first"], ["cheap", "Cheapest first"], ["stars", "Most stars first"]]
    .map(([k, l]) => '<option value="' + k + '"' + (near.sort === k ? " selected" : "") + ">" + l + "</option>").join("");
  renderTimesBar();
}
$("fRadius").addEventListener("change", (e) => { near.radius = Number(e.target.value); near.shown = 30; render(true); });
$("fDiet").addEventListener("change", (e) => { near.diet = e.target.value; near.shown = 30; render(true); });
$("fDay").addEventListener("change", (e) => {
  near.day = e.target.value === "" ? "" : Number(e.target.value); near.shown = 30; render(true);
  if (near.day !== "") track("near-me", { page: "near-me", via: "open-on", day: near.day === today() ? "today" : near.day === (today() + 1) % 7 ? "tomorrow" : "later" });
});
$("fSort").addEventListener("change", (e) => { near.sort = e.target.value; near.shown = 30; render(false); });
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.meal) { near.meal = b.dataset.meal; renderFilters(); render(false); }
  else if (b.dataset.stars) { near.stars = Number(b.dataset.stars); renderFilters(); render(true); }
  else if (b.dataset.focus != null) { focusRow(near.rows[Number(b.dataset.focus)]); }
  else if (b.dataset.widen) { near.radius = Number(b.dataset.widen); renderFilters(); render(true); }
  else if (b.dataset.times) { travelTimes(b.dataset.times); renderTimesBar(); }
  else if (b.dataset.wish) {
    const list = loadWishlist(), id = b.dataset.wish;
    const on = list.includes(id);
    setWishlist(on ? list.filter((x) => x !== id) : list.concat(id));
    track("wishlist", { action: on ? "remove" : "add", restaurant: id, page: "near-me" });
  } else if (b.id === "nearMore") { near.shown += 30; renderList(); }
  else if (b.id === "freshClose") { near.fresh = []; renderNew(inRange()); }
  else if (b.id === "tripToggle") { openTrip($("tripForm").hidden); }
});
document.addEventListener("change", (e) => {
  if (e.target.id !== "rememberBox") return;
  if (e.target.checked) remember(); else store.set(NEAR_KEY, null);
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
    '<span class="nc-meta">' + esc(extra || awayText(r)) + "</span></button>";
}
function renderCards(list) {
  const all = near.rows.filter((r) => r.d != null && r.d < Infinity);
  const nearest = (s) => all.filter((r) => r.stars === s && (!near.diet || hasDiet(r, near.diet)) && (near.day === "" || openFor(r, near.day, near.meal) === true)).sort((a, b) => a.d - b.d)[0];
  // The nearest restaurant that matches the filters, even when it's beyond the chosen distance.
  const byNear = list.length ? list.slice().sort((a, b) => a.d - b.d) : all.filter(matches).sort((a, b) => a.d - b.d);
  const cheapest = list.filter((r) => usd(r) != null).sort((a, b) => usd(a) - usd(b))[0];
  // With no day chosen, the nearest one open today for the chosen meal.
  const openToday = near.day === "" && near.hours ? list.filter((r) => openFor(r, today(), near.meal) === true).sort((a, b) => a.d - b.d)[0] : null;
  const count = '<div class="near-card near-total"><span class="nc-label">' + (near.trip ? "Along the way" : "Within " + radiusText(near.radius)) + '</span><span class="nc-big">' + list.length + "</span>" +
    '<span class="nc-meta">' + (list.length === 1 ? "starred restaurant" : "starred restaurants") + "</span></div>";
  $("nearCards").innerHTML = count + card(near.trip ? "Closest to the route" : "Nearest", byNear[0]) +
    card(L() ? "Cheapest lunch" : "Cheapest dinner", cheapest, cheapest ? priceText(cheapest) + " · " + distanceText(cheapest.d) + (near.trip ? " off the route" : "") : "") +
    (openToday && openToday !== byNear[0] ? card("Nearest open today", openToday, (timesOn(sittings(openToday, today())) ? timesOn(sittings(openToday, today())) + " · " : "") + distanceText(openToday.d)) : "") +
    (near.stars && near.stars !== 2 ? "" : card(near.trip ? "Two-star nearest the route" : "Nearest two-star", nearest(2))) +
    (near.stars && near.stars !== 3 ? "" : card(near.trip ? "Three-star nearest the route" : "Nearest three-star", nearest(3)));
}
// Newly starred restaurants within the chosen distance, and, for a remembered location, those that won a star since the last visit.
function renderNew(list) {
  const fresh = near.fresh.filter((r) => r.d < Infinity).sort((a, b) => a.d - b.d);
  const recent = list.filter(recentlyStarred).filter((r) => !fresh.includes(r)).sort((a, b) => b.stars - a.stars || a.d - b.d);
  const chip = (r) => '<button type="button" class="nn-chip" data-focus="' + idx(r) + '">' + esc(r.name) + " " + starIcons(r.stars) +
    '<small>' + (r.change === "up" ? "gained a star" : "new") + (r.changed ? ", " + esc(monthText(r.changed)) : "") + " · " + distanceText(r.d) + "</small></button>";
  let html = "";
  if (fresh.length) {
    const last = lastLook(store.get(NEAR_KEY, null));
    const when = last && last.at ? new Date(last.at).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "";
    html += '<div class="near-new fresh"><p><strong>Since you last looked' + (when ? " on " + esc(when) : "") + ":</strong> " +
      (fresh.length === 1 ? "one restaurant near here has won a star." : fresh.length + " restaurants near here have won a star.") +
      ' <button type="button" class="linkish" id="freshClose">Hide</button></p><div class="nn-chips">' + fresh.slice(0, 8).map(chip).join("") + (fresh.length > 8 ? '<span class="nn-more">and ' + (fresh.length - 8) + " more</span>" : "") + "</div></div>";
  }
  if (recent.length) {
    html += '<div class="near-new"><p><strong>New stars ' + (near.trip ? "along the way" : "within " + radiusText(near.radius)) + "</strong> in the last 12 months</p>" +
      '<div class="nn-chips">' + recent.slice(0, 8).map(chip).join("") + (recent.length > 8 ? '<span class="nn-more">and ' + (recent.length - 8) + " more</span>" : "") + "</div></div>";
  }
  $("nearNew").innerHTML = html;
  $("nearNew").hidden = !html;
}
function render(refit) {
  if (!near.here) return;
  const list = inRange();
  renderCards(list);
  renderNew(list);
  renderList();
  drawMap(list, refit);
  // Once travel times are on, keep them for whichever restaurants are now the nearest few.
  if (near.timeMode && ROUTES_API && !near.trip) travelTimes(near.timeMode);
}
function renderList() {
  const list = sorted(inRange());
  const shown = list.slice(0, near.shown);
  const wish = loadWishlist();
  const where = near.trip ? "within " + radiusText(near.radius) + " of the route" : "within " + radiusText(near.radius);
  const open = near.day === "" ? "" : " open " + dayName(near.day);
  if (!list.length) {
    const closest = near.rows.filter(matches).sort((a, b) => a.d - b.d)[0];
    const next = radii().findIndex((x, k) => k > near.radius && closest && closest.d <= toMetres(x));
    $("nearCount").innerHTML = "No starred restaurants " + where + open + " that match." +
      (closest && closest.d < Infinity ? " The " + (near.trip ? "closest to the route" : "nearest") + " is <strong>" + esc(closest.name) + "</strong>, " + esc(awayText(closest)) + "." : "") +
      (next > -1 ? ' <button type="button" class="linkish" data-widen="' + next + '">Show everything ' + (near.trip ? "up to " + radiusText(next) + " off the route" : "within " + radiusText(next)) + "</button>" : "");
  } else {
    $("nearCount").textContent = list.length + (list.length === 1 ? " starred restaurant " : " starred restaurants ") + where + open +
      (near.sort === "near" ? (near.trip ? ", in the order you'll pass them" : ", nearest first") : near.sort === "cheap" ? ", cheapest first" : ", most stars first");
  }
  if (near.day !== "") {
    const unknown = near.rows.filter((r) => r.d <= radiusMetres() && r.id && sittings(r, 0) == null).length;
    if (unknown) $("nearCount").insertAdjacentHTML("beforeend",  ' <span class="nc-hours-note">Opening days from the MICHELIN Guide; check with the restaurant before you go. ' + unknown +
      (unknown === 1 ? " restaurant here lists none, so it's" : " restaurants here list none, so they're") + " left out.</span>");
  }
  $("nearRows").innerHTML = shown.map((r) => {
    const on = r.id && wish.includes(r.id);
    const hours = hoursText(r), time = timeText(r);
    return '<li class="near-row">' +
      '<div class="nr-main"><a class="nr-name" href="' + esc(linkOf(r)) + '">' + esc(r.name) + "</a> " + starIcons(r.stars) +
      '<span class="nr-where">' + esc(r.cuisine) + " · " + esc(r.where) + "</span>" +
      (r.chef ? '<span class="nr-chef">' + esc(t("chefLabel", { name: r.chef })) + "</span>" : "") +
      (badges(r) ? '<span class="diet-badges">' + badges(r) + "</span>" : "") +
      '<span class="nr-price">' + esc(priceText(r)) + (!L() && r.lunch > 0 ? ' · <span class="nr-lunch">' + esc(localMoney(r.lunch, r.cur)) + " lunch</span>" : "") + "</span>" +
      (hours ? '<span class="nr-hours' + (hours.startsWith("Closed") ? " shut" : "") + '">' + esc(hours) + "</span>" : "") +
      '<span class="nr-go">' + (time ? '<span class="nr-time">' + esc(time) + "</span> · " : "") +
      '<a href="' + esc(directions(r)) + '" target="_blank" rel="noopener">Directions ↗</a></span></div>' +
      '<div class="nr-side"><span class="nr-d">' + (near.trip ? distanceText(r.d) + " off" : distanceText(r.d)) + "</span>" +
      '<button type="button" class="nr-pin" data-focus="' + idx(r) + '" aria-label="Show ' + esc(r.name) + ' on the map" title="Show on the map"><svg aria-hidden="true"><use href="#pin"/></svg></button>' +
      (r.id ? '<button type="button" class="wish' + (on ? " on" : "") + '" data-wish="' + esc(r.id) + '" aria-pressed="' + !!on + '" aria-label="' + esc(t(on ? "wishRemove" : "wishAdd", { name: r.name })) + '">' + heart + "</button>" : "") +
      "</div></li>";
  }).join("");
  $("nearMore").hidden = list.length <= near.shown;
  $("nearMore").textContent = "Show " + Math.min(30, list.length - near.shown) + " more";
}

function infoHtml(r) {
  const hours = hoursText(r);
  return '<div style="font-family:Figtree,system-ui,sans-serif;color:#12261C;max-width:240px;line-height:1.4">' +
    '<div style="font-weight:700;font-size:15px">' + esc(r.name) + "</div>" +
    '<div style="color:#B3862B;font-size:13px">' + "✱".repeat(r.stars) + ' <span style="color:#5A6E62">' + esc(r.cuisine) + " · " + esc(r.where) + "</span></div>" +
    (r.chef ? '<div style="font-size:12px;color:#5A6E62">' + esc(t("chefLabel", { name: r.chef })) + "</div>" : "") +
    '<div style="margin-top:6px;font-size:13px">' + esc(priceText(r)) + " · " + esc(awayText(r)) + "</div>" +
    (hours ? '<div style="font-size:12px;color:#5A6E62">' + esc(hours) + "</div>" : "") +
    '<a href="' + esc(linkOf(r)) + '" style="display:inline-block;margin-top:6px;color:#1E6142;font-weight:600;font-size:13px">' + (r.id ? "Compare prices →" : "See it in the MICHELIN Guide ↗") + "</a>" +
    ' <a href="' + esc(directions(r)) + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;margin-left:8px;color:#1E6142;font-size:13px">Directions ↗</a></div>';
}
async function ensureMap() {
  if (near.map) return near.map;
  await loadGoogle();
  const { Map, InfoWindow, Circle, Polyline } = await google.maps.importLibrary("maps");
  await google.maps.importLibrary("marker");
  $("nearMap").innerHTML = "";
  $("nearMap").style.display = "block";
  near.map = new Map($("nearMap"), { center: near.here, zoom: 10, mapTypeControl: false, streetViewControl: false, clickableIcons: false, gestureHandling: "cooperative" });
  near.info = new InfoWindow();
  near.map.addListener("click", () => near.info.close());
  near.circle = new Circle({ map: near.map, clickable: false, strokeColor: "#1E6142", strokeOpacity: .5, strokeWeight: 1.5, fillColor: "#1E6142", fillOpacity: .05 });
  near.line = new Polyline({ clickable: false, strokeColor: "#1A73E8", strokeOpacity: .75, strokeWeight: 4 });
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
    near.you.setTitle(near.trip ? "Start" : "You are here");
    if (near.trip) {
      near.circle.setMap(null);
      near.line.setPath(near.trip.path);
      near.line.setMap(map);
      if (!near.end) near.end = new google.maps.Marker({ zIndex: 5000, clickable: false, title: "Destination",
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#ffffff", fillOpacity: 1, strokeColor: "#1A73E8", strokeWeight: 4 } });
      near.end.setPosition(near.trip.to);
      near.end.setMap(map);
    } else {
      near.line.setMap(null);
      if (near.end) near.end.setMap(null);
      near.circle.setMap(map);
      near.circle.setCenter(near.here);
      near.circle.setRadius(radiusMetres());
    }
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
      const b = new google.maps.LatLngBounds(near.here);
      if (near.trip) near.trip.path.forEach((p) => b.extend(p));
      else {
        // Frame the circle, or the nearest few restaurants when they're all much closer than its edge.
        const closest = list.slice().sort((a, c) => a.d - c.d).slice(0, 8);
        if (closest.length >= 8 && closest[7].d < radiusMetres() / 3) closest.forEach((r) => b.extend(r));
        else b.union(near.circle.getBounds());
      }
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
document.addEventListener("click", (e) => {
  const el = e.target.closest("button[data-lang]");
  if (el) { setLang(el.dataset.lang); renderStatic(); }
});
$("locateBtn").addEventListener("click", locate);
$("placeForm").addEventListener("submit", (e) => { e.preventDefault(); $("placeQ").blur(); searchPlace($("placeQ").value); });
$("tripForm").addEventListener("submit", (e) => { e.preventDefault(); document.activeElement.blur(); planTrip($("tripFrom").value, $("tripTo").value); });
const saved = store.get(NEAR_KEY, null);
const params0 = new URLSearchParams(location.search);
if (params0.get("to")) {
  $("tripFrom").value = params0.get("from") || "";
  $("tripTo").value = params0.get("to");
  openTrip(true);
  planTrip(params0.get("from") || "", params0.get("to"));
} else if (params0.get("q")) { $("placeQ").value = params0.get("q"); searchPlace(params0.get("q")); }
else if (params0.get("locate") === "1") locate();
else if (saved && typeof saved.lat === "number") setHere(saved, true);
