#!/usr/bin/env python3
"""The figures for the owner's "Starred Bill Analytics" dashboard (https://claude.ai/artifact/HnZCxEaMBEqzghHtHbDvEK),
refreshed each morning by the "Starred Bill · Morning figures" routine.

    python3 scripts/ga_dashboard.py OUT.json

Reads Google Analytics 4 from 8 Oct 2026 (when it started counting) to yesterday, through the same Google sign-in
as morning_figures.py, and writes one JSON list of rows to OUT.json. Each row's `table` says which part of the
dashboard it belongs to (daily, totals, channels, sources, pages, countries, devices, languages, actions, umami);
the dashboard splits them apart, so a refresh is one file. The `umami` rows set each day's Umami visitors (everyone,
no cookies) beside Google Analytics' users, from the morning figures' saved files.
"""
import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import morning_figures as mf  # noqa: E402

START = "2026-10-08"
FIGURES = Path.home() / "starred-bill-research/figures"

# The site's own events (track() in common.js) in plain words; Google's automatic events are left out.
ACTIONS = {"outbound": "Opened a restaurant's site, a map or a source", "list_more": "Showed a destination's full list",
           "meal": "Switched Dinner / Lunch", "home_link": "Clicked a homepage tile", "wishlist": "Added to the wishlist",
           "currency": "Changed the currency", "search": "Searched", "language": "Changed the language",
           "share": "Shared a page", "near_me": "Used Near me", "browse": "Used By cuisine / By neighbourhood",
           "photos": "Opened More photos", "pick_step": "Answered a Help me pick question",
           "pick_result": "Got Help me pick results", "compare": "Used Compare", "sign_in_opened": "Opened sign-in",
           "sign_in": "Signed in", "account_created": "Created an account", "been_there": "Ticked Been there",
           "jump_to_map": "Jumped to the map", "contact": "Contact link", "booking_check": "Checked when bookings open",
           "trip": "Used Trips", "diary": "Wrote in the diary", "report_opened": "Opened Report a price",
           "saved_search_opened": "Opened Save this search"}
AUTOMATIC = {"page_view", "user_engagement", "session_start", "first_visit", "cookie_choice", "click", "scroll",
             "sign_up", "form_start", "form_submit", "view_search_results"}


def main(out):
    cfg = json.loads((FIGURES / "config.json").read_text())
    token = mf.google_token(cfg, "https://www.googleapis.com/auth/analytics.readonly")
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{cfg['ga4_property']}:runReport"
    auth = {"Authorization": f"Bearer {token}"}

    def report(dims, metrics, limit=50, order=None):
        body = {"dateRanges": [{"startDate": START, "endDate": "yesterday"}], "dimensions": [{"name": d} for d in dims],
                "metrics": [{"name": m} for m in metrics], "limit": limit}
        if order:
            body["orderBys"] = [{"metric": {"metricName": order}, "desc": True}]
        return [([v["value"] for v in r.get("dimensionValues", [])], [float(v["value"]) for v in r["metricValues"]])
                for r in mf.http(url, body, auth).get("rows", [])]

    rows = []
    add = lambda table, **r: rows.append(dict(table=table, **r))  # noqa: E731

    daily = sorted(report(["date"], ["activeUsers", "newUsers", "sessions", "screenPageViews", "engagedSessions",
                                     "userEngagementDuration"], 400))
    days = {}
    for d, m in daily:
        day = f"{d[0][:4]}-{d[0][4:6]}-{d[0][6:]}"
        days[day] = int(m[0])
        add("daily", day=day, users=int(m[0]), new_users=int(m[1]), sessions=int(m[2]), page_views=int(m[3]),
            engaged_sessions=int(m[4]), engaged_seconds=int(m[5]))

    (_, m), = report([], ["activeUsers", "sessions", "screenPageViews", "engagedSessions", "userEngagementDuration",
                          "engagementRate"])
    returning = {d[0]: v[0] for d, v in report(["newVsReturning"], ["activeUsers"])}
    add("totals", **{"from": START, "to": max(days) if days else START, "users": int(m[0]), "sessions": int(m[1]),
                     "page_views": int(m[2]), "engaged_sessions": int(m[3]), "engagement_rate": round(m[5], 4),
                     "engaged_seconds_per_session": round(m[4] / m[1]) if m[1] else 0,
                     "pages_per_session": round(m[2] / m[1], 2) if m[1] else 0,
                     "returning_users": int(returning.get("returning", 0))})

    for d, m in report(["sessionDefaultChannelGroup"], ["sessions", "activeUsers", "engagedSessions"], order="sessions"):
        add("channels", channel=d[0], sessions=int(m[0]), users=int(m[1]),
            engagement_rate=round(m[2] / m[0], 4) if m[0] else 0)
    for d, m in report(["sessionSource"], ["sessions"], 12, "sessions"):
        add("sources", source=d[0], sessions=int(m[0]))
    for d, m in report(["pagePath", "pageTitle"], ["screenPageViews", "activeUsers", "userEngagementDuration"], 30,
                       "screenPageViews"):
        add("pages", page=d[0], title=d[1].replace(" · The Starred Bill", ""), views=int(m[0]), users=int(m[1]),
            seconds_per_view=round(m[2] / m[0]) if m[0] else 0)
    for d, m in report(["country"], ["activeUsers"], 16, "activeUsers"):
        if d[0] != "(not set)":
            add("countries", country=d[0], users=int(m[0]))
    for d, m in report(["deviceCategory"], ["activeUsers"], order="activeUsers"):
        add("devices", device=d[0].capitalize(), users=int(m[0]))
    for d, m in report(["language"], ["activeUsers"], 10, "activeUsers"):
        add("languages", language=d[0], users=int(m[0]))
    for d, m in report(["eventName"], ["eventCount", "totalUsers"], 80, "eventCount"):
        if d[0] not in AUTOMATIC:
            add("actions", event=d[0], action=ACTIONS.get(d[0], d[0].replace("_", " ").capitalize()),
                times=int(m[0]), people=int(m[1]))

    # Each morning's figures file holds Umami's figures for the day before.
    for f in sorted(FIGURES.glob("20??-??-??.json")):
        umami = json.loads(f.read_text()).get("sources", {}).get("umami", {})
        day = str(dt.date.fromisoformat(f.stem) - dt.timedelta(days=1))
        if umami.get("status") == "ok" and day in days:
            add("umami", day=day, all_visitors=umami["yesterday"]["visitors"], ga_users=days[day])

    Path(out).write_text(json.dumps(rows, ensure_ascii=False))
    print(f"{len(rows)} rows, {START} to {max(days) if days else '-'}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1])
