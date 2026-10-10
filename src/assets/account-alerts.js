// Star emails on Your account (9 Oct 2026): members can ask for "New stars near you" (restaurants that win or gain a
// star within 100 km of their home city) and a ceremony-night summary for the countries they choose. The choices are
// one row in `email_alerts` (supabase/schema.sql); scripts/star_alerts.py sends the emails the night a guide's new stars
// reach our pages. account-page.js puts emailsSection() on the page; the account page is English only.
// Booking reminders (10 Oct 2026, supabase/booking.sql): the same row's `booking` asks for a reminder the day before
// bookings open for each restaurant on the member's trips, and remindersSection() lists the reminders they asked for on
// restaurant pages ("Email me the day before"); scripts/booking_reminders.py sends both.
const ALERT_NEAR_KM = 100;
const alerts = { row: null, loading: null, failed: false, note: "", noteOk: true };

function loadAlerts() {
  if (!alerts.loading) alerts.loading = account.client.from("email_alerts").select("near_home,countries,booking").maybeSingle().then(({ data, error }) => {
    if (error) alerts.failed = true;
    else alerts.row = { near_home: !!(data && data.near_home), countries: (data && data.countries) || [], booking: !!(data && data.booking) };
  }, () => { alerts.failed = true; }).then(render);
  return alerts.loading;
}

async function saveAlerts(next, note, event) {
  const before = alerts.row;
  alerts.row = Object.assign({}, alerts.row, next);
  const { error } = await account.client.from("email_alerts")
    .upsert({ user_id: account.user.id, near_home: alerts.row.near_home, countries: alerts.row.countries, booking: alerts.row.booking }, { onConflict: "user_id" });
  if (error) alerts.row = before;
  alerts.note = error ? "That didn't save just now. Please try again." : note;
  alerts.noteOk = !error;
  if (!error) track(event.booking ? "booking-reminder" : "star-emails", event);
  render();
}

