#!/usr/bin/env python3
"""Yesterday's visitor figures for starredbill.com, used by the "Starred Bill · Morning figures" routine.

    python3 scripts/morning_figures.py OUT.json [PREVIOUS.json]

Reads three sources and writes their figures to OUT.json (printing them too). With PREVIOUS.json, the
report can say what changed. A source that isn't set up yet is reported as "not set up" and skipped.

  - Google Search Console (clicks, impressions, average position, top searches and pages, each with the
    countries it shows in and, from the Ahrefs snapshot of 7 Oct 2026, its monthly search volume; search
    countries and devices). Its figures run two to three days behind, so it reports the last 7 days it has,
    against the 7 before.
  - Google's index: which of the key pages in index-pages.txt (beside config.json) Google has indexed, from
    Search Console's URL Inspection, and which became indexed since the previous day.
  - The site's whole sitemap: how many of its pages Google has indexed (URL Inspection, a few hundred a day,
    oldest-checked first, results kept in index-cache.json beside config.json).
  - The SEO plan's 20 target searches (seo-targets.txt beside config.json): each one's Google position over the
    latest week, in its main market, and which of our pages ranks for it.
  - Searches on page one of Google: where we average position 1–10 over the latest week (with 5+ impressions),
    how many, how many in the top three, which are new or dropped off, and which are shown often but never clicked.
  - Searches on page two of Google: where a page of ours averages position 8–20 over the last 28 days, with the
    page's live title, description and heading and the search words they lack, so they can be tuned.
  - Sites linking to us, from Bing Webmaster Tools (Search Console's Links report has no API). Needs the Bing
    Webmaster API key in the Keychain as "starredbill-bing".
  - Cloudflare (every request, robots included, so never a visitor count): pages Googlebot, Bingbot and the
    other search crawlers fetched, which AI crawlers (OAI-SearchBot, ChatGPT-User, Applebot, GPTBot, ClaudeBot…)
    read the site and its most-read pages, all as verified by Cloudflare, whether robots.txt or Cloudflare turns
    any away, the most-hit missing addresses (404) and server errors (5xx) by hour with the push before any spike;
    the last 7 UTC days against the 7 before. Needs a read-only API token in the Keychain as "starredbill-cloudflare".
  - The SEO plan's seven measures against their aims for 31 Jan 2027 (SEO_AIMS), put together from the above.
  - Google Analytics 4 (visitors, sessions, page views, top pages and countries, sign-ups). It only counts
    visitors who accepted the cookie banner. Google settles a day's bounce and engagement rates a day or two
    later, so yesterday's are left out (engagementPending) until then; the day before's are settled.
  - Umami (every visit, no cookies: visitors, page views, bounce rate, time per visit, the last 7 days, top and
    entry pages, referrers, countries, devices, click events).

Settings live in ~/starred-bill-research/figures/config.json (nothing secret in it):
  {"gsc_site": "sc-domain:starredbill.com", "ga4_property": "123456789",
   "umami_website": "0717d470-...", "google_key": "~/starred-bill-research/keys/google-service-account.json"}
Google is read as the owner, through a one-time sign-in (scripts/google_signin.py: a "Desktop app" OAuth
client at "google_oauth", its refresh token in the Keychain as "starredbill-google"), because Google blocks
service account keys on this project. A service account key at "google_key" still works if one exists; its
JWT is signed with the Mac's own openssl, so no extra libraries are needed. Umami is read
through the website's share link ("umami_share": the code after /share/, sharing Overview and Events), as
Umami's free plan has no API keys; with a paid plan, an API key in the Keychain ("starredbill-umami") works too.
Where there's no Keychain (the cloud routines), environment variables stand in for the Keychain items (KEYCHAIN_ENV:
STARREDBILL_GOOGLE_REFRESH_TOKEN, STARREDBILL_BING_KEY, STARREDBILL_UMAMI_KEY, STARREDBILL_CLOUDFLARE_TOKEN), STARREDBILL_GOOGLE_CLIENT_ID and
STARREDBILL_GOOGLE_CLIENT_SECRET for the Desktop client file, and STARREDBILL_RESEARCH for ~/starred-bill-research
(the cloud routines point it at their checkout of the private records repository).
Standard library only, Python 3.9.
"""
import base64
import datetime as dt
import threading
import xml.etree.ElementTree as ET
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RESEARCH = Path(os.environ.get("STARREDBILL_RESEARCH") or Path.home() / "starred-bill-research").expanduser()
CONFIG = RESEARCH / "figures" / "config.json"
SITE = "https://starredbill.com"
# The SEO plan's aims for 31 Jan 2027 (https://claude.ai/code/artifact/8ee24d0c-b566-4b4b-bead-f87d25a46122).
# Raised 23 Oct 2026 (owner's request) once the first aims were passed (400 pages indexed, 10,000 weekly impressions);
# weekly clicks, searches on page one and (owner's request) searches in the top three were added then, and the
# targets grew from 20 to 24 (aim 10 → 12).
SEO_AIMS = {"by": "2027-01-31", "pages_indexed": 2000, "weekly_impressions": 30000, "weekly_clicks": 600,
            "searches_on_page_one": 150, "searches_in_top_three": 20, "linking_sites": 20, "targets_on_page_one": 12}
INDEX_BUDGET = 300   # sitemap pages re-inspected a day, besides the key pages (Google allows 2,000 a day)
# Monthly search volumes come from the Ahrefs snapshot of 7 Oct 2026 (the subscription has ended; Search Console
# gives no volumes). Searches it doesn't hold have no volume.
AHREFS = RESEARCH / "ahrefs" / "2026-10-07"
# Search Console's 3-letter country codes: the 2-letter code Ahrefs uses, and the name for the report.
COUNTRIES = {
    "usa": ("us", "United States"), "gbr": ("gb", "United Kingdom"), "can": ("ca", "Canada"), "aus": ("au", "Australia"),
    "irl": ("ie", "Ireland"), "ind": ("in", "India"), "sgp": ("sg", "Singapore"), "hkg": ("hk", "Hong Kong"),
    "twn": ("tw", "Taiwan"), "jpn": ("jp", "Japan"), "kor": ("kr", "South Korea"), "chn": ("cn", "China"),
    "tha": ("th", "Thailand"), "vnm": ("vn", "Vietnam"), "mys": ("my", "Malaysia"), "phl": ("ph", "Philippines"),
    "idn": ("id", "Indonesia"), "are": ("ae", "UAE"), "qat": ("qa", "Qatar"), "sau": ("sa", "Saudi Arabia"),
    "tur": ("tr", "Türkiye"), "fra": ("fr", "France"), "deu": ("de", "Germany"), "ita": ("it", "Italy"),
    "esp": ("es", "Spain"), "prt": ("pt", "Portugal"), "nld": ("nl", "Netherlands"), "bel": ("be", "Belgium"),
    "lux": ("lu", "Luxembourg"), "che": ("ch", "Switzerland"), "aut": ("at", "Austria"), "dnk": ("dk", "Denmark"),
    "swe": ("se", "Sweden"), "nor": ("no", "Norway"), "fin": ("fi", "Finland"), "isl": ("is", "Iceland"),
    "pol": ("pl", "Poland"), "cze": ("cz", "Czechia"), "hun": ("hu", "Hungary"), "grc": ("gr", "Greece"),
    "hrv": ("hr", "Croatia"), "svn": ("si", "Slovenia"), "srb": ("rs", "Serbia"), "rou": ("ro", "Romania"),
    "ltu": ("lt", "Lithuania"), "lva": ("lv", "Latvia"), "est": ("ee", "Estonia"), "mlt": ("mt", "Malta"),
    "and": ("ad", "Andorra"), "mex": ("mx", "Mexico"), "bra": ("br", "Brazil"), "arg": ("ar", "Argentina"),
    "col": ("co", "Colombia"), "chl": ("cl", "Chile"), "per": ("pe", "Peru"), "zaf": ("za", "South Africa"),
    "nzl": ("nz", "New Zealand"), "isr": ("il", "Israel"), "egy": ("eg", "Egypt"), "nga": ("ng", "Nigeria"),
    "ken": ("ke", "Kenya"), "pak": ("pk", "Pakistan"), "bgd": ("bd", "Bangladesh"), "ukr": ("ua", "Ukraine"),
    "rus": ("ru", "Russia"), "mac": ("mo", "Macau"),
}


