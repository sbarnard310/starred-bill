#!/usr/bin/env python3
"""Build The Starred Bill into _site/ from content/ (the data) and src/ (templates, styles and scripts).

    python3 build.py                          build the site, checking the data as it goes
    python3 -m http.server 8799 -d _site      preview it at http://localhost:8799

GitHub runs the same build on every push and publishes _site/ (see .github/workflows/deploy.yml).
It uses only the Python standard library, so there is nothing to install.
"""
import hashlib
import html
import json
import math
import re
import unicodedata
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT, SRC, OUT = ROOT / "content", ROOT / "src", ROOT / "_site"
SITE_URL = "https://starredbill.com"
PLACE_TYPES = ("country", "region", "city", "district", "group")
PLACE_TEXTS = ("intro", "serviceText", "sourcesText", "starsText")
LANGUAGES = ("en", "zh", "yue", "fr", "ja")
LANG_SUFFIXES = ("Zh", "Yue", "Fr", "Ja")  # e.g. nameZh, introYue, dinnerNoteFr, areaJa
DEFAULT_LANGUAGES = ["en", "zh"]
PRICE_TYPES = ("menu", "main", "spend")
STATUSES = ("lost", "closed", "changed")
CHANGES = ("new", "up", "down")
ID_PATTERN = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")

problems = []


def problem(where, message):
    problems.append(f"{where}: {message}")


def read_json(path):
    try:
        return json.loads(path.read_text("utf-8"))
    except ValueError as e:
        problem(path.relative_to(ROOT), f"isn't valid JSON ({e})")
        return None


def tidy(entry):
    """Drop blank fields, which the editor saves as "" or null, so they read as 'not set'."""
    if not isinstance(entry, dict):
        return entry
    return {k: (v.strip() if isinstance(v, str) else v) for k, v in entry.items()
            if v is not None and v != [] and not (isinstance(v, str) and not v.strip())}


# ---------- Load and check the data ----------
currency_data = read_json(CONTENT / "currencies.json") or {}
CURRENCIES = {}
for c in currency_data.get("currencies", []):
    c = tidy(c)
    if not re.fullmatch(r"[A-Z]{3}", c.get("code", "")) or not c.get("symbol") or not isinstance(c.get("perUSD"), (int, float)) or c["perUSD"] <= 0:
        problem("currencies.json", f"{c.get('code', '?')} needs a three-letter code, a symbol and a rate per US dollar above 0")
    else:
        CURRENCIES[c["code"]] = {"symbol": c["symbol"], "perUSD": c["perUSD"]}
for code in currency_data.get("switchable", []):
    if code not in CURRENCIES:
        problem("currencies.json", f"{code} is in the switch but not in the list of currencies")
site = read_json(CONTENT / "site.json") or {}

places = {}
for f in sorted((CONTENT / "places").glob("*.json")):
    p = tidy(read_json(f))
    if not isinstance(p, dict):
        continue
    pid = p.get("id", "")
    where = f"{f.relative_to(ROOT)} ({pid or p.get('name', '?')})"
    if not ID_PATTERN.fullmatch(pid):
        problem(where, "id must be lower-case letters, numbers and hyphens, e.g. new-york")
    elif pid in places:
        problem(where, "the same id is used twice")
    elif p.get("type") not in PLACE_TYPES:
        problem(where, f"type must be one of {', '.join(PLACE_TYPES)}")
    elif not p.get("name"):
        problem(where, "needs a name")
    else:
        places[pid] = p

