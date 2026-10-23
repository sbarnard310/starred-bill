#!/usr/bin/env python3
"""The figures for the owner's "Starred Bill Figures" dashboard (https://claude.ai/artifact/7PDsRureVos2hCpjNjiuZd):
visitors from Umami and Google search from Search Console, refreshed each morning by the "Starred Bill · Morning
figures" routine. Its Accounts tab reads Supabase live, so it isn't here.

    python3 scripts/site_dashboard.py OUT.json

Writes one JSON list of rows to OUT.json. Each row's `table` says which part of the dashboard it belongs to; the
dashboard splits them apart, so a refresh is one file:

  umami_daily      each day since Umami started: visitors, visits, page views, bounce rate, seconds per visit
  umami_week       the last 7 days and the 7 before, the same figures
  umami_pages, umami_referrers, umami_countries, umami_devices, umami_events   the last 28 days, top first
  gsc_daily        each day Search Console has: clicks, impressions, average position
  gsc_week         its latest 7 days and the 7 before
  gsc_searches, gsc_pages, gsc_countries      its latest 28 days, most impressions first
  seo              the SEO plan's measures (now and aim), from the newest morning figures file
  index_history    pages in Google and in the sitemap, from each morning's figures file
"""
import datetime as dt
import json
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import morning_figures as mf  # noqa: E402
from ga_dashboard import ACTIONS  # noqa: E402

UMAMI_START = dt.date(2026, 10, 4)   # the first full day Umami counted
GSC_START = dt.date(2026, 10, 1)
FIGURES = Path.home() / "starred-bill-research/figures"
SEO_NAMES = [("pages_indexed", "Pages in Google"), ("weekly_impressions", "Weekly search impressions"),
             ("weekly_clicks", "Weekly Google clicks"), ("searches_on_page_one", "Searches on page one"),
             ("searches_in_top_three", "Searches in the top three"), ("linking_sites", "Sites linking to us"),
             ("targets_on_page_one", "Target searches on page one")]


# Umami names countries by their 2-letter code; morning_figures.COUNTRIES has the names.
UMAMI_COUNTRIES = {two.upper(): name for two, name in mf.COUNTRIES.values()}


def ms(day):
    return int(dt.datetime.combine(day, dt.time()).timestamp() * 1000)


def main(out):
    cfg = json.loads((FIGURES / "config.json").read_text())
    rows = []

    def add(table, **r):
        rows.append(dict(table=table, **r))

    def umami_figures(s):
        visits = s.get("visits") or 0
        return {"visitors": s.get("visitors") or 0, "visits": visits, "page_views": s.get("pageviews") or 0,
                "bounce_rate": round((s.get("bounces") or 0) / visits, 4) if visits else None,
                "seconds_per_visit": round((s.get("totaltime") or 0) / visits) if visits else None}

    # Umami
    base, auth, page_type = mf.umami_client(cfg)

    def umami(path, start, end, **q):
        q.update(startAt=ms(start), endAt=ms(end) - 1)
        return mf.http(f"{base}/{path}?{urllib.parse.urlencode(q)}", headers=auth, method="GET")

    today = dt.date.today()
    day = UMAMI_START
    while day < today:
        add("umami_daily", day=str(day), **umami_figures(umami("stats", day, day + dt.timedelta(days=1))))
        day += dt.timedelta(days=1)
    for period, start in (("Last 7 days", today - dt.timedelta(days=7)), ("7 days before", today - dt.timedelta(days=14))):
        add("umami_week", period=period, start=str(start), **umami_figures(umami("stats", start, start + dt.timedelta(days=7))))
    month = max(UMAMI_START, today - dt.timedelta(days=28))
    for table, kind, name, limit in (("umami_pages", page_type, "page", 20), ("umami_referrers", "referrer", "site", 12),
                                     ("umami_countries", "country", "country", 15), ("umami_devices", "device", "device", 5),
                                     ("umami_events", "event", "event", 25)):
        for r in umami("metrics", month, today, type=kind, limit=limit):
            label = r.get("x") or "(none)"
            if kind == "country":
                label = UMAMI_COUNTRIES.get(label.upper(), label)
            if kind == "event":
                if label in ("cookie-choice", "sign-up"):
                    continue
                key = label.replace("-", "_")
                add(table, event=label, action=ACTIONS.get(key, key.replace("_", " ").capitalize()), count=r.get("y") or 0)
                continue
            add(table, **{name: label, "count": r.get("y") or 0})

    # Search Console
    url, gauth, week, prev = mf.gsc_query(cfg)

    def gsc(start, end, dims=None, limit=1000):
        body = {"startDate": str(start), "endDate": str(end), "rowLimit": limit}
        if dims:
            body["dimensions"] = dims
        return mf.http(url, body, gauth).get("rows", [])

    def figs(r):
        return {"clicks": int(r.get("clicks", 0)), "impressions": int(r.get("impressions", 0)),
                "position": round(r.get("position", 0), 1)}

    end = dt.date.fromisoformat(week[1])
    for r in sorted(gsc(GSC_START, end, ["date"]), key=lambda r: r["keys"][0]):
        add("gsc_daily", day=r["keys"][0], **figs(r))
    for period, rng in (("Latest 7 days", week), ("7 days before", prev)):
        r = (gsc(rng[0], rng[1]) or [{}])[0]
        add("gsc_week", period=period, start=rng[0], end=rng[1], **figs(r))
    month_start = end - dt.timedelta(days=27)
    for table, dim, name, limit in (("gsc_searches", "query", "search", 25), ("gsc_pages", "page", "page", 20),
                                    ("gsc_countries", "country", "country", 12)):
        found = sorted(gsc(month_start, end, [dim], 5000), key=lambda r: (-r["impressions"], -r["clicks"]))[:limit]
        for r in found:
            key = r["keys"][0]
            if dim == "page":
                key = key.replace(mf.SITE, "") or "/"
            elif dim == "country":
                key = mf.country_name(key)
            add(table, **dict({name: key}, **figs(r)))

    # The SEO plan's measures and the index's growth, from the morning figures' saved files
    files = sorted(FIGURES.glob("20??-??-??.json"))
    measures = json.loads(files[-1].read_text()).get("seo_measures", {}) if files else {}
    for key, label in SEO_NAMES:
        now = (measures.get(key) or {}).get("now")
        add("seo", measure=key, label=label, now=now, aim=mf.SEO_AIMS[key], by=mf.SEO_AIMS["by"])
    for f in files:
        site = json.loads(f.read_text()).get("sources", {}).get("site_index", {})
        if site.get("status") == "ok":
            add("index_history", day=f.stem, indexed=site.get("indexed"), sitemap_pages=site.get("sitemap_pages"))

    Path(out).write_text(json.dumps(rows, ensure_ascii=False))
    print(f"{len(rows)} rows")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1])
