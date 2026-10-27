#!/usr/bin/env python3
"""What visitors did, what they wanted and where the commercial clicks came from: the decision half of the morning report.

    python3 scripts/visit_report.py daily FIGURES.json [--weekly] [--links] [--try]
    python3 scripts/visit_report.py baseline
    python3 scripts/visit_report.py backfill

`daily` reads Umami's visit records for the last 56 days (through the share link morning_figures.py uses), groups each
visit's page views and clicks in memory, and works out: traffic (raw and likely human), Budget Search and its results,
the bill calculator, commercial clicks (booking platforms, restaurants' own sites, hotels, tours), what visitors asked
for, the Phase 1 funnel and its commonest paths, SEO movement (Search Console, plus today's FIGURES.json from
morning_figures.py), data health, "Prices to verify next", affiliate opportunities and anomalies. On Mondays (or with
--weekly) it adds the weekly comparison: the last 7 days against the 7 before, and the last 28 days. With --links (on
by default on Mondays) it checks the price, website and booking links of the restaurants that matter most. --try
prints the report without saving anything (for trying out a Monday report on another day).

`baseline` writes the official pre-Phase-1 baseline (4 Oct 2026 to the launch, PHASE1_LIVE). `backfill` writes
daily.csv's rows for every day Umami still holds.

What's kept: only totals, in the private records repository (RECORDS, sbarnard310/starred-bill-records):
history/daily/<date>.json, history/daily.csv, history/weekly/<monday>.json, history/weekly.csv,
history/reports/<date>.md (the report's sections), history/link-checks/<date>.json and history/baseline/. Visit-level
records are read, grouped and dropped: no visit id, time, city or device of any one visit is written anywhere. The
only cache is each click's own details (which restaurant, which button), keyed by Umami's event id, kept 70 days in
figures/umami-cache/ on this Mac, so a day's run fetches only the new ones.

Likely-human view: see is_robot(). Raw totals are always reported; the likely-human figures sit beside them and are the
base for every rate. Rates on fewer than MIN_CASES cases say "too few to judge".

Standard library only, Python 3.9.
"""
import csv
import datetime as dt
import json
import os
import re
import statistics
import unicodedata
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import morning_figures as mf  # noqa: E402  (Umami and Google sign-in, shared with the morning figures)

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
CACHE = mf.RESEARCH / "figures" / "umami-cache" / "event-data.json"
RECORDS = Path(os.environ.get("STARREDBILL_RECORDS") or
               (mf.RESEARCH if (mf.RESEARCH / ".git").exists() else mf.RESEARCH / "records")).expanduser()
HISTORY = RECORDS / "history"
UTC = dt.timezone.utc
UMAMI_FROM = dt.datetime(2026, 10, 4, tzinfo=UTC)          # Umami's first full day for the site
PHASE1_LIVE = dt.datetime(2026, 10, 27, 14, 20, tzinfo=UTC)  # commit 2e225d9c reached main (Cloudflare built it minutes later)
PARTNERS_LIVE = mf.PARTNERS_LIVE
MIN_CASES = 30         # fewer relevant cases than this: "too few to judge"
LOOKBACK_DAYS = 56     # visit records read each run: 28 days and the 28 before
VISIT_GAP = 30 * 60    # seconds of quiet that end a visit (Umami's own rule)
CACHE_DAYS = 70

# Clicks whose own details are fetched (one request each, then cached): the rest are only counted.
DETAIL_EVENTS = {"budget-search", "pick-result", "pick-click", "pick-step", "bill-calc", "outbound", "partner", "search",
                 "filter", "home-link", "browse"}
# Events a page can fire with nobody touching it (a shared Budget Search link renders its results by itself), so they
# don't count as a sign that a person was there.
AUTO_EVENTS = {"budget-search", "pick-result", "sign-in"}

COMMERCIAL = {"booking", "hotel", "tour"}   # as COMMERCIAL_OUT in common.js; restaurants' own sites are counted apart
# Booking platforms by address, as PROVIDERS in common.js, plus a few the site linked to before Phase 1.
BOOKING_HOSTS = [("resy.com", "resy"), ("exploretock.com", "tock"), ("opentable.", "opentable"), ("sevenrooms.com", "sevenrooms"),
                 ("thefork.", "thefork"), ("tablecheck.com", "tablecheck"), ("covermanager.com", "covermanager"),
                 ("omakase.in", "omakase"), ("quandoo.", "quandoo"), ("ikyu.com", "ikyu"), ("pocket-concierge.jp", "pocket-concierge"),
                 ("catchtable.co.kr", "catchtable"), ("tablelog.", "tablelog"), ("yelp.com/reservations", "yelp"),
                 ("bookatable.", "bookatable"), ("resdiary.com", "resdiary"), ("zenchef.", "zenchef"), ("guestplan.", "guestplan"),
                 ("formitable.", "formitable"), ("tableagent.", "tableagent"), ("autoreserve.", "autoreserve")]
PARTNER_NAMES = {"booking": "Booking.com", "viator": "Viator", "getyourguide": "GetYourGuide"}

SEARCH_ENGINES = ["bing.", "duckduckgo.", "ecosia.", "yahoo.", "yandex.", "baidu.", "naver.", "brave.", "qwant.",
                  "startpage.", "seznam.", "sogou.", "so.com", "daum.", "aol.", "search."]
AI_HOSTS = ["chatgpt.com", "openai.com", "perplexity.ai", "claude.ai", "copilot.microsoft.com", "gemini.google.com",
            "you.com", "phind.com", "meta.ai", "deepseek."]
SOCIAL_HOSTS = ["facebook.", "instagram.", "t.co", "x.com", "twitter.", "linkedin.", "lnkd.in", "reddit.", "pinterest.",
                "youtube.", "tiktok.", "threads.net", "whatsapp.", "telegram.", "xiaohongshu.", "weibo."]
MAIL_HOSTS = ["mail.", "outlook.", "gmail."]
CHANNELS = ["Google search", "Other search", "AI assistants", "Social", "Email", "Referral", "Direct or unknown"]

# Towns that are mostly data centres (Amazon, Google, Microsoft, Meta): one weak signal among several, never enough alone.
DATA_CENTRE_TOWNS = {"Ashburn", "Boardman", "Council Bluffs", "The Dalles", "Prineville", "Quincy", "Moncks Corner",
                     "Lenoir", "Altoona", "Pryor", "Forest City", "Papillion", "Sterling", "Hillsboro"}


# ---------- small helpers ----------
def load_json(path, default=None):
    try:
        return json.loads(Path(path).read_text())
    except Exception:
        return default


def pct(n, d):
    return round(100 * n / d, 1) if d else None


def rate(n, d, min_cases=MIN_CASES):
    """A rate with its base, or "too few to judge" under MIN_CASES."""
    if not d or d < min_cases:
        return {"n": n, "of": d, "percent": None, "note": "too few to judge"}
    return {"n": n, "of": d, "percent": pct(n, d)}


def change(now, before):
    if before in (None, 0) or now is None:
        return None
    return round(100 * (now - before) / before)


def as_int(x):
    """Umami gives numbers back as 17.0 or "17": an int, or None."""
    try:
        return int(float(x))
    except (TypeError, ValueError):
        return None


def median(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs), 1) if xs else None


def mean(xs):
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs), 1) if xs else None


def top(counter, n=10):
    return [{"item": k, "count": v} for k, v in counter.most_common(n) if k not in (None, "")]


def host_of(url):
    try:
        return urllib.parse.urlparse(url).netloc.lower().replace("www.", "")
    except Exception:
        return ""


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


# ---------- price provenance (as build.py's source_kind() and price_seen(); build.py can't be imported, as it builds) ----------
def _build_tuple(name):
    import ast
    text = (ROOT / "build.py").read_text()
    m = re.search(rf"^{name} = (\(.*?\))\n(?=\S)", text, re.S | re.M)
    return ast.literal_eval(m.group(1)) if m else ()


BUILD_BOOKING_HOSTS, BUILD_GUIDE_HOSTS = _build_tuple("BOOKING_HOSTS"), _build_tuple("GUIDE_HOSTS")
SOURCE_WORDS = {"restaurant": "the restaurant's own site", "booking": "a booking site", "guide": "a restaurant guide",
                "press": "a review or article", "member": "a member's report", "none": "no source"}
# How much a price from each kind of source needs a genuine check, for "Prices to verify next": another database's
# figure or no source at all first, the restaurant's own site last.
SOURCE_NEED = {"none": 1.4, "guide": 1.3, "press": 1.3, "member": 1.2, "booking": 1.1, "restaurant": 1.0}


def source_kind(r, meal="dinner"):
    """Same answer as source_kind() in build.py (change both): restaurant, booking, guide, press, member or none."""
    pre = "" if meal == "dinner" else "lunch"
    own = r.get(f"{pre}SourceKind" if pre else "sourceKind")
    if own:
        return own
    typ, url = r.get(f"{pre}SourceType" if pre else "sourceType"), r.get(f"{pre}Source" if pre else "source") or ""
    if typ == "member":
        return "member"
    if typ == "site":
        return "restaurant"
    if not url or typ in (None, "none"):
        return "none"
    host = urllib.parse.urlsplit(url).netloc.lower()
    return "booking" if any(k in host for k in BUILD_BOOKING_HOSTS) else "guide" if any(k in host for k in BUILD_GUIDE_HOSTS) else "press"


def price_state(r, meal, today):
    """A meal's price: None when there's no price, else its genuine check (verifiedAt, days since), its last recorded
    change (changedAt, never a check), source kind and whether we derived it."""
    if r.get(meal) is None or (meal == "lunch" and r.get("noLunch")):
        return None
    pre = "price" if meal == "dinner" else "lunch"
    v, c = r.get(f"{pre}VerifiedAt"), r.get(f"{pre}ChangedAt")

    def days(d):
        try:
            return (today - dt.date.fromisoformat(str(d)[:10])).days
        except Exception:
            return None
    return {"verified": v, "verified_days": days(v), "changed": c, "changed_days": days(c), "kind": source_kind(r, meal),
            "derived": bool(r.get("priceDerived" if meal == "dinner" else "lunchDerived")),
            "source": r.get("source" if meal == "dinner" else "lunchSource") or ""}


def state_words(st):
    if not st:
        return ""
    month = lambda d: dt.date.fromisoformat(d[:10]).strftime("%b %Y")
    when = (f"checked {st['verified'][:10]}" if st["verified"] else
            f"recorded {month(st['changed'])}, never checked" if st["changed"] else "never checked")
    return f"{when}, from {SOURCE_WORDS.get(st['kind'], st['kind'])}" + (", worked out by us" if st["derived"] else "")


# ---------- the site's own data ----------
class Site:
    """Restaurants and places from content/, for names, cities, prices and checks."""
    def __init__(self):
        self.places = {}
        for f in (CONTENT / "places").glob("*.json"):
            p = load_json(f, {})
            if p.get("id"):
                self.places[p["id"]] = p
        cur = load_json(CONTENT / "currencies.json", {})
        self.rate_date = cur.get("rateDate")
        self.per_usd = {c["code"]: c["perUSD"] for c in cur.get("currencies", [])}
        self.restaurants, self.by_name = {}, {}
        for f in (CONTENT / "restaurants").glob("*/*.json"):
            r = load_json(f, {})
            r["id"], r["file"] = f.stem, str(f.relative_to(ROOT))
            self.restaurants[f.stem] = r
            self.by_name.setdefault(norm(r.get("name")), f.stem)

    def chain(self, pid):
        out, seen = [], set()
        while pid and pid in self.places and pid not in seen:
            seen.add(pid)
            out.append(self.places[pid])
            pid = self.places[pid].get("parent")
        return out

    def currency(self, r):
        for p in self.chain(r.get("city")):
            if p.get("currency"):
                return p["currency"]
        return None

    def city_name(self, r):
        """The restaurant's city (its page, or the nearest place above a district)."""
        ch = self.chain(r.get("city"))
        for p in ch:
            if p.get("type") in ("city", "cuisine"):
                return p.get("name")
        return ch[0].get("name") if ch else r.get("city")

    def place_at(self, path):
        """A destination address (/uk/england/london/, /japan/tokyo/french/) to its place."""
        parts = [x for x in (path or "").split("#")[0].split("/") if x]
        if len(parts) >= 2 and f"{parts[-2]}-{parts[-1]}" in self.places:   # cuisine pages: tokyo-french
            return self.places[f"{parts[-2]}-{parts[-1]}"]
        for seg in reversed(parts):
            if seg in self.places:
                return self.places[seg]
        return None

    def place_name(self, path):
        p = self.place_at(path)
        if not p:
            return path
        if p.get("type") == "cuisine":
            return f"{p.get('name')} in {self.places.get(p.get('parent'), {}).get('name', '')}"
        return p.get("name")

    def rid(self, value):
        """A restaurant id from an event: Phase 1 sends the id, older clicks the name."""
        if not value:
            return None
        if value in self.restaurants:
            return value
        return self.by_name.get(norm(value))

    def name(self, rid):
        r = self.restaurants.get(rid)
        return r.get("name") if r else rid

    def to_gbp(self, amount, code):
        if not amount or code not in self.per_usd or "GBP" not in self.per_usd:
            return None
        return amount / self.per_usd[code] * self.per_usd["GBP"]

    def live(self):
        return [r for r in self.restaurants.values() if (r.get("stars") or 0) > 0 and not r.get("status")]