def country_name(code):
    return COUNTRIES.get((code or "").lower(), (None, (code or "").upper()))[1]


_VOLUMES = None


def volumes():
    """{search: {"markets": {2-letter market: monthly searches}, "global": worldwide}} from the Ahrefs snapshot."""
    global _VOLUMES
    if _VOLUMES is not None:
        return _VOLUMES
    import csv
    _VOLUMES = {}

    def add(q, market, vol, glob):
        e = _VOLUMES.setdefault(q.strip().lower(), {"markets": {}, "global": 0})
        if market and vol not in (None, ""):
            e["markets"][market] = max(e["markets"].get(market, 0), int(float(vol)))
        if glob not in (None, ""):
            e["global"] = max(e["global"], int(float(glob)))

    try:
        with open(AHREFS / "keywords.csv", newline="") as f:
            for r in csv.DictReader(f):
                add(r["keyword"], r["market"], r["volume"], r["global_volume"])
        with open(AHREFS / "destinations.csv", newline="") as f:
            for r in csv.DictReader(f):
                add(r["keyword"], "us", r["volume_us"], r["global_volume"])
        with open(AHREFS / "restaurant-names.csv", newline="") as f:
            for r in csv.DictReader(f):
                if r.get("ambiguous") != "check":
                    add(r["name"], "us", r["volume_us"], r["global_volume"])
    except OSError:
        pass
    return _VOLUMES


def volume_of(search, country=None):
    """Monthly searches for a search: in the given country (Search Console's 3-letter code) where the snapshot
    has it, and worldwide."""
    e = volumes().get(search.strip().lower())
    if not e:
        return {"in_country": None, "worldwide": None}
    market = COUNTRIES.get((country or "").lower(), (None,))[0]
    return {"in_country": e["markets"].get(market) if market else None, "worldwide": e["global"] or None}


def http(url, data=None, headers=None, method=None):
    body = None if data is None else (data if isinstance(data, bytes) else json.dumps(data).encode())
    req = urllib.request.Request(url, data=body, headers=dict({"Content-Type": "application/json"}, **(headers or {})), method=method)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode() or "{}")


def b64(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


# The environment variable that stands in for each Keychain item where there's no Keychain (the cloud routines).
KEYCHAIN_ENV = {"starredbill-google": "STARREDBILL_GOOGLE_REFRESH_TOKEN", "starredbill-bing": "STARREDBILL_BING_KEY",
                "starredbill-umami": "STARREDBILL_UMAMI_KEY", "starredbill-cloudflare": "STARREDBILL_CLOUDFLARE_TOKEN"}


def keychain(service):
    """A key from its environment variable (KEYCHAIN_ENV), or else from the Mac's Keychain."""
    if os.environ.get(KEYCHAIN_ENV.get(service, "")):
        return os.environ[KEYCHAIN_ENV[service]].strip()
    try:
        return subprocess.run(["security", "find-generic-password", "-s", service, "-w"],
                              capture_output=True, text=True).stdout.strip()
    except OSError:     # no Keychain (not a Mac)
        return ""


def oauth_client(cfg):
    """The Desktop OAuth client's id and secret: from STARREDBILL_GOOGLE_CLIENT_ID/_SECRET, else the client file at
    "google_oauth"; None if neither."""
    env = {"client_id": os.environ.get("STARREDBILL_GOOGLE_CLIENT_ID", "").strip(),
           "client_secret": os.environ.get("STARREDBILL_GOOGLE_CLIENT_SECRET", "").strip()}
    if env["client_id"] and env["client_secret"]:
        return env
    oauth = cfg.get("google_oauth")
    if not (oauth and Path(os.path.expanduser(oauth)).exists()):
        return None
    client = json.loads(Path(os.path.expanduser(oauth)).read_text())
    return client.get("installed") or client.get("web") or client


def google_ready(cfg):
    """True if either Google sign-in is set up: a service account key, or the owner's own sign-in."""
    if cfg.get("google_key") and Path(os.path.expanduser(cfg["google_key"])).exists():
        return True
    return bool(oauth_client(cfg) and keychain("starredbill-google"))


def google_token(cfg, scope):
    """An access token: from the owner's own sign-in (scripts/google_signin.py, refresh token in the Keychain)
    when set up, else from a service account key, its JWT signed with openssl (no third-party libraries)."""
    client = oauth_client(cfg)
    refresh = keychain("starredbill-google") if client else ""
    if refresh:
        form = urllib.parse.urlencode({"grant_type": "refresh_token", "refresh_token": refresh,
                                       "client_id": client["client_id"], "client_secret": client["client_secret"]}).encode()
        req = urllib.request.Request("https://oauth2.googleapis.com/token", data=form,
                                     headers={"Content-Type": "application/x-www-form-urlencoded"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())["access_token"]
    key = json.loads(Path(os.path.expanduser(cfg["google_key"])).read_text())
    now = int(time.time())
    head = b64(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    claims = b64(json.dumps({"iss": key["client_email"], "scope": scope, "aud": "https://oauth2.googleapis.com/token",
                             "iat": now, "exp": now + 3000}).encode())
    with tempfile.NamedTemporaryFile("w", delete=False) as f:
        os.chmod(f.name, 0o600)
        f.write(key["private_key"])
    try:
        sig = subprocess.run(["openssl", "dgst", "-sha256", "-sign", f.name], input=f"{head}.{claims}".encode(),
                             capture_output=True, check=True).stdout
    finally:
        os.unlink(f.name)
    form = urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                                   "assertion": f"{head}.{claims}.{b64(sig)}"}).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=form,
                                 headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())["access_token"]


def gsc_query(cfg):
    """Search Console's search figures: the query address, its sign-in header, the latest 7 days it has (it runs
    a few days behind) and the 7 before."""
    token = google_token(cfg, "https://www.googleapis.com/auth/webmasters.readonly")
    site = urllib.parse.quote(cfg.get("gsc_site", "sc-domain:starredbill.com"), safe="")
    url = f"https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query"
    end = dt.date.today() - dt.timedelta(days=3)
    week = (str(end - dt.timedelta(days=6)), str(end))
    prev = (str(end - dt.timedelta(days=13)), str(end - dt.timedelta(days=7)))
    return url, {"Authorization": f"Bearer {token}"}, week, prev


