#!/usr/bin/env python3
"""The lunch-price triage list (28 Oct 2026, owner's brief after the Price Index check): which starred restaurants' lunch
records most need checking at their source, so the lunch clean-up starts where wrong figures do the most harm.

    python3 scripts/lunch_triage.py [N]     writes ~/starred-bill-research/price-checks/lunch/triage-<date>.json and .csv
                                            (every flagged restaurant, ranked) and prints the top N (default 100)

A lunch is flagged when it hasn't been genuinely checked (lunchVerifiedAt) and something about it looks wrong:
  same       recorded at the dinner menu's price (the Q4 2026 check found many were the dinner price copied over where a
             cheaper lunch menu exists)
  low        under a quarter of the dinner menu (usually a bar, two-course or one-dish lunch, or a pairing price)
  short      its note describes a two-course, business, bistro, bento or similar lunch (lunch_state() in build.py), which
             may stand where a comparable full set lunch exists
  no-hours   recorded although its opening hours show no midday service
  saving     lunch 60% or more below dinner: a big saving the pages show
  weak       its lunch source is another guide, a review, a booking site or none
  doubt      a check couldn't confirm it (lunchDoubt)
and a restaurant with opening hours showing lunch service but no lunch recorded counts too (unknown), at a lower weight.
Each flag's weight, times the country's (France, Switzerland, Liechtenstein and the Netherlands 1.5, where the check found
most copied lunches; Italy and Belgium 0.7, where it found none), times the restaurant's demand over 28 days (page views,
clicks out to book or its site, Budget Search and bill use, Google impressions and clicks: the same evidence as "Prices to
verify next", so it needs Umami's share link and the Google sign-in; without them it ranks on suspicion and stars alone),
times its stars. Restaurants parked in manual-review.json are listed apart. Nothing is changed: the checks themselves go
through scripts/prices.py, with evidence saved beside the triage file. Standard library only, Python 3.9.
"""
import csv
import datetime as dt
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import visit_report as vr  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = vr.mf.RESEARCH / "price-checks" / "lunch"
FLAG_WEIGHT = {"doubt": 1.4, "same": 1.0, "low": 1.3, "no-hours": 1.3, "short": 0.8, "saving": 0.6, "weak": 0.5, "unknown": 0.3}
COUNTRY_WEIGHT = {"france": 1.5, "switzerland": 1.5, "liechtenstein": 1.5, "netherlands": 1.5, "italy": 0.7, "belgium": 0.7}
STAR_WEIGHT = {3: 1.5, 2: 1.25}


def regexes():
    """build.py's LUNCH_SHORT_RE and LUNCH_FULL_RE, read from its source so the two never drift apart."""
    src = (ROOT / "build.py").read_text("utf-8")
    pick = lambda name: re.compile(eval(re.search(name + r' = re\.compile\((r".*?)\s*, re\.I\)', src, re.S).group(1).replace("\n", "")), re.I)
    return pick("LUNCH_SHORT_RE"), pick("LUNCH_FULL_RE")


def midday(hours):
    """From a week of opening hours ("1200-1430,1900-2200;;…"): True when some day opens before 3pm, False when none does,
    None when there are no hours."""
    if not hours:
        return None
    starts = [int(x.split("-")[0]) for day in hours.split(";") for x in day.split(",") if re.match(r"\d{4}-\d{4}", x)]
    return any(s < 1500 for s in starts) if starts else None


