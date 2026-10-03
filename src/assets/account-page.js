// The account page: what you've ticked off (stats, milestones, progress by destination), your been-there
// list with dates, your wishlist, and your data (download, sign out, delete). account.js does the signing in.

const ALL = DATA.restaurants;
const byId = new Map(ALL.map((r) => [r.id, r]));
const ui = { confirmDelete: false, message: "" };
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
    '<li class="' + (got ? "got" : "") + '"><svg aria-hidden="true"><use href="#rosette"/></svg><span>' + esc(t(k)) + "</span>" + (got ? '<span class="sr-only">' + esc(t("msGot")) + "</span>" : "") + "</li>").join("") + "</ul></section>";
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
      '<span class="al-meta">' + rosettes(starsOf(r)) + (r.status ? " " + esc(t("formerly")) : "") + " · " + esc(whereOf(r)) + "</span></div>" +
      '<label class="al-date"><span class="sr-only">' + esc(t("accDateAria", { name: nameOf(r) })) + '</span><input type="date" data-date="' + esc(r.id) + '" value="' + esc(visited[r.id] || "") + '" max="' + new Date().toISOString().slice(0, 10) + '"></label>' +
      '<button type="button" class="linkish" data-unbeen="' + esc(r.id) + '">' + esc(t("accRemove")) + "</button></li>").join("") + "</ul>") + "</section>";
}

function wishList() {
  const list = loadWishlist().map((id) => byId.get(id)).filter(Boolean);
  const visited = loadVisited();
  return '<section class="acct-section"><h2>' + esc(t("accWishTitle")) + ' <span class="count">' + list.length + "</span></h2>" +
    (!list.length ? '<p class="empty-note">' + esc(t("accWishEmpty")) + "</p>" : '<ul class="acct-list">' + list.map((r) =>
      '<li><div class="al-main"><a class="al-name" href="' + pageLink(r) + '">' + esc(nameOf(r)) + "</a>" +
      '<span class="al-meta">' + rosettes(starsOf(r)) + " · " + esc(whereOf(r)) + (r.dinner != null ? " · " + esc(localMoney(r.dinner, r.cur)) : "") + "</span></div>" +
      (r.id in visited ? '<span class="al-been"><svg aria-hidden="true"><use href="#check"/></svg>' + esc(t("been")) + "</span>"
        : '<button type="button" class="linkish" data-markbeen="' + esc(r.id) + '">' + esc(t("accMarkBeen")) + "</button>") +
      '<button type="button" class="linkish" data-unwish="' + esc(r.id) + '">' + esc(t("accRemove")) + "</button></li>").join("") + "</ul>") + "</section>";
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
  const visited = loadVisited();
  const been = Object.keys(visited).map((id) => byId.get(id)).filter(Boolean);
  $("acctBody").innerHTML = msg + statTiles(been) + milestones(been) + progress(been) + beenList(been) + wishList() + dataSection();
}

function downloadData() {
  const visited = loadVisited();
  const out = {
    account: account.user.email, exported: new Date().toISOString(), site: "https://starredbill.com",
    wishlist: loadWishlist().map((id) => ({ id, name: (byId.get(id) || {}).name || id })),
    beenThere: Object.keys(visited).map((id) => ({ id, name: (byId.get(id) || {}).name || id, date: visited[id] || null })),
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
});
["sb:account", "sb:wishlist", "sb:visited"].forEach((ev) => window.addEventListener(ev, (e) => { if (e.type === "sb:account" || e.detail.from === "sync") render(); }));
window.addEventListener("storage", (e) => { if (e.key === WISHLIST_KEY || e.key === VISITED_KEY) render(); });

render();
