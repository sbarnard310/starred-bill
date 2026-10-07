#!/usr/bin/env python3
"""Yesterday's visitor figures for starredbill.com, used by the "Starred Bill · Morning figures" routine.

    python3 scripts/morning_figures.py OUT.json [PREVIOUS.json]

Reads three sources and writes their figures to OUT.json (printing them too). With PREVIOUS.json, the
report can say what changed. A source that isn't set up yet is reported as "not set up" and skipped.

  - Google Search Console (clicks, impressions, average position, top searches and pages). Its figures
    run two to three days behind, so it reports the last 7 days it has, against the 7 before.
  - Google's index: which of the key pages in index-pages.txt (beside config.json) Google has indexed, from
    Search Console's URL Inspection, and which became indexed since the previous day.
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
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

CONFIG = Path.home() / "starred-bill-research" / "figures" / "config.json"


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


def search_console(cfg):
    token = google_token(cfg, "https://www.googleapis.com/auth/webmasters.readonly")
    site = urllib.parse.quote(cfg.get("gsc_site", "sc-domain:starredbill.com"), safe="")
    url = f"https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query"
    auth = {"Authorization": f"Bearer {token}"}
    # Search Console runs a few days behind: report the latest 7 days it has, and the 7 before.
    end = dt.date.today() - dt.timedelta(days=3)
    week = (str(end - dt.timedelta(days=6)), str(end))
    prev = (str(end - dt.timedelta(days=13)), str(end - dt.timedelta(days=7)))

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


def index_status(cfg, prev=None):
    """Whether Google has indexed each page in index-pages.txt (beside config.json, "name|/path/" per line),
    from Search Console's URL Inspection (2,000 a day allowed; about 120 pages take under a minute here).
    With the previous day's file, lists the pages that became indexed since."""
    pages_file = CONFIG.parent / "index-pages.txt"
    pages = [l.strip().split("|", 1) for l in pages_file.read_text().splitlines() if "|" in l and not l.startswith("#")]
    token = google_token(cfg, "https://www.googleapis.com/auth/webmasters.readonly")
    site = cfg.get("gsc_site", "sc-domain:starredbill.com")
    auth = {"Authorization": f"Bearer {token}"}

    def inspect(page):
        name, path = page
        try:
            r = http("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
                     {"inspectionUrl": "https://starredbill.com" + path, "siteUrl": site}, auth)
            ix = r.get("inspectionResult", {}).get("indexStatusResult", {})
            return path, {"name": name, "coverage": ix.get("coverageState", ""), "indexed": ix.get("verdict") == "PASS",
                          "last_crawled": ix.get("lastCrawlTime")}
        except Exception as e:
            return path, {"name": name, "coverage": "check failed", "indexed": None, "error": str(e)[:120]}

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
                            ("umami", umami, [])):
        missing = [k for k in needs if not (google_ready(cfg) if k == "google sign-in" else
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
