#!/usr/bin/env python3
"""Saved searches: members save what they're waiting for on a destination page or Help me pick ("two-star restaurants
in Tokyo, dinner under ¥40,000", "vegan options in London"), and this emails them when a restaurant newly matches.

Each search (a row in `saved_searches`, supabase/saved-searches.sql) holds its `query` (the keys are below, in
matches()), the restaurants that matched at the last check (`seen`) and the site's commit then (`checked_commit`). Each
run works out today's matches from the build (_site/data/searches.json, write_search_data() in build.py); a restaurant
that matches now but didn't before is news when its own file changed since that commit in a way that makes it match: a
new star, a lower price, a price now listed, a new dietary option, a new cuisine label, or a restaurant new to our pages.
Ones that match only because an exchange rate moved are noted quietly, with no email. A new search's first check just
records its matches. At most one of these emails a member a day, holding every search with news (email_sent topic
'searches@<day>'), and at most RUN_MAX a run, shared with the star emails' Resend allowance. Standard library only,
Python 3.9 compatible. Run by .github/workflows/saved-searches.yml after pushes that change restaurants, and daily;
by hand:

  python3 build.py
  python3 scripts/saved_searches.py --preview out/ --query '{"p": "tokyo", "s": [2], "m": "dinner", "b": 40000, "c": "JPY"}' --since HEAD~30
  python3 scripts/saved_searches.py --preview out/ --query '{"p": "london", "d": "vegan"}' --since <commit> --test-to you@example.com
  python3 scripts/saved_searches.py                # what would go out, sending nothing
  python3 scripts/saved_searches.py --send         # what the workflow runs

Settings come from the environment, as for scripts/star_alerts.py: SUPABASE_SERVICE_KEY and RESEND_API_KEY.
"""
import argparse
import hashlib
import html
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from star_alerts import ROOT, SITE, SUPABASE_URL, REPLY_TO, STAR_WORD, call, send_batch, already_sent, record_sent, email_page  # noqa: E402

RUN_MAX = 40            # emails per run; the star emails take up to 80 of Resend's 100 a day on a ceremony night
LIST_MAX = 10           # restaurants listed for one search before "and 4 more"
WINE_ROOM = 1.6         # with no pairing price listed, the menu must leave about 60% for one, as in Help me pick
TRACK = "utm_source=search-email&utm_medium=email&utm_campaign=saved-search"
DIET_WORDS = {"vegetarian": "vegetarian options", "vegan": "vegan options", "gluten-free": "gluten-free options", "halal": "halal options", "kosher": "kosher options"}
# Help me pick's "food mood" groups, in the same order and with the same patterns as MOODS in src/assets/pick.js:
# keep the two in step. The first that matches a restaurant's cuisine label wins.
MOODS = [
    ("veg", r"vegetarian|vegan|shojin"),
    ("japanese", r"japan|sushi|tempura|yakitori|kaiseki|teppanyaki|unagi|fugu"),
    ("chinese", r"canton|chinese|sichuan|taizhou|shanghai|chao zhou|teochew|zhejiang|huaiyang|fujian|beijing|ningbo|jiangzhe|jiangsu|shandong|hunan|dongbei|hang zhou|hui cuisine|dim sum|congee|shun tak|taiwan"),
    ("korean", r"korean"),
    ("seasia", r"thai|vietnam|malaysia|peranakan|filipino|singapore"),
    ("indian", r"indian"),
    ("italian", r"italian|piedmont|sicilian|campanian|tuscan|ligurian|emilian|abruzzo|aosta|lombard|sardinian|umbrian|romagna"),
    ("spanish", r"spanish|galician|basque|catalan|portuguese"),
    ("latin", r"mexican|colombian|latin|peruvian|cuban"),
    ("med", r"mediterranean|greek|turkish|middle eastern|israeli|provençal"),
    ("seafood", r"fish|seafood|crab"),
    ("grill", r"barbecue|steak|grill|beef|meats"),
    ("french", r"french"),
    ("modern", r"modern|creative|contemporary|innovative|fusion|international|world|european|asian|californian|american|zealand|australian|farm to table|seasonal|organic|sharing|street food"),
    ("classic", r"."),
]
MOODS = [(k, re.compile(p, re.I)) for k, p in MOODS]


