// Free accounts. People sign in with an emailed code or link, or Google, and their wishlist, "been there" list and
// dining diary (what they paid, the menu and private notes) and preferences (home city, currency, dietary needs) follow
// them to any device. Supabase (supabase.com) holds the accounts and two tables, `saved` and `profile` (see supabase/schema.sql),
// whose rules let each person read and change only their own rows.
// Signed out, the wishlist still works and stays in this browser; "been there" needs an account.
// The pages keep reading the browser copy (loadWishlist / loadVisited in common.js); this file keeps
// that copy in step with the account and sends every change up.

// Both values are public by design, like the Maps key. The table's own rules keep everyone's lists private.
const SUPABASE_URL = "https://uvdaclbhskkukyngikhq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZGFjbGJoc2trdWt5bmdpa2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNDQ5ODEsImV4cCI6MjEwNjYyMDk4MX0.VqzPih99dIG_wPxUNU-N5PbNChYTlI2vu5ova7l8RsI";
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.min.js";
const SESSION_KEY = "sb-uvdaclbhskkukyngikhq-auth-token";
// Which account this browser's lists were last merged with, and changes still waiting to be sent.
const SYNCED_KEY = "starredbill-synced-user", PENDING_KEY = "starredbill-pending";
// A preferences change still waiting to be sent, and which offers to remember a choice have been answered on this device.
const PROFILE_PENDING_KEY = "starredbill-profile-pending", ASKED_KEY = "starredbill-pref-asked";

const account = { client: null, user: null, google: false, boot: null, ready: false, known: null, reason: "", syncing: null, profileReady: false };
const acctSignedIn = () => !!account.user;
// Before the sign-in code has loaded, a saved session is a good guess that someone is signed in.
const hasStoredSession = () => { try { return !!localStorage.getItem(SESSION_KEY); } catch (e) { return false; } };
const authInUrl = () => /(access_token|error_description)=/.test(location.hash) || /[?&]code=/.test(location.search);
// Read before Supabase tidies the address: did this visit come from a sign-in link (or a failed one)?
const ARRIVED_SIGNING_IN = authInUrl();
const LINK_FAILED = /error_description=/.test(location.hash);
const notifyAccount = () => window.dispatchEvent(new CustomEvent("sb:account"));

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Loads the sign-in code only when it's needed: a saved session, a sign-in link just opened, or a tap on Sign in.
function bootAccount() {
  if (account.boot) return account.boot;
  account.boot = (async () => {
    try {
      await loadScript(SUPABASE_JS);
      account.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
      });
      account.client.auth.onAuthStateChange((event, session) => {
        const before = account.user;
        account.user = session ? session.user : null;
        // Supabase asks for no other calls inside this callback, so the follow-up work runs just after it.
        setTimeout(() => afterAuthChange(event, before), 0);
      });
      fetch(SUPABASE_URL + "/auth/v1/settings", { headers: { apikey: SUPABASE_KEY } })
        .then((r) => r.json()).then((s) => { account.google = !!(s.external && s.external.google); renderSignIn(); }).catch(() => {});
    } catch (e) {
      account.boot = null;
      throw e;
    }
  })();
  return account.boot;
}

async function afterAuthChange(event, before) {
  if (account.user) {
    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") await syncDown();
    if (event === "SIGNED_IN" && !before) {
      // A brand-new account signs in within minutes of being created; no email or id is sent.
      const method = (account.user.app_metadata && account.user.app_metadata.provider) || "email";
      const isNew = Date.now() - Date.parse(account.user.created_at || 0) < 15 * 60 * 1000;
      track(isNew ? "account-created" : "sign-in", { method });
    }
    if (!before) {
      const box = $("signInBox");
      if (box && box.open) box.close();
      if (ARRIVED_SIGNING_IN && !acctNotice.shown) { acctNotice.shown = true; acctNotice(t("acctWelcome")); }
    }
  } else if (event === "SIGNED_OUT") {
    // A shared computer shouldn't keep someone's lists once they sign out.
    try { [SYNCED_KEY, PENDING_KEY, PROFILE_PENDING_KEY, ASKED_KEY].forEach((k) => localStorage.removeItem(k)); } catch (e) {}
    account.known = null;
    account.profileReady = false;
    setWishlist([], "sync");
    setVisited({}, "sync");
    setDiary({}, "sync");
    try { localStorage.removeItem(PROFILE_KEY); } catch (e) {}
    window.dispatchEvent(new CustomEvent("sb:profile", { detail: { before: {}, from: "sync" } }));
  }
  account.ready = true;
  renderAccountButton();
  notifyAccount();
}