# ---------- reading Umami ----------
def umami_events(cfg, start, end):
    """Every page view and click between two UTC datetimes, oldest first (Umami's own records, read through the share link)."""
    base, auth, _ = mf.umami_client(cfg)
    q = {"startAt": int(start.timestamp() * 1000), "endAt": int(end.timestamp() * 1000) - 1, "pageSize": 1000}
    rows, page = [], 1
    while True:
        r = mf.http(f"{base}/events?{urllib.parse.urlencode(dict(q, page=page))}", headers=auth, method="GET")
        data = r.get("data") or []
        rows += data
        if not data or len(rows) >= (r.get("count") or 0) or page > 200:
            break
        page += 1
    return list(reversed(rows)), base, auth


def event_details(rows, base, auth):
    """Each click's own details (restaurant, button, budget…), fetched once and cached by event id."""
    cache = load_json(CACHE, {}) or {}
    cutoff = (dt.datetime.now(UTC) - dt.timedelta(days=CACHE_DAYS)).isoformat()
    cache = {k: v for k, v in cache.items() if v.get("_at", "") >= cutoff}
    want = [e for e in rows if e.get("eventType") == 2 and e.get("hasData") and e.get("eventName") in DETAIL_EVENTS
            and e["id"] not in cache]

    def fetch(e):
        try:
            got = mf.http(f"{base}/event-data/{e['id']}", headers=auth, method="GET") or []
        except Exception:
            return e["id"], None
        d = {}
        for x in got:
            v = x.get("stringValue")
            if v is None:
                v = x.get("numberValue")
            d[x.get("dataKey")] = v
        d["_at"] = e.get("createdAt", "")
        return e["id"], d

    with ThreadPoolExecutor(4) as pool:
        for eid, d in pool.map(fetch, want):
            if d is not None:
                cache[eid] = d
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, separators=(",", ":")))
    return cache


UMAMI_LIMIT = 100000   # Umami Cloud's free (Hobby) plan: events a month, each stored event property counting as one
UMAMI_WARN = 0.7       # say so when the month is on course for 70% of it


def umami_usage(cfg, now=None):
    """What Umami counts against the plan: every page view, every custom event and every property stored with one
    (Umami's FAQ). The month so far, the last 7 days and where the month is heading at the faster of the two rates.
    Umami's own Settings › Usage page is the final word: the share link can't read it."""
    base, auth, _ = mf.umami_client(cfg)
    now = now or dt.datetime.now(UTC)

    def count(a, b):
        q = urllib.parse.urlencode({"startAt": int(a.timestamp() * 1000), "endAt": int(b.timestamp() * 1000) - 1})
        pv = mf.http(f"{base}/stats?{q}", headers=auth, method="GET").get("pageviews") or 0
        if isinstance(pv, dict):
            pv = pv.get("value") or 0
        ev = sum(x.get("y") or 0 for x in mf.http(f"{base}/metrics?{q}&type=event&limit=500", headers=auth, method="GET") or [])
        props = (mf.http(f"{base}/event-data/stats?{q}", headers=auth, method="GET") or {}).get("records") or 0
        return {"pageviews": pv, "custom_events": ev, "properties": props, "total": pv + ev + props}

    month0 = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    nxt = (month0 + dt.timedelta(days=32)).replace(day=1)
    mtd, week = count(month0, now), count(now - dt.timedelta(days=7), now)
    days_in, elapsed = (nxt - month0).days, max(0.5, (now - month0).total_seconds() / 86400)
    pace = max(mtd["total"] / elapsed, week["total"] / 7)
    projected = round(mtd["total"] + pace * (days_in - elapsed))
    return {"limit": UMAMI_LIMIT, "month_to_date": mtd, "last_7_days": week, "projected_month": projected,
            "full_month_at_weekly_pace": round(week["total"] * 30 / 7),
            "projected_percent": round(100 * projected / UMAMI_LIMIT), "warn": projected >= UMAMI_WARN * UMAMI_LIMIT,
            "properties_per_custom_event_7d": round(week["properties"] / week["custom_events"], 1) if week["custom_events"] else None}


# ---------- visits ----------
def page_kind(path):
    p = path or "/"
    if p == "/":
        return "home"
    if p.startswith("/pick/"):
        return "budget-search"
    if p.startswith("/restaurants/"):
        return "restaurant"
    if re.match(r"^/([a-z]{2,3}/)?guides/", p):
        return "guide"
    if p.startswith("/news/"):
        return "news"
    if "/bib-gourmand/" in p:
        return "bib"
    for k in ("near-me", "compare", "trips", "account", "privacy", "unsubscribe"):
        if p.startswith(f"/{k}/"):
            return k
    return "destination"


TITLES = {}   # page address -> its title as Umami saw it, for naming pages in the report


def page_name(site, path):
    """A page's plain name: a restaurant's or place's name, else its title without the site's name."""
    p = (path or "/").split("#")[0]
    k = page_kind(p)
    if k == "home":
        return "Homepage"
    if k == "budget-search":
        return "Budget Search"
    if k == "near-me":
        return "Near me"
    if k == "restaurant":
        return site.name(p.split("/")[2]) if len(p.split("/")) > 2 else p
    title = re.sub(r"\s*[·|–-]\s*The Starred Bill\s*$", "", TITLES.get(p, "")).strip()
    if k == "destination":
        parts = [x for x in p.split("/") if x]
        place = site.place_at(p) or {}
        if place:
            name = site.place_name(p)
            lang = parts[0] if parts[0] not in site.places else None
            return name + (f" ({lang})" if lang else "")
    return title or p


def channel(ref, query):
    q = urllib.parse.parse_qs(query or "")
    utm = (q.get("utm_source") or [""])[0].lower()
    host = (ref or "").lower().replace("www.", "")
    if utm in ("star-email", "search-email", "booking-email") or any(h in host for h in MAIL_HOSTS):
        return "Email"
    if any(h in host for h in AI_HOSTS) or any(h in utm for h in ("chatgpt", "openai", "perplexity", "claude", "copilot", "gemini")):
        return "AI assistants"
    if host.startswith("accounts.google.") or host.endswith("starredbill.com") or host.endswith("starred-bill.pages.dev"):
        return "Direct or unknown"
    if re.match(r"^([a-z]+\.)?google\.[a-z.]+$", host) or host.startswith("com.google"):
        return "Google search"
    if any(h in host for h in SEARCH_ENGINES):
        return "Other search"
    if any(host == h.rstrip(".") or h in host for h in SOCIAL_HOSTS):
        return "Social"
    if host:
        return "Referral"
    if utm:
        return "Referral"
    return "Direct or unknown"


def build_visits(rows, details):
    """Group the records into visits (a session's records with no 30-minute gap), each a small dict kept in memory only."""
    by_session = defaultdict(list)
    for e in rows:
        by_session[e["sessionId"]].append(e)
        if e.get("eventType") == 1 and e.get("pageTitle"):
            TITLES[e["urlPath"]] = e["pageTitle"]
    visits = []
    for sid, evs in by_session.items():
        evs.sort(key=lambda e: e["createdAt"])
        chunk, last = [], None
        for e in evs:
            t = dt.datetime.fromisoformat(e["createdAt"].replace("Z", "+00:00"))
            if last and (t - last).total_seconds() > VISIT_GAP and chunk:
                visits.append((sid, chunk))
                chunk = []
            chunk.append((t, e))
            last = t
        if chunk:
            visits.append((sid, chunk))
    out = []
    for sid, chunk in visits:
        pages = [(t, e) for t, e in chunk if e.get("eventType") == 1]
        clicks = [(t, e, details.get(e["id"], {})) for t, e in chunk if e.get("eventType") == 2]
        first = pages[0][1] if pages else chunk[0][1]
        out.append({
            "sid": sid, "start": chunk[0][0], "end": chunk[-1][0],
            "pages": [(t, e["urlPath"], e.get("urlQuery") or "") for t, e in pages],
            "clicks": [(t, e["eventName"], e["urlPath"], d) for t, e, d in clicks],
            "ref": first.get("referrerDomain") or "", "query": first.get("urlQuery") or "",
            "country": first.get("country") or "", "city": first.get("city") or "", "device": first.get("device") or "",
            "os": first.get("os") or "", "browser": first.get("browser") or "",
        })
    for v in out:
        v["channel"] = channel(v["ref"], v["query"])
        v["landing"] = v["pages"][0][1] if v["pages"] else (v["clicks"][0][2] if v["clicks"] else "")
        v["exit"] = v["pages"][-1][1] if v["pages"] else v["landing"]
    mark_robots(out)
    return out


def mark_robots(visits):
    """Sets v["robot"] and v["signals"]. Conservative: see is_robot()."""
    burst = defaultdict(list)   # same town, system, browser and device, one direct page each, within the hour
    for v in visits:
        if len(v["pages"]) == 1 and not v["ref"] and not interacted(v):
            burst[(v["city"], v["os"], v["browser"], v["device"], v["start"].strftime("%Y-%m-%d %H"))].append(v)
    in_burst = {id(v) for group in burst.values() if len(group) >= 5 for v in group}
    for v in visits:
        v["robot"], v["signals"] = is_robot(v, id(v) in in_burst)


def interacted(v):
    return any(name not in AUTO_EVENTS for _, name, _, _ in v["clicks"])


def is_robot(v, in_burst):
    """A visit is set aside as a likely robot only when nobody clicked anything in it AND at least three points of
    signals add up, at least two of them from its behaviour rather than its place:
      - a data-centre town (Ashburn, Boardman…): 1 point, and never enough with only one other weak signal
      - headless-browser look (Linux computer, Chrome or Chromium, no referrer): 1
      - a single page, arrived with no referrer: 1
      - one of 5+ look-alike single-page visits from the same town, system and browser in the same hour: 1
      - pages faster than a person reads (5+ pages a median under 2 seconds apart, or 60+ pages in the visit): 2
      - addresses robots probe for weak spots (/wp-login.php, .env…): 3
    Any click a person makes (cookie banner, wishlist, search, a filter, a link out…) keeps the visit in. When in
    doubt, it stays in: the likely-human figures are only ever a bit lower than the raw ones."""
    if interacted(v):
        return False, []
    sig = {}
    if v["city"] in DATA_CENTRE_TOWNS:
        sig["data-centre town"] = 1
    if v["os"].lower().startswith("linux") and v["device"] in ("desktop", "laptop") and \
            v["browser"].lower() in ("chrome", "chromium", "headless-chrome", "chromium-webview") and not v["ref"]:
        sig["headless look"] = 1
    if len(v["pages"]) == 1 and not v["ref"]:
        sig["single page, no referrer"] = 1
    if in_burst:
        sig["look-alike burst"] = 1
    times = [t for t, _, _ in v["pages"]]
    gaps = [(b - a).total_seconds() for a, b in zip(times, times[1:])]
    if (len(times) >= 5 and statistics.median(gaps) < 2) or len(times) >= 60:
        sig["too fast for a reader"] = 2
    if any(mf.CF_PROBE.search(p) for _, p, _ in v["pages"]):
        sig["probe address"] = 3
    total = sum(sig.values())
    behaviour = total - sig.get("data-centre town", 0)
    return (total >= 3 and behaviour >= 2), sorted(sig)


# ---------- one window's figures ----------
def in_window(v, start, end):
    return start <= v["start"] < end


