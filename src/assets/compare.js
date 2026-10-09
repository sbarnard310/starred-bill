// /compare/: up to three restaurants from the visitor's wishlist as till receipts side by side, in one currency.
// The prices come from /data/compare/<n>.json (build_compare() in build.py). The ticked restaurants are kept in the
// address (?r=id,id,id), so a comparison can be shared, and in the browser for next time.

const MAX = 3;
const cmp = { rows: null, byId: new Map(), sel: [], shared: [], meal: "dinner", cur: "", query: "" };
const rates = Object.fromEntries(Object.entries(DATA.currencies).map(([k, v]) => [k, v.perUSD]));
const EURO_REGIONS = ["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];

shareText = () => cmp.sel.length > 1 ? "Michelin-starred restaurants side by side: " + selRows().map((r) => r.name).join(", ") : "Compare Michelin-starred restaurants side by side";
shareUrl = () => location.origin + location.pathname + (cmp.sel.length ? "?r=" + cmp.sel.map(encodeURIComponent).join(",") : "");

// ---------- Data ----------
// The restaurants are shared between small files by a number worked out from each id (compare_part() in build.py),
// so the page loads only the files holding the wishlist and any restaurants in a shared link.
const partOf = (id) => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 1000003; return h % DATA.compareParts.length; };
const parts = new Map();
function loadIds(ids) {
  const wanted = [...new Set(ids.map(partOf))];
  wanted.forEach((n) => {
    if (!parts.has(n)) parts.set(n, getData(DATA.compareParts[n]).then((d) => {
      d.r.forEach((a) => {
        const r = {};
        d.cols.forEach((c, i) => { r[c] = a[i]; });
        cmp.byId.set(r.id, r);
      });
    }).catch((err) => { parts.delete(n); throw err; }));
  });
  return Promise.all(wanted.map((n) => parts.get(n))).then(() => {
    cmp.rows = [...cmp.byId.values()];
    // The header's wishlist count leaves out restaurants that have lost their stars, as on other pages:
    // every starred restaurant on the wishlist is in a file that has loaded.
    DATA.knownIds = cmp.rows.map((r) => r.id);
    renderWishCount();
  });
}
const linkIds = () => (params.get("r") || "").split(",").map((s) => s.trim()).filter(Boolean);
const dataReady = loadIds(loadWishlist().concat(linkIds()));
const selRows = () => cmp.sel.map((id) => cmp.byId.get(id)).filter(Boolean);
// The restaurants to choose from: the wishlist, plus any from a shared link that aren't on it.
const pool = () => { const wl = loadWishlist(); return wl.concat(cmp.shared.concat(cmp.sel).filter((id, i, a) => !wl.includes(id) && a.indexOf(id) === i)).map((id) => cmp.byId.get(id)).filter(Boolean); };

// ---------- Currency ----------
// The visitor's own choice once made; before that the currency the ticked restaurants share, else a guess from the browser.
function guessCurrency() {
  const region = ((navigator.language || "").split("-")[1] || "").toUpperCase();
  return region === "US" ? "USD" : EURO_REGIONS.includes(region) ? "EUR" : "GBP";
}
function chooseCurrency() {
  const saved = store.get(PREFS_KEY, {}).compareCurrency;
  if (saved && DATA.currencies[saved]) return saved;
  if (homeCurrency()) return homeCurrency();
  const curs = [...new Set(selRows().map((r) => r.cur))];
  return curs.length === 1 ? curs[0] : guessCurrency();
}
const fx = (from) => rates[cmp.cur] / rates[from];
const conv = (r, n) => n == null ? null : r.cur === cmp.cur ? n : n * fx(r.cur);
function money(n, converted) {
  const sym = symbolOf(cmp.cur);
  if (converted) return "≈" + sym + Math.round(n).toLocaleString("en-GB");
  return sym + n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}
const curLabel = (k) => { const s = DATA.currencies[k].symbol.trim(); return s === k ? k : s + " " + k; };