def mood_of(cuisine):
    return next((k for k, p in MOODS if p.search(cuisine or "")), "classic")


def link(path):
    base, _, frag = path.partition("#")
    return SITE + base + ("&" if "?" in base else "?") + TRACK + ("#" + frag if frag else "")


# ---------- Matching ----------
class Data:
    def __init__(self, raw):
        self.cur = raw["currencies"]
        self.pages = raw["pages"]
        cols = raw["cols"]
        self.rows = [dict(zip(cols, row)) for row in raw["rows"]]
        self.by_id = {r["id"]: r for r in self.rows}
        self.path_id = {v[1]: k for k, v in self.pages.items()}  # Help me pick names its place by address

    def money(self, n, cur):
        sym = self.cur.get(cur, [1, cur + " "])[1]
        if sym[-1].isalpha():
            sym += " "
        return sym + (f"{n:,.0f}" if float(n).is_integer() else f"{n:,.2f}")

    def convert(self, n, frm, to):
        return n / self.cur[frm][0] * self.cur[to][0]


def has_diet(diets, d):
    diets = diets or []
    return not d or d in diets or (d == "vegetarian" and ("vegetarian-menu" in diets or "vegetarian-only" in diets))


def bill(r, q, data):
    """The cheapest way to eat there for the search's meal, as (meal, menu price in its own currency, total in the
    search's currency), or None when there's no price for that meal. r holds dinner/lunch/wine/lunchWine/cur."""
    m, cur = q.get("m") or "dinner", q.get("c") or r["cur"]
    opts = []
    if m != "lunch" and r.get("dinner") is not None:
        opts.append(("dinner", r["dinner"], r.get("wine")))
    if m != "dinner" and r.get("lunch") is not None:
        opts.append(("lunch", r["lunch"], r.get("lunchWine")))
    if not opts or r["cur"] not in data.cur or cur not in data.cur:
        return None
    out = []
    for meal, price, wine in opts:
        extra = (wine if wine is not None else price * (WINE_ROOM - 1)) if q.get("w") else 0
        out.append((meal, price, data.convert(price + extra, r["cur"], cur)))
    return min(out, key=lambda o: o[2])


def matches(r, q, data):
    """Whether a restaurant fits a saved search. The query's keys (all optional):
    p  the page it was saved on (a place id, or its address; blank for anywhere)    s  star levels, e.g. [2] or [2, 3]
    k  a cuisine label, as the MICHELIN Guide names it              f  Help me pick's food moods, e.g. ["japanese"]
    d  a dietary need (vegetarian, vegan, gluten-free, halal, kosher)  a  a neighbourhood (the first part of `area`)
    b  most per person, in currency c, for meal m (dinner, lunch, or value: whichever is cheaper), w: with a wine pairing"""
    p = data.path_id.get(q.get("p"), q.get("p"))
    if p and p not in r["in"]:
        return False
    if q.get("s") and r["stars"] not in q["s"]:
        return False
    if q.get("k") and r.get("cuisine") != q["k"]:
        return False
    if q.get("f") and mood_of(r.get("cuisine")) not in q["f"]:
        return False
    if q.get("d") and not has_diet(r.get("diets"), q["d"]):
        return False
    if q.get("a") and r.get("area") != q["a"]:
        return False
    if q.get("b"):
        b = bill(r, q, data)
        if not b or b[2] > q["b"] + 0.5:
            return False
    return True


# ---------- Why a restaurant is news ----------
_old = {}