def summarise(site, visits, start, end, gsc_pages=None):
    """Everything the report needs for one stretch of time. Visits are counted in the window they started in."""
    vs = [v for v in visits if in_window(v, start, end)]
    hum = [v for v in vs if not v["robot"]]
    sessions = lambda xs: len({v["sid"] for v in xs})
    pv = lambda xs: sum(len(v["pages"]) for v in xs)

    out = {"from": start.isoformat(), "to": end.isoformat(), "days": round((end - start).total_seconds() / 86400, 2)}
    out["traffic"] = {
        "raw": {"visitors": sessions(vs), "visits": len(vs), "pageviews": pv(vs)},
        "human": {"visitors": sessions(hum), "visits": len(hum), "pageviews": pv(hum)},
        "robot_signals": dict(Counter(s for v in vs if v["robot"] for s in v["signals"])),
        "channels_raw": dict(Counter(v["channel"] for v in vs)),
        "channels_human": dict(Counter(v["channel"] for v in hum)),
        "entry_pages": top(Counter(v["landing"] for v in hum), 10),
        "exit_pages": top(Counter(v["exit"] for v in hum), 10),
        "devices": dict(Counter(v["device"] for v in {v["sid"]: v for v in hum}.values())),
        "countries": top(Counter(v["country"] for v in {v["sid"]: v for v in hum}.values()), 10),
        "cities": top(Counter(v["city"] for v in {v["sid"]: v for v in hum}.values()), 10),
        "page_kinds": dict(Counter(page_kind(p) for v in hum for _, p, _ in v["pages"])),
        "page_kinds_raw": dict(Counter(page_kind(p) for v in vs for _, p, _ in v["pages"])),
        "bounce_percent_human": pct(sum(1 for v in hum if len(v["pages"]) <= 1 and not interacted(v)), len(hum)),
    }
    google_entries = Counter(v["landing"] for v in hum if v["channel"] == "Google search")
    out["traffic"]["google_landing_pages"] = top(google_entries, 15)
    out["traffic"]["organic_landing_pages"] = top(Counter(v["landing"] for v in hum if v["channel"] in ("Google search", "Other search")), 15)

    # ----- clicks, flattened (human visits, with each click's visit attached) -----
    def clicks_of(xs, name):
        return [(v, t, p, d) for v in xs for t, n, p, d in v["clicks"] if n == name]

    # ----- Budget Search -----
    searches = clicks_of(hum, "budget-search")
    raw_searches = clicks_of(vs, "budget-search")
    home_visits = [v for v in hum if any(p == "/" for _, p, _ in v["pages"])]
    from_home = [v for v in home_visits if any(n == "budget-search" for _, n, _, _ in v["clicks"])]
    people = [as_int(d.get("people")) for _, _, _, d in searches if as_int(d.get("people"))]
    budgets_pp = []
    for _, _, _, d in searches:
        m = re.match(r"^(\d+)\s+([A-Z]{3})$", str(d.get("budget") or ""))
        if m:
            gbp = site.to_gbp(int(m.group(1)), m.group(2))
            n = as_int(d.get("people")) or 1
            if gbp:
                budgets_pp.append(gbp / max(1, n))
    places = Counter(("near you" if d.get("where") == "near" else "anywhere" if d.get("where") == "any"
                      else site.place_name(d.get("place"))) for _, _, _, d in searches)
    matches = [as_int(d.get("matches")) for _, _, _, d in searches if as_int(d.get("matches")) is not None]
    zero = [d for _, _, _, d in searches if as_int(d.get("matches")) == 0]
    gaps = Counter()
    for d in zero:
        m = re.match(r"^(\d+)\s+([A-Z]{3})$", str(d.get("budget") or ""))
        gaps[(site.place_name(d.get("place")) if d.get("where") == "place" else d.get("where"),
              str(as_int(d.get("stars")) or 0), d.get("meal") or "", m and f"{int(m.group(1))} {m.group(2)}" or "no limit",
              str(as_int(d.get("people")) or ""))] += 1
    shown = [d for _, _, _, d in searches if (as_int(d.get("matches")) or 0) > 0]
    stretch_shown = [d for d in shown if d.get("stretch") == "yes"]
    slot_clicks = Counter(d.get("slot") for _, _, _, d in clicks_of(hum, "pick-click"))
    out["budget_search"] = {
        "searches": len(searches), "searches_raw": len(raw_searches),
        "from_home": sum(1 for _, _, _, d in searches if d.get("source") == "home"),
        "from_elsewhere": sum(1 for _, _, _, d in searches if d.get("source") != "home"),
        "homepage_visits": len(home_visits), "homepage_visits_that_searched": rate(len(from_home), len(home_visits)),
        "places": top(places, 12),
        "people": {"median": median(people), "mean": mean(people), "split": dict(Counter(people))},
        "budget_per_person_gbp": {"median": median(budgets_pp), "mean": mean(budgets_pp),
                                  "bands": dict(Counter(band(b) for b in budgets_pp)),
                                  "no_limit": sum(1 for _, _, _, d in searches if d.get("budget") == "no-limit")},
        "meal": dict(Counter(d.get("meal") for _, _, _, d in searches)),
        "wine": dict(Counter(d.get("wine") for _, _, _, d in searches)),
        "stars": dict(Counter(str(as_int(d.get("stars")) or 0) for _, _, _, d in searches)),
        "food": dict(Counter(f for _, _, _, d in searches for f in str(d.get("food") or "any").split(",") if f)),
        "diet": dict(Counter(d.get("diet") for _, _, _, d in searches)),
        "matches": {"median": median(matches), "zero": len(zero), "one_or_two": sum(1 for m in matches if 1 <= m <= 2)},
        "no_result_searches": [{"where": k[0], "stars": k[1], "meal": k[2], "budget": k[3], "people": k[4], "count": c}
                               for k, c in gaps.most_common(10)],
        "with_results": len(shown), "stretch_found": len(stretch_shown),
        "result_clicks": dict(slot_clicks),
        "ctr": {"best": rate(slot_clicks.get("best", 0), len(shown)),
                "value": rate(slot_clicks.get("value", 0), len(shown)),
                "stretch": rate(slot_clicks.get("stretch", 0), len(stretch_shown)),
                "any_result": rate(sum(1 for v in hum if any(n == "budget-search" for _, n, _, _ in v["clicks"])
                                       and any(n == "pick-click" for _, n, _, _ in v["clicks"])),
                                   len({id(v) for v, _, _, _ in searches}))},
        "old_pick_results": len(clicks_of(hum, "pick-result")),
        "old_pick_steps": dict(Counter(d.get("step") for _, _, _, d in clicks_of(hum, "pick-step"))),
    }

    # ----- commercial clicks -----
    def kind_of(name, d, rid=None):
        """booking-platform, restaurant-site, hotel, tour, price-source, google-maps or other, for any era's click."""
        if name == "partner":
            return "tour" if d.get("kind") == "tour" or d.get("partner") in ("viator", "getyourguide") else "hotel"
        k, to = d.get("kind") or "", (d.get("to") or "").lower()
        prov = provider(to)
        if k == "booking":
            return "booking-platform" if prov else "restaurant-site"
        if k == "website":
            return "booking-platform" if prov else "restaurant-site"
        if k in ("hotel", "tour", "price-source", "google-maps"):
            return k
        if prov:
            return "booking-platform"     # before Phase 1 these were "other"
        own = host_of((site.restaurants.get(rid) or {}).get("website", ""))
        if own and to.replace("www.", "") == own:
            return "restaurant-site"      # likewise: the address is the restaurant's own website
        return "other"

    outs = []
    for v in hum:
        for t, n, p, d in v["clicks"]:
            if n in ("outbound", "partner"):
                rid = site.rid(d.get("restaurant")) or (p.split("/")[2] if p.startswith("/restaurants/") else None)
                k = kind_of(n, d, rid)
                outs.append({"v": v, "kind": k, "provider": PARTNER_NAMES.get(d.get("partner")) or provider(d.get("to") or "") or
                             ("own site" if k == "restaurant-site" else d.get("provider") or ""),
                             "paid": (d.get("paid") == "yes"), "rid": rid, "page": p, "where": d.get("where") or "", "partner": n == "partner"})
    commercial = [o for o in outs if o["kind"] in ("booking-platform", "hotel", "tour")]
    restaurant_pv = out["traffic"]["page_kinds"].get("restaurant", 0)
    city_of = lambda o: site.city_name(site.restaurants[o["rid"]]) if o["rid"] in site.restaurants else \
        (site.place_name(o["page"]) if page_kind(o["page"]) == "destination" else None)
    com_visits = {id(o["v"]): o["v"] for o in commercial}
    out["commercial"] = {
        "by_kind": dict(Counter(o["kind"] for o in outs)),
        "by_provider": {k: dict(Counter(o["provider"] for o in outs if o["kind"] == k)) for k in
                        ("booking-platform", "restaurant-site", "hotel", "tour")},
        "commercial_clicks": len(commercial), "restaurant_site_clicks": sum(1 for o in outs if o["kind"] == "restaurant-site"),
        "per_100_restaurant_pageviews": pct(len(commercial), restaurant_pv),
        "per_budget_search": rate(len(commercial), len(searches)),
        "top_restaurants": [{"id": k, "name": site.name(k), "count": c} for k, c in
                            Counter(o["rid"] for o in commercial if o["rid"]).most_common(10)],
        "top_cities": top(Counter(city_of(o) for o in commercial), 10),
        "landing_pages": top(Counter(v["landing"] for v in com_visits.values()), 10),
        "sources": dict(Counter(v["channel"] for v in com_visits.values())),
        "spots": top(Counter(f'{o["kind"]} · {o["where"] or page_kind(o["page"])}' for o in commercial), 10),
        "visits_with_commercial_click": len(com_visits),
    }
    out["affiliate"] = {
        "paid_clicks": sum(1 for o in outs if o["paid"]),
        "unpaid_partner_clicks": dict(Counter(o["provider"] for o in outs if o["partner"] and not o["paid"])),
        "booking_platform_clicks": dict(Counter(o["provider"] for o in outs if o["kind"] == "booking-platform")),
        "restaurant_site_clicks": sum(1 for o in outs if o["kind"] == "restaurant-site"),
        "hotel_clicks": sum(1 for o in outs if o["kind"] == "hotel"), "tour_clicks": sum(1 for o in outs if o["kind"] == "tour"),
        "booking_platform_restaurants": [{"id": k, "name": site.name(k), "count": c} for k, c in
                                         Counter(o["rid"] for o in outs if o["kind"] == "booking-platform" and o["rid"]).most_common(10)],
        "other_outbound": dict(Counter(o["kind"] for o in outs if o["kind"] in ("price-source", "google-maps", "other"))),
    }

    # ----- the bill calculator -----
    rp_visits = [v for v in hum if any(page_kind(p) == "restaurant" for _, p, _ in v["pages"])]
    bill = clicks_of(hum, "bill-calc")
    bill_visit_ids = {id(v) for v, _, _, _ in bill}
    has_com = lambda v: id(v) in com_visits
    with_bill = [v for v in rp_visits if id(v) in bill_visit_ids]
    without = [v for v in rp_visits if id(v) not in bill_visit_ids]
    out["bill"] = {
        "restaurant_pageviews": restaurant_pv, "visits_with_restaurant_page": len(rp_visits),
        "uses": len(bill), "visits_using_bill": len(with_bill), "use_rate": rate(len(with_bill), len(rp_visits)),
        "restaurants": [{"id": k, "name": site.name(k), "count": c} for k, c in
                        Counter(site.rid(d.get("restaurant")) for _, _, _, d in bill).most_common(10) if k],
        "people": {"median": median([as_int(d.get("people")) for _, _, _, d in bill]),
                   "mean": mean([as_int(d.get("people")) for _, _, _, d in bill])},
        "meal": dict(Counter(d.get("meal") for _, _, _, d in bill)),
        "wine": dict(Counter("on" if d.get("wine") not in ("off", None) else "off" for _, _, _, d in bill)),
        "commercial_after_bill": rate(sum(1 for v in with_bill if has_com(v)), len(with_bill)),
        "commercial_without_bill": rate(sum(1 for v in without if has_com(v)), len(without)),
    }

    # ----- the Phase 1 funnel and its commonest paths -----
    def steps(v):
        names = [n for _, n, _, _ in v["clicks"]]
        searched = "budget-search" in names
        picked = "pick-click" in names
        t_search = min((t for t, n, _, _ in v["clicks"] if n == "budget-search"), default=None)
        rp_after = any(page_kind(p) == "restaurant" and (t_search is None or t >= t_search) for t, p, _ in v["pages"])
        return searched, picked, rp_after, id(v) in bill_visit_ids, has_com(v)

    funnel = Counter()
    for v in hum:
        s, p, r, b, c = steps(v)
        if s:
            funnel["1 Budget Search"] += 1
            if p:
                funnel["2 opened a result"] += 1
                if r:
                    funnel["3 restaurant page"] += 1
                    if b:
                        funnel["4 used the bill"] += 1
                    if c:
                        funnel["5 commercial click"] += 1
    base = funnel["1 Budget Search"]
    out["funnel"] = {
        "steps": dict(funnel),
        "rates": {"opened_a_result": rate(funnel["2 opened a result"], base),
                  "reached_restaurant_page": rate(funnel["3 restaurant page"], base),
                  "used_bill": rate(funnel["4 used the bill"], funnel["3 restaurant page"]),
                  "commercial_click": rate(funnel["5 commercial click"], base)},
        "paths": top(Counter(path_of(v, bill_visit_ids, com_visits, site) for v in hum
                             if steps(v)[0] or has_com(v) or id(v) in bill_visit_ids), 10),
        "commercial_paths": top(Counter(path_of(v, bill_visit_ids, com_visits, site, landing_name=True) for v in com_visits.values()), 10),
    }

    # ----- what visitors asked for -----
    names = {norm(r.get("name")): rid for rid, r in site.restaurants.items() if len(norm(r.get("name"))) >= 4}
    places = {norm(p.get("name")): p.get("name") for p in site.places.values() if p.get("type") != "cuisine"}

    def resolve(q):
        """What a typed search was for: a restaurant, a place (prefixes count: "singa" is Singapore) or other words."""
        rid = names.get(q) or next((r for n, r in names.items() if len(q) >= 5 and n.startswith(q)), None)
        if rid:
            return "restaurant", site.name(rid)
        if q in places:
            return "place", places[q]
        hit = sorted((n for n in places if len(q) >= 4 and n.startswith(q)), key=len)
        return ("place", places[hit[0]]) if hit else ("other", q)

    rest_terms, place_terms, terms = Counter(), Counter(), Counter()
    typed = set()   # a visit counts once per thing it searched for, however often the box fired while typing
    for v, _, _, d in clicks_of(hum, "search"):
        q = norm(d.get("q"))
        if len(q) < 3 or "@" in str(d.get("q")) or re.search(r"\d{6,}", q):
            continue
        kind, what = resolve(q)
        if (id(v), kind, what) in typed:
            continue
        typed.add((id(v), kind, what))
        {"restaurant": rest_terms, "place": place_terms, "other": terms}[kind][what] += 1
    filters = Counter(f'{d.get("filter")}: {d.get("value")}' for _, _, _, d in clicks_of(hum, "filter"))
    interest = Counter()
    for _, p, _ in (x for v in hum for x in v["pages"]):
        if p.startswith("/restaurants/"):
            interest[p.split("/")[2]] += 1
    out["demand"] = {
        "search_box_restaurants": top(rest_terms, 10), "search_box_places": top(place_terms, 10),
        # other typed words only when two or more visits typed them (so nothing one person typed is repeated)
        "search_box_other": [x for x in top(terms, 30) if x["count"] >= 2][:10],
        "filters": top(filters, 10), "destination_views": top(Counter(site.place_name(p) for v in hum for _, p, _ in v["pages"]
                                                                  if page_kind(p) == "destination"), 12),
        "restaurant_views": [{"id": k, "name": site.name(k), "count": c} for k, c in interest.most_common(12)],
    }
    out["restaurant_interest"] = restaurant_interest(site, hum, clicks_of, outs)
    return out