// ---------- Prices ----------
const L = () => cmp.meal === "lunch";
// A meal's figure in the chosen currency, or why there isn't one. Only set menus count when looking for the lowest.
function mealValue(r, meal) {
  const lunch = meal === "lunch";
  if (lunch && r.noLunch) return { muted: t("rcptDinnerOnly") };
  const n = conv(r, lunch ? r.lunch : r.dinner);
  if (n == null) return { muted: t("notListed") };
  const type = lunch ? (r.lunchType || "menu") : r.dinnerType;
  return { n, text: money(n, r.cur !== cmp.cur), menu: type === "menu", extra: type === "main" ? t("perMain") : type === "spend" ? t("typicalSpend") : "" };
}
function figures(r) {
  const dinner = mealValue(r, "dinner"), lunch = mealValue(r, "lunch"), chosen = L() ? lunch : dinner;
  const w = conv(r, L() ? r.lunchWine : r.wine);
  const wine = w != null ? { n: w, text: money(w, r.cur !== cmp.cur), menu: true } : { muted: t(r.noPairing ? "rcptNoPairingOffered" : "rcptNoPairing") };
  const total = chosen.menu && w != null ? { n: chosen.n + w, text: money(chosen.n + w, r.cur !== cmp.cur), menu: true } : { dash: true };
  return { dinner, lunch, wine, total };
}
// Which restaurants are lowest on each line: only when two or more can be compared and they aren't all the same.
function lowest(all) {
  const best = {};
  ["dinner", "lunch", "wine", "total"].forEach((k) => {
    const vals = all.map((f) => f[k].menu ? Math.round(f[k].n) : null);
    const nums = vals.filter((v) => v != null);
    if (nums.length < 2 || nums.every((v) => v === nums[0])) return;
    const min = Math.min(...nums);
    best[k] = vals.map((v) => v === min);
  });
  return best;
}

// ---------- Receipts ----------
const sep = '<span class="sr-only">, </span>';
function line(label, v, note, cls) {
  const notes = [v.extra, note].filter(Boolean).join(" · ");
  return '<div class="rc-line' + (cls ? " " + cls : "") + '"><span class="rc-k">' + esc(label) + '</span><span class="rc-dots" aria-hidden="true"></span>' +
    (v.dash ? '<span class="rc-v muted" aria-hidden="true">–</span>' : sep + '<span class="rc-v' + (v.muted ? " muted" : "") + '">' + esc(v.muted || v.text) +
      (/\bbest\b/.test(cls) ? '<span class="sr-only"> (lowest)</span>' : "") + "</span>") +
    (notes ? sep + '<span class="rc-note">' + esc(notes) + "</span>" : "") + "</div>";
}
function receipt(r, f, best, i) {
  const mark = (k, on) => [on ? "on" : "", best[k] && best[k][i] ? "best" : ""].filter(Boolean).join(" ");
  const saved = loadWishlist().includes(r.id);
  const src = (url, type, label) => type === "member" && !url ? '<span class="src">Member’s report</span>' : url && type && type !== "none" ? '<a class="src" href="' + esc(url) + '" target="_blank" rel="noopener" title="Where this price came from">' + label + "</a>" : "";
  const sources = [src(r.source, r.sourceType, r.lunchSource && r.lunchSource !== r.source ? "Dinner source" : "Price source"),
    r.lunchSource !== r.source ? src(r.lunchSource, r.lunchSourceType, "Lunch source") : ""].filter(Boolean).join(" · ");
  const checked = PRICES_CHECKED.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return '<article class="cmp-rc" aria-label="' + esc(r.name) + '">' +
    '<div class="cr-head"><span class="rc-head" aria-hidden="true">' + esc(t("rcptHead")) + "</span>" +
      '<h3 class="cr-name"><a href="' + esc(r.path + "?q=" + encodeURIComponent(r.name)) + '">' + esc(r.name) + "</a></h3>" +
      '<span class="cr-meta">' + starIcons(r.stars) + " " + esc(r.cuisine) + "</span>" +
      '<span class="cr-where">' + esc(r.where) + "</span>" +
      (r.notice ? '<span class="notice">' + esc(t("tempClosed")) + "</span>" : "") +
      '<span class="cr-acts"><button type="button" class="wish" data-wish="' + esc(r.id) + '" aria-pressed="' + saved + '" aria-label="' + esc(t(saved ? "wishRemove" : "wishAdd", { name: r.name })) + '" title="' + esc(t(saved ? "wishRemoveT" : "wishAddT")) + '">' + heart + "</button>" +
      '<button type="button" class="cr-x" data-unpick="' + esc(r.id) + '" aria-label="Take ' + esc(r.name) + ' out of the comparison" title="Take out of the comparison">×</button></span>' +
    "</div>" +
    line(t("mealDinner"), f.dinner, r.dinnerNote, mark("dinner", !L())) +
    line(t("mealLunch"), f.lunch, r.noLunch ? "" : r.lunchNote, mark("lunch", L())) +
    line(t("hWine"), f.wine, "", mark("wine")) +
    line(t(L() ? "rcptLunchWine" : "rcptDinnerWine"), f.total, "", "rc-total " + mark("total")) +
    '<div class="rc-foot">' + esc(t(serviceLabel(r.country))) + "<br>" + esc(t("rcptChecked", { d: checked })) + (sources ? " · " + sources : "") + "</div>" +
    "</article>";
}

