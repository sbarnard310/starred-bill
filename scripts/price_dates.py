#!/usr/bin/env python3
"""When each restaurant's recorded prices last changed, worked out from the git history (Phase 1, 27 Oct 2026).

    python3 scripts/price_dates.py            list what would change
    python3 scripts/price_dates.py --write    write priceChangedAt / lunchChangedAt into the restaurant files

`priceChangedAt` is the last day the dinner price or its wine pairing changed in our files (or was first entered), and
`lunchChangedAt` the same for lunch and the lunch wine. They say when our record changed, never that anyone checked the
restaurant that day: that's `priceVerifiedAt` / `lunchVerifiedAt`, set only by a real check (scripts/prices.py verify).
Run it again any time (after Pages CMS edits, before a quarterly price snapshot): it only moves a date forward, to a
later change git shows, and leaves every other field alone. Files are matched by name (the restaurant's id), so a file
moved between country folders keeps its history. Standard library only, Python 3.9.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "content" / "restaurants"
GROUPS = {"dinner": "priceChangedAt", "wine": "priceChangedAt", "lunch": "lunchChangedAt", "lunchWine": "lunchChangedAt"}
LINE = re.compile(r'^([-+])  "(dinner|wine|lunch|lunchWine)": (.*?),?$')  # top-level keys only (menus' "wine" sit deeper)


def changes():
    """{restaurant id: {"priceChangedAt": day, "lunchChangedAt": day}} from every commit that touched the files, oldest first."""
    log = subprocess.run(["git", "log", "--reverse", "--no-renames", "-U0", "--format=@@C %H %cI", "-p", "--", "content/restaurants"],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout
    value, out = {}, {}
    day, seen = None, {}

    def close_commit():
        # Within one commit a moved file shows as removed from one folder and added to another: what counts is the value
        # the restaurant ends the commit with, against the one it started with.
        for (rid, key), (minus, plus) in seen.items():
            new = plus if plus is not None else (None if minus is not None else value.get((rid, key)))
            if new != value.get((rid, key)):
                if new is not None:
                    out.setdefault(rid, {})[GROUPS[key]] = max(out.get(rid, {}).get(GROUPS[key], ""), day)
                value[(rid, key)] = new
        seen.clear()

    rid = None
    for line in log.splitlines():
        if line.startswith("@@C "):
            close_commit()
            day = line.split()[2][:10]
        elif line.startswith("+++ ") or line.startswith("--- "):
            path = line[4:].strip()
            if path != "/dev/null" and path.endswith(".json"):
                rid = Path(path).stem
        else:
            m = LINE.match(line)
            if m and rid:
                sign, key, raw = m.groups()
                try:
                    v = json.loads(raw)
                except ValueError:
                    v = raw
                minus, plus = seen.get((rid, key), (None, None))
                seen[(rid, key)] = (v if sign == "-" else minus, v if sign == "+" else plus)
    close_commit()
    return out


def main():
    write = "--write" in sys.argv
    found = changes()
    moved = 0
    for f in sorted(DIR.glob("*/*.json")):
        data = json.loads(f.read_text("utf-8"))
        want = found.get(f.stem, {})
        new = dict(data)
        for field in ("priceChangedAt", "lunchChangedAt"):
            has = "dinner" if field == "priceChangedAt" else "lunch"
            if data.get(has) is None:
                continue
            if want.get(field) and want[field] > (data.get(field) or ""):
                new[field] = want[field]
        if new != data:
            moved += 1
            if write:
                f.write_text(json.dumps(new, ensure_ascii=False, indent=2) + "\n", "utf-8")
            elif moved <= 20:
                print(f"{f.stem}: " + ", ".join(f"{k} {data.get(k) or '–'} → {new[k]}" for k in ("priceChangedAt", "lunchChangedAt") if new.get(k) != data.get(k)))
    print(f"{moved} restaurant files {'updated' if write else 'would change (run with --write)'}")


if __name__ == "__main__":
    main()
