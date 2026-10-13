#!/usr/bin/env python3
"""Head chefs for content/restaurants (see README, "Chefs and dietary options").

    python3 scripts/chefs.py missing             list starred restaurants without a chef, with their websites (scripts/chef-review.json)
    python3 scripts/chefs.py add FILE            add chefs from FILE: {"restaurant-id": {"chef": "…", "source": "site|press|manual"}}

Chefs come from the restaurants' own websites (scripts/chef_from_sites.py finds candidates), then recent press.
A chef with "chefSource": "manual" is only replaced by another manual one. Replaces scripts/michelin_details.py, retired
on 13 Oct 2026 with the other scripts that read the MICHELIN Guide's website or search index (its terms forbid it).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SOURCES = ("site", "press", "manual")


def restaurants():
    base = os.path.join(ROOT, "content", "restaurants")
    for country in sorted(os.listdir(base)):
        folder = os.path.join(base, country)
        if not os.path.isdir(folder):
            continue
        for f in sorted(os.listdir(folder)):
            if f.endswith(".json"):
                path = os.path.join(folder, f)
                yield f[:-5], path, json.load(open(path, encoding="utf-8"))


def save(path, r):
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(r, ensure_ascii=False, indent=2) + "\n")


def tidy_chef(name):
    """Surnames written in capitals ("Richard EKKEBUS") get ordinary capitals."""
    return " ".join(w.capitalize() if w.isupper() and len(w) > 2 else w for w in name.strip().split())


def missing():
    out = {rid: {"name": r["name"], "website": r.get("website", "")} for rid, _, r in restaurants()
           if r.get("stars") in (1, 2, 3) and not r.get("status") and not r.get("chef")}
    json.dump(out, open(os.path.join(HERE, "chef-review.json"), "w"), ensure_ascii=False, indent=1)
    print(f"{len(out)} starred restaurants without a chef written to scripts/chef-review.json")


def add(file):
    data = json.load(open(file, encoding="utf-8"))
    bad = sorted(rid for rid, c in data.items() if c.get("source") not in SOURCES)
    if bad:
        sys.exit(f"Each chef needs a source of {', '.join(SOURCES)}: {', '.join(bad)}")
    n = 0
    for rid, path, r in restaurants():
        c = data.get(rid)
        if not c or not c.get("chef") or (r.get("chefSource") == "manual" and c["source"] != "manual"):
            continue
        new = dict(r, chef=tidy_chef(c["chef"]), chefSource=c["source"])
        if new != r:
            save(path, new)
            n += 1
    print(f"Added or updated {n} chefs")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "missing":
        missing()
    elif cmd == "add" and len(sys.argv) > 2:
        add(sys.argv[2])
    else:
        print(__doc__)