def old_file(commit, path):
    """A restaurant's file as it was at a commit, or None if it didn't exist then."""
    key = (commit, path)
    if key not in _old:
        try:
            out = subprocess.run(["git", "show", f"{commit}:{path}"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
            _old[key] = json.loads(out)
        except (subprocess.CalledProcessError, ValueError):
            _old[key] = None
    return _old[key]


def known_commit(commit):
    return bool(commit) and subprocess.run(["git", "cat-file", "-e", commit + "^{commit}"], cwd=ROOT, capture_output=True).returncode == 0


def as_row(f, cur):
    """An old file's fields in the shape of a searches.json row."""
    return {"stars": 0 if f.get("status") else f.get("stars") or 0, "cuisine": f.get("cuisine", ""), "diets": f.get("diets") or [], "cur": cur,
            "dinner": f.get("dinner") if f.get("dinnerType", "menu") == "menu" else None,
            "lunch": f.get("lunch") if not f.get("noLunch") and (f.get("lunch") or 0) > 0 else None,
            "wine": f.get("wine"), "lunchWine": f.get("lunchWine")}


def reason(r, q, data, commit):
    """Why a restaurant that didn't match at `commit` matches now, in a few words, or None when nothing about the
    restaurant itself changed that way (an exchange rate moved, or it moved page)."""
    f = old_file(commit, r["file"])
    if f is None:
        return "new on The Starred Bill"
    old = as_row(f, r["cur"])
    if r["stars"] > old["stars"]:
        return "won its first star" if not old["stars"] else f"up from {STAR_WORD[old['stars']]} to {STAR_WORD[r['stars']]}"
    if q.get("d") and not has_diet(old["diets"], q["d"]):
        return "now offers " + DIET_WORDS.get(q["d"], q["d"] + " options")
    if (q.get("k") or q.get("f")) and old["cuisine"] != r.get("cuisine"):
        return "now listed as " + (r.get("cuisine") or "another cuisine")
    if q.get("b"):
        now = bill(r, q, data)
        if not now:
            return None
        meal, price = now[0], now[1]
        was = old[meal]
        wine, old_wine = r.get("wine" if meal == "dinner" else "lunchWine"), old["wine" if meal == "dinner" else "lunchWine"]
        if was is None:
            return f"{meal} price now listed: {data.money(price, r['cur'])}"
        if was > price:
            return f"{meal} menu now {data.money(price, r['cur'])} (was {data.money(was, r['cur'])} on our pages)"
        if q.get("w") and wine is not None and (old_wine is None or old_wine > wine):
            return (f"{meal} wine pairing now listed: {data.money(wine, r['cur'])}" if old_wine is None
                    else f"{meal} wine pairing now {data.money(wine, r['cur'])} (was {data.money(old_wine, r['cur'])})")
    return None


def news_for(search, data):
    """(today's matches, [(row, reason)] that are news) for one saved search."""
    q = search.get("query") or {}
    now = [r["id"] for r in data.rows if matches(r, q, data)]
    seen = search.get("seen")
    if seen is None or not known_commit(search.get("checked_commit")):
        return now, []
    seen = set(seen)
    out = []
    for rid in now:
        if rid not in seen:
            why = reason(data.by_id[rid], q, data, search["checked_commit"])
            if why:
                out.append((data.by_id[rid], why))
    out.sort(key=lambda x: (-x[0]["stars"], x[0]["name"]))
    return now, out


# ---------- The email ----------
def price_line(r, q, data):
    b = bill(r, dict(q, w=False), data) or bill(r, {"m": "value", "c": r["cur"]}, data)
    return f"{b[0]} menu {data.money(b[1], r['cur'])}" if b else ""


def compose(member, found, data):
    """One email for a member: found is [(search, [(row, reason)])], each with news."""
    n = sum(len(x) for _, x in found)
    first = found[0]
    if n == 1:
        subject = f"New match for your saved search: {first[1][0][0]['name']}"
        h1 = "A new match for your saved search"
    else:
        subject = f"{n} new matches for " + (f"“{first[0]['label']}”" if len(found) == 1 else "your saved searches")
        h1 = "New matches for your saved searches"
    intro = "Restaurants that now fit what you asked us to watch for. Each link shows its prices and how to book."
    body_h, body_t = [], []
    for s, rows in found:
        shown = rows[:LIST_MAX]
        items, lines = [], [f"\n{s['label'].upper()}"]
        for r, why in shown:
            stars = "★" * r["stars"]
            priced = any(ch.isdigit() for ch in why)  # "lunch menu now €55 (was …)" already says what it costs
            bits = " · ".join(b for b in (why[0].upper() + why[1:], r["where"], "" if priced else price_line(r, s["query"], data)) if b)
            items.append('<li style="margin:0 0 10px;">'
                         f'<a href="{html.escape(link(r["url"]))}" style="color:#1E6142;font-weight:bold;text-decoration:none;">{html.escape(r["name"])}</a>'
                         f' <span style="color:#B3862B;">{stars}</span>'
                         f'<br><span style="font-size:14px;color:#5A6E62;">{html.escape(bits)}</span></li>')
            lines.append(f'- {r["name"]}: {bits}\n  {link(r["url"])}')
        more = link(s["page"])
        body_h.append(f'<h2 style="margin:24px 0 8px;font-family:Georgia,serif;font-weight:normal;font-size:21px;color:#12261C;">{html.escape(s["label"])}</h2>'
                      '<ul style="margin:0;padding:0 0 0 18px;font-size:15px;line-height:1.4;color:#12261C;">' + "".join(items) + "</ul>"
                      + (f'<p style="margin:4px 0 0;font-size:14px;">and {len(rows) - len(shown)} more</p>' if len(rows) > len(shown) else "")
                      + f'<p style="margin:14px 0 0;"><a href="{html.escape(more)}" style="display:inline-block;background:#1E6142;color:#FFFFFF;text-decoration:none;'
                        'font-weight:bold;font-size:15px;padding:11px 22px;border-radius:999px;">See every match</a></p>')
        if len(rows) > len(shown):
            lines.append(f"and {len(rows) - len(shown)} more")
        body_t.append("\n".join(lines + [f"See every match: {more}"]))
    unsub = f'{SITE}/unsubscribe/?t={member["token"]}&what=searches'
    manage = f"{SITE}/account/#searches"
    footer_h = ("You're getting this because you saved these searches on your Starred Bill account and asked us to email you when something new matches. "
                f'<a href="{html.escape(manage)}" style="color:#5A6E62;">Change or delete your saved searches</a> · '
                f'<a href="{html.escape(unsub)}" style="color:#5A6E62;">Unsubscribe</a>')
    text = (f"{h1}\n\n{intro}\n" + "\n".join(body_t)
            + "\n\n--\nYou're getting this because you saved these searches on your Starred Bill account.\n"
              f"Change or delete your saved searches: {manage}\nUnsubscribe: {unsub}\n")
    return {"to": [member["email"]], "subject": subject, "html": email_page(h1, intro, "".join(body_h), footer_h), "text": text,
            "headers": {"List-Unsubscribe": f"<{unsub}>, <mailto:{REPLY_TO}?subject=Unsubscribe>"}}


# ---------- Running it ----------
def head_commit():
    return subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()


def preview(args, data):
    q = json.loads(args.query)
    commit = subprocess.run(["git", "rev-parse", args.since], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    now = [r for r in data.rows if matches(r, q, data)]
    news = [(r, reason(r, q, data, commit)) for r in now]
    news = sorted([x for x in news if x[1]], key=lambda x: (-x[0]["stars"], x[0]["name"]))
    print(f"{len(now)} restaurants match today; {len(news)} of them changed since {args.since} in a way that makes them match.")
    if not news:
        return
    search = {"label": args.label or "Your saved search", "query": q, "page": args.page or (data.pages.get(q.get("p"), ["", "/"])[1])}
    mail = compose({"email": args.test_to or "member@example.com", "token": "00000000-0000-0000-0000-000000000000"}, [(search, news)], data)
    out = Path(args.preview)
    out.mkdir(parents=True, exist_ok=True)
    (out / "search-email.html").write_text(f"<!doctype html><meta charset=utf-8><title>{html.escape(mail['subject'])}</title>"
                                           f"<p style='font:14px Arial;margin:12px'><b>Subject:</b> {html.escape(mail['subject'])}</p>" + mail["html"], "utf-8")
    (out / "search-email.txt").write_text("Subject: " + mail["subject"] + "\n\n" + mail["text"], "utf-8")
    print(f"Sample written to {out}/search-email.html (subject: {mail['subject']})")
    if args.test_to:
        rk = os.environ.get("RESEND_API_KEY")
        if not rk:
            sys.exit("RESEND_API_KEY isn't set up.")
        mail["subject"] = "[Test] " + mail["subject"]
        send_batch(rk, [mail], "test-" + hashlib.sha1((mail["subject"] + str(time.time())).encode()).hexdigest())
        print(f"Sample sent to {args.test_to}.")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--send", action="store_true", help="email the members with news and record the checks (needs both keys)")
    ap.add_argument("--preview", help="write a sample email for --query to this folder, sending nothing")
    ap.add_argument("--query", help='a saved search\'s query, e.g. \'{"p": "london", "d": "vegan"}\'')
    ap.add_argument("--since", default="HEAD~20", help="for --preview: news since this commit (default HEAD~20)")
    ap.add_argument("--label", default="", help="for --preview: the search's name")
    ap.add_argument("--page", default="", help="for --preview: the address that shows the search")
    ap.add_argument("--test-to", help="with --preview: also send the sample to this one address (needs RESEND_API_KEY)")
    ap.add_argument("--max", type=int, default=RUN_MAX, help=f"most emails this run (default {RUN_MAX})")
    args = ap.parse_args()

    data_file = ROOT / "_site" / "data" / "searches.json"
    if not data_file.exists():
        sys.exit("Run python3 build.py first: the restaurants come from _site/data/searches.json.")
    data = Data(json.loads(data_file.read_text("utf-8")))
    if args.preview:
        if not args.query:
            sys.exit("--preview needs --query.")
        return preview(args, data)

    sk, rk = os.environ.get("SUPABASE_SERVICE_KEY"), os.environ.get("RESEND_API_KEY")
    if not sk or (args.send and not rk):
        print("Saved-search emails aren't set up yet: add SUPABASE_SERVICE_KEY and RESEND_API_KEY as GitHub secrets. Nothing sent.")
        return
    members = call(f"{SUPABASE_URL}/rest/v1/rpc/search_recipients", sk, "POST", {}) or []
    if not members:
        print("Nobody has a saved search with emails on.")
        return
    head = head_commit()
    topic = "searches@" + datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sent = already_sent(sk, [topic])
    checked, todo, waiting, quiet = [], [], 0, 0
    for m in members:
        if (m["user_id"], topic) in sent:
            waiting += 1  # had one today: their searches wait for tomorrow's check, so nothing new is lost
            continue
        found, mine = [], []
        for s in m["searches"]:
            now, news = news_for(s, data)
            mine.append({"id": s["id"], "seen": now, "commit": head})
            if news:
                found.append((s, news))
            elif s.get("seen") is not None and set(now) - set(s["seen"]):
                quiet += 1
        if found:
            todo.append((m, found, mine))
        else:
            checked += mine
    print(f"{len(members)} members have saved searches with emails on; {len(todo)} have news, {waiting} already had one today"
          + (f", {quiet} searches gained matches only from exchange rates or moves (no email)" if quiet else "") + ".")
    if not args.send:
        for m, found, _ in todo[:5]:
            print(f"  would send: {compose(m, found, data)['subject']}")
        print("Pass --send to send them and record the checks.")
        return
    left = todo[args.max:]
    todo = todo[:args.max]
    if todo:
        idem = hashlib.sha1((topic + "|" + ",".join(m["user_id"] for m, _, _ in todo)).encode()).hexdigest()
        for i in range(0, len(todo), 100):
            part = todo[i:i + 100]
            send_batch(rk, [compose(m, found, data) for m, found, _ in part], idem + f"-{i}")
            record_sent(sk, [{"user_id": m["user_id"], "topic": topic} for m, _, _ in part])
        checked += [x for _, _, mine in todo for x in mine]
    if checked:
        call(f"{SUPABASE_URL}/rest/v1/rpc/searches_checked", sk, "POST", {"rows": checked})
    print(f"Sent {len(todo)} saved-search email(s); recorded {len(checked)} checks."
          + (f" {len(left)} more wait for the next run (Resend's daily allowance)." if left else ""))


if __name__ == "__main__":
    main()