// "Cheapest for dinner: A, ≈£120 less than B and ≈£200 less than C." Ties share a place.
function verdict(rows, all, key, label) {
  const items = rows.map((r, i) => ({ r, v: all[i][key] })).filter((x) => x.v.menu);
  if (items.length < 2) return "";
  const groups = [];
  items.sort((a, b) => a.v.n - b.v.n).forEach((x) => {
    const g = groups[groups.length - 1];
    if (g && Math.round(g[0].v.n) === Math.round(x.v.n)) g.push(x); else groups.push([x]);
  });
  const names = (g) => g.map((x) => x.r.name).join(" and ");
  const approxAny = (g) => g.some((x) => x.r.cur !== cmp.cur);
  const first = groups[0], low = first[0].v.n;
  if (groups.length === 1) return "<p><strong>" + esc(label) + ":</strong> " + esc(names(first)) + " cost the same, " + esc(first[0].v.text) + ".</p>";
  const rest = groups.slice(1).map((g) => money(g[0].v.n - low, approxAny(g) || approxAny(first)) + " less than " + names(g));
  return "<p><strong>" + esc(label) + ":</strong> " + esc(names(first)) + " at " + esc(first[0].v.text) + (first.length > 1 ? " each" : "") + ", " + esc(rest.join(" and ")) + ".</p>";
}

