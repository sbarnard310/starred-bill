// Star emails on Your account (9 Oct 2026): members can ask for "New stars near you" (restaurants that win or gain a
// star within 100 km of their home city) and a ceremony-night summary for the countries they choose. The choices are
// one row in `email_alerts` (supabase/schema.sql); scripts/star_alerts.py sends the emails the night a guide's new stars
// reach our pages. account-page.js puts emailsSection() on the page; the account page is English only.
const ALERT_NEAR_KM = 100;
const alerts = { row: null, loading: null, failed: false, note: "", noteOk: true };

function loadAlerts() {
  if (!alerts.loading) alerts.loading = account.client.from("email_alerts").select("near_home,countries").maybeSingle().then(({ data, error }) => {
    if (error) alerts.failed = true;
    else alerts.row = { near_home: !!(data && data.near_home), countries: (data && data.countries) || [] };
  }, () => { alerts.failed = true; }).then(render);
  return alerts.loading;
}

async function saveAlerts(next, note, event) {
  const before = alerts.row;
  alerts.row = Object.assign({}, alerts.row, next);
  const { error } = await account.client.from("email_alerts")
    .upsert({ user_id: account.user.id, near_home: alerts.row.near_home, countries: alerts.row.countries }, { onConflict: "user_id" });
  if (error) alerts.row = before;
  alerts.note = error ? "That didn't save just now. Please try again." : note;
  alerts.noteOk = !error;
  if (!error) track("star-emails", event);
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
    '<p class="pref-note' + (alerts.noteOk ? " ok" : "") + '" aria-live="polite">' + esc(alerts.note) + "</p></div>" +
    '<p class="pref-small">We send these from hello@starredbill.com through Resend, only to the email you sign in with. Every email has an unsubscribe link. ' +
    'See our <a href="/privacy/">privacy notice</a>.</p></section>';
}

// Signing out (or in as someone else) forgets the last person's choices.
window.addEventListener("sb:account", () => { alerts.row = null; alerts.loading = null; alerts.failed = false; alerts.note = ""; });
// A home city cleared on this page turns "near you" off with it, since there's nowhere to measure from.
window.addEventListener("sb:profile", () => {
  if (alerts.row && alerts.row.near_home && !loadProfile().home && account.user) saveAlerts({ near_home: false }, "No home city, so New stars near you is off.", { near: "off" });
});

document.addEventListener("change", (e) => {
  if (e.target.id === "alNear") {
    const on = e.target.checked, home = loadProfile().homeName || loadProfile().home;
    saveAlerts({ near_home: on }, on ? "Saved. We'll email you when restaurants near " + home + " win or gain a star." : "Saved. No more New stars near you emails.", { near: on ? "on" : "off" });
  }
  if (e.target.id === "alAdd" && e.target.value) {
    const c = alertCountry(e.target.value);
    saveAlerts({ countries: alerts.row.countries.concat(c[0]) }, "Saved. We'll email you what changed in " + c[1] + " the night its guide comes out.", { countries: "add" });
  }
});
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-alremove],[data-gohome]");
  if (!el) return;
  if (el.dataset.gohome !== undefined) { e.preventDefault(); const box = $("prefHome"); if (box) { box.scrollIntoView({ block: "center" }); box.focus(); } return; }
  const c = alertCountry(el.dataset.alremove);
  saveAlerts({ countries: alerts.row.countries.filter((x) => x !== el.dataset.alremove) }, "Saved. No more summaries for " + (c ? c[1] : "that country") + ".", { countries: "remove" });
});