// ---------- Keeping the browser copy and the account in step ----------
function snapshotLocal() {
  return { wish: new Set(loadWishlist()), visited: Object.assign({}, loadVisited()), diary: Object.assign({}, loadDiary()) };
}
// What the account should hold for one restaurant, given the browser copy.
function rowFor(id, local) {
  const visited = Object.prototype.hasOwnProperty.call(local.visited, id), d = local.diary[id] || {};
  return { user_id: account.user.id, restaurant_id: id, wishlist: local.wish.has(id), visited, visited_on: visited && local.visited[id] ? local.visited[id] : null,
    paid: d.paid != null ? d.paid : null, paid_currency: d.paid != null ? d.cur || null : null, menu: d.menu || null, note: d.note || null };
}
const hasDiary = (r) => r.paid != null || !!r.menu || !!r.note;
// A diary entry from the account's row, leaving out what's blank.
function diaryOf(r) {
  const d = {};
  if (r.paid != null && r.paid !== "") { d.paid = Number(r.paid); if (r.paid_currency) d.cur = r.paid_currency; }
  if (r.menu) d.menu = r.menu;
  if (r.note) d.note = r.note;
  return d;
}
async function pushIds(ids) {
  if (!account.client || !account.user || !ids.length) return;
  const local = snapshotLocal();
  const rows = ids.map((id) => rowFor(id, local));
  // A row with diary details stays even when it's off both lists, so unticking "been there" by mistake doesn't lose them;
  // the account page's Remove clears the details first.
  const keep = rows.filter((r) => r.wishlist || r.visited || hasDiary(r)), drop = rows.filter((r) => !r.wishlist && !r.visited && !hasDiary(r)).map((r) => r.restaurant_id);
  let ok = true;
  if (keep.length) {
    const { error } = await account.client.from("saved").upsert(keep, { onConflict: "user_id,restaurant_id" });
    if (error) ok = false;
  }
  if (drop.length) {
    const { error } = await account.client.from("saved").delete().in("restaurant_id", drop);
    if (error) ok = false;
  }
  const pending = new Set(store.get(PENDING_KEY, []));
  ids.forEach((id) => (ok ? pending.delete(id) : pending.add(id)));
  store.set(PENDING_KEY, [...pending]);
  if (ok) account.known = local;
}
// Restaurants whose wishlist or been-there state changed since the account last matched.
function changedIds(local) {
  const before = account.known || { wish: new Set(), visited: {}, diary: {} };
  const ids = new Set();
  local.wish.forEach((id) => { if (!before.wish.has(id)) ids.add(id); });
  before.wish.forEach((id) => { if (!local.wish.has(id)) ids.add(id); });
  Object.keys(local.visited).forEach((id) => { if (before.visited[id] !== local.visited[id]) ids.add(id); });
  Object.keys(before.visited).forEach((id) => { if (!(id in local.visited)) ids.add(id); });
  Object.keys(local.diary).concat(Object.keys(before.diary || {})).forEach((id) => { if (JSON.stringify(local.diary[id]) !== JSON.stringify((before.diary || {})[id])) ids.add(id); });
  return [...ids];
}
// Each change is queued at once, so it still reaches the account if the page closes before it's sent
// or the sign-in code hasn't finished loading yet.
let pushTimer = null;
function queueChange(e) {
  if (e.detail.from === "sync" || !(account.user || hasStoredSession()) || !e.detail.ids.length) return;
  const pending = new Set(store.get(PENDING_KEY, []));
  e.detail.ids.forEach((id) => pending.add(id));
  store.set(PENDING_KEY, [...pending]);
  if (!account.user) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushIds(store.get(PENDING_KEY, [])), 300);
}
window.addEventListener("sb:wishlist", queueChange);
window.addEventListener("sb:visited", queueChange);
window.addEventListener("sb:diary", queueChange);

