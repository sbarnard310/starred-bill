#!/usr/bin/env python3
"""Yesterday's visitor figures for starredbill.com, used by the "Starred Bill · Morning figures" routine.

    python3 scripts/morning_figures.py OUT.json [PREVIOUS.json]

Reads three sources and writes their figures to OUT.json (printing them too). With PREVIOUS.json, the
report can say what changed. A source that isn't set up yet is reported as "not set up" and skipped.

  - Google Search Console (clicks, impressions, average position, top searches and pages). Its figures
    run two to three days behind, so it reports the last 7 days it has, against the 7 before.
  - Google's index: which of the key pages in index-pages.txt (beside config.json) Google has indexed, from
    Search Console's URL Inspection, and which became indexed since the previous day.
  - The site's whole sitemap: how many of its pages Google has indexed (URL Inspection, a few hundred a day,
    oldest-checked first, results kept in index-cache.json beside config.json).
  - The SEO plan's 20 target searches (seo-targets.txt beside config.json): each one's Google position over the
    latest week, in its main market, and which of our pages ranks for it.
  - Searches on page two of Google: where a page of ours averages position 8–20 over the last 28 days, with the
    page's live title, description and heading and the search words they lack, so they can be tuned.
  - Sites linking to us, from Bing Webmaster Tools (Search Console's Links report has no API). Needs the Bing
    Webmaster API key in the Keychain as "starredbill-bing".
  - The SEO plan's four measures against their aims for 31 Jan 2027 (SEO_AIMS), put together from the above.
  - Google Analytics 4 (visitors, sessions, page views, top pages and countries, sign-ups). It only counts
    visitors who accepted the cookie banner.
  - Umami (every visit, no cookies: visitors, page views, top pages, referrers, countries, click events).

Settings live in ~/starred-bill-research/figures/config.json (nothing secret in it):
  {"gsc_site": "sc-domain:starredbill.com", "ga4_property": "123456789",
   "umami_website": "0717d470-...", "google_key": "~/starred-bill-research/keys/google-service-account.json"}
Google is read as the owner, through a one-time sign-in (scripts/google_signin.py: a "Desktop app" OAuth
client at "google_oauth", its refresh token in the Keychain as "starredbill-google"), because Google blocks
service account keys on this project. A service account key at "google_key" still works if one exists; its
JWT is signed with the Mac's own openssl, so no extra libraries are needed. Umami is read
through the website's share link ("umami_share": the code after /share/, sharing Overview and Events), as
Umami's free plan has no API keys; with a paid plan, an API key in the Keychain ("starredbill-umami") works too.
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

CONFIG = Path.home() / "starred-bill-research" / "figures" / "config.json"
SITE = "https://starredbill.com"
# The SEO plan's aims for 31 Jan 2027 (https://claude.ai/code/artifact/8ee24d0c-b566-4b4b-bead-f87d25a46122).
SEO_AIMS = {"by": "2027-01-31", "pages_indexed": 400, "weekly_impressions": 10000, "linking_sites": 20,
            "targets_on_page_one": 10}
INDEX_BUDGET = 300   # sitemap pages re-inspected a day, besides the key pages (Google allows 2,000 a day)


def http(url, data=None, headers=None, method=None):
    body = None if data is None else (data if isinstance(data, bytes) else json.dumps(data).encode())
    req = urllib.request.Request(url, data=body, headers=dict({"Content-Type": "application/json"}, **(headers or {})), method=method)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode() or "{}")


def b64(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def keychain(service):
    return subprocess.run(["security", "find-generic-password", "-s", service, "-w"],
                          capture_output=True, text=True).stdout.strip()


def google_ready(cfg):
    """True if either Google sign-in is set up: a service account key, or the owner's own sign-in."""
    if cfg.get("google_key") and Path(os.path.expanduser(cfg["google_key"])).exists():
        return True
    oauth = cfg.get("google_oauth")
    return bool(oauth and Path(os.path.expanduser(oauth)).exists() and keychain("starredbill-google"))


