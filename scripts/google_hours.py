#!/usr/bin/env python3
"""Fills in opening hours from Google for starred restaurants the MICHELIN Guide gives none for (all of Japan, most of
mainland China, a few elsewhere). See README, "Opening hours".

    python3 scripts/google_hours.py fetch     ask Google (Places API (New) Place Details) for each one's regular hours
    python3 scripts/google_hours.py find      for those with no placeId, look them up by name and address first (Text Search)
    python3 scripts/google_hours.py tidy      just rewrite the file, leaving out hours that look like a hotel's

Writes content/opening-hours-google.json in the same shape as content/opening-hours.json (Monday first, days split by ";",
sittings by ","). build.py uses it only where the MICHELIN Guide has no hours, so rerun after `michelin_details.py hours`.
Each call is a paid Places request (the first 1,000 a month are free), so it asks only for restaurants without Michelin hours.
"""
import datetime
import glob
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "content", "opening-hours-google.json")
KEY = re.search(r"AIza[0-9A-Za-z_-]+", open(os.path.join(ROOT, "src", "assets", "common.js"), encoding="utf-8").read()).group(0)
HEADERS = {"X-Goog-Api-Key": KEY, "Referer": "https://starredbill.com/", "Content-Type": "application/json"}


def call(url, fields, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                                 headers=dict(HEADERS, **{"X-Goog-FieldMask": fields}))
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as err:
            if err.code == 404:
                return {}
            if attempt == 2:
                raise
            time.sleep(2)


def restaurants():
    """Every starred restaurant without MICHELIN Guide hours: (id, file path, data)."""
    michelin = json.load(open(os.path.join(ROOT, "content", "opening-hours.json"), encoding="utf-8")).get("hours", {})
    for path in sorted(glob.glob(os.path.join(ROOT, "content", "restaurants", "*", "*.json"))):
        rid = os.path.basename(path)[:-5]
        r = json.load(open(path, encoding="utf-8"))
        if r.get("stars") and rid not in michelin:
            yield rid, path, r


def week_of(hours):
    """Google's regularOpeningHours as our string, or None. Google numbers days from Sunday (0); ours start on Monday.
    A sitting past midnight keeps its closing time ("1800-0100"); one open round the clock is left out."""
    days = [[] for _ in range(7)]
    for p in (hours or {}).get("periods") or []:
        o, c = p.get("open"), p.get("close")
        if not o or not c:
            return None  # open 24 hours: not a restaurant's real hours
        day = (o["day"] - 1) % 7
        days[day].append("%02d%02d-%02d%02d" % (o.get("hour", 0), o.get("minute", 0), c.get("hour", 0), c.get("minute", 0)))
    out = [",".join(sorted(d)) for d in days]
    return ";".join(out) if any(out) else None


def plausible(week):
    """False for hours that look like a hotel's or a whole day's rather than a dining room's (Google's place for a hotel
    restaurant is sometimes the hotel): a sitting round the clock, over 12 hours, or from breakfast time for more than 3½."""
    for day in week.split(";"):
        for s in filter(None, day.split(",")):
            a, b = (int(x) for x in s.split("-"))
            mins = lambda t: t // 100 * 60 + t % 100
            span = (mins(b) - mins(a)) % 1440 or 1440
            if span > 720 or (a < 1000 and span > 210):
                return False
    return True


def metres(a, b, c, d):
    return 6371000 * 2 * math.asin(math.sqrt(math.sin(math.radians(c - a) / 2) ** 2 + math.cos(math.radians(a)) * math.cos(math.radians(c)) * math.sin(math.radians(d - b) / 2) ** 2))


def load():
    if os.path.exists(OUT):
        return json.load(open(OUT, encoding="utf-8"))
    return {"hours": {}}


def save(data, note):
    data["checked"] = datetime.date.today().isoformat()
    data["source"] = "Google"
    dropped = sorted(rid for rid, week in data["hours"].items() if not plausible(week))
    data["hours"] = {rid: week for rid, week in sorted(data["hours"].items()) if rid not in dropped}
    if dropped:
        print(f"Left out {len(dropped)} whose hours look like a hotel's or a whole day's: {', '.join(dropped)}")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(json.dumps({"checked": data["checked"], "source": data["source"], "hours": data["hours"]}, ensure_ascii=False, indent=0) + "\n")
    print(note)


def fetch():
    data, asked, got, closed = load(), 0, 0, []
    for rid, path, r in restaurants():
        if not r.get("placeId"):
            continue
        asked += 1
        j = call("https://places.googleapis.com/v1/places/" + urllib.parse.quote(r["placeId"]), "regularOpeningHours,businessStatus")
        week = week_of(j.get("regularOpeningHours"))
        if j.get("businessStatus") in ("CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"):
            closed.append(f"{rid}: Google says {j['businessStatus'].lower().replace('_', ' ')}")
        if week:
            data["hours"][rid] = week
            got += 1
        else:
            data["hours"].pop(rid, None)
        if asked % 100 == 0:
            print(f"  {asked} asked, {got} with hours")
    save(data, f"Google gave hours for {got} of the {asked} restaurants asked about; written to content/opening-hours-google.json")
    if closed:
        print("Worth checking (not changed):\n  " + "\n  ".join(closed))


def find():
    """Restaurants with no placeId: search Google by name and address, and keep hours only from a place within 300 m."""
    data, asked, got = load(), 0, 0
    for rid, path, r in restaurants():
        if r.get("placeId") or r.get("lat") is None:
            continue
        asked += 1
        body = {"textQuery": f'{r["name"]} {r.get("address", "")}'.strip(), "maxResultCount": 3,
                "locationBias": {"circle": {"center": {"latitude": r["lat"], "longitude": r["lng"]}, "radius": 500.0}}}
        places = call("https://places.googleapis.com/v1/places:searchText",
                      "places.id,places.displayName,places.location,places.regularOpeningHours", body).get("places") or []
        for p in places:
            loc = p.get("location") or {}
            if loc and metres(r["lat"], r["lng"], loc["latitude"], loc["longitude"]) < 300:
                week = week_of(p.get("regularOpeningHours"))
                if week:
                    data["hours"][rid] = week
                    got += 1
                    print(f"  {rid}: {p.get('displayName', {}).get('text')} ({week})")
                break
    save(data, f"Found hours for {got} of the {asked} restaurants without a placeId")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "fetch":
        fetch()
    elif cmd == "find":
        find()
    elif cmd == "tidy":
        save(load(), "Rewrote content/opening-hours-google.json")
    else:
        print(__doc__)