def search_console(cfg):
    url, auth, week, prev = gsc_query(cfg)

    def totals(rng):
        rows = http(url, {"startDate": rng[0], "endDate": rng[1]}, auth).get("rows", [])
        r = rows[0] if rows else {}
        return {"clicks": r.get("clicks", 0), "impressions": r.get("impressions", 0),
                "ctr_percent": round(r.get("ctr", 0) * 100, 1), "position": round(r.get("position", 0), 1)}

    def rows(dims, limit=25000, rng=week):
        return http(url, {"startDate": rng[0], "endDate": rng[1], "dimensions": dims, "rowLimit": limit},
                    auth).get("rows", [])

    def row(r):
        return {"clicks": r["clicks"], "impressions": r["impressions"], "position": round(r["position"], 1)}

    # Each search and page split by country, so the report can say where it shows and at what position.
    qc, pc, qp = {}, {}, {}
    for r in rows(["query", "country"]):
        qc.setdefault(r["keys"][0], []).append(dict(country=country_name(r["keys"][1]), code=r["keys"][1], **row(r)))
    for r in rows(["page", "country"]):
        pc.setdefault(r["keys"][0], []).append(dict(country=country_name(r["keys"][1]), code=r["keys"][1], **row(r)))
    for r in rows(["query", "page"]):
        qp.setdefault(r["keys"][1], []).append(dict(search=r["keys"][0], **row(r)))
        qp.setdefault(("q", r["keys"][0]), []).append(dict(page=r["keys"][1].replace(SITE, "") or "/", **row(r)))
    by = lambda xs: sorted(xs, key=lambda x: (-x["impressions"], -x["clicks"]))

    def top(dim, limit=10):
        out = []
        for r in sorted(rows([dim], 1000), key=lambda r: (-r["clicks"], -r["impressions"]))[:limit]:
            key = r["keys"][0]
            item = dict(item=key, **row(r))
            if dim == "query":
                where = by(qc.get(key, []))[:3]
                item["countries"] = where
                item["page"] = (by(qp.get(("q", key), [])) or [{}])[0].get("page")
                item["volume"] = volume_of(key, where[0]["code"] if where else None)
            else:
                item["page"] = key.replace(SITE, "") or "/"
                item["countries"] = by(pc.get(key, []))[:3]
                main = item["countries"][0]["code"] if item["countries"] else None
                item["searches"] = [dict(s, volume=volume_of(s["search"], main)) for s in by(qp.get(key, []))[:3]]
            out.append(item)
        return out

    countries = [dict(country=country_name(r["keys"][0]), **row(r))
                 for r in sorted(rows(["country"], 250), key=lambda r: -r["impressions"])[:10]]
    devices = [dict(device=r["keys"][0].lower(), **row(r)) for r in rows(["device"], 10)]
    return {"period": f"{week[0]} to {week[1]}", "this_week": totals(week), "week_before": totals(prev),
            "searches_with_impressions": len(qc), "pages_with_impressions": len(pc),
            "top_searches": top("query", 15), "top_pages": top("page", 10), "countries": countries, "devices": devices}


class Throttle:
    """Spaces out requests shared between threads: URL Inspection allows 600 a minute."""
    def __init__(self, per_second):
        self.gap, self.next, self.lock = 1 / per_second, 0.0, threading.Lock()

    def wait(self):
        with self.lock:
            now = time.monotonic()
            start = max(self.next, now)
            self.next = start + self.gap
            delay = start - now
        if delay > 0:
            time.sleep(delay)


def inspector(cfg):
    """A function that asks Search Console's URL Inspection whether Google has indexed one of our addresses."""
    token = google_token(cfg, "https://www.googleapis.com/auth/webmasters.readonly")
    site = cfg.get("gsc_site", "sc-domain:starredbill.com")
    auth = {"Authorization": f"Bearer {token}"}
    throttle = Throttle(8)

    def inspect(path):
        for attempt in range(3):
            throttle.wait()
            try:
                r = http("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
                         {"inspectionUrl": SITE + path, "siteUrl": site}, auth)
                ix = r.get("inspectionResult", {}).get("indexStatusResult", {})
                return {"coverage": ix.get("coverageState", ""), "indexed": ix.get("verdict") == "PASS",
                        "last_crawled": ix.get("lastCrawlTime")}
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 2:
                    time.sleep(30)
                    continue
                return {"coverage": "check failed", "indexed": None, "error": f"HTTP {e.code}"}
            except Exception as e:
                return {"coverage": "check failed", "indexed": None, "error": str(e)[:120]}
    return inspect


def index_status(cfg, prev=None):
    """Whether Google has indexed each page in index-pages.txt (beside config.json, "name|/path/" per line),
    from Search Console's URL Inspection (2,000 a day allowed; about 120 pages take under a minute here).
    With the previous day's file, lists the pages that became indexed since."""
    pages_file = CONFIG.parent / "index-pages.txt"
    pages = [l.strip().split("|", 1) for l in pages_file.read_text().splitlines() if "|" in l and not l.startswith("#")]
    check = inspector(cfg)

    def inspect(page):
        name, path = page
        return path, dict(name=name, **check(path))

    with ThreadPoolExecutor(max_workers=8) as pool:
        result = dict(pool.map(inspect, pages))
    before = {}
    if prev and Path(prev).exists():
        before = json.loads(Path(prev).read_text()).get("sources", {}).get("index", {}).get("pages", {})
    newly = [v["name"] for p, v in result.items() if v["indexed"] and before and not before.get(p, {}).get("indexed")]
    dropped = [v["name"] for p, v in result.items() if v["indexed"] is False and before.get(p, {}).get("indexed")]
    counts = {}
    for v in result.values():
        counts[v["coverage"]] = counts.get(v["coverage"], 0) + 1
    return {"checked": len(result), "indexed": sum(1 for v in result.values() if v["indexed"]),
            "by_status": counts, "newly_indexed": newly, "dropped_out": dropped, "pages": result}


def site_index(cfg, key_pages=None):
    """How many of the pages in the live sitemap Google has indexed. Checks the pages never checked or checked
    longest ago, INDEX_BUDGET a day (all of them the first time), and keeps every page's latest answer in
    index-cache.json beside config.json, so the count covers the whole sitemap within two or three days.
    Today's key-page results (from index_status) go into the cache without being asked for again."""
    # Cloudflare turns away Python's own User-Agent (error 1010).
    req = urllib.request.Request(SITE + "/sitemap.xml", headers={"User-Agent": "Mozilla/5.0 (Macintosh) starredbill-morning-figures"})
    with urllib.request.urlopen(req, timeout=40) as r:
        root = ET.fromstring(r.read())
    ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    paths = [loc.text.strip()[len(SITE):] for loc in root.iter(ns + "loc") if loc.text.strip().startswith(SITE)]
    cache_file = CONFIG.parent / "index-cache.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    today = str(dt.date.today())
    for path, v in (key_pages or {}).items():
        if v.get("indexed") is not None:
            cache[path] = {"coverage": v["coverage"], "indexed": v["indexed"], "checked": today}
    due = sorted((p for p in paths if cache.get(p, {}).get("checked") != today),
                 key=lambda p: cache.get(p, {}).get("checked", ""))
    if any(p in cache for p in paths):
        due = due[:int(cfg.get("index_budget", INDEX_BUDGET))]
    check, failed = inspector(cfg), []
    # Each answer takes Google a few seconds, so ask 16 at a time (the throttle keeps it under 600 a minute).
    with ThreadPoolExecutor(max_workers=16) as pool:
        for path, v in zip(due, pool.map(check, due)):
            if v["indexed"] is None:
                failed.append(v.get("error"))
            else:
                cache[path] = {"coverage": v["coverage"], "indexed": v["indexed"], "checked": today}
    cache = {p: cache[p] for p in paths if p in cache}   # forget pages no longer in the sitemap
    cache_file.write_text(json.dumps(cache, indent=0, sort_keys=True))
    counts = {}
    for v in cache.values():
        counts[v["coverage"]] = counts.get(v["coverage"], 0) + 1
    return {"sitemap_pages": len(paths), "known": len(cache), "indexed": sum(1 for v in cache.values() if v["indexed"]),
            "checked_today": sum(1 for v in cache.values() if v["checked"] == today),
            "oldest_check": min((v["checked"] for v in cache.values()), default=None), "by_status": counts,
            "checks_failed": len(failed), "failure_reasons": sorted(set(e for e in failed if e))[:5]}