// Brings the account's lists down. The first time this browser meets an account, anything saved here
// while signed out is added to it; after that the account is the record.
function syncDown() {
  if (!account.syncing) account.syncing = doSyncDown().finally(() => { account.syncing = null; });
  return account.syncing;
}
async function doSyncDown() {
  if (!account.client || !account.user) return;
  const pending = store.get(PENDING_KEY, []);
  if (pending.length) await pushIds(pending);
  const { data, error } = await account.client.from("saved").select("restaurant_id,wishlist,visited,visited_on,paid,paid_currency,menu,note").order("created_at");
  if (error) return;
  const remote = { wish: [], visited: {}, diary: {} };
  data.forEach((r) => {
    if (r.wishlist) remote.wish.push(r.restaurant_id);
    if (r.visited) remote.visited[r.restaurant_id] = r.visited_on || "";
    if (hasDiary(r)) remote.diary[r.restaurant_id] = diaryOf(r);
  });
  const first = store.get(SYNCED_KEY, null) !== account.user.id;
  const local = snapshotLocal();
  let wish = remote.wish, visited = remote.visited, diary = remote.diary;
  if (first) {
    const extra = [...local.wish].filter((id) => !remote.wish.includes(id));
    wish = remote.wish.concat(extra);
    visited = Object.assign({}, local.visited, remote.visited);
    diary = Object.assign({}, local.diary, remote.diary);
    store.set(SYNCED_KEY, account.user.id);
  }
  // Keep this browser's order for restaurants it already had, then add the rest.
  const order = loadWishlist();
  wish = order.filter((id) => wish.includes(id)).concat(wish.filter((id) => !order.includes(id)));
  account.known = { wish: new Set(remote.wish), visited: Object.assign({}, remote.visited), diary: Object.assign({}, remote.diary) };
  setWishlist(wish, "sync");
  setVisited(visited, "sync");
  setDiary(diary, "sync");
  if (first) { const ids = changedIds(snapshotLocal()); if (ids.length) await pushIds(ids); }
  await syncProfile();
}

// ---------- Preferences: home city, currency, dietary needs ----------
// One row per person in `profile`; the browser keeps a copy (loadProfile() in common.js) that pages read as they open.
const profileRow = (p) => ({ user_id: account.user.id, home_place: p.home || null, home_name: p.home ? (p.homeName || "").slice(0, 120) || null : null, currency: p.currency || null, diet: p.diet || null });
async function pushProfile() {
  if (!account.client || !account.user) return false;
  const { error } = await account.client.from("profile").upsert(profileRow(loadProfile()), { onConflict: "user_id" });
  store.set(PROFILE_PENDING_KEY, error ? 1 : null);
  return !error;
}
async function syncProfile() {
  if (store.get(PROFILE_PENDING_KEY, null)) await pushProfile();
  const { data, error } = await account.client.from("profile").select("home_place,home_name,currency,diet").maybeSingle();
  if (error) return;
  const r = data || {};
  const next = { home: r.home_place || "", homeName: r.home_name || "", currency: r.currency || "", diet: r.diet || "" };
  const now = loadProfile();
  account.profileReady = true;
  if (["home", "homeName", "currency", "diet"].some((k) => (now[k] || "") !== next[k]) || !store.get(PROFILE_KEY, null)) setProfile(next, "sync");
}
window.addEventListener("sb:profile", (e) => {
  if (e.detail.from === "sync" || !(account.user || hasStoredSession())) return;
  store.set(PROFILE_PENDING_KEY, 1);
  if (account.user) pushProfile();
});

// The first time a member picks £, € or US$ (or a dietary need on Help me pick) without having set one, offer to keep it.
const PREF_LABEL = { currency: (v) => DATA.currencies[v] ? DATA.currencies[v].symbol.trim() : v };
window.addEventListener("sb:prefchosen", (e) => {
  const { kind, value } = e.detail;
  if (!account.user || !account.profileReady || !value || loadProfile()[kind]) return;
  if (kind === "currency" && !HOME_CURRENCIES.includes(value)) return;
  const asked = store.get(ASKED_KEY, {});
  if (asked[kind]) return;
  const question = kind === "currency" ? t("prefOfferCur", { cur: PREF_LABEL.currency(value) }) : "Remember " + value.replace(/-/g, " ") + " as your dietary need on Help me pick?";
  acctOffer(question, () => {
    setProfile(Object.assign({}, loadProfile(), { [kind]: value }));
    acctNotice(t("prefSaved"));
    track("preferences", { set: kind, via: "offer" });
  }, () => { asked[kind] = 1; store.set(ASKED_KEY, asked); });
});