def band(gbp):
    for lim, name in ((75, "under £75"), (150, "£75–150"), (250, "£150–250"), (400, "£250–400")):
        if gbp < lim:
            return name
    return "£400+"


def provider(to):
    to = (to or "").lower()
    for h, name in BOOKING_HOSTS:
        if h in to:
            return name
    return None


def path_of(v, bill_ids, com, site, landing_name=False):
    """A visit as a short chain of steps, e.g. "Google search → Guide → Budget Search → Restaurant → Bill → Booking (resy)"."""
    label = {"home": "Homepage", "budget-search": "Budget Search", "restaurant": "Restaurant", "guide": "Guide",
             "destination": "Destination", "near-me": "Near me"}
    land = v["landing"]
    first = (page_name(site, land) if landing_name else label.get(page_kind(land), page_kind(land).title()))
    chain = [v["channel"], first]
    seen = {page_kind(land)}
    events = sorted([(t, "page", p) for t, p, _ in v["pages"][1:]] + [(t, n, d) for t, n, _, d in v["clicks"]], key=lambda x: x[0])
    for _, n, d in events:
        step = None
        if n == "page" and page_kind(d) in ("budget-search", "restaurant") and page_kind(d) not in seen:
            step = label[page_kind(d)]
            seen.add(page_kind(d))
        elif n == "budget-search" and "search" not in seen:
            step, _ = "Budget Search", seen.add("search")
        elif n == "bill-calc" and "bill" not in seen:
            step, _ = "Bill", seen.add("bill")
        elif n in ("outbound", "partner"):
            pr = PARTNER_NAMES.get(d.get("partner")) or provider(d.get("to") or "")
            k = d.get("kind") or ""
            if n == "partner":
                step = f"{'Tour' if k == 'tour' else 'Hotel'} ({pr})"
            elif pr:
                step = f"Booking ({pr})"
            elif k in ("booking", "website"):
                step = "Restaurant's own site"
        if step and step != chain[-1] and not (step == "Budget Search" and "Budget Search" in chain):
            chain.append(step)
    return " → ".join(chain)


def restaurant_interest(site, hum, clicks_of, outs):
    """Per restaurant: page views, commercial clicks and on-site interest (results opened, bill used, named in a search)."""
    views, com, onsite = Counter(), Counter(), Counter()
    for v in hum:
        for _, p, _ in v["pages"]:
            if p.startswith("/restaurants/"):
                views[p.split("/")[2]] += 1
    for o in outs:
        if o["rid"] and o["kind"] in ("booking-platform", "hotel", "tour", "restaurant-site"):
            com[o["rid"]] += 1
    for name in ("pick-click", "bill-calc"):
        for _, _, _, d in clicks_of(hum, name):
            rid = site.rid(d.get("restaurant"))
            if rid:
                onsite[rid] += 1
    return {"views": dict(views), "commercial": dict(com), "onsite": dict(onsite)}


# ---------- Search Console extras ----------
def gsc_extras(cfg):
    """Pages and searches gaining or losing Google impressions week on week, pages new to Google's results, and every
    restaurant page's 28 days, for "Prices to verify next". Five Search Console requests."""
    if not mf.google_ready(cfg):
        return {"status": "not set up"}
    url, auth, week, prev = mf.gsc_query(cfg)
    end = dt.date.fromisoformat(week[1])
    four = (str(end - dt.timedelta(days=27)), week[1])

    def rows(dim, rng, limit=5000):
        return {r["keys"][0]: r for r in mf.http(url, {"startDate": rng[0], "endDate": rng[1], "dimensions": [dim], "rowLimit": limit}, auth).get("rows", [])}

    out = {"status": "ok", "week": week, "prev": prev}
    for dim in ("page", "query"):
        a, b = rows(dim, week), rows(dim, prev)
        moves = []
        for k in set(a) | set(b):
            x, y = a.get(k, {}), b.get(k, {})
            moves.append({"item": k.replace(mf.SITE, "") or "/", "impressions": x.get("impressions", 0), "before": y.get("impressions", 0),
                          "clicks": x.get("clicks", 0), "clicks_before": y.get("clicks", 0),
                          "position": round(x["position"], 1) if x else None, "ctr": round(100 * x.get("ctr", 0), 1) if x else None})
        gain = sorted([m for m in moves if m["impressions"] - m["before"] >= 15], key=lambda m: -(m["impressions"] - m["before"]))[:8]
        lose = sorted([m for m in moves if m["before"] - m["impressions"] >= 15], key=lambda m: -(m["before"] - m["impressions"]))[:8]
        out[f"{dim}_gainers"], out[f"{dim}_losers"] = gain, lose
        if dim == "page":
            out["new_pages"] = sorted([m for m in moves if m["before"] == 0 and m["impressions"] >= 10],
                                      key=lambda m: -m["impressions"])[:10]
            out["new_pages_with_clicks"] = [m for m in moves if m["clicks_before"] == 0 and m["before"] == 0 and m["clicks"] > 0][:10]
            out["by_kind"] = {}
            for m in moves:
                k = page_kind(m["item"])
                s = out["by_kind"].setdefault(k, {"clicks": 0, "impressions": 0, "clicks_before": 0, "before": 0})
                s["clicks"] += m["clicks"]
                s["impressions"] += m["impressions"]
                s["clicks_before"] += m["clicks_before"]
                s["before"] += m["before"]
    four_rows = rows("page", four, 25000)
    out["restaurant_pages_28d"] = {k.replace(mf.SITE, "").split("/")[2]: {"impressions": r["impressions"], "clicks": r["clicks"]}
                                   for k, r in four_rows.items() if "/restaurants/" in k and len(k.replace(mf.SITE, "").split("/")) > 2}
    return out


# ---------- data health ----------
def data_health(site, today):
    """Price checks kept apart from mere records: a price counts as checked only by its own priceVerifiedAt /
    lunchVerifiedAt (a genuine check of the source); priceChangedAt / lunchChangedAt only say when our record changed."""
    live = site.live()
    yday = str(today - dt.timedelta(days=1))

    def meal_health(meal):
        sts = [st for st in (price_state(r, meal, today) for r in live) if st]
        unchecked = [st for st in sts if not st["verified"]]
        return {"priced": len(sts),
                "checked_yesterday": sum(1 for st in sts if str(st["verified"] or "")[:10] == yday),
                "checked_30_days": sum(1 for st in sts if st["verified_days"] is not None and st["verified_days"] <= 30),
                "checked_90_days": sum(1 for st in sts if st["verified_days"] is not None and st["verified_days"] <= 90),
                "never_checked": len(unchecked),
                "recorded_last_30_days_never_checked": sum(1 for st in unchecked if st["changed_days"] is not None and st["changed_days"] <= 30),
                "by_source": dict(Counter(st["kind"] for st in sts)),
                "never_checked_by_source": dict(Counter(st["kind"] for st in unchecked)),
                "derived": sum(1 for st in sts if st["derived"])}

    names = defaultdict(list)
    for r in live:
        names[(norm(r.get("name")), site.city_name(r))].append(r["id"])
    rate_age = None
    try:
        rate_age = (today - dt.date.fromisoformat(site.rate_date)).days
    except Exception:
        pass
    return {
        "live_starred": len(live),
        "dinner": meal_health("dinner"), "lunch": meal_health("lunch"),
        "menus_checked": sum(1 for r in live if r.get("menusChecked") and r.get("menus")),
        "missing": {"dinner_price": sum(1 for r in live if r.get("dinner") is None and not r.get("lunch")),
                    "dinner_menu_but_lunch_only": sum(1 for r in live if r.get("dinner") is None and r.get("lunch")),
                    "lunch_unknown": sum(1 for r in live if r.get("lunch") is None and not r.get("noLunch") and not r.get("lunchNote")),
                    "booking_link": sum(1 for r in live if not r.get("bookingUrl") and not r.get("noBookings")),
                    "website": sum(1 for r in live if not r.get("website")),
                    "price_source": sum(1 for r in live if r.get("dinner") is not None and source_kind(r) == "none")},
        "exchange_rates": {"date": site.rate_date, "days_old": rate_age, "stale": bool(rate_age is not None and rate_age > 35)},
        "possible_duplicates": [ids for ids in names.values() if len(ids) > 1][:20],
        "price_changes": price_changes(site, today),
    }


def price_changes(site, today):
    """Dinner and lunch prices changed on main since yesterday morning, flagging moves of a third or more."""
    since = f"{today - dt.timedelta(days=1)} 00:00"
    try:
        old = subprocess.run(["git", "-C", str(ROOT), "rev-list", "-1", f"--before={since}", "HEAD"],
                             capture_output=True, text=True, timeout=30).stdout.strip()
        files = subprocess.run(["git", "-C", str(ROOT), "diff", "--name-only", old, "HEAD", "--", "content/restaurants"],
                               capture_output=True, text=True, timeout=30).stdout.split()
    except Exception:
        return {"error": "git not available"}
    changed, odd = 0, []
    for f in files:
        rid = Path(f).stem
        new = site.restaurants.get(rid)
        try:
            was = json.loads(subprocess.run(["git", "-C", str(ROOT), "show", f"{old}:{f}"], capture_output=True, text=True, timeout=30).stdout)
        except Exception:
            continue
        for k in ("dinner", "lunch"):
            a, b = was.get(k), (new or {}).get(k)
            if a != b and a is not None and b is not None:
                changed += 1
                if a and abs(b - a) / a >= 0.33:
                    odd.append({"id": rid, "name": site.name(rid), "field": k, "was": a, "now": b})
    return {"changed": changed, "big_moves": odd[:15]}