const alertCountry = (id) => (DATA.alertCountries || []).find((c) => c[0] === id);
function nextCeremony(c) {
  if (!c || !c[2]) return "";
  const d = new Date(c[2] + "T12:00:00Z");
  if (c[3]) return "next ceremony " + d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return "next expected around " + d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function emailsSection() {
  return starEmailsSection() + searchesSection();
}
function starEmailsSection() {
  const head = '<section class="acct-section" id="emails"><h2>Star emails</h2>' +
    "<p>An email on the night a MICHELIN Guide reveals its new stars, once our pages are up to date. Nothing else, and you can stop them at any time.</p>";
  if (alerts.failed) return head + '<p class="empty-note">Your email choices couldn\'t load just now. Please reload the page to try again.</p></section>';
  if (!alerts.row) { loadAlerts(); return head + '<p class="acct-loading">' + esc(t("accLoading")) + "</p></section>"; }
  const pr = loadProfile(), r = alerts.row;
  const home = pr.home ? pr.homeName || pr.home : "";
  const chosen = r.countries.map(alertCountry).filter(Boolean);
  const left = (DATA.alertCountries || []).filter((c) => !r.countries.includes(c[0]));
  return head + '<div class="alerts">' +
    '<label class="al-opt"><input type="checkbox" id="alNear"' + (r.near_home && home ? " checked" : "") + (home ? "" : " disabled") + ">" +
    "<span><strong>New stars near you</strong>" +
    (home ? "Restaurants that win or gain a star within " + ALERT_NEAR_KM + " km of " + esc(home) + ", after each ceremony."
      : 'Restaurants that win or gain a star near your home city. <a href="#preferences" data-gohome="">Choose a home city</a> above to turn this on.') +
    "</span></label>" +
    '<div class="al-opt al-countries"><div><strong id="alCountriesLabel">Ceremony-night summaries</strong>' +
    "<span>What gained a star, dropped one, lost its stars or closed in the countries you choose, the night each guide comes out.</span>" +
    (chosen.length ? '<ul class="al-chosen" aria-labelledby="alCountriesLabel">' + chosen.map((c) =>
      "<li><span>" + esc(c[1]) + (nextCeremony(c) ? " <small>· " + esc(nextCeremony(c)) + "</small>" : "") + "</span>" +
      '<button type="button" class="linkish" data-alremove="' + esc(c[0]) + '" aria-label="Stop summaries for ' + esc(c[1]) + '">Remove</button></li>').join("") + "</ul>" : "") +
    (left.length ? '<label class="sr-only" for="alAdd">Add a country</label><select id="alAdd"><option value="">' + (chosen.length ? "Add another country…" : "Choose a country…") + "</option>" +
      left.map((c) => '<option value="' + esc(c[0]) + '">' + esc(c[1]) + "</option>").join("") + "</select>" : "") +
    "</div></div>" +
    '<label class="al-opt"><input type="checkbox" id="alBooking"' + (r.booking ? " checked" : "") + ">" +
    "<span><strong>Booking reminders for your trips</strong>" +
    "The day before bookings open for a restaurant on one of your trips, for its date (or the trip's first day), until you mark it booked. " +
    "Only for restaurants whose booking window we know.</span></label>" +
    '<p class="pref-note' + (alerts.noteOk ? " ok" : "") + '" aria-live="polite">' + esc(alerts.note) + "</p></div>" +
    '<p class="pref-small">We send these from hello@starredbill.com through Resend, only to the email you sign in with. Every email has an unsubscribe link. ' +
    'See our <a href="/privacy/">privacy notice</a>.</p></section>';
}

// ---------- Saved searches (10 Oct 2026) ----------
// Searches saved from a destination page's filters or Help me pick (saved-search.js), each a row in `saved_searches`
// (supabase/saved-searches.sql); scripts/saved_searches.py emails the member when a restaurant newly matches one.
// Here members open them again, turn each one's emails on or off, and delete them.
const searches = { rows: null, loading: null, failed: false, note: "", noteOk: true, jumped: false };
function loadSearches() {
  if (!searches.loading) searches.loading = account.client.from("saved_searches").select("id,label,query,page,emails,created_at").order("created_at").then(({ data, error }) => {
    if (error) searches.failed = true;
    else searches.rows = data || [];
  }, () => { searches.failed = true; }).then(() => {
    render();
    if (location.hash === "#searches" && !searches.jumped && $("searches")) { searches.jumped = true; $("searches").scrollIntoView(); }
  });
  return searches.loading;
}
function searchesSection() {
  const head = '<section class="acct-section" id="searches"><h2>Saved searches</h2>' +
    "<p>Save the filters on any destination page (tap <strong>Save this search</strong>), or your answers on Help me pick, and we'll email you when a restaurant newly matches: " +
    "a new star, a lower price or a new menu. At most one email a day.</p>";
  if (searches.failed) return head + '<p class="empty-note">Your saved searches couldn\'t load just now. Please reload the page to try again.</p></section>';
  if (!searches.rows) { loadSearches(); return head + '<p class="acct-loading">' + esc(t("accLoading")) + "</p></section>"; }
  const list = searches.rows.length ? '<ul class="ss-list">' + searches.rows.map((r) =>
    '<li><a href="' + esc(r.page) + '">' + esc(r.label) + "</a>" +
    '<span class="ss-acts"><label class="ss-mail"><input type="checkbox" data-ssmail="' + esc(r.id) + '"' + (r.emails ? " checked" : "") + "> Email me</label>" +
    '<button type="button" class="linkish" data-ssdel="' + esc(r.id) + '" aria-label="Delete the saved search ' + esc(r.label) + '">Delete</button></span></li>').join("") + "</ul>"
    : '<p class="empty-note">No saved searches yet. Try one: <a href="/japan/tokyo/?stars=2">two-star restaurants in Tokyo</a>, <a href="/uk/england/london/?diet=vegan">vegan options in London</a>, or <a href="/pick/">Help me pick</a>.</p>';
  return head + '<div class="alerts">' + list + '<p class="pref-note' + (searches.noteOk ? " ok" : "") + '" aria-live="polite">' + esc(searches.note) + "</p></div>" +
    '<p class="pref-small">You can keep up to 20. Every email has an unsubscribe link. See our <a href="/privacy/#searches">privacy notice</a>.</p></section>';
}
async function changeSearch(id, change) {
  const row = searches.rows.find((r) => r.id === id);
  if (!row) return;
  const q = change === "delete" ? account.client.from("saved_searches").delete().eq("id", id) : account.client.from("saved_searches").update({ emails: change === "on" }).eq("id", id);
  const { error } = await q;
  if (!error) {
    if (change === "delete") searches.rows = searches.rows.filter((r) => r !== row);
    else row.emails = change === "on";
    track("saved-search", { change });
  }
  searches.note = error ? "That didn't save just now. Please try again." : change === "delete" ? "Deleted “" + row.label + "”." : change === "on" ? "We'll email you about “" + row.label + "”." : "No more emails about “" + row.label + "”. It stays saved here.";
  searches.noteOk = !error;
  render();
}
document.addEventListener("change", (e) => { if (e.target.dataset.ssmail) changeSearch(e.target.dataset.ssmail, e.target.checked ? "on" : "off"); });
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-ssdel]");
  if (b) changeSearch(b.dataset.ssdel, "delete");
});

// Signing out (or in as someone else) forgets the last person's choices.
window.addEventListener("sb:account", () => {
  alerts.row = null; alerts.loading = null; alerts.failed = false; alerts.note = "";
  searches.rows = null; searches.loading = null; searches.failed = false; searches.note = "";
  reminders.rows = null; reminders.loading = null;
});
// A home city cleared on this page turns "near you" off with it, since there's nowhere to measure from.
window.addEventListener("sb:profile", () => {
  if (alerts.row && alerts.row.near_home && !loadProfile().home && account.user) saveAlerts({ near_home: false }, "No home city, so New stars near you is off.", { near: "off" });
});