// ---------- Been there ----------
// Returns false (and offers sign-in) when nobody is signed in.
// Unticking and ticking again (the toast's Undo) brings back the date it had.
const untickedDates = {};
function toggleVisited(id) {
  if (!account.user) { openSignIn("been"); return false; }
  const v = loadVisited();
  if (id in v) { untickedDates[id] = v[id]; delete v[id]; } else v[id] = untickedDates[id] || "";
  setVisited(v);
  return true;
}
function setVisitedDate(id, date) {
  const v = loadVisited();
  if (!(id in v)) return;
  v[id] = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  setVisited(v);
}

// ---------- The dining diary ----------
// One window for a restaurant's diary entry: for one they've been to, the date, what they paid per person (and in which
// currency), the menu and a private note; for one only on the wishlist, just the note ("ask for the counter seat").
// `info` gives the restaurant's name and the currency its prices are in. Saving updates the browser copy, which syncs.
function openDiary(id, info) {
  if (!account.user && !hasStoredSession()) { openSignIn("been"); return; }
  const box = $("diaryBox") || buildDiary();
  const been = id in loadVisited(), d = loadDiary()[id] || {};
  box.dataset.id = id;
  box.dataset.been = been ? "1" : "";
  box.querySelector(".si-title").textContent = t(been ? "diaryTitle" : "diaryNoteTitle", { name: info.name || id });
  box.querySelector(".si-close").setAttribute("aria-label", t("acctClose"));
  box.querySelector(".dy-been").hidden = !been;
  box.querySelector("label[for=dyDate]").textContent = t("diaryDate");
  box.querySelector("label[for=dyPaid]").textContent = t("diaryPaid");
  box.querySelector("label[for=dyMenu]").textContent = t("diaryMenu");
  box.querySelector("label[for=dyNote]").textContent = t("diaryNote");
  $("dyCur").setAttribute("aria-label", t("diaryCur"));
  $("dyMenu").placeholder = t("diaryMenuPh");
  $("dyNote").placeholder = t(been ? "diaryNotePh" : "diaryWishPh");
  box.querySelector(".dy-private").textContent = t("diaryPrivate");
  box.querySelector(".si-send").textContent = t("diarySave");
  box.querySelector(".dy-cancel").textContent = t("diaryCancel");
  $("dyDate").value = been ? loadVisited()[id] || "" : "";
  $("dyDate").max = new Date().toISOString().slice(0, 10);
  $("dyPaid").value = d.paid != null ? d.paid : "";
  const cur = d.cur || info.cur || "GBP", codes = Object.keys(DATA.currencies || {}).sort();
  if (!codes.includes(cur)) codes.unshift(cur);
  $("dyCur").innerHTML = codes.map((c) => '<option value="' + esc(c) + '"' + (c === cur ? " selected" : "") + ">" + esc(c) + (DATA.currencies && DATA.currencies[c] && DATA.currencies[c].symbol !== c ? " " + esc(DATA.currencies[c].symbol) : "") + "</option>").join("");
  $("dyMenu").value = d.menu || "";
  $("dyNote").value = d.note || "";
  if (!box.open) box.showModal();
  (been ? $("dyDate") : $("dyNote")).focus();
}
// "1,410.50", "1.410,50", "1410" or "€395": a separator with one or two digits after it is the decimal point, any other is thousands.
function parseAmount(text) {
  let s = String(text).replace(/[^\d.,]/g, "");
  const last = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  s = last >= 0 && s.length - last - 1 <= 2 ? s.slice(0, last).replace(/[.,]/g, "") + "." + s.slice(last + 1) : s.replace(/[.,]/g, "");
  return s && s !== "." ? parseFloat(s) : NaN;
}
function saveDiary(box) {
  const id = box.dataset.id, been = !!box.dataset.been, all = loadDiary();
  // A note added to a wishlist restaurant keeps anything recorded before it was unticked.
  const entry = been ? {} : Object.assign({}, all[id] || {});
  if (been) {
    const paid = parseAmount($("dyPaid").value);
    if (isFinite(paid) && paid >= 0 && paid < 1e7) { entry.paid = Math.round(paid * 100) / 100; entry.cur = $("dyCur").value; }
    const menu = $("dyMenu").value.trim().slice(0, 200);
    if (menu) entry.menu = menu;
  }
  const note = $("dyNote").value.trim().slice(0, 2000);
  if (note) entry.note = note; else delete entry.note;
  if (Object.keys(entry).length) all[id] = entry; else delete all[id];
  if (been) setVisitedDate(id, $("dyDate").value);
  setDiary(all);
  box.close();
  acctNotice(t(been ? "diarySaved" : "diaryNoteSaved"));
  // Only which kind of entry was saved; never what's in it.
  track("diary", { kind: been ? "visit" : "note" });
}
function buildDiary() {
  const box = document.createElement("dialog");
  box.id = "diaryBox";
  box.className = "signin diary";
  box.innerHTML =
    '<form method="dialog" class="si-inner" novalidate>' +
      '<button type="button" class="si-close">×</button>' +
      '<h2 class="si-title"></h2>' +
      '<div class="dy-been">' +
        '<label for="dyDate"></label><input id="dyDate" type="date">' +
        '<label for="dyPaid"></label><div class="dy-paid"><input id="dyPaid" type="text" inputmode="decimal" autocomplete="off" maxlength="12" placeholder="0"><select id="dyCur"></select></div>' +
        '<label for="dyMenu"></label><input id="dyMenu" type="text" maxlength="200" autocomplete="off">' +
      "</div>" +
      '<label for="dyNote"></label><textarea id="dyNote" rows="4" maxlength="2000"></textarea>' +
      '<p class="si-small dy-private"></p>' +
      '<div class="dy-actions"><button type="submit" class="si-send"></button><button type="button" class="btn-line dy-cancel"></button></div>' +
    "</form>";
  document.body.appendChild(box);
  box.addEventListener("click", (e) => { if (e.target === box || e.target.closest(".si-close, .dy-cancel")) box.close(); });
  box.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); saveDiary(box); });
  return box;
}