def verify_queue(site, interest28, gsc28, today, limit=25):
    """Restaurants whose price most needs a genuine check, ranked by our own evidence: page views, clicks out to book
    or to its site, Budget Search and bill use, Google impressions and clicks on its page; times how much its prices
    need a check: never genuinely checked (a recent record or change doesn't count) or checked long ago, from a weaker
    kind of source (another guide, a review, no source; the restaurant's own site least), or worked out by us; times
    its stars. Dinner leads; an unchecked lunch price adds a little."""
    rows = []
    for r in site.live():
        rid = r["id"]
        d, l = price_state(r, "dinner", today), price_state(r, "lunch", today)
        main = d or l
        if not main:
            continue

        def need(st):
            if not st:
                return 0
            age = st["verified_days"]
            stale = 1.0 if age is None else 0.9 if age > 180 else 0.6 if age > 90 else 0.3 if age > 30 else 0
            return stale * SOURCE_NEED.get(st["kind"], 1.2) * (1.15 if st["derived"] else 1)
        n = need(main) + (0.25 * need(l) if d and l else 0)
        if n <= 0:
            continue
        vv = interest28["views"].get(rid, 0)
        cc = interest28["commercial"].get(rid, 0)
        oo = interest28["onsite"].get(rid, 0)
        g = gsc28.get(rid, {})
        gi, gc = g.get("impressions", 0), g.get("clicks", 0)
        weight = {3: 1.5, 2: 1.25}.get(r.get("stars"), 1.0)
        score = (vv + 8 * cc + 3 * oo + 3 * gc + gi / 25) * n * weight
        if score <= 0:
            continue
        why = []
        if vv:
            why.append(f"{vv} page views")
        if cc:
            why.append(f"{cc} click{'s' if cc > 1 else ''} out to book or its website")
        if oo:
            why.append(f"{oo} Budget Search or bill use{'s' if oo > 1 else ''}")
        if gi:
            why.append(f"{gi} Google impressions, {gc} clicks")
        rows.append({"id": rid, "name": r.get("name"), "stars": r.get("stars"), "city": site.city_name(r),
                     "score": round(score, 1), "evidence": ", ".join(why),
                     "dinner": d, "lunch": l, "status": "; ".join(f"{m} {state_words(st)}" for m, st in (("dinner", d), ("lunch", l)) if st),
                     "last_check": (d or {}).get("verified") or "never", "source": main["source"], "source_kind": main["kind"],
                     "page": f"https://starredbill.com/restaurants/{rid}/"})
    rows.sort(key=lambda x: -x["score"])
    return rows[:limit]


def dns_exists(host):
    """Whether public DNS (Cloudflare's DNS over HTTPS) knows the name; True when unsure."""
    try:
        req = urllib.request.Request(f"https://cloudflare-dns.com/dns-query?name={urllib.parse.quote(host)}&type=A",
                                     headers={"Accept": "application/dns-json"})
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read()).get("Status") != 3   # 3 = no such name
    except Exception:
        return True


def link_checks(site, ids, today):
    """Fetches the price source, website and booking link of each restaurant given. Only a 404/410 or a site that no
    longer exists counts as broken; refusals (403, 429), timeouts and 5xx are "couldn't check", never reported as broken."""
    jobs = []
    for rid in ids:
        r = site.restaurants.get(rid) or {}
        for field in ("source", "website", "bookingUrl"):
            if r.get(field, "").startswith("http"):
                jobs.append((rid, field, r[field]))

    def check(job):
        rid, field, url = job
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
                                                                 "(KHTML, like Gecko) Version/17.0 Safari/605.1.15 starredbill-link-check"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return rid, field, url, resp.status, "ok"
        except urllib.error.HTTPError as e:
            return rid, field, url, e.code, "broken" if e.code in (404, 410) else "couldn't check"
        except urllib.error.URLError as e:
            reason = str(e.reason)
            gone = any(s in reason for s in ("nodename nor servname", "Name or service not known", "No address associated"))
            # The Mac's own resolver can fail where the name exists (a filter, a network quirk): only a "no such
            # name" from public DNS counts as the site being gone.
            return rid, field, url, None, "site gone" if gone and not dns_exists(host_of(url)) else "couldn't check"
        except Exception:
            return rid, field, url, None, "couldn't check"

    with ThreadPoolExecutor(6) as pool:
        results = list(pool.map(check, jobs))
    out = {"date": str(today), "checked": len(results), "restaurants": len(ids),
           "results": [{"id": a, "name": site.name(a), "field": b, "url": c, "status": d, "verdict": e} for a, b, c, d, e in results]}
    out["broken"] = [x for x in out["results"] if x["verdict"] in ("broken", "site gone")]
    out["suspected_closures"] = sorted({x["name"] for x in out["results"] if x["field"] == "website" and x["verdict"] == "site gone"})
    out["couldnt_check"] = sum(1 for x in out["results"] if x["verdict"] == "couldn't check")
    return out


# ---------- anomalies ----------
def anomalies(site, visits, day_start, day_end, figures):
    """Only big, real moves: at least double or half the usual level AND a real number behind it."""
    found = []
    days = [(day_start - dt.timedelta(days=i), day_start - dt.timedelta(days=i - 1)) for i in range(1, 29)]
    day_vs = lambda a, b: [v for v in visits if a <= v["start"] < b]

    def measure(vs):
        hum = [v for v in vs if not v["robot"]]
        clicks = lambda n: sum(1 for v in hum for _, x, _, _ in v["clicks"] if x == n)
        com = sum(1 for v in hum for _, n, _, d in v["clicks"]
                  if n == "partner" or (n == "outbound" and ((d.get("kind") in COMMERCIAL) or provider(d.get("to") or ""))))
        return {"visitors (raw)": len({v["sid"] for v in vs}), "visitors (likely human)": len({v["sid"] for v in hum}),
                "Google search visits": sum(1 for v in hum if v["channel"] == "Google search"),
                "AI assistant visits": sum(1 for v in hum if v["channel"] == "AI assistants"),
                "Budget Searches": clicks("budget-search"), "commercial clicks": com}

    today = measure(day_vs(day_start, day_end))
    history = [measure(day_vs(a, b)) for a, b in days[:7] if a >= UMAMI_FROM]
    same_wd = measure(day_vs(*days[6])) if days[6][0] >= UMAMI_FROM else None
    floor = {"visitors (raw)": 30, "visitors (likely human)": 25, "Google search visits": 20, "AI assistant visits": 20,
             "Budget Searches": 5, "commercial clicks": 4}
    for k, now in today.items():
        if not history:
            break
        avg = sum(h[k] for h in history) / len(history)
        # Against the last 7 days' average (the same weekday last week is shown beside it, but while the site is
        # growing fast it understates the usual level, so it isn't a test of its own)
        if avg > 0 and (now >= 2 * avg or now <= avg / 2) and abs(now - avg) >= floor[k]:
            found.append({"what": k, "yesterday": now, "usual": round(avg, 1), "same_day_last_week": same_wd and same_wd[k],
                          "kind": "spike" if now > avg else "drop"})
    # pages and restaurants suddenly much busier than their own 28-day average
    def page_counts(vs):
        return Counter(p for v in vs if not v["robot"] for _, p, _ in v["pages"])
    y = page_counts(day_vs(day_start, day_end))
    past = page_counts([v for v in visits if day_start - dt.timedelta(days=28) <= v["start"] < day_start])
    span = max(1, min(28, (day_start - UMAMI_FROM).days))
    for p, n in y.most_common(30):
        usual = past.get(p, 0) / span
        lim = 10 if page_kind(p) == "restaurant" else 15
        if n >= lim and n >= 3 * max(usual, 1):
            found.append({"what": f"busy {page_kind(p)} page", "page": p, "yesterday": n, "usual": round(usual, 1), "kind": "spike"})
    # a page Google started sending visitors to
    gy = Counter(v["landing"] for v in day_vs(day_start, day_end) if not v["robot"] and v["channel"] == "Google search")
    gp = Counter(v["landing"] for v in visits if not v["robot"] and v["channel"] == "Google search"
                 and day_start - dt.timedelta(days=28) <= v["start"] < day_start)
    for p, n in gy.items():
        if n >= 3 and not gp.get(p):
            found.append({"what": "page new to Google traffic", "page": p, "yesterday": n, "kind": "new"})
    # server errors (Cloudflare, from the morning figures)
    cf = (figures or {}).get("sources", {}).get("cloudflare", {})
    yd = str((day_start + dt.timedelta(hours=12)).date())
    for s in (cf.get("server_errors") or {}).get("spikes") or []:
        if str(s.get("hour", "")).startswith(yd):
            found.append({"what": "server error spike", "hour": s.get("hour"), "count": s.get("count"), "push": s.get("push"), "kind": "spike"})
    return found


# ---------- putting it together ----------
def local_midnight(d):
    return dt.datetime.combine(d, dt.time()).astimezone(UTC)


def daily(figures_path, weekly=False, links=False, keep=True):
    cfg = load_json(mf.CONFIG, {}) or {}
    figures = load_json(figures_path, {}) if figures_path else {}
    site = Site()
    today = dt.date.today()
    weekly = weekly or today.weekday() == 0
    links = links or today.weekday() == 0
    t0 = local_midnight(today)
    y0 = local_midnight(today - dt.timedelta(days=1))
    start = max(UMAMI_FROM, t0 - dt.timedelta(days=LOOKBACK_DAYS))
    rows, base, auth = umami_events(cfg, start, t0)
    details = event_details(rows, base, auth)
    visits = build_visits(rows, details)
    try:
        gsc = gsc_extras(cfg)
    except Exception as e:
        gsc = {"status": "error", "error": str(e)[:200]}

    def win(a_days, b_days=0):
        a, b = max(UMAMI_FROM, t0 - dt.timedelta(days=a_days)), t0 - dt.timedelta(days=b_days)
        return summarise(site, visits, a, b) if b > UMAMI_FROM else None

    rep = {"date": str(today), "generated": dt.datetime.now(UTC).isoformat(timespec="seconds"),
           "phase1_live": PHASE1_LIVE.isoformat(), "min_cases": MIN_CASES,
           "umami_raw": (figures.get("sources", {}).get("umami") or {}).get("yesterday"),
           "yesterday": summarise(site, visits, y0, t0),
           "day_before": summarise(site, visits, y0 - dt.timedelta(days=1), y0),
           "same_day_last_week": summarise(site, visits, y0 - dt.timedelta(days=7), t0 - dt.timedelta(days=7))
           if y0 - dt.timedelta(days=7) >= UMAMI_FROM else None,
           "last_7_days": win(7), "prev_7_days": win(14, 7), "last_28_days": win(28),
           "since_phase1": summarise(site, visits, PHASE1_LIVE, t0) if PHASE1_LIVE < t0 else None,
           "gsc": {k: v for k, v in gsc.items() if k != "restaurant_pages_28d"},
           "search_console_week": (figures.get("sources", {}).get("search_console") or {}).get("this_week")}
    if weekly:
        rep["prev_28_days"] = win(56, 28)
        if rep["prev_28_days"]:
            rep["prev_28_days"]["partial"] = t0 - dt.timedelta(days=56) < UMAMI_FROM
    rep["data_health"] = data_health(site, today)
    try:
        rep["umami_usage"] = umami_usage(cfg)
    except Exception as e:
        rep["umami_usage"] = {"error": str(e)[:200]}
    rep["prices_to_verify"] = verify_queue(site, rep["last_28_days"]["restaurant_interest"], gsc.get("restaurant_pages_28d", {}), today)
    rep["anomalies"] = anomalies(site, visits, y0, t0, figures)
    if links:
        ids = [x["id"] for x in rep["prices_to_verify"]] + [x["id"] for x in rep["last_28_days"]["commercial"]["top_restaurants"]]
        ids += [x["id"] for x in rep["last_28_days"]["affiliate"]["booking_platform_restaurants"]]
        extra = [x["id"] for x in verify_queue(site, rep["last_28_days"]["restaurant_interest"], gsc.get("restaurant_pages_28d", {}), today, 100)]
        ids = list(dict.fromkeys(ids + extra))[:100]
        rep["link_check"] = link_checks(site, ids, today)
    else:
        last = sorted((HISTORY / "link-checks").glob("*.json"))
        rep["link_check_latest"] = summary_of_links(load_json(last[-1], {})) if last else None
    rep["actions"] = action_candidates(rep)
    md = render(rep, site, figures, weekly)
    if keep:
        save(rep, weekly)
        (HISTORY / "reports").mkdir(parents=True, exist_ok=True)
        (HISTORY / "reports" / f"{today}.md").write_text(md)
    print(md)
    return rep