// ---------- Drawing ----------
function renderPick() {
  const list = pool(), q = cmp.query.trim().toLowerCase();
  const full = cmp.sel.length >= MAX;
  if (!list.length) {
    $("cmpHint").innerHTML = "Your wishlist is empty. Tap the heart next to any restaurant on a destination page to save it, then come back to compare. " +
      '<a href="' + withLang("/") + '#destinations">Choose a destination</a> or <a href="/near-me/">find restaurants near you</a>.';
    $("cmpPick").innerHTML = "";
    $("cmpFilter").hidden = true;
    return;
  }
  $("cmpHint").textContent = list.length === 1 ? "Save one more restaurant to compare it with this one."
    : cmp.sel.length < 2 ? "Tick two or three to compare them." : full ? "Comparing three. Untick one to choose another."
    : list.length > 2 ? "Comparing two. Tick one more to add it." : "Comparing two. Save another restaurant to add a third.";
  $("cmpFilter").hidden = list.length <= 10;
  const shown = q ? list.filter((r) => [r.name, r.where, r.cuisine].join(" ").toLowerCase().includes(q)) : list;
  $("cmpPick").innerHTML = shown.map((r) => {
    const on = cmp.sel.includes(r.id);
    return '<li><label class="cmp-chip' + (on ? " on" : "") + '"><input type="checkbox" data-pick="' + esc(r.id) + '"' + (on ? " checked" : full ? " disabled" : "") + ">" +
      '<span class="cc-text"><span class="cc-name">' + esc(r.name) + '</span><span class="cc-sub">' + starIcons(r.stars) + " " + esc(r.where) + "</span></span></label></li>";
  }).join("") + (q && !shown.length ? '<li class="cmp-none">No saved restaurants match “' + esc(cmp.query) + "”.</li>" : "");
}
function renderReceipts() {
  const rows = selRows();
  $("cmpControls").hidden = !rows.length;
  if (!rows.length) { $("cmpReceipts").innerHTML = ""; $("cmpVerdict").innerHTML = ""; $("cmpRate").hidden = true; return; }
  $("cmpMeal").innerHTML = ["dinner", "lunch"].map((m) =>
    '<button type="button" data-meal="' + m + '" aria-pressed="' + (cmp.meal === m) + '">' + esc(t(m === "lunch" ? "mealLunch" : "mealDinner")) + "</button>").join("");
  const order = DATA.switchable.concat(Object.keys(DATA.currencies).filter((k) => !DATA.switchable.includes(k)).sort());
  $("cmpCur").innerHTML = order.map((k) => '<option value="' + k + '"' + (k === cmp.cur ? " selected" : "") + ">" + esc(curLabel(k)) + "</option>").join("");
  const all = rows.map(figures), best = lowest(all);
  $("cmpReceipts").style.setProperty("--n", rows.length);
  $("cmpReceipts").innerHTML = rows.map((r, i) => receipt(r, all[i], best, i)).join("");
  const meal = L() ? "lunch" : "dinner", priced = rows.filter((r, i) => all[i][meal].menu);
  $("cmpVerdict").innerHTML = rows.length < 2 ? "" : priced.length < 2
    ? "<p>" + esc(priced.length ? "Only " + priced[0].name + " lists a " + meal + " menu price, so there's nothing to compare it with." : "None of these list a " + meal + " menu price.") + "</p>"
    : verdict(rows, all, meal, L() ? "Cheapest lunch" : "Cheapest dinner") + verdict(rows, all, "total", L() ? "Cheapest lunch with wine" : "Cheapest dinner with wine");
  const converted = rows.some((r) => r.cur !== cmp.cur), marked = Object.keys(best).length > 0;
  const date = new Date(DATA.rateDate + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  $("cmpRate").textContent = [marked ? "A tick marks the lowest price on each line." : "", converted ? t("rateLineMixed", { sym: symbolOf(cmp.cur).trim(), date }) : ""].filter(Boolean).join(" ");
  $("cmpRate").hidden = !converted && !marked;
}
function render() { renderPick(); renderReceipts(); }

// The address keeps the ticked restaurants, so a reload or a shared link shows the same comparison.
function saveSel() {
  const p = new URLSearchParams(location.search);
  if (cmp.sel.length) p.set("r", cmp.sel.join(",")); else p.delete("r");
  const qs = p.toString().replace(/%2C/g, ",");
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  store.set(PREFS_KEY, Object.assign(store.get(PREFS_KEY, {}), { compare: cmp.sel }));
}
function setSel(ids) {
  const before = cmp.sel.length;
  cmp.sel = ids.slice(0, MAX);
  cmp.cur = chooseCurrency();
  saveSel();
  render();
  if (cmp.sel.length >= 2 && cmp.sel.length !== before) track("compare", { restaurants: cmp.sel.length });
}

// ---------- Start ----------
function renderStatic() {
  applyI18n();
  renderWishCount();
  $("destLink").href = withLang("/") + "#destinations";
}
renderStatic();
// A filter box for long wishlists.
$("cmpPick").insertAdjacentHTML("beforebegin", '<label class="search cmp-filter" id="cmpFilter" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
  '<input id="cmpQ" type="search" autocomplete="off" placeholder="Find in your wishlist" aria-label="Find in your wishlist"></label>');
$("cmpQ").addEventListener("input", (e) => { cmp.query = e.target.value; renderPick(); });

document.addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  if (el.dataset.lang) { setLang(el.dataset.lang); renderStatic(); }
  else if (el.dataset.meal) {
    cmp.meal = el.dataset.meal;
    store.set(PREFS_KEY, Object.assign(store.get(PREFS_KEY, {}), { meal: cmp.meal }));
    renderReceipts();
    track("meal", { meal: cmp.meal });
  } else if (el.dataset.unpick) setSel(cmp.sel.filter((id) => id !== el.dataset.unpick));
  else if (el.dataset.wish) {
    const id = el.dataset.wish, list = loadWishlist();
    setWishlist(list.includes(id) ? list.filter((x) => x !== id) : list.concat(id));
    renderWishCount();
    render();
  }
});
$("cmpPick").addEventListener("change", (e) => {
  const id = e.target.dataset.pick;
  if (!id) return;
  setSel(e.target.checked ? cmp.sel.concat(id) : cmp.sel.filter((x) => x !== id));
});
$("cmpCur").addEventListener("change", (e) => {
  cmp.cur = e.target.value;
  store.set(PREFS_KEY, Object.assign(store.get(PREFS_KEY, {}), { compareCurrency: cmp.cur }));
  renderReceipts();
  track("currency", { currency: cmp.cur });
  prefChosen("currency", cmp.cur);
});
// A new currency in the member's preferences (setProfile() in common.js clears the choice made here).
window.addEventListener("sb:profile", () => { if (cmp.rows && cmp.sel.length) { cmp.cur = chooseCurrency(); render(); } });
// Changes from the account (another device) or another tab.
const refresh = () => { if (cmp.rows) loadIds(loadWishlist()).then(render).catch(() => {}); };
window.addEventListener("storage", (e) => { if (e.key === WISHLIST_KEY) refresh(); });
["sb:wishlist", "sb:account"].forEach((ev) => window.addEventListener(ev, (e) => { if (e.type === "sb:account" || e.detail.from === "sync") refresh(); }));

dataReady.then(() => {
  if (store.get(PREFS_KEY, {}).meal === "lunch") cmp.meal = "lunch";
  const wl = loadWishlist().filter((id) => cmp.byId.has(id));
  const fromLink = linkIds().filter((id) => cmp.byId.has(id));
  const last = (store.get(PREFS_KEY, {}).compare || []).filter((id) => wl.includes(id));
  // A shared link wins; then the last comparison made here; then the first three saved.
  cmp.sel = [];
  cmp.shared = fromLink;
  setSel(fromLink.length ? fromLink : last.length >= 2 ? last : wl.slice(0, MAX));
}).catch(() => {
  $("cmpHint").textContent = "The prices couldn't load just now. Please try again in a moment.";
});
