// /trips/ (10 Oct 2026): members' trips and lists, kept in the `trips` table (supabase/trips.sql).
// - A trip ("Paris, May 2027") has dates, how many people, and its restaurants, each with a day, a time, lunch or dinner,
//   "booked" and a note. They sit in day order, and the trip's bill adds them up with each country's usual service, tax
//   and tips, as the homepage's wishlist bill does (SERVICE in common.js). Each booking can go into a calendar (.ics, or
//   Google Calendar's own link).
// - A list ("My top 10 London lunches") has no dates: the restaurants in the member's own order, each with a note.
// - Sharing gives either a random code (share_trip()); /trips/?s=<code> is the read-only page anyone with it sees, signed
//   in or not (shared_trip(), fetched without the sign-in code). It never shows who made it.
// Prices come from Compare's files (/data/compare/<n>.json, partOf() as in compare.js); the names for searching and the
// wishlist from /data/account.json, loaded only once someone is signed in. The page is English only, like Your account.

const TP = { trips: null, trip: null, shared: null, failed: false, code: (params.get("s") || "").trim(), id: params.get("t") || "",
  byId: new Map(), names: null, query: "", cur: "", confirmDelete: false, status: "", creating: false };
const MAX_ITEMS = 60;
const rates = Object.fromEntries(Object.entries(DATA.currencies).map(([k, v]) => [k, v.perUSD]));
const EURO_REGIONS = ["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];
const COPY_KEY = "starredbill-trip-copy";
const editing = () => !!TP.trip;
const cur = () => TP.trip || TP.shared;
const isTrip = (t) => (t || cur() || {}).kind !== "list";

// ---------- Data ----------
const partOf = (id) => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 1000003; return h % DATA.compareParts.length; };
const parts = new Map();
function loadIds(ids) {
  const wanted = [...new Set(ids.map(partOf))];
  wanted.forEach((n) => {
    if (!parts.has(n)) parts.set(n, getData(DATA.compareParts[n]).then((d) => {
      d.r.forEach((a) => { const r = {}; d.cols.forEach((c, i) => { r[c] = a[i]; }); TP.byId.set(r.id, r); });
    }).catch((err) => { parts.delete(n); throw err; }));
  });
  return Promise.all(wanted.map((n) => parts.get(n)));
}
// Every restaurant's name and place (account.json, as on Your account): for searching, the wishlist, and ones no longer starred.
let namesLoading = null;
function loadNames() {
  if (!namesLoading) namesLoading = getData(DATA.accountUrl).then((d) => {
    TP.names = new Map(d.r.map((a) => {
      const r = {};
      d.cols.forEach((c, i) => { if (a[i] != null && a[i] !== "") r[c] = a[i]; });
      d.cityCols.forEach((c, i) => { if (d.cities[r.city][i] !== "") r[c] = d.cities[r.city][i]; });
      delete r.city;
      return [r.id, r];
    }));
    DATA.knownIds = [...TP.names.keys()].filter((id) => !TP.names.get(id).status);
    renderWishCount();
  }).catch(() => { namesLoading = null; });
  return namesLoading;
}
// What a trip's restaurant shows: its prices where it's still starred, else its name and place, marked as no longer starred.
function infoOf(id) {
  const r = TP.byId.get(id);
  if (r) return r;
  const n = TP.names && TP.names.get(id);
  if (!n) return null;
  const where = [n.area, n.cityName].filter((x, i, a) => x && a.indexOf(x) === i && !(i && a[0].includes(x))).join(", ");
  return { id, name: n.name, stars: n.stars || 0, formerStars: n.formerStars, gone: true, where, country: n.country, cur: n.cur, href: n.cityPath + "#r=" + id };
}
const itemIds = (t) => (t.items || []).map((x) => x.r);
async function loadTripData(t) {
  try { await loadIds(itemIds(t)); } catch (e) { /* drawn without prices; the bill says so */ }
  if (itemIds(t).some((id) => !TP.byId.has(id))) await loadNames();
}

