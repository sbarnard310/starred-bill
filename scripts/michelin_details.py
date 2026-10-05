#!/usr/bin/env python3
"""Adds each restaurant's head chef and dietary options from the MICHELIN Guide (see README, "Chefs and dietary options").

    python3 scripts/michelin_details.py fetch            download every starred restaurant from the MICHELIN Guide's search index
    python3 scripts/michelin_details.py apply            match them to content/restaurants and write michelinId, diets and chef
    python3 scripts/michelin_details.py review           list restaurants still without a chef, with Michelin's description
    python3 scripts/michelin_details.py chefs FILE       add chefs from FILE: {"restaurant-id": {"chef": "…", "source": "michelin|site|press|manual"}}

Run fetch then apply after each guide release. A chef with "chefSource": "manual" is never overwritten.
The download is kept in scripts/michelin-details.json (not committed).
"""
import json
import math
import os
import re
import sys
import unicodedata
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, "michelin-details.json")
ALGOLIA = "https://8nvhrd7onv-dsn.algolia.net/1/indexes/prod-restaurants-en/query"
HEADERS = {"X-Algolia-Application-Id": "8NVHRD7ONV", "X-Algolia-API-Key": "3222e669cf890dc73fa5f38241117ba5",
           "Referer": "https://guide.michelin.com/", "Content-Type": "application/json"}
STARRED = "(michelin_award:ONE_STAR OR michelin_award:TWO_STARS OR michelin_award:THREE_STARS)"
FIELDS = ["objectID", "name", "_geoloc", "chef", "main_desc", "special_diets", "cuisines", "url", "city", "country", "michelin_award"]
# Michelin's special_diets slugs -> ours
DIETS = {"vegetarian_menu": "vegetarian-menu", "vegetarian-options": "vegetarian", "vegan": "vegan",
         "gluten-free": "gluten-free", "halal": "halal", "koshel": "kosher", "kosher": "kosher"}
DIET_ORDER = ["vegetarian-only", "vegetarian-menu", "vegetarian", "vegan", "gluten-free", "halal", "kosher"]


