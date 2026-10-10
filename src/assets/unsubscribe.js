// The unsubscribe link in every star email (scripts/star_alerts.py) and saved-search email (scripts/saved_searches.py):
// /unsubscribe/?t=<token>[&what=near|countries|searches|all].
// It works without signing in: email_unsubscribe() in Supabase (supabase/schema.sql) turns those emails off for whoever
// the token belongs to. It runs in the page rather than on opening the link, so mail scanners that open links can't
// unsubscribe anyone. English only, like the emails; kept out of search engines and the sitemap.
const unsubParams = new URLSearchParams(location.search);
const UNSUB_WHAT = { near: "New stars near you emails", countries: "ceremony-night summaries", searches: "saved-search emails (your searches stay on Your account)", all: "star or saved-search emails" };

function renderHeader() {
  applyI18n();
  renderWishCount();
  $("destLink").href = withLang("/") + "#destinations";
  $("crumbs").innerHTML = '<a href="' + withLang("/") + '">' + esc(t("crumbHome")) + '</a><span aria-current="page">Unsubscribe</span>';
  document.title = "Unsubscribe · The Starred Bill";
}

async function unsubscribe() {
  const token = unsubParams.get("t") || "";
  const what = UNSUB_WHAT[unsubParams.get("what")] ? unsubParams.get("what") : "all";
  const say = (title, text) => { $("unsubTitle").textContent = title; $("unsubText").textContent = text; $("unsubMore").hidden = false; };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    say("This link isn't complete", "Try the link in the email again, or turn the emails off on Your account.");
    return;
  }
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/email_unsubscribe", {
      method: "POST", body: JSON.stringify({ t: token, what }),
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" },
    });
    if (!r.ok) throw new Error(r.status);
    if ((await r.json()) === "ok") {
      say("You're unsubscribed", "We won't send you any more " + UNSUB_WHAT[what] + ".");
      track("star-emails", { unsubscribe: what });
    } else {
      say("We couldn't find those emails", "The link may be from an account that has since been deleted. If you're still getting emails, reply to one with “unsubscribe” and we'll stop them.");
    }
  } catch (e) {
    say("That didn't work just now", "Please try the link again in a minute, or turn the emails off on Your account.");
  }
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("button[data-lang]");
  if (el) { setLang(el.dataset.lang); renderHeader(); }
});
renderHeader();
unsubscribe();