for pid, p in places.items():
    where = f"places ({pid})"
    if p["type"] in ("region", "city"):
        parent = places.get(p.get("parent"))
        if not parent or parent["type"] not in ("country", "region"):
            problem(where, "parent must be the id of a country or region")
    if p["type"] == "district":
        parent = places.get(p.get("parent"))
        if not parent or parent["type"] != "city":
            problem(where, "a district's parent must be the id of a city, e.g. manhattan inside new-york")
    if p["type"] == "group":
        bad = [i for i in p.get("includes", []) if i not in places or places[i]["type"] == "group"]
        if not p.get("includes") or bad:
            problem(where, "includes must list the ids of countries, regions or cities" + (f" (unknown: {', '.join(bad)})" if bad else ""))
    if p["type"] == "country" and p.get("currency") not in CURRENCIES:
        problem(where, "currency must be one listed in currencies.json")
    if p.get("currency") and p["currency"] not in CURRENCIES:
        problem(where, "currency must be one listed in currencies.json")
    if p.get("languages") and (not isinstance(p["languages"], list) or set(p["languages"]) - set(LANGUAGES) or "en" not in p["languages"]):
        problem(where, f"languages must be a list from {', '.join(LANGUAGES)}, including en")


def chain(pid):
    """The place and everything above it, e.g. london -> [london, england, uk]."""
    out = []
    while pid in places and pid not in out:
        out.append(pid)
        pid = places[pid].get("parent")
    return out


def country_of(pid):
    c = chain(pid)
    return c[-1] if c and places[c[-1]]["type"] == "country" else None


def countries_of(p):
    if p["type"] == "group":
        return sorted({country_of(i) for i in p.get("includes", []) if country_of(i)})
    return [country_of(p["id"])] if country_of(p["id"]) else []


def path_of(p):
    """The page's web address: each place sits inside the ones above it, e.g. /uk/england/london/.
    A collection sits inside its country when it has only one, otherwise at the top level."""
    if p["type"] != "group":
        return "/" + "/".join(reversed(chain(p["id"]))) + "/"
    cs = countries_of(p)
    return f"/{cs[0]}/{p['id']}/" if len(cs) == 1 else f"/{p['id']}/"


def inherited(p, field):
    """A field set on the place itself, or on the nearest place above it."""
    if p["type"] == "group":
        cs = countries_of(p)
        return p.get(field) or (places[cs[0]].get(field) if len(cs) == 1 else None)
    for pid in chain(p["id"]):
        if places[pid].get(field):
            return places[pid][field]
    return None


paths = {}
for pid, p in places.items():
    p["path"] = path_of(p)
    if p["path"] in paths or p["path"].strip("/") in ("assets",):
        problem(f"places ({pid})", f"its address {p['path']} is already used by {paths.get(p['path'], 'the site')}")
    paths[p["path"]] = pid
redirects = {}
for pid, p in places.items():
    for old in p.get("redirectFrom", []):
        if not re.fullmatch(r"/([a-z0-9-]+/)+", old):
            problem(f"places ({pid})", f"old address {old} must look like /uk/london/ (lower case, starting and ending with /)")
        elif old in paths or old in redirects:
            problem(f"places ({pid})", f"old address {old} is still in use by {paths.get(old) or redirects.get(old)}")
        else:
            redirects[old] = pid

restaurants = []
seen = {}
for f in sorted((CONTENT / "restaurants").rglob("*.json")):
    r = tidy(read_json(f))
    where = f.relative_to(ROOT)
    if not isinstance(r, dict):
        continue
    if r.get("noLunch") is False:
        del r["noLunch"]
    rid = f.stem
    if not ID_PATTERN.fullmatch(rid):
        problem(where, "file name must be lower-case letters, numbers and hyphens, e.g. the-ledbury.json")
    if rid in seen:
        problem(where, f"same file name as {seen[rid]}; every restaurant needs its own name")
    seen[rid] = where
    if not r.get("name"):
        problem(where, "needs a name")
    city = places.get(r.get("city"))
    if not city or city["type"] == "group":
        problem(where, f"city \"{r.get('city')}\" isn't a city, region or country in content/places")
        continue
    if r.get("status"):
        if r["status"] not in STATUSES:
            problem(where, f"status must be one of {', '.join(STATUSES)}")
    elif r.get("stars") not in (1, 2, 3):
        problem(where, "stars must be 1, 2 or 3")
    for field in ("dinnerType", "lunchType"):
        if r.get(field) and r[field] not in PRICE_TYPES:
            problem(where, f"{field} must be one of {', '.join(PRICE_TYPES)}")
    if r.get("change") and r["change"] not in CHANGES:
        problem(where, f"change must be one of {', '.join(CHANGES)}")
    for field in ("dinner", "wine", "lunch", "lunchWine", "rating", "reviews", "lat", "lng"):
        if r.get(field) is not None and not isinstance(r[field], (int, float)):
            problem(where, f"{field} must be a number (no currency sign or quotes)")
    country = places.get(country_of(city["id"]))
    r.update({
        "id": rid,
        "cur": country["currency"] if country else "USD",
        "country": country["id"] if country else None,
        "cityName": city["name"], "cityNameZh": city.get("nameZh", ""), "cityNameJa": city.get("nameJa", ""),
        "cityPath": city["path"], "cityType": city["type"],
        "_chain": chain(city["id"]),
    })
    restaurants.append(r)