def query(body):
    req = urllib.request.Request(ALGOLIA, data=json.dumps(body).encode(), headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def fetch():
    countries = query({"query": "", "hitsPerPage": 0, "filters": STARRED, "facets": ["country.slug"], "maxValuesPerFacet": 500})["facets"]["country.slug"]
    hits = []
    for slug, n in sorted(countries.items()):
        got = query({"query": "", "hitsPerPage": 1000, "filters": f"country.slug:{slug} AND {STARRED}", "attributesToRetrieve": FIELDS})["hits"]
        if len(got) < n:
            print(f"  {slug}: only {len(got)} of {n} came back")
        hits += got
    for h in hits:
        h.pop("_highlightResult", None); h.pop("_snippetResult", None)
    json.dump(hits, open(CACHE, "w"), ensure_ascii=False)
    print(f"Saved {len(hits)} starred restaurants from {len(countries)} countries to scripts/{os.path.basename(CACHE)}")


# ---------- Matching (the same test build.py uses for the world map) ----------
NAME_STOP = {"the", "restaurant", "by", "at", "de", "la", "le", "and", "les", "du", "des", "l", "d"}


def norm_name(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def metres(a, b, c, d):
    return 6371000 * 2 * math.asin(math.sqrt(math.sin(math.radians(c - a) / 2) ** 2 + math.cos(math.radians(a)) * math.cos(math.radians(c)) * math.sin(math.radians(d - b) / 2) ** 2))


def score(h, r):
    """How well a Michelin record fits one of our restaurants: None if it doesn't, lower is better."""
    if r.get("lat") is None or not h.get("_geoloc"):
        return None
    d = metres(h["_geoloc"]["lat"], h["_geoloc"]["lng"], r["lat"], r["lng"])
    a, b = norm_name(h["name"]), norm_name(r["name"])
    if a == b and d < 25000:  # Michelin's own map pins are occasionally kilometres out
        return d
    if d > 400:
        return None
    if a in b or b in a:
        return d + 1
    ta, tb = set(a.split()) - NAME_STOP, set(b.split()) - NAME_STOP
    if ta and tb and len(ta & tb) / min(len(ta), len(tb)) >= 0.5:
        return d + 2
    return d + 1000 if d < 15 else None


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


def diets_of(h):
    out = {DIETS[d["slug"]] for d in (h.get("special_diets") or []) if d.get("slug") in DIETS}
    if any(c.get("slug") in ("vegetarian", "vegan") for c in (h.get("cuisines") or [])):
        out.add("vegetarian-only")
    return [d for d in DIET_ORDER if d in out]


def tidy_chef(name):
    """Michelin sometimes writes surnames in capitals ("Richard EKKEBUS")."""
    words = name.strip().split()
    return " ".join(w.capitalize() if w.isupper() and len(w) > 2 else w for w in words)


def matches():
    hits = json.load(open(CACHE, encoding="utf-8"))
    by_id = {h["objectID"]: h for h in hits}
    pairs, unmatched, taken = {}, [], set()
    ours = [(rid, path, r) for rid, path, r in restaurants() if r.get("stars") in (1, 2, 3) and not r.get("status")]
    for rid, path, r in ours:
        if r.get("michelinId") in by_id:
            pairs[rid] = by_id[r["michelinId"]]; taken.add(r["michelinId"])
    for rid, path, r in ours:
        if rid in pairs:
            continue
        best = sorted((s, h["objectID"]) for h in hits if h["objectID"] not in taken for s in [score(h, r)] if s is not None)
        if best:
            pairs[rid] = by_id[best[0][1]]; taken.add(best[0][1])
        else:
            unmatched.append((rid, r["name"]))
    return ours, pairs, unmatched, [h for h in hits if h["objectID"] not in taken]


def apply():
    ours, pairs, unmatched, spare = matches()
    counts = {"chef": 0, "diets": 0}
    for rid, path, r in ours:
        h = pairs.get(rid)
        if not h:
            continue
        new = dict(r)
        new["michelinId"] = h["objectID"]
        new["diets"] = diets_of(h)
        if not new["diets"]:
            new.pop("diets")
        if h.get("chef") and r.get("chefSource") != "manual":
            new["chef"], new["chefSource"] = tidy_chef(h["chef"]), "michelin"
        counts["chef"] += bool(new.get("chef")); counts["diets"] += bool(new.get("diets"))
        if new != r:
            save(path, new)
    print(f"Matched {len(pairs)} of {len(ours)} starred restaurants; {counts['diets']} have dietary options, {counts['chef']} have a chef.")
    if unmatched:
        print(f"{len(unmatched)} of ours not found in the MICHELIN Guide:\n  " + "\n  ".join(f"{i} ({n})" for i, n in unmatched))
    if spare:
        print(f"{len(spare)} MICHELIN Guide starred restaurants not matched to ours:\n  " + "\n  ".join(f"{h['name']} ({h.get('city', {}).get('name', '')})" for h in spare))


def review():
    _, pairs, _, _ = matches()
    out = {}
    for rid, path, r in restaurants():
        if r.get("stars") in (1, 2, 3) and not r.get("status") and not r.get("chef") and rid in pairs:
            out[rid] = {"name": r["name"], "desc": pairs[rid].get("main_desc", ""), "website": r.get("website", "")}
    path = os.path.join(HERE, "chef-review.json")
    json.dump(out, open(path, "w"), ensure_ascii=False, indent=1)
    print(f"{len(out)} restaurants without a chef written to scripts/chef-review.json")


def chefs(file):
    data = json.load(open(file, encoding="utf-8"))
    n = 0
    for rid, path, r in restaurants():
        c = data.get(rid)
        if not c or not c.get("chef") or (r.get("chefSource") == "manual" and c.get("source") != "manual"):
            continue
        new = dict(r, chef=tidy_chef(c["chef"]), chefSource=c.get("source", "michelin"))
        if new != r:
            save(path, new); n += 1
    print(f"Added or updated {n} chefs")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "fetch":
        fetch()
    elif cmd == "apply":
        apply()
    elif cmd == "review":
        review()
    elif cmd == "chefs" and len(sys.argv) > 2:
        chefs(sys.argv[2])
    else:
        print(__doc__)
