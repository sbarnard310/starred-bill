"""Restaurant pages in waves (16 Oct 2026, to-do item seo-restaurant-pages, round 2).

The researched restaurant pages are listed in build.py's RESTAURANT_PAGES. Every other starred restaurant with a price gets
a simpler page (the same template, without hand-researched menus or booking rules), released a wave at a time so Google
isn't handed thousands of new pages at once: content/restaurant-pages.json lists each wave's restaurants and the day it
goes live (`from`), and the first build on or after that day publishes it. Two- and three-stars came first, then one-stars
by popularity (Google review count), WAVE_SIZE a week.

    python3 scripts/restaurant_waves.py list        each wave, its day and size, and what's waiting for a wave
    python3 scripts/restaurant_waves.py add         put restaurants that qualify but aren't in a wave (new stars, new
                                                    prices) into the last wave not yet live, or a new one a week later
    python3 scripts/restaurant_waves.py make DAY    write the waves from scratch, the first on DAY (done once, 16 Oct 2026)
    python3 scripts/restaurant_waves.py due [DAY]   how many restaurants' pages go live on DAY (default today, UTC)
    python3 scripts/restaurant_waves.py ping DAY    send those pages to IndexNow (once they're live)

.github/workflows/restaurant-waves.yml runs `due` every morning; on a wave's day it pushes an empty commit so Cloudflare
rebuilds and publishes the wave, waits until it's live, then runs `ping` (the IndexNow workflow can't see a wave: it
compares two builds made the same day, which both include it).

A restaurant qualifies when it holds a star, is open (no `status`), has no `notice` (closed for now, closing) and has a
dinner or lunch price. Standard library only, Python 3.9.
"""
import json
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WAVES = ROOT / "content" / "restaurant-pages.json"
WAVE_SIZE = 300
WAVE_DAYS = 7


def researched():
    """The ids in build.py's RESTAURANT_PAGES."""
    src = (ROOT / "build.py").read_text("utf-8")
    start = re.search(r"^RESTAURANT_PAGES = \(", src, re.M).end()
    depth, i = 1, start
    while depth:
        depth += {"(": 1, ")": -1}.get(src[i], 0)
        i += 1
    body = "\n".join(line.split("#")[0] for line in src[start:i].splitlines())
    return set(re.findall(r'"([a-z0-9-]+)"', body))


def restaurants():
    out = {}
    for f in sorted((ROOT / "content" / "restaurants").glob("*/*.json")):
        out[f.stem] = json.loads(f.read_text("utf-8"))
    return out


def qualifies(r):
    return bool(r.get("stars")) and not r.get("status") and not r.get("notice") and (r.get("dinner") or r.get("lunch")) is not None


def popularity(item):
    """Most stars first, then those on the most critics' lists (we no longer keep Google review counts, 24 Oct 2026)."""
    rid, r = item
    return (-r["stars"], -len(r.get("rankings") or []), rid)


def waiting(rs, data):
    taken = researched() | {i for w in data["waves"] for i in w["ids"]}
    return sorted(((k, r) for k, r in rs.items() if k not in taken and qualifies(r)), key=popularity)


def save(data):
    WAVES.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")


def make(day):
    rs = restaurants()
    data = {"waves": []}
    todo = waiting(rs, data)
    top = [k for k, r in todo if r["stars"] >= 2]
    ones = [k for k, r in todo if r["stars"] == 1]
    data["waves"].append({"from": day.isoformat(), "label": "Two- and three-star restaurants", "ids": top})
    for n, i in enumerate(range(0, len(ones), WAVE_SIZE), 1):
        data["waves"].append({"from": (day + timedelta(days=WAVE_DAYS * n)).isoformat(),
                              "label": f"One-star restaurants, most reviewed first ({n})", "ids": ones[i:i + WAVE_SIZE]})
    save(data)
    show(data, rs)


def add():
    rs = restaurants()
    data = json.loads(WAVES.read_text("utf-8"))
    todo = [k for k, _ in waiting(rs, data)]
    if not todo:
        print("Every restaurant that qualifies is on a page or in a wave.")
        return
    today = date.today().isoformat()
    later = [w for w in data["waves"] if w["from"] > today]
    if later:
        later[-1]["ids"].extend(todo)
        print(f"Added {len(todo)} to the wave of {later[-1]['from']}: {', '.join(todo)}")
    else:
        last = max(date.fromisoformat(w["from"]) for w in data["waves"])
        day = max(last + timedelta(days=WAVE_DAYS), date.today() + timedelta(days=1)).isoformat()
        data["waves"].append({"from": day, "label": "Restaurants added since", "ids": todo})
        print(f"Added a wave of {len(todo)} for {day}: {', '.join(todo)}")
    save(data)


def show(data, rs):
    today = date.today().isoformat()
    for w in data["waves"]:
        stars = [rs[i]["stars"] for i in w["ids"] if i in rs]
        print(f"{w['from']}  {'live   ' if w['from'] <= today else 'waiting'}  {len(w['ids']):4}  {w['label']}"
              f"  ({stars.count(3)} three-star, {stars.count(2)} two-star, {stars.count(1)} one-star)")
    left = waiting(rs, data)
    print(f"Not in any wave yet: {len(left)}" + (" (run: python3 scripts/restaurant_waves.py add)" if left else ""))
    held = sorted(k for k, r in rs.items() if k not in researched() and r.get("stars") and not r.get("status") and r.get("notice")
                  and (r.get("dinner") or r.get("lunch")) is not None)
    if held:
        print(f"Held back for their notice (closed for now, closing): {', '.join(held)}")


def due(day):
    """The restaurants whose wave goes live on `day` ("2026-10-23")."""
    data = json.loads(WAVES.read_text("utf-8"))
    return [i for w in data["waves"] if w["from"] == day for i in w["ids"]]


def ping(day):
    sys.path.insert(0, str(ROOT / "scripts"))
    import indexnow
    build = (ROOT / "build.py").read_text("utf-8")
    site = re.search(r'^SITE_URL = "([^"]+)"', build, re.M).group(1)
    key = re.search(r'^INDEXNOW_KEY = "([0-9a-f]{32})"', build, re.M).group(1)
    urls = [f"{site}/restaurants/{i}/" for i in due(day)]
    if urls:
        indexnow.send(urls, key)
    else:
        print(f"No wave on {day}.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
    if cmd == "make":
        if WAVES.exists() and "--force" not in sys.argv:
            sys.exit(f"{WAVES.name} already exists; use add, or make DAY --force to start again")
        make(date.fromisoformat(sys.argv[2]))
    elif cmd == "add":
        add()
    elif cmd == "due":
        print(len(due(sys.argv[2] if len(sys.argv) > 2 else datetime.now(timezone.utc).date().isoformat())))
    elif cmd == "ping":
        ping(sys.argv[2])
    else:
        show(json.loads(WAVES.read_text("utf-8")), restaurants())