if problems:
    print("The site wasn't built because of these problems in the data:\n  - " + "\n  - ".join(problems))
    sys.exit(1)


def members(p):
    """Restaurants that belong on a place's page: those in it or anywhere below it."""
    wanted = set(p["includes"]) if p["type"] == "group" else {p["id"]}
    return [r for r in restaurants if wanted & set(r["_chain"])]


starred_n = {pid: sum(1 for r in members(p) if not r.get("status")) for pid, p in places.items()}
# Every place gets a page; one without starred restaurants says so and waits for its first star.
pages = list(places.values())


def public(r):
    return {k: v for k, v in r.items() if not k.startswith("_")}


def names(p):
    """A place's name in every language it has, e.g. {"name": "Paris", "nameZh": "巴黎", "nameFr": "Paris"}."""
    return {k: p[k] for k in ["name"] + ["name" + s for s in LANG_SUFFIXES] if p.get(k)}


def link(p, current=None):
    return dict(names(p), path=p["path"], n=starred_n[p["id"]], current=p["id"] == current)


def by_size(ps):
    return sorted(ps, key=lambda p: (-starred_n[p["id"]], p["name"]))


def explore_links(p):
    """The rows of place links under the page title."""
    rows = []
    # A city's districts (e.g. New York's boroughs), or a district's neighbours in the same city.
    districts = by_size(q for q in pages if q["type"] == "district" and q.get("parent") == (p.get("parent") if p["type"] == "district" else p["id"]))
    if districts and p["type"] in ("city", "district"):
        city = places[districts[0]["parent"]]
        rows.append(dict({k.replace("name", "country"): v for k, v in names(city).items()}, label="exploreDistricts",
                         items=[link(q, p["id"]) for q in districts]))
    if p["type"] == "city":
        country = places.get(country_of(p["id"]))
        cities = [c for c in pages if c["type"] == "city" and country_of(c["id"]) == (country or {}).get("id")]
        if country and len(cities) > 1:
            rows.append(dict({k.replace("name", "country"): v for k, v in names(country).items()}, label="exploreCities",
                             items=[link(c, p["id"]) for c in by_size(cities)]))
    elif p["type"] == "group":
        inside = [places[i] for i in p["includes"] if i in places and starred_n[i]]
        if inside:
            rows.append({"label": "explore", "items": [link(q) for q in inside]})
    else:
        # The regions directly inside (e.g. England's counties), then every city further down (e.g. London, York).
        regions = by_size(q for q in pages if q["type"] == "region" and q.get("parent") == p["id"])
        cities = by_size(q for q in pages if q["type"] == "city" and p["id"] in chain(q["id"])[1:])
        # Up to 12 of the busiest, then every one (with those still waiting for a star) in a fold underneath.
        starred_regions = [q for q in regions if starred_n[q["id"]]]
        if starred_regions:
            rows.append({"label": "explore", "items": [link(q) for q in starred_regions[:12]]})
        if len(starred_regions) > 12 or len(starred_regions) < len(regions):
            rows.append({"label": "exploreAll", "more": True, "items": [link(q) for q in sorted(regions, key=lambda q: q["name"])]})
        if cities:
            rows.append(dict({k.replace("name", "country"): v for k, v in names(p).items()}, label="exploreCities" if regions else "explore",
                             items=[link(q) for q in cities]))
    groups = [g for g in pages if g["type"] == "group" and g["id"] != p["id"] and set(g["includes"]) & set(chain(p["id"]) if p["type"] != "group" else [])]
    if groups:
        rows.append({"label": "alsoIn", "items": [link(g) for g in groups]})
    return rows


