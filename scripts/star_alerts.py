#!/usr/bin/env python3
"""Star emails: the two emails members can ask for on Your account, sent the night a MICHELIN Guide's new stars reach
our pages (when its `starsUpdated` is set in content/ceremonies.json and pushed):

  * New stars near you: restaurants that won or gained a star within NEAR_KM of the member's home city (or inside their
    home region or country), from the home city in `profile`.
  * The ceremony-night summary for the countries they chose: what gained a star, dropped one, lost its stars or closed.

One email per member per run, holding whichever of the two apply; nobody gets an email when neither has anything in it.
The changes come from the build (_site/data/alerts.json, alerts_data() in build.py), the members from Supabase
(alert_recipients(), with the secret key), and the emails go out through Resend's API. Each one sent is recorded in
`email_sent` (topic '<guide id>@<starsUpdated>'), so running it again never sends twice. Standard library only,
Python 3.9 compatible. Run by .github/workflows/star-alerts.yml; by hand:

  python3 build.py
  python3 scripts/star_alerts.py --guide texas --preview out/            # sample emails as HTML files, nothing sent
  python3 scripts/star_alerts.py --guide texas --preview out/ --home london --countries uk,ireland
  python3 scripts/star_alerts.py --guide texas --test-to you@example.com  # the sample, sent to one address
  python3 scripts/star_alerts.py --before <commit> --send                 # what the workflow runs

Settings come from the environment: SUPABASE_SERVICE_KEY (Supabase › Project Settings › API Keys, the secret key) and
RESEND_API_KEY (resend.com › API Keys, sending access for starredbill.com). Without them it says it isn't set up.
"""
import argparse
import hashlib
import html
import json
import math
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://starredbill.com"
SUPABASE_URL = "https://uvdaclbhskkukyngikhq.supabase.co"
FROM = "The Starred Bill <hello@starredbill.com>"
REPLY_TO = "hello@starredbill.com"
NEAR_KM = 100           # "near you": this far from the home city's centre
FRESH_DAYS = 45         # only a ceremony this recent is news (a starsUpdated set long after it, e.g. a correction, isn't)
RUN_MAX = 80            # emails per run: Resend's free plan sends 100 a day, and sign-in emails share that allowance
LIST_MAX = 25           # restaurants listed in one group before "and 12 more"
BATCH = 100             # Resend's batch API takes up to 100 emails a call
UA = "StarredBill-Alerts/1.0"   # Cloudflare refuses Python's default User-Agent
TRACK = "utm_source=star-email&utm_medium=email&utm_campaign="  # so Umami shows the visits these emails bring back
STAR_WORD = {1: "one star", 2: "two stars", 3: "three stars"}
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def long_date(d):
    return f"{int(d[8:10])} {MONTHS[int(d[5:7]) - 1]} {d[:4]}"


def km(a, b, c, d):
    return 6371 * 2 * math.asin(math.sqrt(math.sin(math.radians(c - a) / 2) ** 2 + math.cos(math.radians(a)) * math.cos(math.radians(c)) * math.sin(math.radians(d - b) / 2) ** 2))


def link(path, campaign):
    """An address on the site, with the campaign added before any #r= part."""
    base, _, frag = path.partition("#")
    url = SITE + base + ("&" if "?" in base else "?") + TRACK + campaign
    return url + ("#" + frag if frag else "")