def summary_of_links(lc):
    if not lc:
        return None
    return {"date": lc.get("date"), "checked": lc.get("checked"), "broken": lc.get("broken", []),
            "suspected_closures": lc.get("suspected_closures", []), "couldnt_check": lc.get("couldnt_check")}


def action_candidates(rep):
    """Evidence-backed actions for the routine to choose from (it gives one to three, or none)."""
    acts = []
    pv = rep["prices_to_verify"][:5]
    if pv and any("page views" in x["evidence"] or "commercial" in x["evidence"] for x in pv):
        acts.append({"action": "Verify the prices of the top restaurants in Prices to verify next",
                     "evidence": "; ".join(f'{x["name"]} ({x["evidence"]}; {x["status"]})' for x in pv), "strength": "strong" if pv[0]["score"] >= 20 else "moderate"})
    w = rep["last_7_days"]
    for g in w["budget_search"]["no_result_searches"]:
        if g["count"] >= 3:
            acts.append({"action": f'Look at Budget Searches with no results: {g["where"]}, {g["stars"]}★, {g["meal"]}, {g["budget"]} for {g["people"]}',
                         "evidence": f'{g["count"]} searches in 7 days found nothing', "strength": "moderate"})
    lc = rep.get("link_check") or rep.get("link_check_latest") or {}
    if lc.get("broken"):
        acts.append({"action": "Fix broken price, website or booking links", "evidence": ", ".join(sorted({x["name"] for x in lc["broken"]}))[:300],
                     "strength": "strong"})
    aff = rep["last_28_days"]["affiliate"]
    unpaid = sum(aff["unpaid_partner_clicks"].values()) + sum(aff["booking_platform_clicks"].values())
    if unpaid >= MIN_CASES:
        acts.append({"action": "Consider the affiliate programme of the provider getting the most unpaid clicks",
                     "evidence": json.dumps({"partners": aff["unpaid_partner_clicks"], "booking": aff["booking_platform_clicks"]}), "strength": "moderate"})
    for a in rep["anomalies"]:
        if "page" not in a and a["what"] != "server error spike":
            acts.append({"action": f'Find out why {a["what"]} {"jumped" if a["kind"] == "spike" else "fell"} yesterday '
                                   "(Search Console catches up in 2–3 days; a site change or a Google update are the usual causes)",
                         "evidence": f'{a["yesterday"]} against about {a["usual"]} a day over the last week', "strength": "moderate"})
        if a["kind"] in ("spike", "new") and "page" in a:
            acts.append({"action": f'Check why {a["page"]} got busy', "evidence": f'{a["yesterday"]} yesterday against about {a.get("usual", 0)} a day',
                         "strength": "weak"})
    u = rep.get("umami_usage") or {}
    if u.get("warn"):
        acts.append({"action": "Umami usage is heading past 70% of the free plan: check Settings › Usage and decide between the paid plan and trimming event details",
                     "evidence": f'about {u["projected_month"]:,} events projected this month', "strength": "strong"})
    if rep["data_health"]["exchange_rates"]["stale"]:
        acts.append({"action": "Refresh exchange rates", "evidence": f'rates are {rep["data_health"]["exchange_rates"]["days_old"]} days old', "strength": "strong"})
    return acts


# ---------- history (aggregates only) ----------
def row_of(date, w, rep):
    t, b, c, bl, a = w["traffic"], w["budget_search"], w["commercial"], w["bill"], w["affiliate"]
    ch = t["channels_human"]
    fig_sc = rep.get("search_console_week") or {}
    return {"date": date, "visitors_raw": t["raw"]["visitors"], "visitors_human": t["human"]["visitors"],
            "visits_raw": t["raw"]["visits"], "visits_human": t["human"]["visits"], "pageviews_raw": t["raw"]["pageviews"],
            "pageviews_human": t["human"]["pageviews"], "google_visits": ch.get("Google search", 0), "other_search_visits": ch.get("Other search", 0),
            "ai_visits": ch.get("AI assistants", 0), "social_visits": ch.get("Social", 0), "referral_visits": ch.get("Referral", 0),
            "direct_visits": ch.get("Direct or unknown", 0), "restaurant_pageviews": bl["restaurant_pageviews"],
            "homepage_visits": b["homepage_visits"], "budget_searches": b["searches"], "budget_from_home": b["from_home"],
            "budget_no_results": b["matches"]["zero"], "result_clicks": sum(b["result_clicks"].values()), "bill_uses": bl["uses"],
            "commercial_clicks": c["commercial_clicks"], "booking_platform_clicks": sum(a["booking_platform_clicks"].values()),
            "restaurant_site_clicks": a["restaurant_site_clicks"], "hotel_clicks": a["hotel_clicks"], "tour_clicks": a["tour_clicks"],
            "paid_clicks": a["paid_clicks"], "gsc_clicks_week": fig_sc.get("clicks", ""), "gsc_impressions_week": fig_sc.get("impressions", ""),
            "dinner_checked_30d": (rep.get("data_health") or {}).get("dinner", {}).get("checked_30_days", ""),
            "dinner_never_checked": (rep.get("data_health") or {}).get("dinner", {}).get("never_checked", ""),
            "lunch_checked_30d": (rep.get("data_health") or {}).get("lunch", {}).get("checked_30_days", ""),
            "lunch_never_checked": (rep.get("data_health") or {}).get("lunch", {}).get("never_checked", ""),
            "umami_usage_7d": (rep.get("umami_usage") or {}).get("last_7_days", {}).get("total", "")}


def upsert_csv(path, row, key="date"):
    rows = []
    if path.exists():
        with path.open() as f:
            rows = [r for r in csv.DictReader(f) if r.get(key) != row[key]]
    rows.append(row)
    rows.sort(key=lambda r: str(r[key]))
    cols = list(row.keys())
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def strip(w):
    """A window's figures without the per-restaurant interest table (kept only for the ranking)."""
    return {k: v for k, v in w.items() if k != "restaurant_interest"} if isinstance(w, dict) else w


def save(rep, weekly):
    for d in ("daily", "weekly", "link-checks"):
        (HISTORY / d).mkdir(parents=True, exist_ok=True)
    keep = {k: (strip(v) if isinstance(v, dict) and "traffic" in v else v) for k, v in rep.items()}
    (HISTORY / "daily" / f"{rep['date']}.json").write_text(json.dumps(keep, indent=1, ensure_ascii=False))
    yday = str(dt.date.fromisoformat(rep["date"]) - dt.timedelta(days=1))
    upsert_csv(HISTORY / "daily.csv", row_of(yday, rep["yesterday"], rep))
    if rep.get("link_check"):
        (HISTORY / "link-checks" / f"{rep['date']}.json").write_text(json.dumps(rep["link_check"], indent=1, ensure_ascii=False))
    if weekly:
        wk = {k: keep[k] for k in ("date", "last_7_days", "prev_7_days", "last_28_days", "prev_28_days", "gsc", "data_health",
                                   "prices_to_verify", "actions") if k in keep}
        (HISTORY / "weekly" / f"{rep['date']}.json").write_text(json.dumps(wk, indent=1, ensure_ascii=False))
        r = row_of(f"{dt.date.fromisoformat(rep['date']) - dt.timedelta(days=7)} to {yday}", rep["last_7_days"], rep)
        r["week_ending"] = yday
        upsert_csv(HISTORY / "weekly.csv", r)


# ---------- the report's sections (Markdown) ----------
SITE_FOR_NAMES = None


def link(path, text=None):
    p = path or "/"
    if text is None and SITE_FOR_NAMES is not None:
        text = page_name(SITE_FOR_NAMES, p)
    return f"[{text or p}](https://starredbill.com{p})"


def fmt_rate(r):
    if not r:
        return "–"
    if r.get("percent") is None:
        return f"{r['n']} of {r['of']} (too few to judge)"
    return f"{r['percent']}% ({r['n']} of {r['of']})"


def fmt_change(now, before):
    c = change(now, before)
    return "–" if c is None else f"{c:+d}%"