document.addEventListener("change", (e) => {
  if (e.target.id === "alNear") {
    const on = e.target.checked, home = loadProfile().homeName || loadProfile().home;
    saveAlerts({ near_home: on }, on ? "Saved. We'll email you when restaurants near " + home + " win or gain a star." : "Saved. No more New stars near you emails.", { near: on ? "on" : "off" });
  }
  if (e.target.id === "alBooking") {
    const on = e.target.checked;
    saveAlerts({ booking: on }, on ? "Saved. We'll email you the day before bookings open for the restaurants on your trips." : "Saved. No more booking reminders for your trips.", { booking: on ? "trips-on" : "trips-off" });
  }
  if (e.target.id === "alAdd" && e.target.value) {
    const c = alertCountry(e.target.value);
    saveAlerts({ countries: alerts.row.countries.concat(c[0]) }, "Saved. We'll email you what changed in " + c[1] + " the night its guide comes out.", { countries: "add" });
  }
});
document.addEventListener("click", (e) => {
  const rm = e.target.closest("[data-remindremove]");
  if (rm) { removeReminder(rm.dataset.remindremove, rm.dataset.day); return; }
  const el = e.target.closest("[data-alremove],[data-gohome]");
  if (!el) return;
  if (el.dataset.gohome !== undefined) { e.preventDefault(); const box = $("prefHome"); if (box) { box.scrollIntoView({ block: "center" }); box.focus(); } return; }
  const c = alertCountry(el.dataset.alremove);
  saveAlerts({ countries: alerts.row.countries.filter((x) => x !== el.dataset.alremove) }, "Saved. No more summaries for " + (c ? c[1] : "that country") + ".", { countries: "remove" });
});

// ---------- Booking reminders ----------
// The reminders a member asked for on restaurant pages, soonest first, with when bookings open (from /data/booking.json,
// loaded only now) and the day we'll email them. Sent ones and past dates aren't shown.
const reminders = { rows: null, loading: null, failed: false, windows: null };
function loadReminders() {
  if (!reminders.loading) reminders.loading = Promise.all([
    account.client.from("booking_reminders").select("restaurant,visit_on,sent_at").gte("visit_on", new Date().toLocaleDateString("en-CA")).order("visit_on"),
    DATA.bookingUrl ? getData(DATA.bookingUrl).catch(() => ({})) : Promise.resolve({}),
  ]).then(([{ data, error }, windows]) => {
    if (error) reminders.failed = true;
    else { reminders.rows = data || []; reminders.windows = windows || {}; }
  }, () => { reminders.failed = true; }).then(render);
  return reminders.loading;
}
async function removeReminder(id, day) {
  if (!confirm("Remove this booking reminder?")) return;
  const { error } = await account.client.from("booking_reminders").delete().eq("restaurant", id).eq("visit_on", day);
  if (error) { acctNotice("That didn't save just now. Please try again."); return; }
  reminders.rows = reminders.rows.filter((x) => !(x.restaurant === id && x.visit_on === day));
  track("booking-reminder", { remove: id });
  render();
}
function remindersSection() {
  if (reminders.failed) return "";
  if (!reminders.rows) { loadReminders(); return ""; }
  const rows = reminders.rows;
  if (!rows.length) return "";
  const today = new Date().toLocaleDateString("en-CA");
  return '<section class="acct-section" id="reminders"><h2>Booking reminders <span class="count">' + rows.length + "</span></h2>" +
    "<p>We email you the day before bookings open for each date. Ask for more on a restaurant's own page, under How to book.</p>" +
    '<ul class="acct-list">' + rows.map((x) => {
      const w = reminders.windows[x.restaurant], r = byId && byId.get(x.restaurant);
      const name = w ? w.name : r ? nameOf(r) : x.restaurant, href = w ? w.href : r ? pageLink(r) : "";
      const on = w ? bwOpens(w.bw, x.visit_on) : "";
      const [oy, om, od] = (on || "2000-01-01").split("-").map(Number), eve = on ? bwIso(bwUtc(oy, om, od - 1)) : "";
      const when = x.sent_at ? "reminder sent" : !on ? "we don't know when its bookings open any more, so there's no email to send"
        : on <= today ? "bookings are open now" : "bookings open " + bwLong(on) + (w.bw.time ? " at " + bwClock(w.bw.time) + " " + bwZone(w.bw.tz) : "") +
          (eve > today ? "; we'll email you on " + bwLong(eve) : "; we'll email you today");
      return '<li><div class="al-main">' + (href ? '<a class="al-name" href="' + esc(href) + '">' + esc(name) + "</a>" : '<span class="al-name">' + esc(name) + "</span>") +
        '<span class="al-meta">' + esc("For " + bwLong(x.visit_on) + " · " + when) + "</span></div>" +
        '<button type="button" class="linkish" data-remindremove="' + esc(x.restaurant) + '" data-day="' + esc(x.visit_on) + '" aria-label="Remove the reminder for ' + esc(name) + '">Remove</button></li>';
    }).join("") + "</ul></section>";
}
