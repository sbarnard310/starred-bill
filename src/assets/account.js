// Free accounts. People sign in with an emailed link or Google, and their wishlist and "been there" list
// follow them to any device. Supabase (supabase.com) holds the accounts and one table, `saved`
// (see supabase/schema.sql), whose rules let each person read and change only their own rows.
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

const account = { client: null, user: null, google: false, boot: null, ready: false, known: null, reason: "", syncing: null };
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
    if (!before) {
      const box = $("signInBox");
      if (box && box.open) box.close();
      if (ARRIVED_SIGNING_IN && !acctNotice.shown) { acctNotice.shown = true; acctNotice(t("acctWelcome")); }
    }
  } else if (event === "SIGNED_OUT") {
    // A shared computer shouldn't keep someone's lists once they sign out.
    try { localStorage.removeItem(SYNCED_KEY); localStorage.removeItem(PENDING_KEY); } catch (e) {}
    account.known = null;
    setWishlist([], "sync");
    setVisited({}, "sync");
  }
  account.ready = true;
  renderAccountButton();
  notifyAccount();
}

// ---------- Keeping the browser copy and the account in step ----------
function snapshotLocal() {
  return { wish: new Set(loadWishlist()), visited: Object.assign({}, loadVisited()) };
}
// What the account should hold for one restaurant, given the browser copy.
function rowFor(id, local) {
  const visited = Object.prototype.hasOwnProperty.call(local.visited, id);
  return { user_id: account.user.id, restaurant_id: id, wishlist: local.wish.has(id), visited, visited_on: visited && local.visited[id] ? local.visited[id] : null };
}
async function pushIds(ids) {
  if (!account.client || !account.user || !ids.length) return;
  const local = snapshotLocal();
  const rows = ids.map((id) => rowFor(id, local));
  const keep = rows.filter((r) => r.wishlist || r.visited), drop = rows.filter((r) => !r.wishlist && !r.visited).map((r) => r.restaurant_id);
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
  const before = account.known || { wish: new Set(), visited: {} };
  const ids = new Set();
  local.wish.forEach((id) => { if (!before.wish.has(id)) ids.add(id); });
  before.wish.forEach((id) => { if (!local.wish.has(id)) ids.add(id); });
  Object.keys(local.visited).forEach((id) => { if (before.visited[id] !== local.visited[id]) ids.add(id); });
  Object.keys(before.visited).forEach((id) => { if (!(id in local.visited)) ids.add(id); });
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
  const { data, error } = await account.client.from("saved").select("restaurant_id,wishlist,visited,visited_on").order("created_at");
  if (error) return;
  const remote = { wish: [], visited: {} };
  data.forEach((r) => {
    if (r.wishlist) remote.wish.push(r.restaurant_id);
    if (r.visited) remote.visited[r.restaurant_id] = r.visited_on || "";
  });
  const first = store.get(SYNCED_KEY, null) !== account.user.id;
  const local = snapshotLocal();
  let wish = remote.wish, visited = remote.visited;
  if (first) {
    const extra = [...local.wish].filter((id) => !remote.wish.includes(id));
    wish = remote.wish.concat(extra);
    visited = Object.assign({}, local.visited, remote.visited);
    store.set(SYNCED_KEY, account.user.id);
  }
  // Keep this browser's order for restaurants it already had, then add the rest.
  const order = loadWishlist();
  wish = order.filter((id) => wish.includes(id)).concat(wish.filter((id) => !order.includes(id)));
  account.known = { wish: new Set(remote.wish), visited: Object.assign({}, remote.visited) };
  setWishlist(wish, "sync");
  setVisited(visited, "sync");
  if (first) { const ids = changedIds(snapshotLocal()); if (ids.length) await pushIds(ids); }
}

// ---------- Been there ----------
// Returns false (and offers sign-in) when nobody is signed in.
function toggleVisited(id) {
  if (!account.user) { openSignIn("been"); return false; }
  const v = loadVisited();
  if (id in v) delete v[id]; else v[id] = "";
  setVisited(v);
  return true;
}
function setVisitedDate(id, date) {
  const v = loadVisited();
  if (!(id in v)) return;
  v[id] = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  setVisited(v);
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

function renderSignIn() {
  const box = $("signInBox");
  if (!box) return;
  const why = account.reason === "been" ? t("acctWhyBeen") : t("acctWhy");
  box.querySelector(".si-title").textContent = t("acctTitle");
  box.querySelector(".si-why").textContent = why;
  box.querySelector(".si-close").setAttribute("aria-label", t("acctClose"));
  const g = box.querySelector(".si-google");
  g.hidden = !account.google;
  g.querySelector("span").textContent = t("acctGoogle");
  box.querySelector(".si-or").hidden = !account.google;
  box.querySelector(".si-or span").textContent = t("acctOr");
  box.querySelector("label[for=siEmail]").textContent = t("acctEmailLabel");
  const send = box.querySelector(".si-send");
  if (!send.disabled) send.textContent = t("acctSend");
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
      '<p class="si-small"></p>' +
    "</form>";
  document.body.appendChild(box);
  box.addEventListener("click", (e) => { if (e.target === box || e.target.closest(".si-close")) box.close(); });
  box.querySelector(".si-google").addEventListener("click", async () => {
    try {
      await bootAccount();
      try { sessionStorage.setItem("starredbill-signing-in", "1"); } catch (e) {}
      await account.client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname + location.search } });
    } catch (e) { box.querySelector(".si-status").textContent = t("acctFailed"); }
  });
  box.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("siEmail").value.trim(), status = box.querySelector(".si-status"), send = box.querySelector(".si-send");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = t("acctBadEmail"); $("siEmail").focus(); return; }
    send.disabled = true; send.textContent = t("acctSending"); status.textContent = "";
    try {
      await bootAccount();
      try { sessionStorage.setItem("starredbill-signing-in", "1"); } catch (err) {}
      const { error } = await account.client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname + location.search } });
      if (error) status.textContent = error.status === 429 ? t("acctTooMany") : t("acctFailed");
      else status.textContent = t("acctSent", { email });
    } catch (err) { status.textContent = t("acctFailed"); }
    send.disabled = false; send.textContent = t("acctSend");
  });
  return box;
}

function openSignIn(reason) {
  account.reason = reason || "";
  const box = $("signInBox") || buildSignIn();
  box.querySelector(".si-status").textContent = "";
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

// Start straight away only if someone is (or is becoming) signed in; everyone else loads nothing extra.
if (hasStoredSession() || ARRIVED_SIGNING_IN) bootAccount().catch(() => { account.ready = true; renderAccountButton(); });
else account.ready = true;
if (LINK_FAILED) setTimeout(() => acctNotice(t("acctLinkExpired")), 600);