def render(rep, site, figures, weekly):
    global SITE_FOR_NAMES
    SITE_FOR_NAMES = site
    y, w, w0, m = rep["yesterday"], rep["last_7_days"], rep["prev_7_days"], rep["last_28_days"]
    db, sw = rep["day_before"], rep["same_day_last_week"]
    L = []
    t = y["traffic"]
    raw, hum = t["raw"], t["human"]
    c = y["commercial"]
    L.append(f"**Headline:** {raw['visitors']} visitors yesterday ({fmt_change(raw['visitors'], db['traffic']['raw']['visitors'])} on the day before"
             + (f", {fmt_change(raw['visitors'], sw['traffic']['raw']['visitors'])} on the same day last week" if sw else "")
             + f"); {c['commercial_clicks']} commercial clicks, {c['restaurant_site_clicks']} to restaurants' own sites; "
             + f"{y['budget_search']['searches']} Budget Searches; {y['bill']['uses']} bill calculator uses.")
    if raw["visitors"] - hum["visitors"] >= max(5, raw["visitors"] * 0.1):
        L.append(f"Likely human: {hum['visitors']} of the {raw['visitors']} (the rest were set aside as likely robots; rates below use the human figure).")

    # Commercial clicks
    L.append("\n## Commercial clicks")
    L.append("| | Yesterday | 7 days | 28 days |\n|---|---|---|---|")
    for k, name in (("booking-platform", "Booking platforms"), ("restaurant-site", "Restaurants' own sites"), ("hotel", "Hotels (Booking.com)"), ("tour", "Tours")):
        L.append(f"| {name} | {y['commercial']['by_kind'].get(k, 0)} | {w['commercial']['by_kind'].get(k, 0)} | {m['commercial']['by_kind'].get(k, 0)} |")
    L.append(f"| **Commercial (booking, hotel, tour)** | {y['commercial']['commercial_clicks']} | {w['commercial']['commercial_clicks']} | {m['commercial']['commercial_clicks']} |")
    L.append(f"| Per 100 restaurant page views | {y['commercial']['per_100_restaurant_pageviews'] or '–'} | {w['commercial']['per_100_restaurant_pageviews'] or '–'} | {m['commercial']['per_100_restaurant_pageviews'] or '–'} |")
    tr = ", ".join(f"{x['name']} {x['count']}" for x in w["commercial"]["top_restaurants"][:5]) or "none yet"
    tc = ", ".join(f"{x['item']} {x['count']}" for x in w["commercial"]["top_cities"][:5]) or "none yet"
    L.append(f"\nTop restaurants (7 days): {tr}. Top cities: {tc}.")
    if w["commercial"]["landing_pages"]:
        L.append("Landing pages that led to a commercial click (7 days): " + ", ".join(f"{link(x['item'])} {x['count']}" for x in w["commercial"]["landing_pages"][:5]) + ".")
    if w["funnel"]["commercial_paths"]:
        L.append("Paths to a commercial click (7 days, grouped): " + "; ".join(f"{x['item']} ({x['count']})" for x in w["funnel"]["commercial_paths"][:3]) + ".")

    # Budget Search
    b, bw = y["budget_search"], w["budget_search"]
    L.append("\n## Budget Search")
    L.append(f"Yesterday: {b['searches']} searches ({b['from_home']} from the homepage, {b['from_elsewhere']} elsewhere), "
             f"{b['matches']['zero']} with no results; results opened: " +
             (", ".join(f"{SLOT.get(k, k)} {v}" for k, v in sorted(b["result_clicks"].items(), key=lambda kv: -kv[1])) or "none") + ".")
    L.append(f"7 days: {bw['searches']} searches; homepage visitors who searched: {fmt_rate(bw['homepage_visits_that_searched'])}; "
             f"Best match opened {fmt_rate(bw['ctr']['best'])}, Best value {fmt_rate(bw['ctr']['value'])}, Stretch {fmt_rate(bw['ctr']['stretch'])}.")
    if bw["old_pick_results"]:
        L.append(f"Before Phase 1 (old Help me pick, in this 7 days): {bw['old_pick_results']} result screens.")
    f = w["funnel"]["steps"]
    L.append(f"Funnel (7 days, visits): Budget Search {f.get('1 Budget Search', 0)} → opened a result {f.get('2 opened a result', 0)} → "
             f"restaurant page {f.get('3 restaurant page', 0)} → used the bill {f.get('4 used the bill', 0)} → commercial click {f.get('5 commercial click', 0)}.")

    # The bill
    bl, blw = y["bill"], w["bill"]
    L.append("\n## The bill calculator")
    L.append(f"Yesterday: used on {bl['visits_using_bill']} of {bl['visits_with_restaurant_page']} visits that saw a restaurant page "
             f"({bl['restaurant_pageviews']} restaurant page views). 7 days: {fmt_rate(blw['use_rate'])}; diners median {blw['people']['median'] or '–'}; "
             f"meal {dict_words(blw['meal'])}; wine {dict_words(blw['wine'])}.")
    L.append(f"Commercial click after using the bill: {fmt_rate(blw['commercial_after_bill'])}; without it: {fmt_rate(blw['commercial_without_bill'])}.")
    if blw["restaurants"]:
        L.append("Most-used (7 days): " + ", ".join(f"{x['name']} {x['count']}" for x in blw["restaurants"][:5]) + ".")

    # Demand
    d = w["demand"]
    L.append("\n## What visitors are looking for (7 days)")
    if bw["places"]:
        L.append("Budget Search places: " + ", ".join(f"{x['item']} {x['count']}" for x in bw["places"][:6]) + ".")
    if bw["searches"]:
        L.append(f"Budgets: median £{round(bw['budget_per_person_gbp']['median'] or 0)} a head ({dict_words(bw['budget_per_person_gbp']['bands'])}); "
                 f"party size median {bw['people']['median']}; stars {dict_words(bw['stars'])}; meal {dict_words(bw['meal'])}; wine {dict_words(bw['wine'])}.")
    if d["search_box_restaurants"]:
        L.append("Restaurants searched for by name: " + ", ".join(f"{x['item']} {x['count']}" for x in d["search_box_restaurants"][:6]) + ".")
    if d["search_box_places"]:
        L.append("Places searched for: " + ", ".join(f"{x['item']} {x['count']}" for x in d["search_box_places"][:6]) + ".")
    if d["restaurant_views"]:
        L.append("Most-viewed restaurant pages: " + ", ".join(f"{link('/restaurants/' + x['id'] + '/', x['name'])} {x['count']}" for x in d["restaurant_views"][:6]) + ".")
    if d["destination_views"]:
        L.append("Most-viewed destinations: " + ", ".join(f"{x['item']} {x['count']}" for x in d["destination_views"][:6]) + ".")
    if d["filters"]:
        L.append("Filters used: " + ", ".join(f"{x['item']} {x['count']}" for x in d["filters"][:6]) + ".")
    for g in bw["no_result_searches"][:3]:
        L.append(f"- No results: {g['count']} × {g['where']}, {g['stars'] if g['stars'] != '0' else 'any'}★, {g['meal']}, {g['budget']} for {g['people']}.")

    # Traffic
    L.append("\n## Traffic")
    L.append("| | Yesterday | Day before | Same day last week |\n|---|---|---|---|")
    for k, name in (("visitors", "Visitors"), ("visits", "Visits"), ("pageviews", "Page views")):
        L.append(f"| {name} (raw) | {raw[k]} | {db['traffic']['raw'][k]} | {sw['traffic']['raw'][k] if sw else '–'} |")
    L.append(f"| Visitors (likely human) | {hum['visitors']} | {db['traffic']['human']['visitors']} | {sw['traffic']['human']['visitors'] if sw else '–'} |")
    ch = t["channels_human"]
    L.append("Where visits came from (likely human): " + ", ".join(f"{k} {ch[k]}" for k in CHANNELS if ch.get(k)) + ".")
    L.append("Entry pages: " + ", ".join(f"{link(x['item'])} {x['count']}" for x in t["entry_pages"][:5]) + ". "
             "Exit pages: " + ", ".join(f"{link(x['item'])} {x['count']}" for x in t["exit_pages"][:3]) + ".")
    L.append(f"Devices: {dict_words(t['devices'])}. Countries: " + ", ".join(f"{x['item']} {x['count']}" for x in t["countries"][:5]) + ".")

    # SEO
    sc = (figures or {}).get("sources", {}).get("search_console", {})
    g = rep.get("gsc") or {}
    L.append("\n## SEO")
    if sc.get("status") == "ok":
        tw, wb = sc["this_week"], sc["week_before"]
        L.append(f"Google, {sc['period']}: {tw['clicks']} clicks ({fmt_change(tw['clicks'], wb['clicks'])}), {tw['impressions']} impressions "
                 f"({fmt_change(tw['impressions'], wb['impressions'])}), click-through {tw['ctr_percent']}%, average position {tw['position']}.")
    if t["google_landing_pages"]:
        L.append("Google visitors landed on (yesterday): " + ", ".join(f"{link(x['item'])} {x['count']}" for x in t["google_landing_pages"][:5]) + ".")
    if g.get("page_gainers"):
        L.append("Gaining impressions: " + ", ".join(f"{link(x['item'])} {x['before']}→{x['impressions']}" for x in g["page_gainers"][:3]) + ".")
    if g.get("page_losers"):
        L.append("Losing: " + ", ".join(f"{link(x['item'])} {x['before']}→{x['impressions']}" for x in g["page_losers"][:3]) + ".")
    if g.get("new_pages_with_clicks"):
        L.append("New pages getting Google clicks: " + ", ".join(link(x["item"]) for x in g["new_pages_with_clicks"][:5]) + ".")
    p2 = (figures or {}).get("sources", {}).get("page_two", {})
    if p2.get("searches"):
        L.append("Close to page one: " + "; ".join(f"\"{x.get('search')}\" (position {x.get('position')}, {link(x.get('page'))})"
                                                   for x in p2["searches"][:3]) + ".")
    p1 = (figures or {}).get("sources", {}).get("page_one", {})
    if p1.get("no_clicks"):
        L.append("Shown often but not clicked (title or description to look at): " + "; ".join(
            f"\"{x.get('search')}\" ({x.get('impressions')} impressions, {link(x.get('page'))})" for x in p1["no_clicks"][:3]) + ".")

    # Data health
    h = rep["data_health"]
    L.append("\n## Data health")
    for meal in ("dinner", "lunch"):
        x = h[meal]
        L.append(f"{meal.capitalize()} prices ({x['priced']}): genuinely checked {x['checked_yesterday']} yesterday, {x['checked_30_days']} in 30 days, "
                 f"{x['checked_90_days']} in 90 days; never checked {x['never_checked']} ({x['recorded_last_30_days_never_checked']} of them recorded in the "
                 f"last 30 days, which doesn't count as a check). Sources: {source_words(x['by_source'])}" + (f"; {x['derived']} worked out by us" if x["derived"] else "") + ".")
    L.append(f"Missing: dinner price {h['missing']['dinner_price']}, lunch unknown {h['missing']['lunch_unknown']}, "
             f"a separate booking link {h['missing']['booking_link']} (most book through their website), website {h['missing']['website']}. "
             f"Exchange rates: {h['exchange_rates']['date']}" + (" (stale)" if h["exchange_rates"]["stale"] else "") + ".")
    u = rep.get("umami_usage") or {}
    if u.get("month_to_date"):
        L.append(f"Umami usage (page views + clicks + their stored details): {u['month_to_date']['total']:,} this month so far, "
                 f"{u['last_7_days']['total']:,} in the last 7 days; on course for about {u['projected_month']:,} this month, "
                 f"{u['projected_percent']}% of the free plan's {u['limit']:,} (a full month at last week's pace: about {u['full_month_at_weekly_pace']:,})" + (" — **getting close: look at it this week**" if u["warn"] else "") + ".")
    pc = h["price_changes"]
    if pc.get("big_moves"):
        L.append("Price moves of a third or more since yesterday: " + ", ".join(f"{x['name']} {x['field']} {x['was']}→{x['now']}" for x in pc["big_moves"][:5]) + ".")
    if h["possible_duplicates"]:
        L.append(f"Possible duplicate restaurants: {len(h['possible_duplicates'])} (" + "; ".join(", ".join(x) for x in h["possible_duplicates"][:3]) + ").")
    lc = rep.get("link_check") or rep.get("link_check_latest")
    if lc:
        L.append(f"Link check ({lc.get('date')}, {lc.get('checked')} links of the most-used restaurants): {len(lc.get('broken') or [])} broken, "
                 f"{lc.get('couldnt_check')} couldn't be checked (sites that turn robots away)." +
                 (" Possible closures (website gone): " + ", ".join(lc["suspected_closures"]) + "." if lc.get("suspected_closures") else ""))
        for x in (lc.get("broken") or [])[:5]:
            L.append(f"- {x['name']}: {x['field']} {x['verdict']} ({x['url']})")
    L.append("\n**Prices to verify next**")
    for x in rep["prices_to_verify"][:(10 if weekly else 5)]:
        L.append(f"- {link('/restaurants/' + x['id'] + '/', x['name'])} ({'★' * (x['stars'] or 0)}, {x['city']}): {x['evidence']}. "
                 f"Price: {x['status']}. Check at: {x['source'] or 'no source yet'}")

    # Affiliate opportunities
    a = m["affiliate"]
    L.append("\n## Affiliate opportunities (28 days)")
    L.append(f"Paid clicks: {a['paid_clicks']}. Unpaid partner clicks: {dict_words(a['unpaid_partner_clicks']) or 'none'}. "
             f"Booking platforms: {dict_words(a['booking_platform_clicks']) or 'none'}. Restaurants' own sites: {a['restaurant_site_clicks']}. "
             f"Hotels {a['hotel_clicks']}, tours {a['tour_clicks']}. No revenue is estimated until there are real commission figures.")
    if a["booking_platform_restaurants"]:
        L.append("Restaurants sending most booking-platform clicks: " + ", ".join(f"{x['name']} {x['count']}" for x in a["booking_platform_restaurants"][:5]) + ".")

    # Anomalies
    if rep["anomalies"]:
        L.append("\n## Unusual yesterday")
        for x in rep["anomalies"]:
            if "page" in x:
                L.append(f"- {x['what']}: {link(x['page'])}, {x['yesterday']} views" + (f" (usually about {x['usual']} a day)" if "usual" in x else ""))
            elif x["what"] == "server error spike":
                L.append(f"- Server errors: {x['count']} at {x['hour']}" + (f", after the push \"{x['push']}\"" if x.get("push") else ""))
            else:
                L.append(f"- {x['what']}: {x['yesterday']} (usually about {x['usual']}; same day last week {x['same_day_last_week']})")

    if weekly:
        L.append(render_weekly(rep, site))

    L.append("\n## Action candidates (the routine picks only the ones the evidence supports)")
    for x in rep["actions"]:
        L.append(f"- [{x['strength']}] {x['action']}: {x['evidence']}")
    return "\n".join(L) + "\n"


SLOT = {"best": "Best match", "value": "Best value", "stretch": "Stretch", "wild": "Also worth a look", "lunch-tip": "Lunch tip", "more": "More matches"}
MEALS = {"value": "either", "lunch": "lunch", "dinner": "dinner", "weekend": "lunch + dinner"}


def source_words(d):
    return ", ".join(f"{SOURCE_WORDS.get(k, k)} {v}" for k, v in sorted((d or {}).items(), key=lambda kv: -kv[1]))


def dict_words(d):
    d = {MEALS.get(k, k) if isinstance(k, str) else k: v for k, v in (d or {}).items() if k not in (None, "")}
    return ", ".join(f"{k} {v}" for k, v in sorted(d.items(), key=lambda kv: -kv[1])) or "–"