def seo_targets(cfg):
    """The SEO plan's target searches (seo-targets.txt beside config.json: "search|market|/page/" per line,
    market a 3-letter country code or "all"): each one's average Google position over the latest week in its
    main market (worldwide if it had no impressions there), and which of our pages Google showed most."""
    lines = (CONFIG.parent / "seo-targets.txt").read_text().splitlines()
    targets = [l.strip().split("|") for l in lines if l.strip() and not l.startswith("#")]
    url, auth, week, _ = gsc_query(cfg)
    words = [t[0].lower() for t in targets]
    only = [{"filters": [{"dimension": "query", "operator": "includingRegex",
                          "expression": "^(" + "|".join(w.replace(" ", "\\s") for w in words) + ")$"}]}]

    def rows(dims):
        body = {"startDate": week[0], "endDate": week[1], "dimensions": dims, "rowLimit": 25000,
                "dimensionFilterGroups": only}
        return http(url, body, auth).get("rows", [])

    world = {r["keys"][0]: r for r in rows(["query"])}
    by_country = {(r["keys"][0], r["keys"][1]): r for r in rows(["query", "country"])}
    pages = {}
    for r in rows(["query", "page"]):
        q, page = r["keys"]
        if r["impressions"] > pages.get(q, {}).get("impressions", 0):
            pages[q] = {"impressions": r["impressions"], "page": page.replace(SITE, "") or "/"}
    out = []
    for search, market, page in targets:
        q = search.lower()
        r, where = (by_country.get((q, market)), market) if market != "all" else (None, "all")
        if not r:
            r, where = world.get(q), "all"
        pos = round(r["position"], 1) if r else None
        out.append({"search": search, "market": market, "page": page, "position": pos, "measured_in": where if r else None,
                    "impressions": r["impressions"] if r else 0, "clicks": r["clicks"] if r else 0,
                    "page_one": bool(pos and pos <= 10), "ranking_page": pages.get(q, {}).get("page"),
                    "volume": volume_of(search, market if market != "all" else "usa"),
                    "countries": sorted([{"country": country_name(c), "impressions": v["impressions"],
                                          "position": round(v["position"], 1)}
                                         for (qq, c), v in by_country.items() if qq == q],
                                        key=lambda x: -x["impressions"])[:3]})
    return {"period": f"{week[0]} to {week[1]}", "targets": len(out), "showing": sum(1 for t in out if t["position"]),
            "on_page_one": sum(1 for t in out if t["page_one"]), "searches": out}


PAGE_ONE_MIN = 5     # impressions a week before a search counts as "on page one" (fewer is mostly noise)
PAGE_ONE_MAX = 20    # page-one searches listed in full, most impressions first
NO_CLICKS_MIN = 20   # page-one searches with this many impressions and no clicks: a title or description to tune


def page_one(cfg, prev=None):
    """Searches where we average position 1–10 worldwide over the latest week, with PAGE_ONE_MIN or more
    impressions: how many (and in the top three), the week before's count, the biggest listed with their page,
    countries and monthly searches, which are new on page one or dropped off since the previous file, and those
    shown often but never clicked."""
    url, auth, week, prev_week = gsc_query(cfg)

    def rows(dims, rng=week):
        return http(url, {"startDate": rng[0], "endDate": rng[1], "dimensions": dims, "rowLimit": 25000},
                    auth).get("rows", [])

    def on(rng):
        return [r for r in rows(["query"], rng) if r["position"] <= 10 and r["impressions"] >= PAGE_ONE_MIN]

    now = sorted(on(week), key=lambda r: (-r["impressions"], r["position"]))
    names = {r["keys"][0] for r in now}
    pages, where = {}, {}
    for r in rows(["query", "page"]):
        q = r["keys"][0]
        if q in names and r["impressions"] > pages.get(q, {}).get("impressions", 0):
            pages[q] = {"impressions": r["impressions"], "page": urllib.parse.urlparse(r["keys"][1]).path or "/"}
    for r in rows(["query", "country"]):
        if r["keys"][0] in names:
            where.setdefault(r["keys"][0], []).append({"country": country_name(r["keys"][1]), "code": r["keys"][1],
                                                       "impressions": r["impressions"],
                                                       "position": round(r["position"], 1)})
    found = []
    for r in now:
        q = r["keys"][0]
        countries = sorted(where.get(q, []), key=lambda x: -x["impressions"])[:3]
        found.append({"search": q, "position": round(r["position"], 1), "impressions": r["impressions"],
                      "clicks": r["clicks"], "page": pages.get(q, {}).get("page"), "countries": countries,
                      "volume": volume_of(q, countries[0]["code"] if countries else None)})
    before = None
    if prev and Path(prev).exists():
        before = json.loads(Path(prev).read_text()).get("sources", {}).get("page_one", {}).get("all")
    page_rows = [r for r in rows(["page"]) if r["position"] <= 10 and r["impressions"] >= PAGE_ONE_MIN]
    return {"period": f"{week[0]} to {week[1]}", "min_impressions": PAGE_ONE_MIN,
            "on_page_one": len(found), "top_three": sum(1 for f in found if f["position"] <= 3),
            "week_before": len(on(prev_week)), "pages_on_page_one": len(page_rows),
            "clicks_from_page_one": sum(f["clicks"] for f in found),
            "searches": found[:PAGE_ONE_MAX],
            "top_three_searches": [f for f in found if f["position"] <= 3],
            "new": [f for f in found if before is not None and f["search"] not in before],
            "dropped_off": sorted(set(before or []) - names),
            "no_clicks": [f for f in found if f["impressions"] >= NO_CLICKS_MIN and not f["clicks"]],
            "all": sorted(names)}


PAGE_TWO = (8, 20)   # average positions counted as "page two": just off page one, the quickest wins
PAGE_TWO_DAYS = 28
PAGE_TWO_MAX = 25
FILLER = {"a", "an", "and", "the", "in", "of", "for", "to", "with", "near", "me", "best", "top", "at", "on", "by"}