// The share link's page, read without signing in: the database's shared_trip() answers anyone who has the code.
async function fetchShared(code) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/shared_trip", {
    method: "POST", headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });
  if (!res.ok) throw new Error(res.status);
  const rows = await res.json();
  return rows[0] || null;
}
async function fetchTrips() {
  const { data, error } = await account.client.from("trips").select("id,kind,title,starts_on,ends_on,people,meal,wine,currency,note,items,share_code,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

// ---------- Words and figures ----------
const dayDate = (d) => new Date(d + "T12:00:00Z");
const fmt = (d, o) => dayDate(d).toLocaleDateString("en-GB", Object.assign({ timeZone: "UTC" }, o));
const shortDay = (d) => fmt(d, { weekday: "short", day: "numeric", month: "short" });
const longDay = (d) => fmt(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
// "14–17 May 2027", "28 May – 2 June 2027", "30 Dec 2027 – 2 Jan 2028", or one day.
function dateRange(a, b) {
  if (!a && !b) return "";
  if (!a || !b || a === b) return fmt(a || b, { day: "numeric", month: "long", year: "numeric" });
  const [ya, ma] = a.split("-"), [yb, mb] = b.split("-");
  if (ya !== yb) return fmt(a, { day: "numeric", month: "short", year: "numeric" }) + " – " + fmt(b, { day: "numeric", month: "short", year: "numeric" });
  if (ma !== mb) return fmt(a, { day: "numeric", month: "long" }) + " – " + fmt(b, { day: "numeric", month: "long", year: "numeric" });
  return fmt(a, { day: "numeric" }) + "–" + fmt(b, { day: "numeric", month: "long", year: "numeric" });
}
const plural = (n, one, many) => n + " " + (n === 1 ? one : many || one + "s");
const mealOf = (t, x) => x.meal || t.meal || "dinner";
const mealWord = (m) => m === "lunch" ? "Lunch" : "Dinner";
function guessCurrency() {
  const region = ((navigator.language || "").split("-")[1] || "").toUpperCase();
  return region === "US" ? "USD" : EURO_REGIONS.includes(region) ? "EUR" : "GBP";
}
// The bill's currency: the trip's own (saved with it), else the member's, else the one its restaurants share, else a guess.
function billCurrency(t) {
  if (TP.cur && DATA.currencies[TP.cur]) return TP.cur;
  if (t.currency && DATA.currencies[t.currency]) return t.currency;
  if (homeCurrency()) return homeCurrency();
  const curs = [...new Set(itemIds(t).map((id) => TP.byId.get(id)).filter(Boolean).map((r) => r.cur))];
  return curs.length === 1 ? curs[0] : guessCurrency();
}
const fx = (from, to) => rates[to] / rates[from];
function money(n, c, approx) {
  return approx ? "≈" + symbolOf(c) + Math.round(n).toLocaleString("en-GB") : localMoney(Math.round(n * 100) / 100, c);
}
// A restaurant's meal price in its own currency, or why there isn't one.
function mealPrice(r, meal) {
  if (!r || r.gone) return { why: "no longer starred" };
  if (meal === "lunch" && r.noLunch) return { why: "no lunch service" };
  const n = meal === "lunch" ? r.lunch : r.dinner, type = meal === "lunch" ? r.lunchType || "menu" : r.dinnerType || "menu";
  if (n == null) return { why: "no " + meal + " price yet" };
  return { n, type };
}
const wineOf = (r, meal) => r && !r.gone ? (meal === "lunch" ? r.lunchWine : r.wine) : null;

// ---------- Calendar ----------
// One event per restaurant with a day: at its time (lunch 2½ hours, dinner 3), or all day when there's no time yet.
// Times are the restaurant's local time ("floating"), so a 19:30 dinner in Tokyo stays 19:30 wherever the calendar is.
const icsEsc = (s) => String(s).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
// Lines longer than 75 bytes are folded onto the next line, which starts with a space (the calendar standard, RFC 5545).
const utf8 = new TextEncoder();
function icsFold(line) {
  let out = "", part = "", n = 0;
  for (const ch of line) {
    const b = utf8.encode(ch).length;
    if (n + b > 75) { out += part + "\r\n "; part = ""; n = 1; }
    part += ch; n += b;
  }
  return out + part;
}
const compact = (d) => d.replace(/-/g, "");
function eventOf(t, x) {
  const r = infoOf(x.r), meal = mealOf(t, x);
  if (!x.day || !r) return null;
  const name = r.name, summary = mealWord(meal) + " at " + name;
  const url = location.origin + (r.href || "/");
  const desc = [x.booked ? "Booked." : "", x.note || "", "Prices and details: " + url, "From " + (isTrip(t) ? "the trip" : "the list") + " “" + t.title + "” on The Starred Bill"].filter(Boolean).join("\n");
  let start, end, allDay = !x.time;
  if (allDay) {
    const next = new Date(dayDate(x.day).getTime() + 864e5).toISOString().slice(0, 10);
    start = compact(x.day); end = compact(next);
  } else {
    const [h, m] = x.time.split(":").map(Number), mins = h * 60 + m + (meal === "lunch" ? 150 : 180);
    const endDay = new Date(dayDate(x.day).getTime() + Math.floor(mins / 1440) * 864e5).toISOString().slice(0, 10);
    const hm = (v) => String(Math.floor(v / 60) % 24).padStart(2, "0") + String(v % 60).padStart(2, "0") + "00";
    start = compact(x.day) + "T" + hm(h * 60 + m); end = compact(endDay) + "T" + hm(mins % 1440);
  }
  return { uid: (t.id || TP.code || "trip") + "-" + x.r + "-" + x.day + "@starredbill.com", summary, desc, location: name + ", " + (r.where || ""), url, start, end, allDay };
}
function icsFile(events) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Starred Bill//Trips//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  events.forEach((ev) => {
    lines.push("BEGIN:VEVENT", "UID:" + ev.uid, "DTSTAMP:" + stamp,
      ev.allDay ? "DTSTART;VALUE=DATE:" + ev.start : "DTSTART:" + ev.start, ev.allDay ? "DTEND;VALUE=DATE:" + ev.end : "DTEND:" + ev.end,
      "SUMMARY:" + icsEsc(ev.summary), "LOCATION:" + icsEsc(ev.location), "DESCRIPTION:" + icsEsc(ev.desc), "URL:" + ev.url, "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}
function saveIcs(events, name) {
  const url = URL.createObjectURL(new Blob([icsFile(events)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = (name || "trip").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + ".ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
const googleCal = (ev) => "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(ev.summary) +
  "&dates=" + ev.start + "/" + ev.end + "&details=" + encodeURIComponent(ev.desc) + "&location=" + encodeURIComponent(ev.location);

// ---------- Order ----------
// A trip's restaurants sit in day order (then time, lunch before dinner); those without a day keep their order at the end.
function sortTrip(t) {
  if (!isTrip(t)) return;
  const at = (x) => x.time || (mealOf(t, x) === "lunch" ? "12:00" : "19:00");
  const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  t.items = t.items.map((x, i) => [x, i]).sort(([a, i], [b, j]) => cmp(a.day || "9999", b.day || "9999") || (a.day && b.day ? cmp(at(a), at(b)) : 0) || i - j).map(([x]) => x);
}

// ---------- Drawing: shared pieces ----------
function head(eyebrow, h1, lede) {
  $("tripsEyebrow").textContent = eyebrow;
  $("tripsH1").textContent = h1;
  $("tripsLede").textContent = lede;
}
const rulesHtml = () => '<section class="trip-sec trip-rules" id="rules"><h2>Rules for shared trips and lists</h2><ul>' +
  "<li>Share only what you're happy for anyone with the link to see. Shared pages are kept out of search engines, but a link can be passed on.</li>" +
  "<li>Don't put other people's personal details in a shared trip or list, such as phone numbers, email addresses or booking references.</li>" +
  "<li>Nothing offensive or unlawful, no advertising, and nothing that pretends to come from a restaurant or from us.</li>" +
  "<li>The prices and stars on a shared page are our latest figures, not a restaurant's promise: check with the restaurant before you book.</li>" +
  "<li>You can stop sharing at any time, and the link stops working straight away. We may stop sharing or remove a trip or list that breaks these rules, and close an account that keeps doing so.</li>" +
  '</ul><p>To tell us about a shared page that breaks them, email <a href="mailto:hello@starredbill.com">hello@starredbill.com</a> with its link. See also our <a href="/privacy/#trips">privacy notice</a>.</p></section>';
const starsOf = (r) => r.gone ? r.formerStars || 0 : r.stars || 0;
function nameLine(r, x) {
  if (!r) return '<span class="ti-name">A restaurant no longer on our pages</span>';
  return '<a class="ti-name" href="' + esc(r.href || "/") + '">' + esc(r.name) + "</a>" +
    '<span class="ti-meta">' + starIcons(starsOf(r)) + (r.gone ? " " + esc(t("formerly")) : r.cuisine ? " " + esc(r.cuisine) : "") + " · " + esc(r.where || "") + "</span>";
}
// "Dinner £195 · wine pairing £150", in the restaurant's own currency.
function priceLine(r, meal) {
  const p = mealPrice(r, meal);
  if (p.why) return '<span class="ti-price muted">' + esc(mealWord(meal) + ": " + p.why) + "</span>";
  const w = wineOf(r, meal);
  return '<span class="ti-price">' + esc(mealWord(meal) + " " + localMoney(p.n, r.cur) + (p.type === "main" ? " a main course" : p.type === "spend" ? " typical spend" : "") +
    (w != null ? " · wine pairing " + localMoney(w, r.cur) : "")) + "</span>";
}
function calLinks(t, x, i) {
  const ev = eventOf(t, x);
  if (!ev) return "";
  return '<span class="ti-cal"><button type="button" class="linkish" data-ics="' + i + '">Add to calendar</button>' +
    '<a href="' + esc(googleCal(ev)) + '" target="_blank" rel="noopener" data-gcal="' + i + '">Google Calendar ↗</a></span>';
}

// ---------- The bill ----------
// Each restaurant's meal (and wine pairing, if chosen) in one currency, with each country's usual service, tax and tips on top.
function billHtml(t) {
  const c = billCurrency(t), people = t.people || 1;
  const items = t.items.map((x) => {
    const r = infoOf(x.r), meal = mealOf(t, x), p = mealPrice(r, meal);
    if (p.why) return { x, r, meal, why: p.why };
    const w = t.wine ? wineOf(r, meal) : null, own = p.n + (w || 0), rate = fx(r.cur, c);
    const [kind, pct] = p.type === "spend" ? ["spend", 0] : SERVICE[r.country] || ["before", 0];
    return { x, r, meal, amount: own * rate, extra: kind === "spend" ? 0 : own * rate * serviceAdd(r.country), approx: r.cur !== c, kind, pct, type: p.type,
      noWine: t.wine && w == null ? (r.noPairing ? "no pairing offered" : "no pairing listed") : "" };
  });
  const counted = items.filter((b) => !b.why), approx = counted.some((b) => b.approx);
  const sub = counted.reduce((a, b) => a + b.amount, 0), extra = counted.reduce((a, b) => a + b.extra, 0);
  const kindNote = (b) => b.kind === "included" ? t_("billIncluded") : b.kind === "tax" ? t_("billTax") : b.kind === "spend" ? t_("typicalSpend") : !b.pct ? "" :
    t_({ before: "billBefore", plusplus: "billPlus", taxtip: "billTaxTip", tip: "billTip" }[b.kind], { p: b.pct.toLocaleString("en-GB") });
  const sep = '<span class="sr-only">, </span>';
  const line = (k, v, note, cls) => '<span class="rc-line' + (cls ? " " + cls : "") + '"><span class="rc-k">' + esc(k) + '</span><span class="rc-dots" aria-hidden="true"></span>' + sep +
    '<span class="rc-v' + (v == null ? " muted" : "") + '">' + (v == null ? "–" : v) + "</span>" + (note ? sep + '<span class="rc-note">' + esc(note) + "</span>" : "") + "</span>";
  const order = DATA.switchable.concat(Object.keys(DATA.currencies).filter((k) => !DATA.switchable.includes(k)).sort());
  const curLabel = (k) => { const s = DATA.currencies[k].symbol.trim(); return s === k ? k : s + " " + k; };
  const date = new Date(DATA.rateDate + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return '<div class="bill-controls">' +
      '<label class="bill-wine"><input type="checkbox" id="tWine"' + (t.wine ? " checked" : "") + "> " + esc(t_("billWine")) + "</label>" +
      '<label class="near-sel"><span>Currency</span><select id="tCur">' + order.map((k) => '<option value="' + k + '"' + (k === c ? " selected" : "") + ">" + esc(curLabel(k)) + "</option>").join("") + "</select></label></div>" +
    '<div class="receipt bill"><span class="rc-paper"><span class="rc-head" aria-hidden="true">The Starred Bill · ' + esc(t.title) + "</span>" +
    items.map((b) => line((b.x.day ? shortDay(b.x.day) + " · " : "") + (b.r ? b.r.name : "Restaurant"), b.why ? null : money(b.amount, c, b.approx),
      [mealWord(b.meal), b.why || kindNote(b), b.type === "main" ? "one main course" : "", b.noWine].filter(Boolean).join(" · "), "bill-line" + (b.why ? " out" : ""))).join("") +
    (counted.length ? line(t_("billSubtotal"), money(sub, c, approx), "", "rc-sub") + line(t_("billExtras"), money(extra, c, approx)) +
      line("Total per person", money(sub + extra, c, approx), "", "rc-total") +
      (people > 1 ? line("For " + people + " people", money((sub + extra) * people, c, approx), "", "rc-total") : "") : "") +
    '<span class="rc-foot">' + esc(counted.length + " of " + plural(items.length, "restaurant") + " counted. Menu prices per person; service, tax and tips are our estimate of what each country usually adds.") +
      (approx ? "<br>" + esc(t_("rateLineMixed", { sym: symbolOf(c).trim(), date })) : "") + "</span></span></div>";
}
// The site's words (t() in common.js), for where `t` is the trip.
const t_ = (k, v) => t(k, v);

// ---------- Drawing: the views ----------
function renderOut() {
  head("Trips", "Plan a trip", "Group the restaurants you're saving into trips, like “Paris, May 2027”: give each a day and a time, see the whole trip's bill with service, add your bookings to your calendar, and share it with the people you're going with.");
  $("tripsBody").innerHTML = '<div class="trip-sec trip-intro"><ul class="trip-points">' +
      "<li><strong>Dates and bookings.</strong> Put each restaurant on a day, with a time, and tick it off once it's booked.</li>" +
      "<li><strong>The whole bill.</strong> Lunch or dinner, with or without wine pairings, in your currency, with each country's usual service on top.</li>" +
      "<li><strong>In your calendar.</strong> Add every booking to Apple, Google or Outlook calendars in a tap.</li>" +
      "<li><strong>Share it.</strong> A link the people you're going with can open, no account needed. Or publish a list, like your top 10 London lunches.</li></ul>" +
    '<p>Trips are free with an account, and work on every device you sign in on.</p><button type="button" class="cta-btn" data-signin="trip">Sign in to plan a trip</button></div>' + rulesHtml();
}

function cardHtml(t) {
  const n = t.items.length, booked = t.items.filter((x) => x.booked).length;
  const names = t.items.slice(0, 4).map((x) => { const r = infoOf(x.r); return r ? r.name : ""; }).filter(Boolean);
  const meta = [isTrip(t) ? dateRange(t.starts_on, t.ends_on) || "No dates yet" : "List", plural(n, "restaurant"), booked ? booked + " booked" : ""].filter(Boolean).join(" · ");
  return '<li><a class="trip-card" href="/trips/?t=' + esc(t.id) + '"><span class="tc-title">' + esc(t.title) + "</span>" +
    '<span class="tc-meta">' + esc(meta) + (t.share_code ? ' <span class="tc-shared">Shared</span>' : "") + "</span>" +
    (names.length ? '<span class="tc-names">' + esc(names.join(", ") + (n > names.length ? " and " + (n - names.length) + " more" : "")) + "</span>" : "") + "</a></li>";
}
function newFormHtml() {
  return '<form class="trip-sec trip-new" id="newTrip" novalidate><h2>Start a new trip or list</h2>' +
    '<fieldset class="tn-kind"><legend class="sr-only">Trip or list</legend>' +
      '<label class="rf-kind"><input type="radio" name="tnKind" value="trip" checked> A trip, with dates</label>' +
      '<label class="rf-kind"><input type="radio" name="tnKind" value="list"> A list to share, like “My top 10 London lunches”</label></fieldset>' +
    '<div class="tn-fields"><label class="tn-name"><span>Name</span><input id="tnTitle" type="text" maxlength="120" autocomplete="off" placeholder="Paris, May 2027"></label>' +
      '<label class="tn-date"><span>From</span><input id="tnFrom" type="date"></label><label class="tn-date"><span>To</span><input id="tnTo" type="date"></label></div>' +
    '<p class="tn-error" id="tnError" aria-live="polite"></p>' +
    '<button type="submit" class="cta-btn"' + (TP.creating ? " disabled" : "") + ">Create</button></form>";
}
function renderList() {
  head("Trips", "Your trips", "Group your saved restaurants into trips and lists: dates, bookings, the whole bill, and a link to share with the people you're going with.");
  if (TP.failed) { $("tripsBody").innerHTML = '<p class="acct-loading">Your trips couldn\'t load just now. Please reload the page to try again.</p>'; return; }
  if (!TP.trips) { $("tripsBody").innerHTML = '<p class="acct-loading">Loading your trips…</p>'; return; }
  const trips = TP.trips.filter((t) => isTrip(t)), lists = TP.trips.filter((t) => !isTrip(t));
  const group = (title, rows) => rows.length ? '<section class="trip-sec"><h2>' + title + ' <span class="count">' + rows.length + '</span></h2><ul class="trip-cards">' + rows.map(cardHtml).join("") + "</ul></section>" : "";
  const empty = !TP.trips.length ? '<p class="trip-empty">You haven\'t planned a trip yet. Give it a name below, then add restaurants from your wishlist or search for them.' +
    (loadWishlist().length ? " You have " + plural(loadWishlist().length, "restaurant") + " on your wishlist to start from." : "") + "</p>" : "";
  $("tripsBody").innerHTML = empty + (TP.trips.length ? group("Your trips", trips) + group("Your lists", lists) + newFormHtml() : newFormHtml()) + rulesHtml();
  syncNewForm();
}
function syncNewForm() {
  const f = $("newTrip");
  if (!f) return;
  const list = f.querySelector("input[name=tnKind]:checked").value === "list";
  f.querySelectorAll(".tn-date").forEach((l) => { l.hidden = list; });
  $("tnTitle").placeholder = list ? "My top 10 London lunches" : "Paris, May 2027";
}

function itemHtml(t, x, i, ro) {
  const r = infoOf(x.r), meal = mealOf(t, x), trip = isTrip(t), n = t.items.length;
  const num = '<span class="ti-n" aria-hidden="true">' + (i + 1) + "</span>";
  if (ro) {
    const when = trip ? [x.time || "", mealWord(meal)].filter(Boolean).join(" · ") : "";  // the day is the heading above
    return '<li class="ti">' + num + '<div class="ti-body"><div class="ti-head"><div class="ti-who">' + nameLine(r, x) + "</div></div>" +
      (when || x.booked ? '<p class="ti-when">' + esc(when) + (x.booked ? ' <span class="ti-booked-tag">Booked</span>' : "") + "</p>" : "") +
      (x.note ? '<p class="ti-note-ro">' + esc(x.note) + "</p>" : "") + bwHtml(t, x, ro) +
      '<div class="ti-foot">' + priceLine(r, meal) + (trip ? calLinks(t, x, i) : "") + "</div></div></li>";
  }
  const lim = (t.starts_on ? ' min="' + t.starts_on + '"' : "") + (t.ends_on ? ' max="' + t.ends_on + '"' : "");
  const name = r ? r.name : "this restaurant";
  return '<li class="ti" data-i="' + i + '">' + num + '<div class="ti-body"><div class="ti-head"><div class="ti-who">' + nameLine(r, x) + "</div>" +
      '<span class="ti-acts">' + (trip ? "" : '<button type="button" class="ti-move" data-move="-1" aria-label="Move ' + esc(name) + ' up"' + (i ? "" : " disabled") + ">↑</button>" +
        '<button type="button" class="ti-move" data-move="1" aria-label="Move ' + esc(name) + ' down"' + (i < n - 1 ? "" : " disabled") + ">↓</button>") +
      '<button type="button" class="ti-rm" data-rm="' + i + '" aria-label="Take ' + esc(name) + ' out" title="Take it out">×</button></span></div>' +
    (trip ? '<div class="ti-fields">' +
      '<label><span>Day</span><input type="date" data-f="day" value="' + esc(x.day || "") + '"' + lim + "></label>" +
      '<label><span>Time</span><input type="time" data-f="time" step="900" value="' + esc(x.time || "") + '"></label>' +
      '<div class="seg" role="group" aria-label="Meal">' + ["lunch", "dinner"].map((m) => '<button type="button" data-meal="' + m + '" aria-pressed="' + (meal === m) + '">' + mealWord(m) + "</button>").join("") + "</div>" +
      '<label class="ti-booked"><input type="checkbox" data-f="booked"' + (x.booked ? " checked" : "") + "> Booked</label></div>" : "") +
    '<label class="sr-only" for="tiNote' + i + '">Note on ' + esc(name) + '</label><input class="ti-note" id="tiNote' + i + '" data-f="note" type="text" maxlength="300" autocomplete="off" value="' + esc(x.note || "") + '" placeholder="' +
      (trip ? "A note, e.g. ask for the counter seats" : "Why it's on the list") + '">' + bwHtml(t, x, ro) +
    '<div class="ti-foot">' + priceLine(r, meal) + (trip ? calLinks(t, x, i) : "") + "</div></div></li>";
}
// When bookings open for each restaurant on its day, or the trip's first day (booking windows, 10 Oct 2026): from
// /data/booking.json (write_booking_data() in build.py), loaded with the trip, and bwOpens() in common.js. Members can ask
// for an email the day before under Star emails on Your account (scripts/booking_reminders.py sends them).
let bwData = null, bwLoading = null;
function loadWindows() {
  if (!bwLoading && DATA.bookingUrl) bwLoading = getData(DATA.bookingUrl).then((d) => { bwData = d || {}; renderItems(); }).catch(() => { bwLoading = null; });
}
function bwHtml(t, x, ro) {
  const w = bwData && bwData[x.r], day = x.day || t.starts_on, today = new Date().toLocaleDateString("en-CA");
  if (!w || !isTrip(t) || x.booked || !day || day < today || !["rolling", "monthly"].includes(w.bw.type)) return "";
  const on = bwOpens(w.bw, day);
  if (!on) return "";
  const first = x.day ? "" : " for the trip's first day";
  const text = on <= today ? "Bookings are open" + first + ": book now." :
    "Bookings open" + first + " on " + bwLong(on) + (w.bw.time ? " at " + bwClock(w.bw.time) + " " + bwZone(w.bw.tz) + bwYourTime(on, w.bw) : "") + ".";
  return '<p class="ti-bw">' + esc(text) + (!ro && on > today ? ' <a href="/account/#emails">Email me the day before</a>' : "") + "</p>";
}
// Day headings between a trip's restaurants ("Friday 14 May 2027", then "Not on a day yet").
function itemsHtml(t, ro) {
  loadWindows();
  if (!t.items.length) return '<p class="trip-empty">' + (ro ? "Nothing on it yet." : "No restaurants yet. Add some from your wishlist or search for them below.") + "</p>";
  let last = null;
  return '<ol class="trip-items">' + t.items.map((x, i) => {
    let h = "";
    if (isTrip(t) && (x.day || "") !== last && (x.day || last !== null)) h = '<li class="ti-day"><h3>' + esc(x.day ? longDay(x.day) : "Not on a day yet") + "</h3></li>";
    last = x.day || "";
    return h + itemHtml(t, x, i, ro);
  }).join("") + "</ol>";
}
function addHtml(t) {
  if (t.items.length >= MAX_ITEMS) return '<p class="trip-empty">That\'s ' + MAX_ITEMS + " restaurants, the most a trip or list can hold.</p>";
  const inIt = new Set(itemIds(t));
  const wish = loadWishlist().filter((id) => !inIt.has(id)).map((id) => [id, TP.names && TP.names.get(id)]).filter(([, n]) => n && !n.status);
  const q = TP.query.trim().toLowerCase();
  const found = q.length >= 2 && TP.names ? [...TP.names.values()].filter((n) => !n.status && !inIt.has(n.id) && [n.name, n.cityName, n.area].join(" ").toLowerCase().includes(q))
    .sort((a, b) => (a.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.name.toLowerCase().startsWith(q) ? 0 : 1) || b.stars - a.stars).slice(0, 8) : [];
  const chip = (id, n) => '<li><button type="button" class="cmp-chip trip-chip" data-add="' + esc(id) + '"><span class="cc-text"><span class="cc-name">' + esc(n.name) + '</span><span class="cc-sub">' +
    starIcons(n.stars) + " " + esc(n.cityName || "") + '</span></span><span class="tc-plus" aria-hidden="true">+</span><span class="sr-only">Add</span></button></li>';
  return (wish.length ? '<h3 class="sub-head">From your wishlist</h3><ul class="cmp-pick">' + wish.slice(0, 40).map(([id, n]) => chip(id, n)).join("") + "</ul>" : "") +
    '<h3 class="sub-head">Search every starred restaurant</h3><label class="search cmp-filter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
    '<input id="tQ" type="search" autocomplete="off" placeholder="A restaurant or a city" aria-label="Search for a restaurant to add" value="' + esc(TP.query) + '"></label>' +
    '<ul class="cmp-pick" id="tFound" aria-live="polite">' + (q.length >= 2 ? (!TP.names ? '<li class="cmp-none">Loading…</li>' : found.length ? found.map((n) => chip(n.id, n)).join("") : '<li class="cmp-none">No starred restaurants match “' + esc(TP.query) + "”.</li>") : "") + "</ul>";
}
function shareHtml(t) {
  const what = isTrip(t) ? "trip" : "list";
  if (!t.share_code) return '<h2>Share this ' + what + "</h2><p>Send a read-only copy to the people you're going with" + (isTrip(t) ? "" : ", or to anyone you like") +
    ". Anyone with the link can see its name, " + (isTrip(t) ? "dates, restaurants, times" : "restaurants") + " and notes, with their prices: never your email, wishlist or diary. " +
    'You can stop sharing at any time. Please read the <a href="#rules">rules for shared trips and lists</a> first.</p><button type="button" class="cta-btn" id="tShareOn">Share this ' + what + "</button>";
  const link = location.origin + "/trips/?s=" + t.share_code;
  return "<h2>Shared</h2><p>Anyone with this link can see this " + what + ", read-only, without an account. Changes you make show there straight away.</p>" +
    '<div class="trip-link"><label class="sr-only" for="tLink">Share link</label><input id="tLink" type="text" readonly value="' + esc(link) + '">' +
    '<button type="button" class="btn-line" id="tCopy">Copy link</button>' + (navigator.share ? '<button type="button" class="btn-line" id="tShareNative">Share…</button>' : "") + "</div>" +
    '<p><a href="' + esc(link) + '" target="_blank" rel="noopener">See it as others will</a> · <button type="button" class="linkish" id="tShareOff">Stop sharing</button></p>';
}
function allCalHtml(t) {
  const evs = t.items.map((x) => eventOf(t, x)).filter(Boolean);
  return evs.length > 1 ? '<p class="trip-allcal"><button type="button" class="btn-line" id="tAllCal">Add ' + (evs.length === 2 ? "both" : "all " + evs.length) + " to your calendar</button> <span>One file for Apple, Google or Outlook calendars.</span></p>" : "";
}

function renderTrip() {
  const t = TP.trip;
  head(isTrip(t) ? "Your trip" : "Your list", t.title, isTrip(t) ? [dateRange(t.starts_on, t.ends_on) || "No dates yet", plural(t.people || 1, "person", "people")].join(" · ") : plural(t.items.length, "restaurant"));
  document.title = t.title + " · The Starred Bill";
  const peopleOpts = Array.from({ length: 12 }, (_, i) => i + 1).map((n) => '<option value="' + n + '"' + (n === (t.people || 1) ? " selected" : "") + ">" + n + "</option>").join("");
  $("tripsBody").innerHTML = '<p class="trip-back"><a href="/trips/">← All your trips and lists</a></p>' +
    '<section class="trip-sec trip-details"><div class="td-fields">' +
      '<label class="td-name"><span>Name</span><input id="tTitle" type="text" maxlength="120" autocomplete="off" value="' + esc(t.title) + '"></label>' +
      (isTrip(t) ? '<label><span>From</span><input id="tFrom" type="date" value="' + esc(t.starts_on || "") + '"></label>' +
        '<label><span>To</span><input id="tTo" type="date" value="' + esc(t.ends_on || "") + '"></label>' +
        '<label><span>People</span><select id="tPeople">' + peopleOpts + "</select></label>"
        : '<div class="td-meal"><span>Prices for</span><div class="seg" role="group" aria-label="Prices for">' + ["lunch", "dinner"].map((m) => '<button type="button" data-listmeal="' + m + '" aria-pressed="' + (t.meal === m) + '">' + mealWord(m) + "</button>").join("") + "</div></div>") +
    '</div><label class="td-note"><span>About this ' + (isTrip(t) ? "trip" : "list") + ' <small>(shown on the shared page)</small></span><textarea id="tNote" rows="2" maxlength="2000">' + esc(t.note || "") + "</textarea></label>" +
    '<p class="trip-status" id="tStatus" aria-live="polite">' + esc(TP.status) + "</p></section>" +
    '<section class="trip-sec"><h2>Restaurants <span class="count" id="tCount">' + t.items.length + '</span></h2><div id="tItems"></div><div id="tCalBox"></div></section>' +
    '<section class="trip-sec trip-add"><h2>Add restaurants</h2><div id="tAdd"></div></section>' +
    (isTrip(t) ? '<section class="trip-sec trip-bill"><h2>The trip\'s bill</h2><p class="bill-intro">What it all comes to, with each country\'s usual service, tax and tips estimated on top.</p><div id="tBill"></div></section>' : "") +
    '<section class="trip-sec trip-share" id="tShare"></section>' +
    '<section class="trip-sec trip-danger"><div id="tDelete"></div></section>' + rulesHtml();
  renderItems(); renderAdd(); renderBill(); renderShare(); renderDelete();
}
function renderItems() {
  const t = cur();
  if (!$("tItems")) return;
  $("tItems").innerHTML = itemsHtml(t, !editing());
  if ($("tCount")) $("tCount").textContent = t.items.length;
  if ($("tCalBox")) $("tCalBox").innerHTML = isTrip(t) ? allCalHtml(t) : "";
}
function renderAdd() { if ($("tAdd")) $("tAdd").innerHTML = addHtml(TP.trip); }
function renderFound() {
  // Redraw just the results, so the search box keeps its place while typing.
  const box = document.createElement("div");
  box.innerHTML = addHtml(TP.trip);
  const fresh = box.querySelector("#tFound");
  if ($("tFound") && fresh) $("tFound").innerHTML = fresh.innerHTML;
}
function renderBill() { const t = cur(); if ($("tBill") && isTrip(t)) $("tBill").innerHTML = t.items.length ? billHtml(t) : '<p class="trip-empty">Add restaurants to see what the trip comes to.</p>'; }
function renderShare() { if ($("tShare") && editing()) $("tShare").innerHTML = shareHtml(TP.trip); }
function renderDelete() {
  if (!$("tDelete")) return;
  const what = isTrip(TP.trip) ? "trip" : "list";
  $("tDelete").innerHTML = TP.confirmDelete
    ? '<div class="acct-confirm" role="alertdialog" aria-labelledby="tDelQ"><p id="tDelQ">Delete “' + esc(TP.trip.title) + "”? " + (TP.trip.share_code ? "Its share link will stop working. " : "") +
      "The restaurants stay on your wishlist.</p><div class=\"acct-actions\"><button type=\"button\" class=\"btn-line danger solid\" id=\"tDelYes\">Delete it</button><button type=\"button\" class=\"btn-line\" id=\"tDelNo\">Keep it</button></div></div>"
    : '<button type="button" class="btn-line danger" id="tDel">Delete this ' + what + "</button>";
}

function renderShared() {
  const t = TP.shared;
  if (!t) {
    head("Trips", "This link doesn't work", "");
    $("tripsBody").innerHTML = '<div class="trip-sec"><p>' + (TP.failed ? "It couldn't load just now. Please try again in a moment." :
      "The trip or list it led to is no longer shared, or the link is incomplete. Ask the person who sent it for a new one.") +
      '</p><p><a class="btn-line" href="/trips/">Plan your own trip</a></p></div>';
    return;
  }
  const trip = isTrip(t);
  head(trip ? "A shared trip" : "A shared list", t.title, [trip ? dateRange(t.starts_on, t.ends_on) : "", trip ? plural(t.people || 1, "person", "people") : plural(t.items.length, "restaurant")].filter(Boolean).join(" · "));
  document.title = t.title + " · The Starred Bill";
  const updated = t.updated_at ? new Date(t.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const inWish = itemIds(t).filter((id) => loadWishlist().includes(id)).length, starred = itemIds(t).filter((id) => TP.byId.has(id)).length;
  $("tripsBody").innerHTML = (t.note ? '<p class="trip-about">' + esc(t.note) + "</p>" : "") +
    '<section class="trip-sec"><h2>Restaurants <span class="count">' + t.items.length + '</span></h2><div id="tItems"></div><div id="tCalBox"></div></section>' +
    (trip ? '<section class="trip-sec trip-bill"><h2>What it comes to</h2><p class="bill-intro">Per person, with each country\'s usual service, tax and tips estimated on top.</p><div id="tBill"></div></section>' : "") +
    '<section class="trip-sec trip-keep"><h2>Keep it</h2><div class="acct-actions">' +
      (starred && inWish < starred ? '<button type="button" class="btn-line" id="sWish">Save ' + (starred - inWish === 1 ? "it" : "all " + (starred - inWish)) + " to my wishlist</button>" : starred ? '<span class="al-been">On your wishlist</span>' : "") +
      '<button type="button" class="btn-line" id="sCopy">Copy to my trips</button></div>' +
      "<p>Copying makes your own " + (trip ? "trip" : "list") + " to change as you like" + (acctSignedIn() ? "." : " (free with an account).") + "</p></section>" +
    '<p class="trip-small">Shared from The Starred Bill' + (updated ? ", last changed " + esc(updated) : "") + ". Prices are per person, from each restaurant's menus as we last checked them: please check with the restaurant before you book. " +
      '<a href="mailto:hello@starredbill.com?subject=' + encodeURIComponent("A shared page: " + location.origin + "/trips/?s=" + TP.code) + '">Report this page</a></p>' + rulesHtml();
  renderItems(); renderBill();
}

function render() {
  applyI18n();
  renderWishCount();
  if (TP.code) { if (TP.shared !== undefined) renderShared(); return; }
  if (!account.ready) { $("tripsBody").innerHTML = '<p class="acct-loading">Loading…</p>'; return; }
  if (!acctSignedIn()) { TP.trips = null; TP.trip = null; renderOut(); return; }
  if (TP.id) {
    if (TP.trip) return;  // drawn once; its pieces redraw themselves
    if (!TP.trips && !TP.failed) { $("tripsBody").innerHTML = '<p class="acct-loading">Loading your trip…</p>'; return; }
    if (TP.trips) {
      const found = TP.trips.find((t) => t.id === TP.id);
      if (!found) { head("Trips", "Trip not found", ""); $("tripsBody").innerHTML = '<p class="trip-sec">It may have been deleted. <a href="/trips/">See all your trips and lists</a>.</p>'; return; }
      TP.trip = Object.assign({}, found, { items: (found.items || []).map((x) => Object.assign({}, x)) });
      $("tripsBody").innerHTML = '<p class="acct-loading">Loading its restaurants…</p>';
      Promise.all([loadTripData(TP.trip), loadNames()]).then(renderTrip);
      return;
    }
  }
  renderList();
}

// ---------- Saving ----------
// Every change is saved a moment later (and straight away when leaving the page).
let saveTimer = null, dirty = false;
function setStatus(s) { TP.status = s; if ($("tStatus")) $("tStatus").textContent = s; }
function queueSave(delay) {
  dirty = true;
  setStatus("Saving…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, delay == null ? 700 : delay);
}
const clean = (x) => {
  const o = { r: x.r };
  if (x.day) o.day = x.day;
  if (x.time) o.time = x.time;
  if (x.meal) o.meal = x.meal;
  if (x.booked) o.booked = true;
  if (x.note && x.note.trim()) o.note = x.note.trim().slice(0, 300);
  return o;
};
async function saveNow() {
  clearTimeout(saveTimer);
  const t = TP.trip;
  if (!t || !dirty) return;
  dirty = false;
  const row = { title: (t.title || "").trim().slice(0, 120) || "My trip", starts_on: isTrip(t) ? t.starts_on || null : null, ends_on: isTrip(t) ? t.ends_on || null : null,
    people: t.people || 2, meal: t.meal || "dinner", wine: !!t.wine, currency: t.currency || null, note: (t.note || "").trim().slice(0, 2000) || null, items: t.items.map(clean) };
  if (row.starts_on && row.ends_on && row.ends_on < row.starts_on) row.ends_on = row.starts_on;
  const { error } = await account.client.from("trips").update(row).eq("id", t.id);
  if (error) { dirty = true; setStatus("Couldn't save just now. We'll try again with your next change."); return; }
  const kept = TP.trips && TP.trips.find((x) => x.id === t.id);
  if (kept) Object.assign(kept, row);
  setStatus("Saved");
}
window.addEventListener("pagehide", () => { if (dirty) saveNow(); });

// ---------- Changes ----------
function addItem(id, from) {
  const t = TP.trip;
  if (!t || t.items.some((x) => x.r === id) || t.items.length >= MAX_ITEMS) return;
  t.items.push(isTrip(t) ? { r: id, meal: t.meal || "dinner" } : { r: id });
  sortTrip(t);
  loadIds([id]).catch(() => {}).then(() => { renderItems(); renderAdd(); renderBill(); });
  queueSave(200);
  track("trip", { action: "add", from, kind: t.kind });
}
async function createTrip(e) {
  e.preventDefault();
  const kind = document.querySelector("input[name=tnKind]:checked").value, title = $("tnTitle").value.trim();
  const from = kind === "trip" ? $("tnFrom").value : "", to = kind === "trip" ? $("tnTo").value : "";
  if (!title) { $("tnError").textContent = "Please give it a name."; $("tnTitle").focus(); return; }
  if (from && to && to < from) { $("tnError").textContent = "The end date is before the start."; $("tnTo").focus(); return; }
  TP.creating = true;
  e.target.querySelector("button[type=submit]").disabled = true;
  const { data, error } = await account.client.from("trips").insert({ kind, title: title.slice(0, 120), starts_on: from || null, ends_on: to || from || null,
    meal: "dinner", currency: homeCurrency() || null, items: [] }).select("id").single();
  TP.creating = false;
  if (error) { $("tnError").textContent = /100 trips/.test(error.message || "") ? "You can keep up to 100 trips and lists. Delete one to start another." : "That didn't work. Please try again in a moment."; e.target.querySelector("button[type=submit]").disabled = false; return; }
  track("trip", { action: "create", kind });
  location.href = "/trips/?t=" + data.id;
}
async function copyShared() {
  if (!acctSignedIn()) { store.set(COPY_KEY, { code: TP.code, at: Date.now() }); openSignIn("trip"); return; }
  const s = TP.shared;
  const { data, error } = await account.client.from("trips").insert({ kind: s.kind, title: s.title, starts_on: s.starts_on, ends_on: s.ends_on, people: s.people, meal: s.meal,
    wine: s.wine, currency: s.currency, note: s.note, items: s.items.map(clean) }).select("id").single();
  if (error) { acctNotice(/100 trips/.test(error.message || "") ? "You already have 100 trips and lists. Delete one to copy this." : "That didn't work. Please try again in a moment."); return; }
  track("trip", { action: "copy", kind: s.kind });
  location.href = "/trips/?t=" + data.id;
}

document.addEventListener("submit", (e) => { if (e.target.id === "newTrip") createTrip(e); });
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.name === "tnKind") { syncNewForm(); return; }
  if (el.id === "tCur") {
    const c = el.value;
    if (editing()) { TP.trip.currency = c; queueSave(); } else TP.cur = c;
    renderBill(); track("currency", { currency: c, page: "trips" }); prefChosen("currency", c);
    return;
  }
  if (el.id === "tWine") { cur().wine = el.checked; if (editing()) queueSave(); renderBill(); return; }
  if (!editing()) return;
  const t = TP.trip;
  if (el.id === "tFrom" || el.id === "tTo") {
    t.starts_on = $("tFrom").value || null; t.ends_on = $("tTo").value || null;
    if (t.starts_on && t.ends_on && t.ends_on < t.starts_on) { t.ends_on = t.starts_on; $("tTo").value = t.starts_on; }
    head("Your trip", t.title, [dateRange(t.starts_on, t.ends_on) || "No dates yet", plural(t.people || 1, "person", "people")].join(" · "));
    renderItems(); queueSave(); return;
  }
  if (el.id === "tPeople") { t.people = Number(el.value); head("Your trip", t.title, [dateRange(t.starts_on, t.ends_on) || "No dates yet", plural(t.people, "person", "people")].join(" · ")); renderBill(); queueSave(); return; }
  const li = el.closest("li.ti[data-i]");
  if (!li || !el.dataset.f) return;
  const x = t.items[Number(li.dataset.i)];
  if (el.dataset.f === "booked") { x.booked = el.checked; queueSave(); return; }
  if (el.dataset.f === "day" || el.dataset.f === "time") {
    x[el.dataset.f] = el.value || null;
    sortTrip(t); renderItems(); renderBill(); queueSave();
  }
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "tQ") { TP.query = el.value; if (!TP.names) loadNames().then(renderFound); renderFound(); return; }
  if (!editing()) return;
  const t = TP.trip;
  if (el.id === "tTitle") { if (el.value.trim()) { t.title = el.value; $("tripsH1").textContent = el.value.trim(); document.title = el.value.trim() + " · The Starred Bill"; queueSave(900); } return; }
  if (el.id === "tNote") { t.note = el.value; queueSave(900); return; }
  const li = el.closest("li.ti[data-i]");
  if (li && el.dataset.f === "note") { t.items[Number(li.dataset.i)].note = el.value; queueSave(900); }
});
document.addEventListener("click", async (e) => {
  const el = e.target.closest("button, a[data-gcal]");
  if (!el) return;
  const t = cur();
  if (el.dataset.lang) { setLang(el.dataset.lang); return; }
  if (el.dataset.gcal != null) {
    // Built afresh, so a note or "booked" ticked since the list was drawn goes in too.
    const ev = eventOf(t, t.items[Number(el.dataset.gcal)]);
    if (ev) el.href = googleCal(ev);
    track("trip", { action: "calendar", via: "google" });
    return;
  }
  if (el.dataset.ics != null) {
    const x = t.items[Number(el.dataset.ics)], ev = eventOf(t, x), r = infoOf(x.r);
    if (ev) { saveIcs([ev], (r ? r.name : "booking") + "-" + x.day); track("trip", { action: "calendar", via: "ics" }); }
    return;
  }
  if (el.id === "tAllCal") { saveIcs(t.items.map((x) => eventOf(t, x)).filter(Boolean), t.title); track("trip", { action: "calendar", via: "ics-all" }); return; }
  if (el.id === "sWish") {
    const wl = loadWishlist(), add = itemIds(t).filter((id) => TP.byId.has(id) && !wl.includes(id));
    setWishlist(wl.concat(add)); renderWishCount(); renderShared();
    acctNotice(plural(add.length, "restaurant") + " saved to your wishlist.");
    track("trip", { action: "wishlist", n: add.length });
    return;
  }
  if (el.id === "sCopy") { copyShared(); return; }
  if (!editing()) return;
  if (el.dataset.add) { addItem(el.dataset.add, el.closest("#tFound") ? "search" : "wishlist"); return; }
  if (el.dataset.meal) {
    const x = t.items[Number(el.closest("li.ti").dataset.i)];
    x.meal = el.dataset.meal;
    sortTrip(t); renderItems(); renderBill(); queueSave(); return;
  }
  if (el.dataset.listmeal) {
    t.meal = el.dataset.listmeal;
    document.querySelectorAll("[data-listmeal]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.listmeal === t.meal)));
    renderItems(); queueSave(); return;
  }
  if (el.dataset.rm != null) {
    const i = Number(el.dataset.rm), [gone] = t.items.splice(i, 1), r = infoOf(gone.r);
    renderItems(); renderAdd(); renderBill(); queueSave(200);
    acctNotice((r ? r.name : "It") + " is out of “" + t.title + "”.");
    return;
  }
  if (el.dataset.move) {
    const i = Number(el.closest("li.ti").dataset.i), j = i + Number(el.dataset.move);
    if (j < 0 || j >= t.items.length) return;
    [t.items[i], t.items[j]] = [t.items[j], t.items[i]];
    renderItems(); queueSave();
    const btn = document.querySelector('li.ti[data-i="' + j + '"] [data-move="' + el.dataset.move + '"]') || document.querySelector('li.ti[data-i="' + j + '"] .ti-move');
    if (btn) btn.focus();
    return;
  }
  if (el.id === "tShareOn") {
    el.disabled = true;
    await saveNow();
    const { data, error } = await account.client.rpc("share_trip", { t: t.id });
    if (error || !data) { el.disabled = false; acctNotice("That didn't work. Please try again in a moment."); return; }
    t.share_code = data;
    const kept = TP.trips.find((x) => x.id === t.id); if (kept) kept.share_code = data;
    renderShare(); $("tLink").select();
    track("trip", { action: "share", kind: t.kind });
    return;
  }
  if (el.id === "tShareOff") {
    const { error } = await account.client.rpc("unshare_trip", { t: t.id });
    if (error) { acctNotice("That didn't work. Please try again in a moment."); return; }
    t.share_code = null;
    renderShare();
    acctNotice("Sharing stopped. The old link no longer works.");
    track("trip", { action: "unshare", kind: t.kind });
    return;
  }
  if (el.id === "tCopy") {
    const link = $("tLink").value;
    try { await navigator.clipboard.writeText(link); acctNotice("Link copied."); } catch (err) { $("tLink").select(); document.execCommand("copy"); acctNotice("Link copied."); }
    return;
  }
  if (el.id === "tShareNative") { try { await navigator.share({ title: t.title, text: t.title + " on The Starred Bill", url: $("tLink").value }); } catch (err) { /* closed */ } return; }
  if (el.id === "tDel") { TP.confirmDelete = true; renderDelete(); $("tDelYes").focus(); return; }
  if (el.id === "tDelNo") { TP.confirmDelete = false; renderDelete(); return; }
  if (el.id === "tDelYes") {
    el.disabled = true;
    clearTimeout(saveTimer); dirty = false;
    const { error } = await account.client.from("trips").delete().eq("id", t.id);
    if (error) { el.disabled = false; acctNotice("That didn't work. Please try again in a moment."); return; }
    track("trip", { action: "delete", kind: t.kind });
    location.href = "/trips/";
  }
});

// ---------- Start ----------
$("destLink").href = withLang("/") + "#destinations";
shareText = () => cur() && TP.code ? cur().title + " on The Starred Bill" : "Plan a trip around Michelin-starred restaurants";
shareUrl = () => location.origin + "/trips/" + (TP.code ? "?s=" + TP.code : "");
async function loadMine() {
  if (!acctSignedIn() || TP.trips || TP.loadingMine) return;
  TP.loadingMine = true;
  try {
    TP.trips = await fetchTrips();
    TP.failed = false;
    await loadIds(TP.trips.flatMap((t) => itemIds(t).slice(0, 4))).catch(() => {});
    if (TP.trips.some((t) => itemIds(t).slice(0, 4).some((id) => !TP.byId.has(id)))) await loadNames();
  } catch (e) { TP.failed = true; }
  TP.loadingMine = false;
  render();
}
if (TP.code) {
  TP.shared = undefined;
  fetchShared(TP.code).then(async (s) => {
    TP.shared = s;
    if (s) { s.items = s.items || []; await loadTripData(s); }
  }).catch(() => { TP.shared = null; TP.failed = true; }).then(render);
}
window.addEventListener("sb:account", () => {
  if (!acctSignedIn()) { TP.trips = null; TP.trip = null; }
  // Signed in to copy a shared trip: carry on with it.
  const pending = store.get(COPY_KEY, null);
  if (pending && acctSignedIn() && TP.code === pending.code && TP.shared && Date.now() - pending.at < 30 * 60 * 1000) { store.set(COPY_KEY, null); copyShared(); return; }
  if (TP.code) { render(); return; }
  render(); loadMine();
});
["sb:wishlist"].forEach((ev) => window.addEventListener(ev, () => { if (editing()) renderAdd(); else if (!TP.code && !TP.id) render(); }));
render();
if (account.ready) loadMine();
