// The account page: what you've ticked off (stats, milestones, progress by destination), your been-there
// list with dates, your wishlist, your preferences (home city, currency, dietary needs) and your data
// (download, sign out, delete). account.js does the signing in and keeps the preferences with the account.

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

function statTiles(been) {
  const stars = been.reduce((a, r) => a + starsOf(r), 0);
  const three = been.filter((r) => starsOf(r) === 3).length;
  const countries = new Set(been.map((r) => r.country)).size;
  return '<div class="acct-stats">' + [[been.length, "accStatBeen"], [stars, "accStatStars"], [three, "accStatThree"], [countries, "accStatCountries"]].map(([n, k]) =>
    '<div class="acct-stat"><div class="n">' + n + '</div><div class="l">' + esc(t(k)) + "</div></div>").join("") + "</div>";
}

function milestones(been) {
  const stars = been.reduce((a, r) => a + starsOf(r), 0);
  const countries = new Set(been.map((r) => r.country)).size;
  const list = [["ms1", been.length >= 1], ["ms2", been.some((r) => starsOf(r) === 3)], ["ms3", been.length >= 10], ["ms4", been.length >= 25], ["ms5", countries >= 3], ["ms6", stars >= 50]];
  return '<section class="acct-section"><h2>' + esc(t("accMilestones")) + '</h2><ul class="milestones">' + list.map(([k, got]) =>
    '<li class="' + (got ? "got" : "") + '"><svg aria-hidden="true"><use href="#star"/></svg><span>' + esc(t(k)) + "</span>" + (got ? '<span class="sr-only">' + esc(t("msGot")) + "</span>" : "") + "</li>").join("") + "</ul></section>";
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

function beenList(been) {
  const items = been.slice().sort((a, b) => String(loadVisited()[b.id] || "").localeCompare(String(loadVisited()[a.id] || "")) || nameOf(a).localeCompare(nameOf(b)));
  const visited = loadVisited();
  return '<section class="acct-section"><h2>' + esc(t("accBeenTitle")) + ' <span class="count">' + been.length + "</span></h2>" +
    (!items.length ? '<p class="empty-note">' + esc(t("accBeenEmpty")) + "</p>" : '<ul class="acct-list">' + items.map((r) =>
      '<li><div class="al-main"><a class="al-name" href="' + pageLink(r) + '">' + esc(nameOf(r)) + "</a>" +
      '<span class="al-meta">' + starIcons(starsOf(r)) + (r.status ? " " + esc(t("formerly")) : "") + " · " + esc(whereOf(r)) + "</span></div>" +
      '<label class="al-date"><span class="sr-only">' + esc(t("accDateAria", { name: nameOf(r) })) + '</span><input type="date" data-date="' + esc(r.id) + '" value="' + esc(visited[r.id] || "") + '" max="' + new Date().toISOString().slice(0, 10) + '"></label>' +
      '<button type="button" class="linkish" data-unbeen="' + esc(r.id) + '">' + esc(t("accRemove")) + "</button></li>").join("") + "</ul>") + "</section>";
}

function wishList() {
  const list = loadWishlist().map((id) => byId.get(id)).filter(Boolean);
  const visited = loadVisited();
  return '<section class="acct-section"><h2>' + esc(t("accWishTitle")) + ' <span class="count">' + list.length + "</span></h2>" +
    (list.length >= 2 ? '<p class="wish-compare"><a class="btn-line" href="/compare/">' + esc(t("wishCompare")) + " →</a></p>" : "") +
    (!list.length ? '<p class="empty-note">' + esc(t("accWishEmpty")) + "</p>" : '<ul class="acct-list">' + list.map((r) =>
      '<li><div class="al-main"><a class="al-name" href="' + pageLink(r) + '">' + esc(nameOf(r)) + "</a>" +
      '<span class="al-meta">' + starIcons(starsOf(r)) + " · " + esc(whereOf(r)) + (r.dinner != null ? " · " + esc(localMoney(r.dinner, r.cur)) : "") + "</span></div>" +
      (r.id in visited ? '<span class="al-been"><svg aria-hidden="true"><use href="#check"/></svg>' + esc(t("been")) + "</span>"
        : '<button type="button" class="linkish" data-markbeen="' + esc(r.id) + '">' + esc(t("accMarkBeen")) + "</button>") +
      '<button type="button" class="linkish" data-unwish="' + esc(r.id) + '">' + esc(t("accRemove")) + "</button></li>").join("") + "</ul>") + "</section>";
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
  const visited = loadVisited();
  const been = Object.keys(visited).map((id) => byId.get(id)).filter(Boolean);
  $("acctBody").innerHTML = msg + statTiles(been) + milestones(been) + progress(been) + beenList(been) + wishList() + prefsSection() + dataSection();
  if (location.hash === "#preferences" && !ui.jumped) { ui.jumped = true; $("preferences").scrollIntoView(); }
}

function downloadData() {
  const visited = loadVisited();
  const out = {
    account: account.user.email, exported: new Date().toISOString(), site: "https://starredbill.com",
    wishlist: loadWishlist().map((id) => ({ id, name: (byId.get(id) || {}).name || id })),
    beenThere: Object.keys(visited).map((id) => ({ id, name: (byId.get(id) || {}).name || id, date: visited[id] || null })),
    preferences: { homeCity: loadProfile().homeName || null, currency: loadProfile().currency || null, dietaryNeeds: loadProfile().diet || null },
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
  if (el.dataset.unbeen) { const v = loadVisited(); delete v[el.dataset.unbeen]; setVisited(v); render(); return; }
  if (el.dataset.markbeen) { toggleVisited(el.dataset.markbeen); render(); return; }
  if (el.dataset.unwish) { setWishlist(loadWishlist().filter((x) => x !== el.dataset.unwish)); render(); return; }
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
  const input = e.target.closest("[data-date]");
  if (input) setVisitedDate(input.dataset.date, input.value);
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
["sb:account", "sb:wishlist", "sb:visited", "sb:profile"].forEach((ev) => window.addEventListener(ev, (e) => { if (e.type === "sb:account" || e.detail.from === "sync") render(); }));
window.addEventListener("storage", (e) => { if (e.key === WISHLIST_KEY || e.key === VISITED_KEY) render(); });

render();
