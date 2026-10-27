#!/usr/bin/env python3
"""The price-verification run's queue: the restaurants whose prices most need a genuine check (27 Oct 2026).

    python3 scripts/price_queue.py next [N]      the top N (default 20) of "Prices to verify next", with each one's
                                                 recorded prices, notes and sources, as JSON, for a verification run
    python3 scripts/price_queue.py progress      how many priced starred restaurants have a genuine check

The ranking is verify_queue() in visit_report.py (page views, clicks out, Budget Search and bill use, Google
impressions and clicks, stars, time since a genuine check, kind of source), so it needs Umami's share link and the
Google sign-in, as the morning figures do. Restaurants parked for manual review in
~/starred-bill-research/price-checks/manual-review.json ({"<id>": {"since": "2026-10-27", "issue": "..."}}) are left
out until they're taken off it, so each run reaches new ones; they're listed apart. Each run's evidence (what was
checked, the quotes, the verdicts) goes in ~/starred-bill-research/price-checks/<date>.json. The checks themselves are
recorded with scripts/prices.py (verify, set). Standard library only, Python 3.9.
"""
import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import visit_report as vr  # noqa: E402

CHECKS = vr.mf.RESEARCH / "price-checks"
FIELDS = ("name", "city", "stars", "currency", "dinner", "dinnerType", "wine", "lunch", "lunchWine", "noLunch", "noPairing",
          "dinnerNote", "lunchNote", "source", "sourceType", "sourceKind", "lunchSource", "lunchSourceType", "website",
          "bookingUrl", "serviceIncluded", "taxIncluded", "servicePct", "priceDerived", "lunchDerived", "priceVerifiedAt",
          "lunchVerifiedAt", "priceChangedAt", "lunchChangedAt", "status", "notice")


def ranked(limit):
    cfg = vr.load_json(vr.mf.CONFIG, {}) or {}
    today = dt.date.today()
    t0 = vr.local_midnight(today)
    start = max(vr.UMAMI_FROM, t0 - dt.timedelta(days=28))
    rows, base, auth = vr.umami_events(cfg, start, t0)
    visits = vr.build_visits(rows, vr.event_details(rows, base, auth))
    site = vr.Site()
    interest = vr.summarise(site, visits, start, t0)["restaurant_interest"]
    try:
        gsc = vr.gsc_extras(cfg).get("restaurant_pages_28d", {})
    except Exception as e:
        print(f"Search Console unavailable ({str(e)[:80]}); ranking without it", file=sys.stderr)
        gsc = {}
    return site, vr.verify_queue(site, interest, gsc, today, limit)


def main():
    args = sys.argv[1:]
    if args[:1] == ["progress"]:
        site = vr.Site()
        priced = [r for r in site.live() if r.get("dinner") is not None or r.get("lunch") is not None]
        done = [r for r in priced if r.get("priceVerifiedAt") or r.get("lunchVerifiedAt")]
        print(json.dumps({"priced": len(priced), "verified": len(done), "pct": round(100 * len(done) / len(priced), 1)}))
        return
    if args[:1] != ["next"]:
        sys.exit(__doc__)
    n = int(args[1]) if len(args) > 1 else 20
    parked = vr.load_json(CHECKS / "manual-review.json", {}) or {}
    site, queue = ranked(n + len(parked) + 10)
    out = {"date": str(dt.date.today()), "next": [], "parked": []}
    for x in queue:
        r = site.restaurants.get(x["id"]) or {}
        row = {"id": x["id"], "rank_score": x["score"], "evidence": x["evidence"], "status": x["status"],
               "page": x["page"], **{k: r[k] for k in FIELDS if k in r}}
        if x["id"] in parked:
            out["parked"].append({**row, "review": parked[x["id"]]})
        elif len(out["next"]) < n:
            out["next"].append(row)
    print(json.dumps(out, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