def search_example(rs, zh, field=None):
    """A typical area name for the search box, e.g. Mayfair."""
    counts = {}
    for r in rs:
        area = r.get(field or ("areaZh" if zh else "area")) or ""
        if zh:
            area = area[len(r.get("cityNameZh", "")):] if area.startswith(r.get("cityNameZh") or "\0") else area
        else:
            area = area.split(", ")[0]
        if area and area != (r.get("cityNameZh") if zh else r.get("cityName")):
            counts[area] = counts.get(area, 0) + 1
    return max(sorted(counts), key=counts.get) if counts else ""


# ---------- Output helpers ----------
e = html.escape


def money(n, cur):
    if n is None:
        return ""
    return CURRENCIES[cur]["symbol"] + (f"{n:,.0f}" if float(n).is_integer() else f"{n:,.2f}")


def inherited_name_fr(p):
    """How the place reads in a French sentence, e.g. "à Paris" or "en France"."""
    return p.get("inSentenceFr") or (f"à {p.get('nameFr') or p['name']}")


def in_sentence(p):
    return p.get("inSentence") or p["name"]


def as_json(data):
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


assets = {}


def copy_assets():
    (OUT / "assets").mkdir(parents=True)
    for f in sorted((SRC / "assets").iterdir()):
        shutil.copy2(f, OUT / "assets" / f.name)
        assets[f.name] = hashlib.sha1(f.read_bytes()).hexdigest()[:10]


ICONS = (SRC / "icons.svg").read_text("utf-8").strip()


def render(template, values):
    out = (SRC / template).read_text("utf-8")
    out = re.sub(r"\{\{asset:([\w.-]+)\}\}", lambda m: f"/assets/{m.group(1)}?v={assets[m.group(1)]}", out)
    values = dict(values, icons=ICONS)
    out = re.sub(r"\{\{(\w+)\}\}", lambda m: values[m.group(1)], out)
    return out


def write(path, text):
    target = OUT / path.strip("/") / "index.html" if path.endswith("/") else OUT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, "utf-8")