def render_weekly(rep, site):
    w, w0, m = rep["last_7_days"], rep["prev_7_days"], rep["last_28_days"]
    m0 = rep.get("prev_28_days")
    L = ["\n## This week (last 7 days against the 7 before, and the last 28 days)"]
    L.append("| | Last 7 days | 7 before | Change | Last 28 days |\n|---|---|---|---|---|")

    def line(name, f):
        a, b, c = f(w), f(w0), f(m)
        L.append(f"| {name} | {a} | {b} | {fmt_change(a, b)} | {c} |")
    line("Visitors (raw)", lambda x: x["traffic"]["raw"]["visitors"])
    line("Visitors (likely human)", lambda x: x["traffic"]["human"]["visitors"])
    line("Page views (raw)", lambda x: x["traffic"]["raw"]["pageviews"])
    line("Google search visits", lambda x: x["traffic"]["channels_human"].get("Google search", 0))
    line("Other search visits", lambda x: x["traffic"]["channels_human"].get("Other search", 0))
    line("AI assistant visits", lambda x: x["traffic"]["channels_human"].get("AI assistants", 0))
    line("Restaurant page views", lambda x: x["bill"]["restaurant_pageviews"])
    line("Budget Searches", lambda x: x["budget_search"]["searches"])
    line("Bill calculator uses", lambda x: x["bill"]["uses"])
    line("Commercial clicks", lambda x: x["commercial"]["commercial_clicks"])
    line("Restaurants' own sites", lambda x: x["commercial"]["restaurant_site_clicks"])
    L.append("\n**Phase 1 funnel, rates** (7 days | 28 days):")
    for k, name in (("opened_a_result", "Searches that opened a result"), ("reached_restaurant_page", "…that reached a restaurant page"),
                    ("used_bill", "Restaurant pages from a search where the bill was used"), ("commercial_click", "Searches ending in a commercial click")):
        L.append(f"- {name}: {fmt_rate(w['funnel']['rates'][k])} | {fmt_rate(m['funnel']['rates'][k])}")
    L.append(f"- Homepage visitors who searched: {fmt_rate(w['budget_search']['homepage_visits_that_searched'])} | {fmt_rate(m['budget_search']['homepage_visits_that_searched'])}")
    L.append(f"- Commercial click after the bill vs without: {fmt_rate(m['bill']['commercial_after_bill'])} vs {fmt_rate(m['bill']['commercial_without_bill'])} (28 days)")
    if m["funnel"]["paths"]:
        L.append("\nCommonest paths (28 days, grouped): " + "; ".join(f"{x['item']} ({x['count']})" for x in m["funnel"]["paths"][:5]) + ".")
    g = rep.get("gsc") or {}
    if g.get("by_kind"):
        L.append("\nGoogle by kind of page (impressions, week before → this week): " + ", ".join(
            f"{k} {v['before']}→{v['impressions']}" for k, v in sorted(g["by_kind"].items(), key=lambda kv: -kv[1]["impressions"])[:6]) + ".")
    if g.get("query_gainers"):
        L.append("Searches gaining impressions: " + "; ".join(f"\"{x['item']}\" {x['before']}→{x['impressions']} (position {x['position']})" for x in g["query_gainers"][:5]) + ".")
    if g.get("query_losers"):
        L.append("Searches losing: " + "; ".join(f"\"{x['item']}\" {x['before']}→{x['impressions']}" for x in g["query_losers"][:3]) + ".")
    if not m0:
        L.append("\n28 days against the 28 before: not yet, as Umami's records start on 4 Oct 2026 (first full comparison from 29 Nov).")
    else:
        L.append(f"\n28 days against the 28 before{' (the earlier one starts 4 Oct, when Umami began, so it is shorter)' if m0.get('partial') else ''}: "
                 f"visitors {m['traffic']['raw']['visitors']} vs {m0['traffic']['raw']['visitors']}, commercial clicks {m['commercial']['commercial_clicks']} vs "
                 f"{m0['commercial']['commercial_clicks']}, restaurant page views {m['bill']['restaurant_pageviews']} vs {m0['bill']['restaurant_pageviews']}.")
    return "\n".join(L)


def backfill():
    """daily.csv rows for every day Umami still holds (from 4 Oct 2026), so the history starts at the beginning.
    Search Console and price-check columns stay blank for those days."""
    cfg = load_json(mf.CONFIG, {}) or {}
    site = Site()
    today = dt.date.today()
    rows, base, auth = umami_events(cfg, UMAMI_FROM, local_midnight(today))
    visits = build_visits(rows, event_details(rows, base, auth))
    (HISTORY).mkdir(parents=True, exist_ok=True)
    d = UMAMI_FROM.date()
    while d < today:
        a, b = max(UMAMI_FROM, local_midnight(d)), local_midnight(d + dt.timedelta(days=1))
        upsert_csv(HISTORY / "daily.csv", row_of(str(d), summarise(site, visits, a, b), {}))
        d += dt.timedelta(days=1)
    print(f"daily.csv: {UMAMI_FROM.date()} to {today - dt.timedelta(days=1)}")


# ---------- the Phase 1 baseline ----------
def baseline():
    cfg = load_json(mf.CONFIG, {}) or {}
    site = Site()
    rows, base, auth = umami_events(cfg, UMAMI_FROM, PHASE1_LIVE)
    details = event_details(rows, base, auth)
    visits = build_visits(rows, details)
    w = summarise(site, visits, UMAMI_FROM, PHASE1_LIVE)
    days = w["days"]
    umami_stats = mf.http(f"{base}/stats?{urllib.parse.urlencode({'startAt': int(UMAMI_FROM.timestamp() * 1000), 'endAt': int(PHASE1_LIVE.timestamp() * 1000) - 1})}",
                          headers=auth, method="GET")
    umami_stats.pop("comparison", None)
    try:
        url, gauth, _, _ = mf.gsc_query(cfg)
        r = mf.http(url, {"startDate": "2026-10-04", "endDate": "2026-10-26"}, gauth).get("rows", [{}])[0]
        gsc = {"period": "2026-10-04 to 2026-10-26", "clicks": r.get("clicks"), "impressions": r.get("impressions"),
               "ctr_percent": round(100 * r.get("ctr", 0), 2), "position": round(r.get("position", 0), 1)}
    except Exception as e:
        gsc = {"error": str(e)[:200]}
    fig = load_json(mf.RESEARCH / "figures" / "2026-10-27.json", {})
    seo = fig.get("seo_measures")
    t, b, c, a = w["traffic"], w["budget_search"], w["commercial"], w["affiliate"]
    per_day = lambda n: round(n / days, 1)
    ch_raw, ch_h = t["channels_raw"], t["channels_human"]
    out = {
        "name": "Phase 1 baseline (official)", "period": {"from": UMAMI_FROM.isoformat(), "to": PHASE1_LIVE.isoformat(), "days": days},
        "note": "Umami's records start on 4 Oct 2026. Phase 1 reached the live site with commit 2e225d9c at 14:20 UTC on 27 Oct 2026.",
        "umami_official": {k: umami_stats.get(k) for k in ("visitors", "visits", "pageviews", "bounces", "totaltime")},
        "traffic": {"raw": t["raw"], "human": t["human"], "per_day_raw": {k: per_day(v) for k, v in t["raw"].items()},
                    "per_day_human": {k: per_day(v) for k, v in t["human"].items()},
                    "channels_raw": ch_raw, "channels_human": ch_h, "robot_signals": t["robot_signals"],
                    "devices": t["devices"], "countries": t["countries"], "entry_pages": t["entry_pages"]},
        "pages": {"restaurant_pageviews": t["page_kinds"].get("restaurant", 0),
                  "restaurant_share_of_pageviews_percent": pct(t["page_kinds"].get("restaurant", 0), t["human"]["pageviews"]),
                  "homepage_pageviews": t["page_kinds"].get("home", 0), "pick_pageviews": t["page_kinds"].get("budget-search", 0),
                  "by_kind_human": t["page_kinds"], "by_kind_raw": t["page_kinds_raw"]},
        "help_me_pick": {"result_screens": b["old_pick_results"], "steps": b["old_pick_steps"],
                         "visits_reaching_results": sum(1 for v in visits if not v["robot"] and in_window(v, UMAMI_FROM, PHASE1_LIVE)
                                                        and any(n == "pick-result" for _, n, _, _ in v["clicks"])),
                         "result_volumes": result_volumes(visits),
                         "budget_search_after_preview": b["searches"]},
        "outbound": {"by_kind": c["by_kind"], "estimated_booking_platform_clicks": sum(a["booking_platform_clicks"].values()),
                     "booking_platforms": a["booking_platform_clicks"], "restaurant_site_clicks": a["restaurant_site_clicks"],
                     "partner_clicks_since_26_oct": a["hotel_clicks"] + a["tour_clicks"],
                     "per_100_restaurant_pageviews": pct(sum(a["booking_platform_clicks"].values()), t["page_kinds"].get("restaurant", 0))},
        "google_search_console": gsc, "seo_measures_on_launch_day": seo,
        "not_comparable": {
            "bill_calculator": "No pre-launch figure: the bill calculator went live with Phase 1.",
            "best_match_best_value_stretch_clicks": "No pre-launch figure: result clicks (pick-click) were first counted with Phase 1.",
            "budget_search_answers": "Before Phase 1 Help me pick counted each question's answer (pick-step) and its result screens (pick-result, with the number of matches); the table-total budget, party size and source of Phase 1's budget-search have no earlier equivalent.",
            "booking_vs_website_split": "Before Phase 1 restaurants' booking and website buttons were counted together as 'other' links; booking-platform clicks are estimated from the address clicked (Resy, Tock, OpenTable…), so a booking made on a restaurant's own site is in neither figure.",
            "partner_clicks": "The Booking.com, Viator and GetYourGuide buttons went live at 22:40 UTC on 26 Oct 2026, under a day before Phase 1: too short for a baseline.",
            "likely_human": "The likely-human split is our own reconstruction (see visit_report.py is_robot()); the raw figures are Umami's own.",
        },
    }
    d = HISTORY / "baseline"
    d.mkdir(parents=True, exist_ok=True)
    (d / "phase-1-before.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
    (d / "phase-1-before.md").write_text(baseline_md(out))
    print(baseline_md(out))


def result_volumes(visits):
    xs = [as_int(d.get("matches")) for v in visits if not v["robot"] and in_window(v, UMAMI_FROM, PHASE1_LIVE)
          for _, n, _, d in v["clicks"] if n == "pick-result" and as_int(d.get("matches")) is not None]
    return {"median_matches": median(xs), "zero": sum(1 for x in xs if x == 0), "one_or_two": sum(1 for x in xs if 1 <= x <= 2),
            "three_or_more": sum(1 for x in xs if x >= 3)}


def baseline_md(o):
    t, p, h, ob = o["traffic"], o["pages"], o["help_me_pick"], o["outbound"]
    ch = lambda d: ", ".join(f"{k} {d.get(k, 0)}" for k in CHANNELS if d.get(k))
    L = [f"# Phase 1 baseline (official)", "",
         f"Period: 4 Oct 2026 (Umami's first day) to 27 Oct 2026 14:20 UTC, when Phase 1 went live: {o['period']['days']} days.", "",
         "| Measure | Whole period | Per day |", "|---|---|---|",
         f"| Visitors (Umami's own count) | {o['umami_official']['visitors']} | {round(o['umami_official']['visitors'] / o['period']['days'], 1)} |",
         f"| Visits (Umami) | {o['umami_official']['visits']} | {round(o['umami_official']['visits'] / o['period']['days'], 1)} |",
         f"| Page views (Umami) | {o['umami_official']['pageviews']} | {round(o['umami_official']['pageviews'] / o['period']['days'], 1)} |",
         f"| Visitors, likely human | {t['human']['visitors']} | {t['per_day_human']['visitors']} |",
         f"| Visits, likely human | {t['human']['visits']} | {t['per_day_human']['visits']} |",
         f"| Restaurant page views (human) | {p['restaurant_pageviews']} ({p['restaurant_share_of_pageviews_percent']}% of page views) | {round(p['restaurant_pageviews'] / o['period']['days'], 1)} |",
         f"| Homepage views (human) | {p['homepage_pageviews']} | {round(p['homepage_pageviews'] / o['period']['days'], 1)} |",
         f"| Help me pick page views (human) | {p['pick_pageviews']} | {round(p['pick_pageviews'] / o['period']['days'], 1)} |",
         f"| Help me pick result screens | {h['result_screens']} (in {h['visits_reaching_results']} visits) | {round(h['result_screens'] / o['period']['days'], 1)} |",
         f"| Booking-platform clicks (estimated from the address) | {ob['estimated_booking_platform_clicks']} | {round(ob['estimated_booking_platform_clicks'] / o['period']['days'], 2)} |",
         f"| Restaurants' own site clicks (estimated) | {ob['restaurant_site_clicks']} | |", "",
         f"Traffic sources (visits, raw): {ch(t['channels_raw'])}.", f"Traffic sources (visits, likely human): {ch(t['channels_human'])}.", "",
         f"Help me pick result volumes: median {h['result_volumes']['median_matches']} matches; {h['result_volumes']['zero']} screens with none, "
         f"{h['result_volumes']['one_or_two']} with one or two. Steps answered: {dict_words(h['steps'])}.", "",
         f"Booking platforms clicked: {dict_words(ob['booking_platforms']) or 'none'}. Links out by kind: {dict_words(ob['by_kind'])}.", "",
         f"Google (Search Console, {o['google_search_console'].get('period', '')}): {o['google_search_console'].get('clicks')} clicks, "
         f"{o['google_search_console'].get('impressions')} impressions, average position {o['google_search_console'].get('position')}.", "",
         "## No pre-launch comparison", ""]
    L += [f"- {v}" for v in o["not_comparable"].values()]
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["baseline"]:
        baseline()
    elif args[:1] == ["backfill"]:
        backfill()
    elif args[:1] == ["daily"] and len(args) >= 2:
        daily(args[1], weekly="--weekly" in args, links="--links" in args, keep="--try" not in args)
    else:
        print(__doc__)
        sys.exit(1)