async function signOut() {
  if (!account.client) await bootAccount();
  await account.client.auth.signOut();
}
async function deleteAccount() {
  if (!account.client || !account.user) return false;
  const { error } = await account.client.rpc("delete_my_account");
  if (error) return false;
  await account.client.auth.signOut({ scope: "local" });
  return true;
}

// ---------- Header button and the sign-in window ----------
function renderAccountButton() {
  const btn = $("accountBtn");
  if (!btn) return;
  const signedIn = account.ready ? !!account.user : hasStoredSession();
  const initial = account.user && account.user.email ? account.user.email[0].toUpperCase() : "";
  btn.classList.toggle("signed-in", signedIn);
  btn.innerHTML = signedIn
    ? '<span class="acct-initial" aria-hidden="true">' + esc(initial || "✓") + "</span><span>" + esc(t("acctAccount")) + "</span>"
    : '<svg aria-hidden="true"><use href="#user"/></svg><span>' + esc(t("acctSignIn")) + "</span>";
  btn.setAttribute("aria-label", signedIn ? t("acctAccount") : t("acctSignIn"));
}

function acctNotice(text) {
  let n = $("acctNotice");
  if (!n) {
    n = document.createElement("div");
    n.id = "acctNotice"; n.className = "acct-notice"; n.setAttribute("role", "status");
    document.body.appendChild(n);
  }
  n.textContent = text;
  n.hidden = false;
  clearTimeout(acctNotice.timer);
  acctNotice.timer = setTimeout(() => { n.hidden = true; }, 5000);
}