# ---------- Which guides this run is about ----------
def ceremonies_at(commit):
    try:
        out = subprocess.run(["git", "show", f"{commit}:content/ceremonies.json"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
        return {g["id"]: g for g in json.loads(out)["guides"]}
    except (subprocess.CalledProcessError, ValueError, KeyError):
        return {}


def updated_guides(before):
    """Guides whose starsUpdated was set (or moved later) since the commit `before`."""
    old = ceremonies_at(before)
    now = json.loads((ROOT / "content" / "ceremonies.json").read_text("utf-8"))["guides"]
    return [g["id"] for g in now if g.get("starsUpdated") and g["starsUpdated"] > (old.get(g["id"], {}).get("starsUpdated") or "")]


def pick_guides(data, ids, forced):
    """The guides to write about, each checked: its changes are in our files and its ceremony is recent news."""
    by_id = {g["id"]: g for g in data["guides"]}
    out = []
    for gid in ids:
        g = by_id.get(gid)
        if not g:
            print(f"  {gid}: not a guide in content/ceremonies.json")
        elif g["updating"]:
            print(f"  {gid}: its latest ceremony ({g['last']}) is newer than starsUpdated ({g['starsUpdated'] or 'never'}); nothing to send yet")
        elif not g["marked"]:
            print(f"  {gid}: none of its restaurants carries a change from the {g['last']} ceremony, so there's nothing to tell")
        elif not forced and (date.today() - date.fromisoformat(g["last"])).days > FRESH_DAYS:
            print(f"  {gid}: its ceremony was on {g['last']}, more than {FRESH_DAYS} days ago, so it isn't news; pass --guide to send anyway")
        else:
            out.append(g)
    return out


# ---------- What each member hears about ----------
GAINED = ("new", "up")


def near_changes(member, data, chosen):
    """Restaurants that won or gained a star near the member's home city, nearest first, with their distance."""
    home = data["places"].get(member.get("home_place") or "")
    if not member.get("near_home") or not home:
        return None, []
    name, path, _, kind, lat, lng = home
    found = []
    for g in chosen:
        for r in g["changes"]:
            if r["kind"] not in GAINED:
                continue
            inside = r["path"].startswith(path)
            far = km(lat, lng, r["lat"], r["lng"]) if None not in (lat, lng, r.get("lat"), r.get("lng")) else None
            # A city reaches NEAR_KM around it; a region or country is "near" anywhere inside it.
            if inside or (kind in ("city", "district") and far is not None and far <= NEAR_KM):
                found.append((far if far is not None else 0, r, g))
    found.sort(key=lambda x: x[0])
    return member.get("home_name") or name, found


def country_changes(member, data, chosen):
    """For each chosen country one of this run's guides covers: the guide and its changes there."""
    out = []
    names = {c[0]: c[1] for c in data["countries"]}
    for c in member.get("countries") or []:
        for g in chosen:
            if c in g["countries"]:
                out.append((c, names.get(c, c), g, [r for r in g["changes"] if r["country"] == c]))
    return out


# ---------- The email ----------
def kind_text(r):
    k = r["kind"]
    if k == "new":
        return "new, " + STAR_WORD.get(r["stars"], "")
    if k == "up":
        return "up to " + STAR_WORD.get(r["stars"], "")
    if k == "down":
        return "down to " + STAR_WORD.get(r["stars"], "")
    if k == "lost":
        return "lost its " + ("star" if (r.get("formerStars") or 1) == 1 else STAR_WORD[r["formerStars"]])
    return "closed"


def edition(g):
    return f'{g["name"]} {g.get("edition") or g["last"][:4]}'


def row_html(r, campaign, extra=""):
    stars = "★" * (r["stars"] or 0)
    bits = [kind_text(r), r["where"]] + ([extra] if extra else []) + ([f'dinner menu {r["dinner"]}'] if r.get("dinner") and r["kind"] in GAINED else [])
    return ('<li style="margin:0 0 10px;">'
            f'<a href="{html.escape(link(r["url"], campaign))}" style="color:#1E6142;font-weight:bold;text-decoration:none;">{html.escape(r["name"])}</a>'
            + (f' <span style="color:#B3862B;">{stars}</span>' if stars and r["kind"] not in ("lost", "closed") else "")
            + f'<br><span style="font-size:14px;color:#5A6E62;">{html.escape(" · ".join(b for b in bits if b))}</span></li>')


def row_text(r, campaign, extra=""):
    bits = [kind_text(r), r["where"]] + ([extra] if extra else []) + ([f'dinner menu {r["dinner"]}'] if r.get("dinner") and r["kind"] in GAINED else [])
    return f'- {r["name"]} ({", ".join(b for b in bits if b)}): {link(r["url"], campaign)}'


def group_html(title, rows, more_url, campaign):
    if not rows:
        return "", ""
    shown = rows[:LIST_MAX]
    h = (f'<h3 style="margin:18px 0 8px;font-size:15px;color:#12261C;">{html.escape(title)} ({len(rows)})</h3>'
         '<ul style="margin:0;padding:0 0 0 18px;font-size:15px;line-height:1.4;color:#12261C;">'
         + "".join(row_html(r, campaign, x) for r, x in shown) + "</ul>")
    t = f"\n\n{title} ({len(rows)}):\n" + "\n".join(row_text(r, campaign, x) for r, x in shown)
    if len(rows) > len(shown):
        h += f'<p style="margin:4px 0 0;font-size:14px;"><a href="{html.escape(more_url)}" style="color:#1E6142;">and {len(rows) - len(shown)} more</a></p>'
        t += f"\nand {len(rows) - len(shown)} more: {more_url}"
    return h, t


def compose(member, data, chosen):
    """The email for one member, or None when there's nothing for them in this run."""
    home, near = near_changes(member, data, chosen)
    summaries = [s for s in country_changes(member, data, chosen)]
    if not near and not summaries:
        return None
    campaign = "-".join(sorted({g["id"] for g in chosen}))
    lead_g = summaries[0][2] if summaries else near[0][2]
    guides_named = sorted({s[2]["id"]: s[2] for s in summaries}.values(), key=lambda g: g["last"], reverse=True) or [lead_g]
    if summaries:
        subject = f"{edition(guides_named[0])}: what changed" + (f" in {summaries[0][1]}" if len({s[0] for s in summaries}) == 1 and len(guides_named) == 1 and len(guides_named[0]["countries"]) > 1 else "")
        h1 = edition(guides_named[0]) if len(guides_named) == 1 else "New Michelin stars tonight"
    else:
        subject = (f"A new Michelin star near {home}: {near[0][1]['name']}" if len(near) == 1 else f"{len(near)} new Michelin stars near {home}")
        h1 = f"New Michelin stars near {home}"
    intro = " ".join(f'The {g["name"]} revealed its {g.get("edition") or g["last"][:4]} stars on {long_date(g["last"])}.' for g in guides_named) \
        + " Our pages now show every change, with what each menu costs."
    body_h, body_t = [], []
    if near:
        title = f"New stars near {home}"
        rows = [(r, (f"{round(d)} km away" if d >= 1 else "")) for d, r, g in near]
        h, t = group_html("Won or gained a star", rows, link(data["places"][member["home_place"]][1], campaign), campaign)
        body_h.append(f'<h2 style="margin:24px 0 4px;font-family:Georgia,serif;font-weight:normal;font-size:21px;color:#12261C;">{html.escape(title)}</h2>'
                      f'<p style="margin:0;font-size:14px;color:#5A6E62;">Within {NEAR_KM} km of {html.escape(home)}.</p>' + h)
        body_t.append(f"\n{title.upper()} (within {NEAR_KM} km)\n" + t)
    near_ids = {r["id"] for _, r, _ in near}
    for c, cname, g, rs in summaries:
        more = link(g["results"] or data["places"][c][1], campaign)
        # Those already listed near the home city aren't listed again, just counted.
        also = [r for r in rs if r["kind"] in GAINED and r["id"] in near_ids]
        groups = [("Gained a star", [r for r in rs if r["kind"] in GAINED and r["id"] not in near_ids]), ("Dropped a star", [r for r in rs if r["kind"] == "down"]),
                  ("Lost its stars", [r for r in rs if r["kind"] == "lost"]), ("Closed", [r for r in rs if r["kind"] == "closed"])]
        parts = [group_html(t, [(r, "") for r in sorted(rows, key=lambda r: (-(r["stars"] or 0), r["name"]))], more, campaign) for t, rows in groups]
        title = cname if len(summaries) > 1 or len(g["countries"]) > 1 else "What changed"
        none = "" if rs else '<p style="margin:6px 0 0;font-size:15px;color:#3E5247;">No restaurant there gained, lost or dropped a star this time.</p>'
        plus = f"Plus the {len(also)} near {home} above." if len(also) > 1 else f"Plus {also[0]['name']}, near {home} above." if also else ""
        body_h.append(f'<h2 style="margin:24px 0 4px;font-family:Georgia,serif;font-weight:normal;font-size:21px;color:#12261C;">{html.escape(title)}</h2>' + none
                      + "".join(p[0] for p in parts)
                      + (f'<p style="margin:8px 0 0;font-size:14px;color:#5A6E62;">{html.escape(plus)}</p>' if plus else "")
                      + f'<p style="margin:14px 0 0;"><a href="{html.escape(more)}" style="display:inline-block;background:#1E6142;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;padding:11px 22px;border-radius:999px;">'
                      + ("See every change" if g["results"] else f"See {html.escape(cname)}'s starred restaurants") + "</a></p>")
        body_t.append(f"\n{title.upper()}\n" + ("No restaurant there gained, lost or dropped a star this time.\n" if not rs else "") + "".join(p[1] for p in parts) + (f"\n{plus}" if plus else "") + f"\n\nSee every change: {more}")
    what = " and ".join(x for x in (("new stars near " + home) if member.get("near_home") and home else "",
                                    ("ceremony-night summaries for " + ", ".join({c[0]: c[1] for c in data["countries"]}.get(c, c) for c in member.get("countries") or [])) if member.get("countries") else "") if x)
    unsub = f'{SITE}/unsubscribe/?t={member["token"]}'
    manage = f"{SITE}/account/#emails"
    footer_h = (f'You\'re getting this because you asked for {html.escape(what)} on your Starred Bill account. '
                f'<a href="{html.escape(manage)}" style="color:#5A6E62;">Change which emails you get</a> · '
                f'<a href="{html.escape(unsub)}" style="color:#5A6E62;">Unsubscribe</a>')
    page = f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F6F1;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #D5E0D6;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#10362A;padding:18px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:14px;"><img src="https://starredbill.com/img/email/receipt-mark.png" width="27" height="40" alt="" style="display:block;border:0;"></td>
                <td style="vertical-align:middle;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#F5F0E4;">The Starred Bill</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 26px;color:#12261C;">
            <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;line-height:1.2;color:#12261C;">{html.escape(h1)}</h1>
            <p style="margin:0;font-size:16px;line-height:1.5;color:#3E5247;">{html.escape(intro)}</p>
            {"".join(body_h)}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px 24px;border-top:1px solid #D5E0D6;font-size:12px;line-height:1.5;color:#5A6E62;">
            {footer_h}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>"""
    text = (f"{h1}\n\n{intro}\n" + "\n".join(body_t)
            + f"\n\n--\nYou're getting this because you asked for {what} on your Starred Bill account.\n"
              f"Change which emails you get: {manage}\nUnsubscribe: {unsub}\n")
    return {"to": [member["email"]], "subject": subject, "html": page, "text": text,
            "headers": {"List-Unsubscribe": f"<{unsub}>, <mailto:{REPLY_TO}?subject=Unsubscribe>"}}


# ---------- Supabase and Resend ----------
def call(url, key, method="GET", body=None, headers=None):
    h = {"User-Agent": UA, "Content-Type": "application/json"}
    h.update(headers or {})
    if "supabase.co" in url:
        h.update({"apikey": key, "Authorization": "Bearer " + key})
    else:
        h["Authorization"] = "Bearer " + key
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            text = r.read().decode()
            return json.loads(text) if text.strip() else None
    except urllib.error.HTTPError as err:
        raise SystemExit(f"{method} {url.split('?')[0]} failed ({err.code}): {err.read().decode()[:400]}")


def members_from_supabase(key):
    return call(f"{SUPABASE_URL}/rest/v1/rpc/alert_recipients", key, "POST", {}) or []


def already_sent(key, topics):
    q = ",".join(json.dumps(t) for t in topics)
    rows = call(f"{SUPABASE_URL}/rest/v1/email_sent?select=user_id,topic&topic=in.({urllib.request.quote(q)})", key) or []
    return {(r["user_id"], r["topic"]) for r in rows}


def record_sent(key, rows):
    if rows:
        call(f"{SUPABASE_URL}/rest/v1/email_sent?on_conflict=user_id,topic", key, "POST", rows, {"Prefer": "resolution=ignore-duplicates,return=minimal"})


def send_batch(key, emails, idem):
    for m in emails:
        m.update({"from": FROM, "reply_to": REPLY_TO})
    call("https://api.resend.com/emails/batch", key, "POST", emails, {"Idempotency-Key": idem})


def sample_member(args):
    return {"user_id": "sample", "email": args.test_to or "member@example.com", "token": "00000000-0000-0000-0000-000000000000",
            "near_home": bool(args.home), "home_place": args.home, "home_name": "",
            "countries": [c for c in (args.countries or "").split(",") if c]}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--before", help="the commit before the push: guides whose starsUpdated changed since then")
    ap.add_argument("--guide", help="these guide ids instead (comma-separated), even if their ceremony isn't recent")
    ap.add_argument("--send", action="store_true", help="email the members who asked (needs both keys)")
    ap.add_argument("--preview", help="write the sample email(s) to this folder as HTML and text, sending nothing")
    ap.add_argument("--test-to", help="send the sample email to this one address (needs RESEND_API_KEY)")
    ap.add_argument("--home", default="", help="sample member's home city (a place id), e.g. london")
    ap.add_argument("--countries", default="", help="sample member's countries (place ids), e.g. uk,ireland")
    ap.add_argument("--max", type=int, default=RUN_MAX, help=f"most emails this run (default {RUN_MAX})")
    args = ap.parse_args()

    data_file = ROOT / "_site" / "data" / "alerts.json"
    if not data_file.exists():
        sys.exit("Run python3 build.py first: the changes come from _site/data/alerts.json.")
    data = json.loads(data_file.read_text("utf-8"))
    ids = [g for g in (args.guide or "").split(",") if g] if args.guide else updated_guides(args.before) if args.before else []
    if not ids:
        print("No guide's starsUpdated changed, so there are no star emails to send.")
        return
    print("Guides with newly updated stars: " + ", ".join(ids))
    chosen = pick_guides(data, ids, forced=bool(args.guide))
    if not chosen:
        print("Nothing to send.")
        return
    topics = {g["id"]: f'{g["id"]}@{g["starsUpdated"]}' for g in chosen}

    if args.preview or args.test_to:
        m = sample_member(args)
        if not m["near_home"] and not m["countries"]:  # a member who chose the guides' first two countries
            m["countries"] = sorted({c for g in chosen for c in g["countries"]})[:2]
        mail = compose(m, data, chosen)
        if not mail:
            print("The sample member would get nothing from these guides.")
            return
        if args.preview:
            out = Path(args.preview)
            out.mkdir(parents=True, exist_ok=True)
            (out / "star-email.html").write_text(f"<!doctype html><meta charset=utf-8><title>{html.escape(mail['subject'])}</title>"
                                                 f"<p style='font:14px Arial;margin:12px'><b>Subject:</b> {html.escape(mail['subject'])}</p>" + mail["html"], "utf-8")
            (out / "star-email.txt").write_text("Subject: " + mail["subject"] + "\n\n" + mail["text"], "utf-8")
            print(f"Sample written to {out}/star-email.html (subject: {mail['subject']})")
        if args.test_to:
            rk = os.environ.get("RESEND_API_KEY")
            if not rk:
                sys.exit("RESEND_API_KEY isn't set up.")
            mail["subject"] = "[Test] " + mail["subject"]
            send_batch(rk, [mail], "test-" + hashlib.sha1((mail["subject"] + str(time.time())).encode()).hexdigest())
            print(f"Sample sent to {args.test_to}.")
        return

    sk, rk = os.environ.get("SUPABASE_SERVICE_KEY"), os.environ.get("RESEND_API_KEY")
    if not sk or not rk:
        print("Star emails aren't set up yet: add SUPABASE_SERVICE_KEY and RESEND_API_KEY as GitHub secrets. Nothing sent.")
        return
    members = members_from_supabase(sk)
    sent = already_sent(sk, list(topics.values()))
    todo = []
    for m in members:
        fresh = [g for g in chosen if (m["user_id"], topics[g["id"]]) not in sent]
        mail = compose(m, data, fresh) if fresh else None
        if mail:
            todo.append((m, fresh, mail))
    print(f"{len(members)} members want star emails; {len(todo)} have something in this run.")
    if not args.send:
        for m, fresh, mail in todo[:5]:
            print(f"  would send: {mail['subject']}")
        print("Pass --send to send them.")
        return
    left = todo[args.max:]
    todo = todo[:args.max]
    for i in range(0, len(todo), BATCH):
        part = todo[i:i + BATCH]
        idem = hashlib.sha1("|".join(m["user_id"] + ":" + ",".join(topics[g["id"]] for g in f) for m, f, _ in part).encode()).hexdigest()
        send_batch(rk, [mail for _, _, mail in part], idem)
        record_sent(sk, [{"user_id": m["user_id"], "topic": topics[g["id"]]} for m, f, _ in part for g in f])
        print(f"  sent {len(part)}")
    print(f"Sent {len(todo)} star email(s)." + (f" {len(left)} more are waiting: run the workflow again tomorrow (Resend's daily allowance)." if left else ""))


if __name__ == "__main__":
    main()
