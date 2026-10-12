#!/usr/bin/env python3
"""Opening hours for mainland China's starred restaurants from Ctrip, where neither the MICHELIN Guide nor Google has any.
See README, "Opening hours".

    python3 scripts/ctrip_hours.py          list what Ctrip says for each Chinese restaurant without guide or Google hours,
                                            beside what content/opening-hours-sites.json has
    python3 scripts/ctrip_hours.py write    also write Ctrip's into that file for those with none, or whose hours there
                                            already came from Ctrip

Ctrip's mobile restaurant page (gs.ctrip.com/html5/you/foods/<city>/<id>.html, found from the Ctrip link in a restaurant's
`source` or `lunchSource`) carries a weekly timetable in its page data (WeekdayDtoList). Only the all-year rows (1/1 to
12/31) are used; seasonal ones are printed for checking by hand. Hours from a restaurant's or its hotel's own page are never
replaced.
"""
import datetime
import glob
import json
import os
import re
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITES = os.path.join(ROOT, "content", "opening-hours-sites.json")
UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]


def ctrip_week(url):
    """(week string or None, seasonal rows) from a Ctrip mobile restaurant page."""
    html = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=25).read().decode("utf-8", "ignore")
    data = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S).group(1))
    info = data["props"]["pageProps"]["initialState"]["mainInfoData"]["RestaurantInfo"]
    week, other = {d: [] for d in DAYS}, []
    for w in info.get("WeekdayDtoList") or []:
        sits = [o["BeginTime"].replace(":", "") + "-" + o["EndTime"].replace(":", "")
                for o in w.get("OpenTimeList") or [] if o.get("BeginTime") and o.get("EndTime")]
        if w.get("Weekday") in week and (w.get("StartDate"), w.get("EndDate")) == ("1/1", "12/31"):
            week[w["Weekday"]] += sits
        else:
            other.append((w.get("Weekday"), w.get("StartDate"), w.get("EndDate"), sits))
    text = ";".join(",".join(week[d]) for d in DAYS)
    ok = any(week.values()) and re.fullmatch(r"(?:\d{4}-\d{4}(?:,\d{4}-\d{4})*)?(?:;(?:\d{4}-\d{4}(?:,\d{4}-\d{4})*)?){6}", text)
    return (text if ok else None), other


def main(write):
    covered = set()
    for name in ("opening-hours.json", "opening-hours-google.json"):
        covered |= set(json.load(open(os.path.join(ROOT, "content", name), encoding="utf-8")).get("hours", {}))
    sites = json.load(open(SITES, encoding="utf-8")) if os.path.exists(SITES) else {"hours": {}, "sources": {}, "daysOnly": []}
    changed = 0
    for path in sorted(glob.glob(os.path.join(ROOT, "content", "restaurants", "china", "*.json"))):
        rid, r = os.path.basename(path)[:-5], json.load(open(path, encoding="utf-8"))
        if not r.get("stars") or r.get("status") or rid in covered:
            continue
        m = next((re.search(r"/food/[a-z]*(\d+)/(\d+)", s) for s in (r.get("source", ""), r.get("lunchSource", "")) if re.search(r"/food/[a-z]*(\d+)/(\d+)", s or "")), None)
        if not m:
            print(f"{rid}: no Ctrip link")
            continue
        url = f"https://gs.ctrip.com/html5/you/foods/{m.group(1)}/{m.group(2)}.html"
        try:
            week, other = ctrip_week(url)
        except Exception as err:
            print(f"{rid}: {err}")
            continue
        have, src = sites["hours"].get(rid), (sites["sources"].get(rid) or {}).get("url", "")
        print(f"{rid}: Ctrip {week}" + (f" | seasonal {other}" if other else "") + (f" | ours {have} ({src})" if have and have != week else ""))
        if write and week and (not have or "ctrip.com" in src) and have != week:
            sites["hours"][rid], sites["sources"][rid] = week, {"url": url, "type": "other"}
            changed += 1
        time.sleep(1)
    if write and changed:
        sites["checked"] = datetime.date.today().isoformat()
        sites["hours"] = dict(sorted(sites["hours"].items()))
        sites["sources"] = dict(sorted(sites["sources"].items()))
        with open(SITES, "w", encoding="utf-8") as f:
            f.write(json.dumps(sites, ensure_ascii=False, indent=0) + "\n")
    if write:
        print(f"Wrote {changed} restaurants' hours from Ctrip to content/opening-hours-sites.json")


if __name__ == "__main__":
    main(len(sys.argv) > 1 and sys.argv[1] == "write")