# ---------- Pages ----------
def build_place(p):
    rs = members(p)
    starred = [r for r in rs if not r.get("status")]
    curs = sorted({r["cur"] for r in starred})
    currency = p.get("currency") or inherited(p, "currency") or (curs[0] if len(curs) == 1 else "GBP")
    crumbs = [places[c] for c in reversed(chain(p["id"])[1:])] if p["type"] != "group" else \
        ([places[countries_of(p)[0]]] if len(countries_of(p)) == 1 else [])
    page = dict(names(p), **{
        "id": p["id"], "type": p["type"], "inSentence": in_sentence(p), "inSentenceFr": inherited_name_fr(p),
        "path": p["path"], "currency": currency, "showCity": len({r["city"] for r in starred}) > 1,
        "crumbs": [dict(names(c), path=c["path"], n=starred_n[c["id"]]) for c in crumbs],
        "links": explore_links(p),
        "searchEx": search_example(starred, False), "searchExZh": search_example(starred, True),
        "searchExFr": search_example(starred, False, "areaFr"), "searchExJa": search_example(starred, False, "areaJa"),
    })
    for field in PLACE_TEXTS:
        for suffix in ("",) + LANG_SUFFIXES:
            page[field + suffix] = inherited(p, field + suffix) or ""
    data = {"page": page, "languages": inherited(p, "languages") or DEFAULT_LANGUAGES, "restaurants": [public(r) for r in rs], "currencies": CURRENCIES,
            "switchable": currency_data.get("switchable", []), "rateDate": currency_data.get("rateDate")}

    stars = [sum(1 for r in starred if r["stars"] == s) for s in (1, 2, 3)]
    menus = sorted((r for r in starred if r.get("dinnerType") == "menu" and r.get("dinner") is not None), key=lambda r: r["dinner"])
    where = in_sentence(p)
    description = (f"Dinner, lunch and wine pairing prices at {len(starred)} Michelin-starred restaurants in {where}"
                   f" ({stars[2]} three-star, {stars[1]} two-star, {stars[0]} one-star)"
                   + (f", from {money(menus[0]['dinner'], menus[0]['cur'])} to {money(menus[-1]['dinner'], menus[-1]['cur'])} for a dinner menu." if menus else ".")) if starred else \
        f"There are currently no Michelin-starred restaurants in {where}. We'll add their dinner, lunch and wine pairing prices here as soon as one gets a star."
    intro = page["intro"]
    crumb_html = '<a href="/">All destinations</a>' + "".join(f'<a href="{c["path"]}">{e(c["name"])}</a>' for c in crumbs) + \
        f'<span aria-current="page">{e(p["name"])}</span>'
    explore_html = "".join(
        '<div class="explore-row">' + "".join(
            f'<span class="place-link" aria-current="page">{e(i["name"])}</span>' if i["current"] else f'<a class="place-link" href="{i["path"]}">{e(i["name"])}</a>'
            for i in row["items"]) + "</div>" for row in page["links"] if not row.get("more"))
    ledger = '<ol class="prerender">' + "".join(
        f"<li><strong>{e(r['name'])}</strong> · {r['stars']} Michelin star{'s' if r['stars'] > 1 else ''} · {e(r.get('cuisine', ''))} · {e(r.get('area') or r['cityName'])}"
        + (f" · dinner {money(r['dinner'], r['cur'])}" if r.get("dinner") is not None else "") + "</li>"
        for r in sorted(starred, key=lambda r: (-r["stars"], r["name"]))) + "</ol>"
    write(p["path"], render("place.html", {
        "title": e(f"The Starred Bill · {p['name']}"), "description": e(description), "canonical": SITE_URL + p["path"],
        "eyebrow": e(f"{p['name']} · Michelin Guide restaurants"),
        "h1": f"What a Michelin star <em>costs</em> in {e(where)}.",
        "heroText": e((f"Dinner, lunch and wine pairing prices per person at the starred restaurants in {where}, side by side." + (" " + intro if intro else ""))
                      if starred else f"There are currently no restaurants with a Michelin star in {where}, but we'll update this page as soon as one appears."),
        "crumbs": crumb_html, "explore": explore_html, "ledger": ledger, "data": as_json(data),
    }))