def google_token(cfg, scope):
    """An access token: from the owner's own sign-in (scripts/google_signin.py, refresh token in the Keychain)
    when set up, else from a service account key, its JWT signed with openssl (no third-party libraries)."""
    oauth = cfg.get("google_oauth")
    refresh = keychain("starredbill-google") if oauth else ""
    if refresh and Path(os.path.expanduser(oauth)).exists():
        client = json.loads(Path(os.path.expanduser(oauth)).read_text())
        client = client.get("installed") or client.get("web") or client
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

    def top(dim):
        rows = http(url, {"startDate": week[0], "endDate": week[1], "dimensions": [dim], "rowLimit": 10}, auth).get("rows", [])
        return [{"item": r["keys"][0], "clicks": r["clicks"], "impressions": r["impressions"], "position": round(r["position"], 1)} for r in rows]

    return {"period": f"{week[0]} to {week[1]}", "this_week": totals(week), "week_before": totals(prev),
            "top_searches": top("query"), "top_pages": top("page")}


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
                    "page_one": bool(pos and pos <= 10), "ranking_page": pages.get(q, {}).get("page")})
    return {"period": f"{week[0]} to {week[1]}", "targets": len(out), "showing": sum(1 for t in out if t["position"]),
            "on_page_one": sum(1 for t in out if t["page_one"]), "searches": out}


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
    base = "https://ssl.bing.com/webmaster/api.svc/pox/"
    ns = "{http://schemas.datacontract.org/2004/07/Microsoft.Bing.Webmaster.Api}"

    def call(method, **q):
        q.update(siteUrl=site, apikey=key)
        req = urllib.request.Request(f"{base}{method}?{urllib.parse.urlencode(q)}", headers={"Accept": "application/xml"})
        with urllib.request.urlopen(req, timeout=40) as r:
            return ET.fromstring(r.read())

    def paged(method, item, field, **q):
        found, page, total = [], 0, 1
        while page < min(total, 20):
            root = call(method, page=page, **q)
            found += [(e.findtext(ns + field) or "") for e in root.iter(ns + item)]
            total = int(root.findtext(ns + "TotalPages") or 0)
            page += 1
        return found

    ours = paged("GetLinkCounts", "LinkCount", "Url")
    sites = {}
    for target in ours:
        for source in paged("GetUrlLinks", "LinkDetail", "Url", link=target):
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
    """The SEO plan's four measures, today's figure against the aim for SEO_AIMS["by"] (None where its source
    isn't working yet)."""
    def ok(name):
        src = sources.get(name, {})
        return src if src.get("status") == "ok" else {}

    now = {"pages_indexed": ok("site_index").get("indexed"),
           "weekly_impressions": ok("search_console").get("this_week", {}).get("impressions"),
           "linking_sites": ok("links").get("linking_sites"),
           "targets_on_page_one": ok("targets").get("on_page_one")}
    return {k: {"now": v, "aim": SEO_AIMS[k]} for k, v in now.items()} | {"aim_date": SEO_AIMS["by"]}


def analytics(cfg):
    token = google_token(cfg, "https://www.googleapis.com/auth/analytics.readonly")
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{cfg['ga4_property']}:runReport"
    auth = {"Authorization": f"Bearer {token}"}
    metrics = [{"name": m} for m in ("activeUsers", "newUsers", "sessions", "screenPageViews")]

    def report(body):
        return http(url, body, auth).get("rows", [])

    def day(rng):
        rows = report({"dateRanges": [{"startDate": rng, "endDate": rng}], "metrics": metrics})
        vals = rows[0]["metricValues"] if rows else []
        return {m["name"]: int(float(v["value"])) for m, v in zip(metrics, vals)} if vals else {m["name"]: 0 for m in metrics}

    def top(dim, metric="screenPageViews", start="yesterday", limit=8):
        rows = report({"dateRanges": [{"startDate": start, "endDate": "yesterday"}], "dimensions": [{"name": dim}],
                       "metrics": [{"name": metric}], "limit": limit,
                       "orderBys": [{"metric": {"metricName": metric}, "desc": True}]})
        return [{"item": r["dimensionValues"][0]["value"], metric: int(float(r["metricValues"][0]["value"]))} for r in rows]

    return {"yesterday": day("yesterday"), "day_before": day("2daysAgo"),
            "top_pages_yesterday": top("pagePath"), "top_countries_yesterday": top("country", "activeUsers"),
            "events_last_7_days": top("eventName", "eventCount", "7daysAgo", 25)}


def umami(cfg):
    """Reads through the website's share link ("umami_share" in config.json: the code after /share/), which
    works on Umami's free plan, else through an API key in the Keychain (Umami's paid plans only)."""
    site = cfg.get("umami_website", "0717d470-551a-4b38-8632-c2e273c3cc5d")
    browser = {"User-Agent": "Mozilla/5.0 (Macintosh) starredbill-morning-figures", "Accept": "application/json"}
    if cfg.get("umami_share"):
        gateway = "https://gateway-eu.umami.is/api"
        share = http(f"{gateway}/share/{cfg['umami_share']}", headers=browser, method="GET")
        site = share.get("websiteId", site)
        auth = dict(browser, **{"x-umami-share-token": share["token"], "x-umami-share-context": "1"})
        base, page_type = f"{gateway}/websites/{site}", "path"
    else:
        key = subprocess.run(["security", "find-generic-password", "-s", "starredbill-umami", "-w"],
                             capture_output=True, text=True).stdout.strip()
        if not key:
            raise RuntimeError("not set up: no Umami share link in config.json and no API key in the Keychain")
        auth = dict(browser, **{"x-umami-api-key": key})
        base, page_type = f"https://api.umami.is/v1/websites/{site}", "url"
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
        return [{"item": r.get("x"), "count": r.get("y")} for r in get("metrics", type=kind, limit=limit)]

    return {"yesterday": flat, "day_before": before, "top_pages": metric(page_type), "referrers": metric("referrer"),
            "countries": metric("country"), "events": metric("event", 25)}


def main(out, prev=None):
    cfg = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    result = {"date": str(dt.date.today()), "sources": {}}
    for name, fn, needs in (("search_console", search_console, ["google sign-in"]),
                            ("analytics", analytics, ["google sign-in", "ga4_property"]),
                            ("index", lambda c: index_status(c, prev), ["google sign-in", "index-pages.txt"]),
                            ("site_index", lambda c: site_index(c, result["sources"].get("index", {}).get("pages")),
                             ["google sign-in"]),
                            ("targets", seo_targets, ["google sign-in", "seo-targets.txt"]),
                            ("page_two", lambda c: page_two(c, prev), ["google sign-in"]),
                            ("links", lambda c: bing_links(c, prev), ["Bing API key"]),
                            ("umami", umami, [])):
        missing = [k for k in needs if not (google_ready(cfg) if k == "google sign-in" else
                                            keychain("starredbill-bing") if k == "Bing API key" else
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