// A question with Yes / No thanks at the foot of the screen. Saying yes, no or closing it counts as an answer.
function acctOffer(text, yes, no) {
  let n = $("acctOffer");
  if (!n) {
    n = document.createElement("div");
    n.id = "acctOffer"; n.className = "acct-notice acct-offer"; n.setAttribute("role", "dialog"); n.setAttribute("aria-live", "polite");
    document.body.appendChild(n);
  }
  n.innerHTML = '<span class="ao-q"></span><span class="ao-btns"><button type="button" class="ao-yes"></button><button type="button" class="ao-no"></button></span>';
  n.querySelector(".ao-q").textContent = text;
  n.querySelector(".ao-yes").textContent = t("prefYes");
  n.querySelector(".ao-no").textContent = t("prefNo");
  n.setAttribute("aria-label", text);
  n.hidden = false;
  const done = (fn) => { n.hidden = true; clearTimeout(acctOffer.timer); fn(); };
  n.querySelector(".ao-yes").onclick = () => done(yes);
  n.querySelector(".ao-no").onclick = () => done(no);
  clearTimeout(acctOffer.timer);
  acctOffer.timer = setTimeout(() => { n.hidden = true; }, 15000);
}

function renderSignIn() {
  const box = $("signInBox");
  if (!box) return;
  const why = account.reason === "been" ? t("acctWhyBeen") : account.reason === "report" ? t("acctWhyReport") : t("acctWhy");
  box.querySelector(".si-title").textContent = t("acctTitle");
  box.querySelector(".si-why").textContent = why;
  box.querySelector(".si-close").setAttribute("aria-label", t("acctClose"));
  const g = box.querySelector(".si-google");
  g.hidden = !account.google;
  g.querySelector("span").textContent = t("acctGoogle");
  box.querySelector(".si-or").hidden = !account.google;
  box.querySelector(".si-or span").textContent = t("acctOr");
  box.querySelector("label[for=siEmail]").textContent = t("acctEmailLabel");
  const send = box.querySelector(".si-send:not(.si-verify)");
  if (!send.disabled) send.textContent = t("acctSend");
  box.querySelector("label[for=siCode]").textContent = t("acctCodeLabel");
  const verify = box.querySelector(".si-verify");
  if (!verify.disabled) verify.textContent = t("acctVerify");
  box.querySelector(".si-small").innerHTML = esc(t("acctSmall")) + ' <a href="' + withLang("/privacy/") + '">' + esc(t("acctPrivacy")) + "</a>";
}

function buildSignIn() {
  const box = document.createElement("dialog");
  box.id = "signInBox";
  box.className = "signin";
  box.innerHTML =
    '<form method="dialog" class="si-inner" novalidate>' +
      '<button type="button" class="si-close">×</button>' +
      '<h2 class="si-title"></h2><p class="si-why"></p>' +
      '<button type="button" class="si-google" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7h-4a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg><span></span></button>' +
      '<p class="si-or" hidden><span></span></p>' +
      '<label for="siEmail"></label>' +
      '<input id="siEmail" type="email" autocomplete="email" inputmode="email" placeholder="name@example.com">' +
      '<button type="submit" class="si-send"></button>' +
      '<p class="si-status" aria-live="polite"></p>' +
      // Step two: the 6-digit code from the email. Typing it signs in right here, which matters in the
      // home-screen app, where the email's link would open the browser instead (and sign in there).
      '<div class="si-code" hidden><label for="siCode"></label>' +
        '<input id="siCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456">' +
        '<button type="button" class="si-send si-verify"></button></div>' +
      '<p class="si-small"></p>' +
    "</form>";
  document.body.appendChild(box);
  box.addEventListener("click", (e) => { if (e.target === box || e.target.closest(".si-close")) box.close(); });
  box.querySelector(".si-google").addEventListener("click", async () => {
    try {
      await bootAccount();
      try { sessionStorage.setItem("starredbill-signing-in", "1"); } catch (e) {}
      track("sign-in-google");
      await account.client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname + location.search } });
    } catch (e) { box.querySelector(".si-status").textContent = t("acctFailed"); }
  });
  const verify = async () => {
    const token = $("siCode").value.replace(/\D/g, ""), status = box.querySelector(".si-status"), btn = box.querySelector(".si-verify");
    if (token.length < 6) { status.textContent = t("acctBadCode"); $("siCode").focus(); return; }
    btn.disabled = true; btn.textContent = t("acctVerifying");
    try {
      const { error } = await account.client.auth.verifyOtp({ email: account.codeEmail, token, type: "email" });
      if (error) status.textContent = error.status === 429 ? t("acctTooMany") : t("acctCodeWrong");
      else { box.close(); acctNotice.shown = true; acctNotice(t("acctWelcome")); track("sign-in-code"); }
    } catch (err) { status.textContent = t("acctFailed"); }
    btn.disabled = false; btn.textContent = t("acctVerify");
  };
  box.querySelector(".si-verify").addEventListener("click", verify);
  box.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    // Enter in the code box checks the code rather than sending another email.
    if (document.activeElement === $("siCode")) { verify(); return; }
    const email = $("siEmail").value.trim(), status = box.querySelector(".si-status"), send = box.querySelector(".si-send:not(.si-verify)");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = t("acctBadEmail"); $("siEmail").focus(); return; }
    send.disabled = true; send.textContent = t("acctSending"); status.textContent = "";
    try {
      await bootAccount();
      try { sessionStorage.setItem("starredbill-signing-in", "1"); } catch (err) {}
      const { error } = await account.client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname + location.search } });
      if (error) status.textContent = error.status === 429 ? t("acctTooMany") : t("acctFailed");
      else {
        account.codeEmail = email;
        status.textContent = t("acctSentCode", { email });
        box.querySelector(".si-code").hidden = false;
        $("siCode").value = "";
        $("siCode").focus();
        track("sign-in-link-sent");
      }
    } catch (err) { status.textContent = t("acctFailed"); }
    send.disabled = false; send.textContent = t("acctSend");
  });
  return box;
}