def norm_name(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


NAME_STOP = {"the", "restaurant", "by", "at", "de", "la", "le", "and", "les", "du", "des", "l", "d"}


def metres(a, b, c, d):
    return 6371000 * 2 * math.asin(math.sqrt(math.sin(math.radians(c - a) / 2) ** 2 + math.cos(math.radians(a)) * math.cos(math.radians(c)) * math.sin(math.radians(d - b) / 2) ** 2))


def same_restaurant(w, r):
    """Whether a pin from the world list is one of our own restaurants (similar name, close by)."""
    if r.get("lat") is None or r.get("lng") is None:
        return False
    d = metres(w[2], w[3], r["lat"], r["lng"])
    a, b = norm_name(w[0]), norm_name(r["name"])
    if a == b and (d < 3000 or r["cityName"] in w[5]):
        return True
    if d > 400:
        return False
    if a in b or b in a:
        return True
    ta, tb = set(a.split()) - NAME_STOP, set(b.split()) - NAME_STOP
    return bool(ta and tb and len(ta & tb) / min(len(ta), len(tb)) >= 0.5) or d < 15


def build_world(starred):
    """The homepage's pins for starred restaurants we don't have prices for yet, written to /data/world.json."""
    path = CONTENT / "world-starred.json"
    if not path.exists():
        return None, 0
    rows = read_json(path).get("restaurants", [])
    near = {}
    for r in starred:
        if r.get("lat") is not None:
            near.setdefault((round(r["lat"]), round(r["lng"])), []).append(r)
    others = []
    for w in rows:
        cands = [r for dy in (-1, 0, 1) for dx in (-1, 0, 1) for r in near.get((round(w[2]) + dy, round(w[3]) + dx), [])]
        if not any(same_restaurant(w, r) for r in cands):
            others.append(w)
    body = as_json({"updated": read_json(path).get("updated", ""), "r": others}).encode("utf-8")
    (OUT / "data").mkdir(exist_ok=True)
    (OUT / "data" / "world.json").write_bytes(body)
    return f"/data/world.json?v={hashlib.sha1(body).hexdigest()[:10]}", len(rows)


def build_home():
    starred = [r for r in restaurants if not r.get("status")]
    world_url, world_total = build_world(starred)
    countries = []
    for c in by_size(p for p in pages if p["type"] == "country"):
        mine = [r for r in starred if r["country"] == c["id"]]
        menus = sorted((r for r in mine if r.get("dinnerType") == "menu" and r.get("dinner") is not None), key=lambda r: r["dinner"])
        # The regions directly inside the country (e.g. England, Scotland), then its cities.
        cities = by_size(q for q in pages if q["type"] == "region" and q.get("parent") == c["id"]) + \
            by_size(q for q in pages if q["type"] == "city" and country_of(q["id"]) == c["id"])
        countries.append({
            **names(c), "id": c["id"], "path": c["path"], "n": starred_n[c["id"]],
            "from": {"price": menus[0]["dinner"], "cur": menus[0]["cur"], "name": menus[0]["name"], "nameZh": menus[0].get("nameZh", "")} if menus else None,
            "cities": [dict(link(q), type=q["type"]) for q in cities],
        })
    groups = [link(g) for g in by_size(g for g in pages if g["type"] == "group")]
    keep = ("id", "name", "nameZh", "nameJa", "stars", "cuisine", "cuisineZh", "lat", "lng", "dinner", "dinnerType", "cur", "rating",
            "country", "cityName", "cityNameZh", "cityPath")
    data = {
        # Restaurants listed under a region or country rather than a city also carry their town, e.g. Aughton.
        "restaurants": [dict({k: r[k] for k in keep if r.get(k) is not None}, **({"town": r["area"].split(", ")[0]} if r["cityType"] != "city" and r.get("area") else {}))
                        for r in starred],
        "knownIds": [r["id"] for r in starred],
        "countries": countries, "groups": groups,
        "places": [dict(link(p), type=p["type"]) for p in by_size(pages)],
        "currencies": CURRENCIES, "updated": site.get("updated", ""),
        "worldUrl": world_url, "worldTotal": world_total, "languages": DEFAULT_LANGUAGES,
    }
    country_names = ", ".join(c["name"] for c in countries)
    cards = "".join(
        f'<article class="dest"><div class="dest-top"><h3><a href="{c["path"]}">{e(c["name"])}</a></h3></div>'
        f'<p class="dest-meta">{c["n"]} starred restaurants</p>'
        + "".join(f'<a class="city-link" href="{q["path"]}">{e(q["name"])}</a> ' for q in c["cities"]) + "</article>"
        for c in countries)
    write("/", render("home.html", {
        "title": "The Starred Bill · Michelin-starred restaurant prices",
        "description": e(f"Compare dinner, lunch and wine pairing prices at {len(starred)} Michelin-starred restaurants in {country_names}, city by city."),
        "canonical": SITE_URL + "/",
        "eyebrow": "Michelin Guide restaurants, priced",
        "h1": "What a Michelin star <em>costs</em>, city by city.",
        "heroText": "Dinner, lunch and wine pairing prices per person at Michelin-starred restaurants, side by side and linked to where each price came from.",
        "destinations": cards, "data": as_json(data),
    }))


def build_redirects():
    """Pages at old addresses that send visitors on to where the page lives now, keeping any ?q= search."""
    for old, pid in sorted(redirects.items()):
        new = places[pid]["path"]
        write(old, f'''<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>The Starred Bill · {e(places[pid]["name"])}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="{SITE_URL}{new}">
<script>location.replace("{new}" + location.search + location.hash);</script>
<meta http-equiv="refresh" content="0; url={new}">
</head>
<body><p>This page has moved to <a href="{new}">{SITE_URL}{new}</a>.</p></body>
</html>
''')


def build_account_pages():
    """The account page (/account/) and the privacy notice (/privacy/). Signing in and the lists run in the browser (account.js)."""
    keep = ("id", "name", "nameZh", "nameJa", "stars", "formerStars", "status", "area", "areaZh", "areaJa",
            "cityName", "cityNameZh", "cityNameJa", "cityPath", "country", "cur", "dinner", "dinnerType")
    data = {
        "restaurants": [dict({k: r[k] for k in keep if r.get(k) not in (None, "")}, chain=r["_chain"]) for r in restaurants],
        "places": [dict(link(p), id=p["id"], type=p["type"]) for p in by_size(q for q in pages if q["type"] != "group" and starred_n[q["id"]])],
        "knownIds": [r["id"] for r in restaurants],
        "currencies": CURRENCIES, "languages": list(LANGUAGES),
    }
    write("/account/", render("account.html", {
        "title": "Your account · The Starred Bill", "description": "Your wishlist and the Michelin-starred restaurants you've been to, on any device.",
        "canonical": SITE_URL + "/account/", "data": as_json(data),
    }))
    write("/privacy/", render("privacy.html", {
        "title": "Privacy notice · The Starred Bill", "description": "What The Starred Bill keeps about you, and why.",
        "canonical": SITE_URL + "/privacy/", "data": as_json({"currencies": CURRENCIES, "languages": list(LANGUAGES)}),
    }))


def build_extras():
    shutil.copy2(SRC / "favicon.svg", OUT / "favicon.svg")
    shutil.copy2(SRC / "404.html", OUT / "404.html")
    shutil.copy2(SRC / "manifest.webmanifest", OUT / "manifest.webmanifest")
    shutil.copytree(SRC / "icons", OUT / "icons")
    if (ROOT / "CNAME").exists():
        shutil.copy2(ROOT / "CNAME", OUT / "CNAME")
    urls = ["/"] + [p["path"] for p in by_size(pages)] + ["/privacy/"]
    (OUT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{SITE_URL}{u}</loc></url>\n" for u in urls) + "</urlset>\n", "utf-8")
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n", "utf-8")


def build_service_worker():
    """The offline helper. Its version changes whenever any file in the site does, so phones pick up updates."""
    digest = hashlib.sha1()
    for f in sorted(OUT.rglob("*")):
        if f.is_file():
            digest.update(str(f.relative_to(OUT)).encode() + f.read_bytes())
    precache = ["/", "/manifest.webmanifest", "/favicon.svg", "/icons/icon-192.png"] + [f"/assets/{name}?v={v}" for name, v in sorted(assets.items())]
    sw = (SRC / "sw.js").read_text("utf-8").replace("{{version}}", digest.hexdigest()[:12]).replace("{{precache}}", json.dumps(precache))
    (OUT / "sw.js").write_text(sw, "utf-8")


if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
copy_assets()
for p in pages:
    build_place(p)
build_home()
build_account_pages()
build_redirects()
build_extras()
build_service_worker()
print(f"Built {len(pages) + 1} pages from {len(restaurants)} restaurants into {OUT.relative_to(ROOT)}/:")
print("  /  (homepage)")
for p in sorted(pages, key=lambda p: p["path"]):
    print(f"  {p['path']}  {p['name']}, {starred_n[p['id']]} starred")
for old, pid in sorted(redirects.items()):
    print(f"  {old}  now sends visitors to {places[pid]['path']}")