def flags(r, short_re, full_re, hours):
    out = []
    lunch, dinner = r.get("lunch"), r.get("dinner") if r.get("dinnerType", "menu") == "menu" else None
    serves = midday(hours.get(r["id"]))
    if lunch is None:
        if not r.get("noLunch") and serves:
            out.append("unknown")
        return out
    if r.get("lunchVerifiedAt") and not r.get("lunchDoubt"):
        return out
    if r.get("lunchDoubt"):
        out.append("doubt")
    if r.get("lunchType", "menu") == "menu" and dinner:
        if lunch == dinner:
            out.append("same")
        elif lunch < 0.25 * dinner:
            out.append("low")
        elif lunch <= 0.4 * dinner:
            out.append("saving")
    note = (r.get("lunchNote") or "").split("(")[0]
    if r.get("lunchKind") == "short" or (r.get("lunchKind") != "full" and not full_re.search(note) and short_re.search(note)):
        out.append("short")
    if serves is False:
        out.append("no-hours")
    if vr.source_kind(r, "lunch") in ("guide", "press", "booking", "none"):
        out.append("weak")
    return out


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    today = dt.date.today()
    site = vr.Site()
    short_re, full_re = regexes()
    hours = {}
    for name in ("opening-hours.json", "opening-hours-sites.json"):
        data = vr.load_json(ROOT / "content" / name, {}) or {}
        hours.update(data.get("hours", {}))
    try:
        cfg = vr.load_json(vr.mf.CONFIG, {}) or {}
        t0 = vr.local_midnight(today)
        start = max(vr.UMAMI_FROM, t0 - dt.timedelta(days=28))
        rows, base, auth = vr.umami_events(cfg, start, t0)
        interest = vr.summarise(site, vr.build_visits(rows, vr.event_details(rows, base, auth)), start, t0)["restaurant_interest"]
    except Exception as e:
        print(f"Umami unavailable ({str(e)[:80]}); ranking without visits", file=sys.stderr)
        interest = {"views": {}, "commercial": {}, "onsite": {}}
    try:
        gsc = vr.gsc_extras(cfg).get("restaurant_pages_28d", {})
    except Exception as e:
        print(f"Search Console unavailable ({str(e)[:80]}); ranking without it", file=sys.stderr)
        gsc = {}
    parked = vr.load_json(vr.mf.RESEARCH / "price-checks" / "manual-review.json", {}) or {}
    ranked = []
    for r in site.live():
        r = dict(r, country=Path(r["file"]).parts[2], cur=site.currency(r))  # the file's folder is its country
        fl = flags(r, short_re, full_re, hours)
        if not fl:
            continue
        rid = r["id"]
        vv, cc, oo = interest["views"].get(rid, 0), interest["commercial"].get(rid, 0), interest["onsite"].get(rid, 0)
        g = gsc.get(rid, {})
        demand = vv + 8 * cc + 3 * oo + 3 * g.get("clicks", 0) + g.get("impressions", 0) / 25
        suspicion = sum(FLAG_WEIGHT[f] for f in fl)
        score = (1 + demand) * suspicion * COUNTRY_WEIGHT.get(r["country"], 1.0) * STAR_WEIGHT.get(r.get("stars"), 1.0)
        ranked.append({"id": rid, "name": r["name"], "country": r["country"], "stars": r.get("stars"), "currency": r.get("cur"),
                       "lunch": r.get("lunch"), "dinner": r.get("dinner"), "lunchNote": r.get("lunchNote"), "dinnerNote": r.get("dinnerNote"),
                       "lunchSource": r.get("lunchSource"), "source": r.get("source"), "website": r.get("website"),
                       "flags": fl, "views": vv, "clicksOut": cc, "budgetSearch": oo, "googleImpressions": g.get("impressions", 0),
                       "googleClicks": g.get("clicks", 0), "score": round(score, 2), "parked": rid in parked})
    ranked.sort(key=lambda x: (-x["score"], x["id"]))
    OUT.mkdir(parents=True, exist_ok=True)
    stem = OUT / f"triage-{today}"
    stem.with_suffix(".json").write_text(json.dumps({"date": str(today), "count": len(ranked), "rows": ranked}, indent=1, ensure_ascii=False))
    with stem.with_suffix(".csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        cols = ["id", "name", "country", "stars", "currency", "lunch", "dinner", "flags", "views", "clicksOut", "budgetSearch",
                "googleImpressions", "googleClicks", "score", "parked", "lunchNote", "lunchSource"]
        w.writerow(["rank"] + cols)
        for i, x in enumerate(ranked, 1):
            w.writerow([i] + [" ".join(x[c]) if c == "flags" else x[c] for c in cols])
    counts = {}
    for x in ranked:
        for fl in x["flags"]:
            counts[fl] = counts.get(fl, 0) + 1
    top = [x for x in ranked if not x["parked"]][:n]
    print(json.dumps({"date": str(today), "flagged": len(ranked), "byFlag": counts, "file": str(stem.with_suffix(".csv")),
                      "top": [{k: x[k] for k in ("id", "name", "country", "stars", "lunch", "dinner", "flags", "views", "clicksOut",
                                                  "googleImpressions", "score")} for x in top]}, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