def page_words(path):
    """The live page's title, search description and main heading, as Google reads them."""
    req = urllib.request.Request(SITE + path, headers={"User-Agent": "StarredBillFigures/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        html = r.read().decode("utf-8", "replace")

    def first(pattern):
        m = re.search(pattern, html, re.S | re.I)
        if not m:
            return ""
        text = re.sub(r"<[^>]+>", " ", m.group(1))
        text = " ".join(text.replace("&amp;", "&").replace("&#39;", "'").replace("&quot;", '"').split())
        return re.sub(r"\s+([,.:;!?])", r"\1", text)

    return {"title": first(r"<title>(.*?)</title>"),
            "description": first(r'<meta name="description" content="([^"]*)"'),
            "heading": first(r"<h1[^>]*>(.*?)</h1>")}


def missing_words(search, text):
    """The search's words (filler words aside) that the text doesn't contain, allowing plurals."""
    have = text.lower()
    return [w for w in search.lower().split() if w not in FILLER and w.rstrip("s") not in have]


def page_two(cfg, prev=None):
    """Searches where one of our pages sits at average position 8–20 over the last 28 days (PAGE_TWO), most
    impressions first, with the page's live title, description and heading and the search words each lacks,
    so the title can be tuned to the search. Addresses with ?lang= are counted under the page itself (their
    canonical)."""
    url, auth, week, _ = gsc_query(cfg)
    end = dt.date.fromisoformat(week[1])
    start = end - dt.timedelta(days=PAGE_TWO_DAYS - 1)
    rows = http(url, {"startDate": str(start), "endDate": str(end), "dimensions": ["query", "page"],
                      "rowLimit": 25000}, auth).get("rows", [])
    found = []
    for r in rows:
        if PAGE_TWO[0] <= r["position"] <= PAGE_TWO[1]:
            q, page = r["keys"]
            path = urllib.parse.urlparse(page).path or "/"
            found.append({"search": q, "page": path, "position": round(r["position"], 1),
                          "impressions": r["impressions"], "clicks": r["clicks"]})
    found.sort(key=lambda f: (-f["impressions"], f["position"]))
    found = found[:PAGE_TWO_MAX]
    # Where each one shows: its position country by country.
    split = {}
    for r in http(url, {"startDate": str(start), "endDate": str(end), "dimensions": ["query", "page", "country"],
                        "rowLimit": 25000}, auth).get("rows", []):
        q, page, c = r["keys"]
        split.setdefault((q, urllib.parse.urlparse(page).path or "/"), []).append(
            {"country": country_name(c), "code": c, "impressions": r["impressions"], "position": round(r["position"], 1)})
    for f in found:
        where = sorted(split.get((f["search"], f["page"]), []), key=lambda x: -x["impressions"])[:3]
        f["countries"] = where
        f["volume"] = volume_of(f["search"], where[0]["code"] if where else None)
    words = {}
    for f in found:
        if f["page"] not in words:
            try:
                words[f["page"]] = page_words(f["page"])
            except Exception as e:
                words[f["page"]] = {"error": str(e)[:100]}
        w = words[f["page"]]
        f.update(w)
        if "title" in w:
            f["missing_from_title"] = missing_words(f["search"], w["title"])
            f["missing_from_heading"] = missing_words(f["search"], w["heading"])
    before = []
    if prev and Path(prev).exists():
        before = json.loads(Path(prev).read_text()).get("sources", {}).get("page_two", {}).get("searches", [])
    seen = {(b["search"], b["page"]) for b in before}
    for f in found:
        f["new"] = bool(prev) and (f["search"], f["page"]) not in seen
    return {"period": f"{start} to {end}", "searches_with_impressions": len(rows), "on_page_two": len(found),
            "searches": found}


def bing_links(cfg, prev=None):
    """Sites linking to us, from Bing Webmaster Tools: every page of ours Bing knows links to, then the
    addresses linking to each, counted by site. Search Console's Links report has no API, so Bing stands in;
    its counts are usually close. Needs the API key (Bing Webmaster › Settings › API access) in the Keychain
    as "starredbill-bing"."""
    key = keychain("starredbill-bing")
    site = cfg.get("bing_site", SITE + "/")
    base = "https://ssl.bing.com/webmaster/api.svc/json/"  # the pox/ (XML) address answers 404 since Oct 2026

    def call(method, **q):
        q.update(siteUrl=site, apikey=key)
        with urllib.request.urlopen(f"{base}{method}?{urllib.parse.urlencode(q)}", timeout=40) as r:
            return json.loads(r.read().decode()).get("d") or {}

    def paged(method, items, field, **q):
        found, page, total = [], 0, 1
        while page < min(total, 20):
            res = call(method, page=page, **q)
            found += [(e.get(field) or "") for e in res.get(items) or []]
            total = int(res.get("TotalPages") or 0)
            page += 1
        return found

    ours = paged("GetLinkCounts", "Links", "Url")
    sites = {}
    for target in ours:
        for source in paged("GetUrlLinks", "Details", "Url", link=target):
            host = urllib.parse.urlparse(source).hostname or ""
            host = host[4:] if host.startswith("www.") else host
            if host and not host.endswith(("starredbill.com", "starred-bill.pages.dev", "sbarnard310.github.io")):
                sites.setdefault(host, set()).add(target.replace(SITE, "") or "/")
    before = []
    if prev and Path(prev).exists():
        before = json.loads(Path(prev).read_text()).get("sources", {}).get("links", {}).get("sites", [])
    return {"linking_sites": len(sites), "pages_linked_to": len(ours),
            "sites": sorted(sites), "new_sites": sorted(set(sites) - set(before)) if before else [],
            "by_site": {h: sorted(p) for h, p in sorted(sites.items())}}


def seo_measures(sources):
    """The SEO plan's measures, today's figure against the aim for SEO_AIMS["by"] (None where its source
    isn't working yet)."""
    def ok(name):
        src = sources.get(name, {})
        return src if src.get("status") == "ok" else {}

    now = {"pages_indexed": ok("site_index").get("indexed"),
           "weekly_impressions": ok("search_console").get("this_week", {}).get("impressions"),
           "weekly_clicks": ok("search_console").get("this_week", {}).get("clicks"),
           "searches_on_page_one": ok("page_one").get("on_page_one"),
           "searches_in_top_three": ok("page_one").get("top_three"),
           "linking_sites": ok("links").get("linking_sites"),
           "targets_on_page_one": ok("targets").get("on_page_one")}
    return {k: {"now": v, "aim": SEO_AIMS[k]} for k, v in now.items()} | {"aim_date": SEO_AIMS["by"]}


def analytics(cfg):
    token = google_token(cfg, "https://www.googleapis.com/auth/analytics.readonly")
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{cfg['ga4_property']}:runReport"
    auth = {"Authorization": f"Bearer {token}"}
    # bounceRate and engagementRate are shares (0.4 = 40%); averageSessionDuration and userEngagementDuration are
    # in seconds. averageSessionDuration runs from a session's first event to its last, so a tab left open makes it
    # long; engagement time per session (the time the page was actually on screen) is the one to quote.
    metrics = [{"name": m} for m in ("activeUsers", "newUsers", "sessions", "screenPageViews", "bounceRate",
                                     "engagementRate", "averageSessionDuration", "engagedSessions",
                                     "userEngagementDuration")]
    fractional = {"bounceRate", "engagementRate", "averageSessionDuration"}

    def report(body):
        return http(url, body, auth).get("rows", [])

    def value(name, raw):
        return round(float(raw), 3) if name in fractional else int(float(raw))

    def day(rng):
        rows = report({"dateRanges": [{"startDate": rng, "endDate": rng}], "metrics": metrics})
        vals = rows[0]["metricValues"] if rows else []
        out = {m["name"]: value(m["name"], v["value"]) for m, v in zip(metrics, vals)} if vals else {m["name"]: 0 for m in metrics}
        out["engagementSecondsPerSession"] = round(out["userEngagementDuration"] / out["sessions"]) if out["sessions"] else None
        # Google works out which sessions were "engaged" a day or two later, so a recent day reads 0 engaged sessions
        # (100% bounce) although its engagement time is in. Those rates aren't finished: leave them out, not wrong.
        out["engagementPending"] = bool(out["sessions"] and not out["engagedSessions"] and out["userEngagementDuration"])
        if out["engagementPending"]:
            out["bounceRate"] = out["engagementRate"] = None
        return out

    def top(dim, metric="screenPageViews", start="yesterday", limit=8):
        rows = report({"dateRanges": [{"startDate": start, "endDate": "yesterday"}], "dimensions": [{"name": dim}],
                       "metrics": [{"name": metric}], "limit": limit,
                       "orderBys": [{"metric": {"metricName": metric}, "desc": True}]})
        return [{"item": r["dimensionValues"][0]["value"], metric: int(float(r["metricValues"][0]["value"]))} for r in rows]

    return {"yesterday": day("yesterday"), "day_before": day("2daysAgo"),
            "top_pages_yesterday": top("pagePath"), "top_countries_yesterday": top("country", "activeUsers"),
            "events_last_7_days": top("eventName", "eventCount", "7daysAgo", 25)}


# Crawlers counted from Cloudflare. Cloudflare checks which requests really come from a known crawler (by its
# addresses, not just the name it gives) and sorts them into kinds (verifiedBotCategory: "Search Engine Crawler",
# "AI Crawler", "AI Search", "AI Assistant", "Search Engine Optimization", "Page Preview"…), on the free plan too.
# Only those verified requests are counted; requests that only claim a crawler's name are counted apart as impostors.
# Known crawlers by name (name, a piece of its user agent, whose it is, what it reads for):
CF_SEARCH = [("Googlebot", "Googlebot", "Google", "Google search"),
             ("Bingbot", "bingbot", "Microsoft", "Bing search, also behind ChatGPT search, Copilot and DuckDuckGo"),
             ("YandexBot", "YandexBot", "Yandex", "Yandex search"), ("DuckDuckBot", "DuckDuckBot", "DuckDuckGo", "DuckDuckGo search"),
             ("Baiduspider", "Baiduspider", "Baidu", "Baidu search"), ("SeznamBot", "SeznamBot", "Seznam", "Seznam search"),
             ("Yeti", "Yeti/", "Naver", "Naver search")]
CF_AI = [("GPTBot", "GPTBot", "OpenAI", "training"), ("OAI-SearchBot", "OAI-SearchBot", "OpenAI", "ChatGPT search"),
         ("ChatGPT-User", "ChatGPT-User", "OpenAI", "a ChatGPT user asking about a page"),
         ("ClaudeBot", "ClaudeBot", "Anthropic", "training"), ("Claude-SearchBot", "Claude-SearchBot", "Anthropic", "Claude search"),
         ("Claude-User", "Claude-User", "Anthropic", "a Claude user asking about a page"),
         ("PerplexityBot", "PerplexityBot", "Perplexity", "Perplexity search"),
         ("Perplexity-User", "Perplexity-User", "Perplexity", "a Perplexity user asking about a page"),
         ("Applebot", "Applebot", "Apple", "Siri, Spotlight and Apple Intelligence"),
         ("Meta-ExternalAgent", "meta-externalagent", "Meta", "training"),
         ("Meta-ExternalFetcher", "meta-externalfetcher", "Meta", "a Meta AI user asking about a page"),
         ("Amazonbot", "Amazonbot", "Amazon", "Alexa and Rufus answers"),
         ("DuckAssistBot", "DuckAssistBot", "DuckDuckGo", "DuckDuckGo's AI answers"),
         ("MistralAI-User", "MistralAI-User", "Mistral", "a Le Chat user asking about a page"),
         ("Google-CloudVertexBot", "Google-CloudVertexBot", "Google", "AI agents built on Google Cloud"),
         ("Bytespider", "Bytespider", "ByteDance", "training"), ("CCBot", "CCBot", "Common Crawl", "an open archive many AIs train on"),
         ("PetalBot", "PetalBot", "Huawei", "Petal search and its AI"), ("ExaSearchBot", "ExaSearchBot", "Exa", "an AI search engine"),
         ("cohere-ai", "cohere-ai", "Cohere", "training"), ("Diffbot", "Diffbot", "Diffbot", "training data for others")]
CF_KNOWN = CF_SEARCH + CF_AI
# Names that exist only in robots.txt, never as a crawler: Google and Apple crawl with Googlebot and Applebot, and these
# say whether what they read may also train their AI. Only robots.txt can show them.
CF_ROBOTS_ONLY = [("Google-Extended", "Google", "Gemini training"), ("Applebot-Extended", "Apple", "Apple Intelligence training")]
CF_CLAIMED = ["Googlebot", "bingbot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Applebot"]
CF_ZONE = "2c9a4e0f1d3a1d8f76019ae477f3d286"   # starredbill.com's zone id (not secret); "cloudflare_zone" in config.json wins
CF_DAYS = 14          # two weeks of UTC days, a query each: this week and the week before
CF_TOP = 5            # top pages listed per crawler
CF_SEARCH_LIST = 8    # search crawlers listed (Googlebot and Bingbot always)
CF_404_TOP = 15       # most-hit missing addresses listed
CF_SPIKE = 20         # 5xx answers in one hour that count as a spike
CF_ROWS = 10000       # most rows one query returns (the free plan's maxPageSize)
CF_LET_THROUGH = {"", "unknown", "allow", "skip", "log"}   # securityAction values that didn't stop the request
# Addresses robots try on every site, looking for a weakness (WordPress, PHP, keys and settings files, hidden
# folders): counted, not listed. Cloudflare's own /cdn-cgi/ addresses are left out too.
CF_PROBE = re.compile(r"(\.php|phpinfo|_profiler|wp-|wordpress|xmlrpc|\.asp|\.jsp|cgi-bin|phpmyadmin|/admin|\.sql|\.bak|"
                      r"\.zip|\.tar|\.gz$|\.ya?ml$|\.ini$|\.conf$|\.log$|credentials|secret|appsettings|aws-exports|"
                      r"^/config\.|^/env\.|^/settings\.|/\.(?!well-known/security\.txt)|^/cdn-cgi/|\.env$|dockerfile|composer\.|"
                      r"service-account|^/auth\.json|^/debug/|^/azure/|^/bedrock/)", re.I)


def is_page(path):
    """A page rather than a script, style, picture or data file."""
    path = path.split("?")[0]
    last = path.rstrip("/").rsplit("/", 1)[-1]
    return not path.startswith(("/assets/", "/data/", "/img/", "/icons/", "/og/", "/cdn-cgi/")) and \
        (path.endswith("/") or path.endswith(".html") or "." not in last)


def bot_name(ua):
    """A crawler's short name from its user agent: a known one, else the name it gives itself, else None."""
    ua = ua or ""
    for name, piece, _, _ in CF_KNOWN:
        if piece in ua:
            return name
    if ua.startswith("Mozilla/"):
        m = re.search(r"compatible; ?([A-Za-z][\w.\-]*)", ua)
    else:                       # "facebookexternalhit/1.1 (…)"
        m = re.match(r"([A-Za-z][\w.\-]*)/", ua)
    if not m:
        m = re.search(r"\b([A-Za-z][\w\-]*(?:bot|Bot|BOT|crawler|Crawler|spider|Spider|fetcher|Fetcher))\b", ua)
    return m.group(1) if m else None


def cloudflare(cfg, prev=None):
    """Crawlers, AI crawlers and errors for the last 14 UTC days, from Cloudflare's GraphQL Analytics API (free
    plan: the httpRequestsAdaptiveGroups dataset, 31 days kept, one day a query here). Needs a read-only API token
    (Zone Analytics: Read) in the Keychain as "starredbill-cloudflare" (STARREDBILL_CLOUDFLARE_TOKEN in the cloud).
    Cloudflare counts every request, robots included, so its totals are not a visitor count. Its counts
    come from a sample of requests, so small ones are rough."""
    token = keychain("starredbill-cloudflare")
    zone = cfg.get("cloudflare_zone") or CF_ZONE
    auth = {"Authorization": f"Bearer {token}"}
    claimed = ", ".join("{userAgent_like: %s}" % json.dumps(f"%{c}%") for c in CF_CLAIMED)
    query = """{ viewer { zones(filter: {zoneTag: %(zone)s}) {
      all: httpRequestsAdaptiveGroups(limit: 1, filter: {%(when)s}) { count }
      bots: httpRequestsAdaptiveGroups(limit: %(rows)d, orderBy: [count_DESC], filter: {%(when)s, verifiedBotCategory_neq: ""})
        { count dimensions { verifiedBotCategory userAgent clientRequestPath edgeResponseStatus securityAction } }
      fake: httpRequestsAdaptiveGroups(limit: 100, orderBy: [count_DESC], filter: {%(when)s, verifiedBotCategory: "", OR: [%(claimed)s]})
        { count dimensions { userAgent } }
      missing: httpRequestsAdaptiveGroups(limit: 1000, orderBy: [count_DESC], filter: {%(when)s, edgeResponseStatus: 404})
        { count dimensions { clientRequestPath } }
      errors: httpRequestsAdaptiveGroups(limit: 1000, orderBy: [count_DESC], filter: {%(when)s, edgeResponseStatus_geq: 500})
        { count dimensions { datetimeHour edgeResponseStatus clientRequestPath } }
    } } }"""

    def day_figures(day):
        # Real requests only: Cloudflare's own (its Early Hints cache asks for pages and logs thousands of 504s) left out.
        when = (f'datetime_geq: "{day}T00:00:00Z", datetime_lt: "{day + dt.timedelta(days=1)}T00:00:00Z", '
                f'requestSource: "eyeball"')
        res = http("https://api.cloudflare.com/client/v4/graphql",
                   {"query": query % {"zone": json.dumps(zone), "when": when, "rows": CF_ROWS, "claimed": claimed}}, auth)
        if res.get("errors"):
            raise RuntimeError("; ".join(e.get("message", "") for e in res["errors"])[:300])
        return res["data"]["viewer"]["zones"][0]

    yesterday = dt.date.today() - dt.timedelta(days=1)
    days = [yesterday - dt.timedelta(days=i) for i in range(CF_DAYS)]
    figures, unavailable = {}, []
    with ThreadPoolExecutor(4) as pool:
        for day, res in zip(days, pool.map(lambda d: _try(day_figures, d), days)):
            if isinstance(res, Exception):
                if day == yesterday:
                    raise res
                unavailable.append(str(day))
            else:
                figures[day] = res
    week_of = {d: ("week" if d > yesterday - dt.timedelta(days=7) else "before") for d in figures}
    info = {n: (c, p) for n, _, c, p in CF_KNOWN}
    ai_names = {n for n, _, _, _ in CF_AI}

    def blank():
        return {"requests": 0, "pages": 0, "paths": {}, "restaurant_pages": set(), "stopped": 0, "not_found": 0}

    # Every verified crawler's requests, pages and answers, by week, and each kind's totals.
    seen, kinds, kind_of = {}, {}, {}
    for day, res in figures.items():
        w = week_of[day]
        for g in res["bots"]:
            d, n = g["dimensions"], g["count"]
            kind = d["verifiedBotCategory"] or "Other"
            name = bot_name(d["userAgent"]) or f"Unnamed ({kind})"
            kind_of.setdefault(name, kind)
            kinds.setdefault(kind, {"week": 0, "before": 0})[w] += n
            s = seen.setdefault(name, {"week": blank(), "before": blank()})[w]
            s["requests"] += n
            if (d.get("securityAction") or "") not in CF_LET_THROUGH or d["edgeResponseStatus"] in (403, 429):
                s["stopped"] += n
            if d["edgeResponseStatus"] == 404:
                s["not_found"] += n
            path = d["clientRequestPath"]
            if is_page(path) and d["edgeResponseStatus"] < 400:
                s["pages"] += n
                s["paths"][path] = s["paths"].get(path, 0) + n
                if path.startswith("/restaurants/"):
                    s["restaurant_pages"].add(path)
    capped = sorted(str(d) for d, res in figures.items() if len(res["bots"]) >= CF_ROWS)

    def crawler(name):
        s = seen.get(name) or {}
        company, purpose = info.get(name, (None, None))
        out = {"name": name, "company": company, "for": purpose, "cloudflare_kind": kind_of.get(name)}
        for w in ("week", "before"):
            x = s.get(w) or blank()
            out[w] = {"requests": x["requests"], "pages": x["pages"], "different_pages": len(x["paths"]),
                      "restaurant_pages": len(x["restaurant_pages"]), "stopped": x["stopped"], "not_found": x["not_found"]}
        top = sorted((s.get("week") or blank())["paths"].items(), key=lambda kv: -kv[1])[:CF_TOP]
        out["top_pages"] = [{"page": p, "fetches": n} for p, n in top]
        return out

    def busiest(names):
        return sorted(names, key=lambda n: -(seen[n]["week"]["requests"] + seen[n]["before"]["requests"] / 1000))

    ai = busiest([n for n in seen if n in ai_names or (kind_of.get(n) or "").startswith("AI")])
    search = busiest([n for n in seen if kind_of.get(n) == "Search Engine Crawler" and n not in ai])
    search = ["Googlebot", "Bingbot"] + [n for n in search if n not in ("Googlebot", "Bingbot")][:CF_SEARCH_LIST - 2]

    # Requests that give a known crawler's name but don't come from it.
    fakes = {"week": {}, "before": {}}
    for day, res in figures.items():
        for g in res["fake"]:
            name = bot_name(g["dimensions"]["userAgent"]) or "other"
            fakes[week_of[day]][name] = fakes[week_of[day]].get(name, 0) + g["count"]

    # robots.txt: which crawlers it turns away (Cloudflare's "Block AI bots" and managed robots.txt write to it too).
    robots = {}
    try:
        req = urllib.request.Request(SITE + "/robots.txt", headers={"User-Agent": "Mozilla/5.0 starredbill-morning-figures"})
        with urllib.request.urlopen(req, timeout=30) as r:
            text = r.read().decode("utf-8", "replace")
        groups, cur = [], None
        for line in text.splitlines():
            key, _, val = line.split("#")[0].partition(":")
            key, val = key.strip().lower(), val.strip()
            if key == "user-agent":
                if cur is None or cur[1]:      # a rule ended the last group's list of names
                    cur = ([], [])
                    groups.append(cur)
                cur[0].append(val.lower())
            elif key in ("disallow", "allow") and cur is not None:
                cur[1].append((key, val))
        for name in [n for n, _, _, _ in CF_KNOWN] + [n for n, _, _ in CF_ROBOTS_ONLY]:
            rules = next((g[1] for g in groups if name.lower() in g[0]), None)
            if rules is None:
                rules = next((g[1] for g in groups if "*" in g[0]), [])
            robots[name] = "blocked" if ("disallow", "/") in rules else "allowed"
    except Exception as e:
        robots = {"error": str(e)[:200]}

    # Missing addresses (404), apart from robots' probes, with how many of the hits were verified crawlers.
    missing = {"week": {}, "before": {}}
    for day, res in figures.items():
        for g in res["missing"]:
            p = g["dimensions"]["clientRequestPath"]
            missing[week_of[day]][p] = missing[week_of[day]].get(p, 0) + g["count"]
    by_crawlers = {}
    for day, res in figures.items():
        if week_of[day] == "week":
            for g in res["bots"]:
                if g["dimensions"]["edgeResponseStatus"] == 404:
                    p = g["dimensions"]["clientRequestPath"]
                    by_crawlers[p] = by_crawlers.get(p, 0) + g["count"]

    def total(d, probes):
        return sum(n for p, n in d.items() if bool(CF_PROBE.search(p)) == probes)

    # Missing pages are the ones worth fixing (a broken link or an old address); missing files are mostly icons
    # browsers ask for by habit, plus probes the pattern doesn't know.
    top404 = sorted(((p, n) for p, n in missing["week"].items() if not CF_PROBE.search(p)), key=lambda kv: -kv[1])
    not_found = {"week": total(missing["week"], False), "before": total(missing["before"], False),
                 "probes_week": total(missing["week"], True), "probes_before": total(missing["before"], True),
                 "top_pages": [{"path": p, "hits": n, "from_crawlers": by_crawlers.get(p, 0)}
                               for p, n in top404 if is_page(p)][:CF_404_TOP],
                 "top_files": [{"path": p, "hits": n, "from_crawlers": by_crawlers.get(p, 0)}
                               for p, n in top404 if not is_page(p)][:5]}

    # Server errors (5xx) by hour, with the last push to main before any spike.
    hours, codes = {}, {"week": {}, "before": {}}
    for day, res in figures.items():
        for g in res["errors"]:
            h, code = g["dimensions"]["datetimeHour"], str(g["dimensions"]["edgeResponseStatus"])
            hours[h] = hours.get(h, 0) + g["count"]
            codes[week_of[day]][code] = codes[week_of[day]].get(code, 0) + g["count"]
    pushes = []
    try:
        repo = Path(__file__).resolve().parent.parent
        log = subprocess.run(["git", "-C", str(repo), "log", "origin/main", "--first-parent", f"--since={days[-1]}",
                              "--format=%ct %h %s"], capture_output=True, text=True, timeout=30).stdout
        pushes = [(int(t), h, s) for t, h, s in (line.split(" ", 2) for line in log.splitlines() if line.count(" ") >= 2)]
    except Exception:
        pass
    spikes = []
    for h, n in sorted(hours.items()):
        if n < CF_SPIKE:
            continue
        start = dt.datetime.strptime(h, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc).timestamp()
        near = [p for p in pushes if start - 7200 <= p[0] < start + 3600]
        spikes.append({"hour": h, "errors": n,
                       "push": {"commit": near[-1][1], "subject": near[-1][2][:100]} if near else None})
    error_paths = {}
    for day, res in figures.items():
        if week_of[day] == "week":
            for g in res["errors"]:
                p = g["dimensions"]["clientRequestPath"]
                error_paths[p] = error_paths.get(p, 0) + g["count"]
    errors = {"week": sum(codes["week"].values()), "before": sum(codes["before"].values()), "codes_week": codes["week"],
              "spikes": spikes[-10:],
              "top_paths_week": [{"path": p, "errors": n} for p, n in sorted(error_paths.items(), key=lambda kv: -kv[1])[:5]]}

    def requests(w):
        return sum(r["all"][0]["count"] for d, r in figures.items() if week_of[d] == w and r["all"])

    return {"period": f"{days[6]} to {yesterday}", "before_period": f"{days[-1]} to {days[7]}",
            "days_unavailable": sorted(unavailable), "days_capped": capped,
            "all_requests": {"week": requests("week"), "before": requests("before")},
            "by_kind": [dict(kind=k, **v) for k, v in sorted(kinds.items(), key=lambda kv: -kv[1]["week"])],
            "search_crawlers": [crawler(n) for n in search], "ai_crawlers": [crawler(n) for n in ai],
            "ai_not_seen": [n for n, _, _, _ in CF_AI if n not in seen],
            "impostors": {w: dict(sorted(v.items(), key=lambda kv: -kv[1])) for w, v in fakes.items()},
            "robots_txt": robots, "robots_only": [{"name": n, "company": c, "for": p} for n, c, p in CF_ROBOTS_ONLY],
            "not_found": not_found, "server_errors": errors}


def _try(fn, *args):
    try:
        return fn(*args)
    except Exception as e:
        return e


def umami_client(cfg):
    """Umami's API address for the website, its sign-in headers and its name for page addresses. Reads through the
    website's share link ("umami_share" in config.json: the code after /share/), which works on Umami's free plan,
    else through an API key in the Keychain (Umami's paid plans only)."""
    site = cfg.get("umami_website", "0717d470-551a-4b38-8632-c2e273c3cc5d")
    browser = {"User-Agent": "Mozilla/5.0 (Macintosh) starredbill-morning-figures", "Accept": "application/json"}
    if cfg.get("umami_share"):
        gateway = "https://gateway-eu.umami.is/api"
        share = http(f"{gateway}/share/{cfg['umami_share']}", headers=browser, method="GET")
        site = share.get("websiteId", site)
        auth = dict(browser, **{"x-umami-share-token": share["token"], "x-umami-share-context": "1"})
        base, page_type = f"{gateway}/websites/{site}", "path"
    else:
        key = keychain("starredbill-umami")
        if not key:
            raise RuntimeError("not set up: no Umami share link in config.json and no API key in the Keychain")
        auth = dict(browser, **{"x-umami-api-key": key})
        base, page_type = f"https://api.umami.is/v1/websites/{site}", "url"
    return base, auth, page_type


def umami(cfg):
    base, auth, page_type = umami_client(cfg)
    today = dt.datetime.combine(dt.date.today(), dt.time())
    start = int((today - dt.timedelta(days=1)).timestamp() * 1000)
    end = int(today.timestamp() * 1000) - 1

    def get(path, **q):
        q.update(startAt=start, endAt=end)
        return http(f"{base}/{path}?{urllib.parse.urlencode(q)}", headers=auth, method="GET")

    stats = get("stats")
    # Newer Umami gives plain numbers plus a "comparison" block; older gives {"value", "prev"} pairs.
    if "comparison" in stats:
        before = stats.pop("comparison")
        flat = stats
    else:
        flat = {k: (v.get("value") if isinstance(v, dict) else v) for k, v in stats.items()}
        before = {k: (v.get("prev") if isinstance(v, dict) else None) for k, v in stats.items()}

    def metric(kind, limit=8):
        try:
            return [{"item": r.get("x"), "count": r.get("y")} for r in get("metrics", type=kind, limit=limit)]
        except Exception:
            return []

    def engagement(s):
        """Bounce rate (visits that saw one page and left) and average time per visit, from Umami's totals."""
        visits = (s or {}).get("visits") or 0
        if not visits:
            return {"bounce_rate_percent": None, "avg_visit_seconds": None, "pages_per_visit": None}
        return {"bounce_rate_percent": round(100 * (s.get("bounces") or 0) / visits),
                "avg_visit_seconds": round((s.get("totaltime") or 0) / visits),
                "pages_per_visit": round((s.get("pageviews") or 0) / visits, 1)}

    week_start = int((today - dt.timedelta(days=7)).timestamp() * 1000)
    try:
        week = http(f"{base}/stats?{urllib.parse.urlencode({'startAt': week_start, 'endAt': end})}", headers=auth,
                    method="GET")
        week.pop("comparison", None)
        week = {k: (v.get("value") if isinstance(v, dict) else v) for k, v in week.items()}
    except Exception:
        week = {}
    return {"yesterday": flat, "day_before": before, "yesterday_engagement": engagement(flat),
            "day_before_engagement": engagement(before), "last_7_days": week, "last_7_days_engagement": engagement(week),
            "top_pages": metric(page_type, 10), "entry_pages": metric("entry", 8), "referrers": metric("referrer"),
            "countries": metric("country", 10), "devices": metric("device", 5), "events": metric("event", 25)}


def main(out, prev=None):
    cfg = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    result = {"date": str(dt.date.today()), "sources": {}}
    for name, fn, needs in (("search_console", search_console, ["google sign-in"]),
                            ("analytics", analytics, ["google sign-in", "ga4_property"]),
                            ("index", lambda c: index_status(c, prev), ["google sign-in", "index-pages.txt"]),
                            ("site_index", lambda c: site_index(c, result["sources"].get("index", {}).get("pages")),
                             ["google sign-in"]),
                            ("targets", seo_targets, ["google sign-in", "seo-targets.txt"]),
                            ("page_one", lambda c: page_one(c, prev), ["google sign-in"]),
                            ("page_two", lambda c: page_two(c, prev), ["google sign-in"]),
                            ("links", lambda c: bing_links(c, prev), ["Bing API key"]),
                            ("cloudflare", lambda c: cloudflare(c, prev), ["Cloudflare API token"]),
                            ("umami", umami, [])):
        missing = [k for k in needs if not (google_ready(cfg) if k == "google sign-in" else
                                            keychain("starredbill-bing") if k == "Bing API key" else
                                            keychain("starredbill-cloudflare") if k == "Cloudflare API token" else
                                            (CONFIG.parent / k).exists() if k.endswith(".txt") else cfg.get(k))]
        if missing:
            result["sources"][name] = {"status": "not set up", "missing": missing}
            continue
        try:
            result["sources"][name] = dict(status="ok", **fn(cfg))
        except urllib.error.HTTPError as e:
            result["sources"][name] = {"status": "error", "error": f"HTTP {e.code}: {e.read().decode()[:300]}"}
        except Exception as e:
            result["sources"][name] = {"status": "error", "error": str(e)[:300]}
    result["seo_measures"] = seo_measures(result["sources"])
    if prev and Path(prev).exists():
        result["previous_file"] = prev
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    Path(out).write_text(json.dumps(result, indent=1, ensure_ascii=False))
    print(json.dumps(result, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        print(__doc__)
        sys.exit(1)
    main(*sys.argv[1:])