function openSignIn(reason) {
  account.reason = reason || "";
  track("sign-in-opened", { reason: account.reason || "button" });
  const box = $("signInBox") || buildSignIn();
  box.querySelector(".si-status").textContent = "";
  box.querySelector(".si-code").hidden = true;
  renderSignIn();
  if (!box.open) box.showModal();
  bootAccount().catch(() => { box.querySelector(".si-status").textContent = t("acctFailed"); });
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("#accountBtn, [data-signin]");
  if (!btn) return;
  e.preventDefault();
  if (btn.id === "accountBtn" && (account.ready ? account.user : hasStoredSession())) location.href = withLang("/account/");
  else openSignIn(btn.dataset.signin || "");
});

// ---------- Reporting a price or change ----------
// "Report a price or change" ([data-report-id] on restaurant pages and destination rows) opens the form in report.js,
// loaded only now, for signed-in members. Anyone else is asked to sign in first, and the form opens once they have
// (kept for half an hour, so it survives the email's sign-in link opening a new tab).
const REPORT_JS = "{{asset:report.js}}", REPORT_KEY = "starredbill-report-pending";
const accountSettled = () => account.ready ? Promise.resolve() : new Promise((done) => window.addEventListener("sb:account", done, { once: true }));
async function openReport(r) {
  track("report-opened", { restaurant: r.id });
  const askSignIn = () => { store.set(REPORT_KEY, Object.assign({ at: Date.now() }, r)); openSignIn("report"); };
  if (!(account.ready ? account.user : hasStoredSession())) { askSignIn(); return; }
  try {
    await bootAccount();
    await accountSettled();
    if (!account.user) { askSignIn(); return; }
    if (!window.showReport) await loadScript(REPORT_JS);
    window.showReport(r);
  } catch (e) { acctNotice(t("acctFailed")); }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-report-id]");
  if (!b) return;
  e.preventDefault();
  const d = b.dataset;
  openReport({ id: d.reportId, name: d.reportName || "", cur: d.reportCur || "", meal: d.reportMeal || "" });
});
window.addEventListener("sb:account", () => {
  const r = store.get(REPORT_KEY, null);
  if (!r || !account.user) return;
  store.set(REPORT_KEY, null);
  if (Date.now() - r.at < 30 * 60 * 1000) openReport(r);
});

// Start straight away only if someone is (or is becoming) signed in; everyone else loads nothing extra.
if (hasStoredSession() || ARRIVED_SIGNING_IN) bootAccount().catch(() => { account.ready = true; renderAccountButton(); });
else account.ready = true;
if (LINK_FAILED) setTimeout(() => acctNotice(t("acctLinkExpired")), 600);
