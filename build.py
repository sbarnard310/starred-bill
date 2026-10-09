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
import urllib.parse
import shutil
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT, SRC, OUT = ROOT / "content", ROOT / "src", ROOT / "_site"
SITE_URL = "https://starredbill.com"
PLACE_TYPES = ("country", "region", "city", "district", "group")
PLACE_TEXTS = ("intro", "serviceText", "sourcesText", "starsText")
# Languages added from 5 Oct 2026 keep their words in src/assets/lang-<code>.js, loaded only by pages that offer them.
LANG_FILES = ("zhs", "de", "nl", "pt", "nb", "fi", "pl", "cs", "hu", "sl", "hr", "sr", "el", "tr", "lt", "lv", "et", "mt", "ms", "fil", "vi", "ar")
RTL_LANGUAGES = ("ar",)  # right to left: their pages also load assets/rtl.css
LANGUAGES = ("en", "zh", "yue", "fr", "ja", "es", "it", "ko", "da", "sv", "is", "ca", "th") + LANG_FILES
LANG_SUFFIXES = ("Zh", "Yue", "Fr", "Ja", "Es", "It", "Ko", "Da", "Sv", "Is", "Ca", "Th") + tuple(c[0].upper() + c[1:] for c in LANG_FILES)  # e.g. nameZh, introYue, dinnerNoteFr, areaJa, statusNoteEs, nameZhs
# How a place reads mid-sentence where a preposition in front of its name is enough ("in München", "em Lisboa", "tại Hà Nội").
# Languages that decline names (Finnish "Helsingissä", Polish "w Warszawie"…) aren't listed: each place sets inSentence<Sfx> itself.
IN_PREPOSITIONS = (("Da", "i"), ("Sv", "i"), ("Is", "í"), ("Ca", "a"), ("Th", "ใน"), ("De", "in"), ("Nl", "in"), ("Pt", "em"), ("Nb", "i"),
                   ("Ms", "di"), ("Fil", "sa"), ("Vi", "tại"), ("Ar", "في"))
DECLINED = ("Fi", "Pl", "Cs", "Hu", "Sl", "Hr", "Sr", "El", "Tr", "Lt", "Lv", "Et", "Mt")
DEFAULT_LANGUAGES = ["en"]  # a country without `languages` (and the homepage, account and privacy pages) is English only
# Each language version of a destination page has its own address, e.g. /fr/france/paris/ (English keeps /france/paris/).
# Search engines are told about the versions with hreflang codes: ISO 639-1, plus the script for Chinese (they don't know yue or fil).
HREFLANG = {"zh": "zh-Hant", "yue": "zh-HK", "zhs": "zh-Hans", "fil": "tl"}
CJK_NAMES = ("zh", "yue", "zhs", "ja", "ko")  # languages that use the place's name mid-sentence, without a preposition
PRICE_TYPES = ("menu", "main", "spend")
STATUSES = ("lost", "closed", "changed")
CHANGES = ("new", "up", "down")
# Dietary options, from the MICHELIN Guide (scripts/michelin_details.py). "vegetarian-only" marks a vegetarian or vegan restaurant.
DIETS = ("vegetarian-only", "vegetarian-menu", "vegetarian", "vegan", "gluten-free", "halal", "kosher")
CHEF_SOURCES = ("michelin", "site", "press", "manual")
MENU_MEALS = ("dinner", "lunch", "lounge")  # where a menu in `menus` is served: the dining room at dinner or lunch, or the bar/lounge
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
source_files = {}  # each place's and restaurant's file, for the sitemap's last-changed dates
for f in sorted((CONTENT / "places").glob("*.json")):
    p = tidy(read_json(f))
    if not isinstance(p, dict):
        continue
    pid = p.get("id", "")
    source_files["place:" + pid] = f.relative_to(ROOT).as_posix()
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
for pid, p in places.items():
    if p["path"].split("/")[1] in LANGUAGES:
        problem(f"places ({pid})", f"its address {p['path']} starts with a language code, which the translated pages use (e.g. /fr/france/)")
# In languages that decline names, every place offering the language says how it reads mid-sentence (Polish "w Warszawie").
for pid, p in places.items():
    for lang in inherited(p, "languages") or []:
        sfx = lang[0].upper() + lang[1:]
        if sfx in DECLINED and not p.get("inSentence" + sfx):
            problem(f"places ({pid})", f"is offered in {lang}, so it needs inSentence{sfx}: its name as it reads after \"in\" in that language")
# A place's own English title, search snippet and opening sentence (e.g. Boston's "Are There Any?") replace the
# generated ones, so they must fit where Google shows them.
for pid, p in places.items():
    if len(p.get("title") or "") > 61:  # TITLE_MAX, set further down
        problem(f"places ({pid})", f"its title is {len(p['title'])} characters; keep it to 61")
    if len(p.get("description") or "") > 155:
        problem(f"places ({pid})", f"its description is {len(p['description'])} characters; keep it to 155")

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
    source_files[rid] = f.relative_to(ROOT).as_posix()
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
    if r.get("noPairing") not in (None, True, False):
        problem(where, "noPairing must be true or false")
    elif r.get("noPairing") and (r.get("wine") is not None or r.get("lunchWine") is not None):
        problem(where, "noPairing says there's no wine pairing, but wine or lunchWine has a price: remove one")
    if r.get("diets") is not None and (not isinstance(r["diets"], list) or set(r["diets"]) - set(DIETS)):
        problem(where, f"diets must be a list made from {', '.join(DIETS)}")
    if r.get("chef") is not None and not isinstance(r["chef"], str):
        problem(where, "chef must be a name in quotes, e.g. \"Clare Smyth\"")
    # The details only a restaurant's own page shows: its menus, past prices and practical information.
    for i, m in enumerate(r.get("menus") or []):
        if not isinstance(m, dict) or not m.get("name") or not isinstance(m.get("price"), (int, float)) or m.get("meal", "dinner") not in MENU_MEALS:
            problem(where, f"menu {i + 1} needs a name, a price (a number) and meal set to {', '.join(MENU_MEALS)}")
        elif any(m.get(k) is not None and not isinstance(m[k], (int, float)) for k in ("wine", "courses")):
            problem(where, f"menu {i + 1}: wine and courses must be numbers")
    for i, h in enumerate(r.get("priceHistory") or []):
        if not isinstance(h, dict) or not re.fullmatch(r"\d{4}-\d{2}", str(h.get("date", ""))) or not isinstance(h.get("price"), (int, float)):
            problem(where, f"priceHistory {i + 1} needs a date like 2019-10 and a price (a number)")
    if r.get("starsSince") is not None and not (isinstance(r["starsSince"], int) and 1926 <= r["starsSince"] <= date.today().year):
        problem(where, "starsSince must be a year, e.g. 2005")
    for field in ("menusChecked", "infoChecked"):
        if r.get(field) and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", r[field]):
            problem(where, f"{field} must be a date like 2026-10-09")
    if r.get("chefSource") and r["chefSource"] not in CHEF_SOURCES:
        problem(where, f"chefSource must be one of {', '.join(CHEF_SOURCES)}")
    country = places.get(country_of(city["id"]))
    r.update({
        "id": rid,
        "cur": country["currency"] if country else "USD",
        "country": country["id"] if country else None,
        "cityName": city["name"], **{"cityName" + sfx: city.get("name" + sfx, "") for sfx in LANG_SUFFIXES if sfx != "Yue"},
        "cityPath": city["path"], "cityType": city["type"],
        "_chain": chain(city["id"]),
    })
    restaurants.append(r)

# Guides: one JSON file per article in content/guides/, its name being the page's address (/guides/<name>/).
guides = {}
# The Guides page's groups, in order: a guide's `section` puts it in one (else it goes under "More guides").
GUIDE_SECTIONS = {
    "stars": ("Understanding the stars", "What the stars mean, how restaurants win and lose them, and the MICHELIN Guide’s other awards."),
    "where": ("Where to find them", "Every starred restaurant by country, the world’s three-star tables and the best of London."),
    "no-stars": ("No stars yet", "Big food countries the MICHELIN Guide hasn’t starred, and when that might change."),
}
GUIDE_FIELDS = ("title", "description", "h1", "summary", "published", "updated", "body")
for path in sorted((CONTENT / "guides").glob("*.json")) if (CONTENT / "guides").exists() else []:
    where = f"guides/{path.name}"
    g = tidy(read_json(path) or {})
    gid = path.stem
    if g.get("id") and g["id"] != gid:
        problem(where, f"id is \"{g['id']}\" but the file is named {gid}.json; they must match")
    if not ID_PATTERN.fullmatch(gid):
        problem(where, "the file name must be lowercase words joined by hyphens, like what-is-a-michelin-star")
    for field in GUIDE_FIELDS:
        if not g.get(field):
            problem(where, f"needs a {field}")
    if len(g.get("title", "")) > 60:
        problem(where, f"title is {len(g['title'])} characters; search results cut it off after 60")
    if len(g.get("description", "")) > 155:
        problem(where, f"description is {len(g['description'])} characters; keep it to 155")
    if g.get("section") and g["section"] not in GUIDE_SECTIONS:
        problem(where, f"section is \"{g['section']}\"; use one of " + ", ".join(GUIDE_SECTIONS))
    for field in ("published", "updated"):
        if g.get(field) and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", g[field]):
            problem(where, f"{field} must be a date like 2026-10-05")
    g["faq"] = [tidy(f) for f in g.get("faq", []) if tidy(f).get("q") and tidy(f).get("a")]
    if not isinstance(g.get("keywords", []), list) or not all(isinstance(k, str) and k.strip() for k in g.get("keywords", [])):
        problem(where, "keywords must be a list of search phrases, the main one first")
    g["keywords"] = [k.strip() for k in g.get("keywords", []) if isinstance(k, str) and k.strip()]
    if not isinstance(g.get("places", []), list) or any(i not in places for i in g.get("places", [])):
        problem(where, "places must be a list of place ids (file names in content/places), e.g. [\"london\"]")
    g["picks"] = [tidy(p) for p in g.get("picks", []) if isinstance(p, dict) and tidy(p).get("restaurant") and tidy(p).get("text")]
    for p in g["picks"]:
        if p["restaurant"] not in {r["id"] for r in restaurants}:
            problem(where, f"picks names \"{p['restaurant']}\", which isn't a restaurant file name")
    g["id"] = gid
    guides[gid] = g

# Opening hours from the MICHELIN Guide (scripts/michelin_details.py hours): per restaurant, Monday first, days split by ";",
# each day's sittings by "," as "1200-1430", a closed day empty. Near me's "Open on" filter and the restaurant pages read them.
opening = read_json(CONTENT / "opening-hours.json") or {} if (CONTENT / "opening-hours.json").exists() else {}
HOURS = {}
ids = {r["id"] for r in restaurants}
for rid, week in (opening.get("hours") or {}).items():
    if rid not in ids:
        continue  # a restaurant file renamed or removed since the hours were written; the next "hours" run drops it
    if not isinstance(week, str) or not re.fullmatch(r"(?:\d{4}-\d{4}(?:,\d{4}-\d{4})*)?(?:;(?:\d{4}-\d{4}(?:,\d{4}-\d{4})*)?){6}", week):
        problem("opening-hours.json", f"{rid} has hours that aren't seven days like \"1200-1430,1900-2200;…\": {week!r}")
    else:
        HOURS[rid] = week
HOURS_CHECKED = opening.get("checked", "")

if problems:
    print("The site wasn't built because of these problems in the data:\n  - " + "\n  - ".join(problems))
    sys.exit(1)


def members(p):
    """Restaurants that belong on a place's page: those in it or anywhere below it."""
    wanted = set(p["includes"]) if p["type"] == "group" else {p["id"]}
    return [r for r in restaurants if wanted & set(r["_chain"])]


starred_n = {pid: sum(1 for r in members(p) if not r.get("status")) for pid, p in places.items()}
same_name = {}  # how many places share each name (page_titles tells them apart)
for _p in places.values():
    same_name[_p["name"]] = same_name.get(_p["name"], 0) + 1
# Every place gets a page; one without starred restaurants says so and waits for its first star.
pages = list(places.values())


# Fields only a restaurant's own page shows (build_restaurant_pages()), kept out of destination pages' data.
PAGE_ONLY = ("menus", "menusSource", "menusChecked", "priceHistory", "starsSince", "dressCode", "booking", "bookingUrl", "cancellation",
             "children", "infoSource", "infoChecked")


def public(r):
    return {k: v for k, v in r.items() if not k.startswith("_") and k not in ("chefSource", "michelinId") + PAGE_ONLY}


# Pages carry only the translations they can show, which keeps the biggest (France, Italy, Japan) light enough for phones.
SUFFIX_AT_END = re.compile("(" + "|".join(sorted(LANG_SUFFIXES, key=len, reverse=True)) + ")$")
# Restaurant fields that come in several languages. Restaurant names stay in every script, as pages show one under the other.
RESTAURANT_TEXTS = ("area", "cityName", "cuisine", "dinnerNote", "lunchNote", "changeNote", "statusNote", "address", "notice")
# Place fields that come in several languages (names, the texts on the page and how a name reads mid-sentence).
PAGE_TEXTS = ("name", "country", "inSentence", "searchEx") + PLACE_TEXTS


def lang_suffixes(langs):
    """The data suffixes a page's languages read, e.g. ["en", "yue"] -> {"Yue", "Zh"} (Cantonese falls back to Chinese)."""
    return {code[0].upper() + code[1:] for code in langs if code != "en"} | ({"Zh"} if "yue" in langs else set())


def only_langs(data, suffixes, texts):
    """A copy of a dict (and the dicts and lists inside it) without blank fields or translations into languages
    outside `suffixes`, e.g. a page offering English and French keeps areaFr but not areaJa."""
    if isinstance(data, list):
        return [only_langs(x, suffixes, texts) for x in data]
    if not isinstance(data, dict):
        return data
    out = {}
    for k, v in data.items():
        m = SUFFIX_AT_END.search(k)
        if v == "" or (m and k[:m.start()] in texts and m.group(1) not in suffixes):
            continue
        out[k] = only_langs(v, suffixes, texts)
    return out


def names(p):
    """A place's name in every language it has, e.g. {"name": "Paris", "nameZh": "巴黎", "nameFr": "Paris"}."""
    return {k: p[k] for k in ["name"] + ["name" + s for s in LANG_SUFFIXES] if p.get(k)}


def link(p, current=None):
    return dict(names(p), path=p["path"], n=starred_n[p["id"]], current=p["id"] == current)


def by_size(ps):
    return sorted(ps, key=lambda p: (-starred_n[p["id"]], p["name"]))


# A region inside a region (Mallorca in the Balearic Islands, Perthshire in Scotland) is listed beside the regions
# directly inside a page when its parent holds only a few, so it isn't two clicks away; England's counties stay on England.
FEW_SUBREGIONS = 3


def regions_in(pid):
    inside = [q for q in pages if q["type"] == "region" and q.get("parent") == pid]
    for q in list(inside):
        subs = [s for s in pages if s["type"] == "region" and s.get("parent") == q["id"]]
        if len(subs) <= FEW_SUBREGIONS:
            inside += subs
    return inside


# "Nearby" links between neighbouring pages (Cumbria -> Lancashire, Northumberland, Yorkshire), worked out from where
# their restaurants are: two places are as far apart as their closest pair of restaurants.
NEARBY_KM = 150   # list every neighbour this close...
NEARBY_MIN = 3    # ...topping up to this many from further away (up to NEARBY_FAR_KM) for remote places
NEARBY_FAR_KM = 500
NEARBY_MAX = 8
_spots = {}


def spots(pid):
    """A place's restaurant positions, rounded to about 5 km so big regions stay quick to compare."""
    if pid not in _spots:
        _spots[pid] = sorted({(round(r["lat"] * 20) / 20, round(r["lng"] * 20) / 20) for r in members(places[pid])
                              if r.get("lat") is not None and r.get("lng") is not None})
    return _spots[pid]


_apart = {}


def apart_km(a, b):
    """The distance between two places' closest restaurants, or None when it's clearly over NEARBY_FAR_KM."""
    key = (a, b) if a < b else (b, a)
    if key not in _apart:
        _apart[key] = measure_apart(a, b)
    return _apart[key]


def measure_apart(a, b):
    sa, sb = spots(a), spots(b)
    if not sa or not sb:
        return None
    # A quick check on the boxes around them first (a degree of latitude is 111 km).
    gap = max(min(y for y, x in sb) - max(y for y, x in sa), min(y for y, x in sa) - max(y for y, x in sb), 0) * 111
    if gap > NEARBY_FAR_KM:
        return None
    return min(metres(y1, x1, y2, x2) for y1, x1 in sa for y2, x2 in sb) / 1000


def nearby(p, linked):
    """Starred places near this one, nearest first: at about the same level (a county's fellow counties and the
    nations next door, a region's neighbouring regions, a country's neighbours), leaving out those above or
    inside it and any the page already links to. With linked None: every candidate kept, with its distance, and the list
    shown (remote_nearby() uses these)."""
    if p["type"] not in ("country", "region", "city") or not spots(p["id"]):
        return [] if linked is not None else ([], [])
    depth = len(chain(p["id"]))
    found = []
    for q in pages:
        qid = q["id"]
        if q["type"] not in ("country", "region", "city") or qid == p["id"] or not starred_n[qid] or q["path"] in (linked or ()):
            continue
        if qid in chain(p["id"]) or p["id"] in chain(qid) or abs(len(chain(qid)) - depth) > 1:
            continue
        km = apart_km(p["id"], qid)
        if km is not None and km <= NEARBY_FAR_KM:
            found.append((km, q))
    found.sort(key=lambda f: (f[0], -starred_n[f[1]["id"]]))

    def better(q, other):
        return (q["type"] == p["type"]) > (other["type"] == p["type"]) or \
            ((q["type"] == p["type"]) == (other["type"] == p["type"]) and len(chain(q["id"])) < len(chain(other["id"])))
    # Nearest first, so a place above another comes no later than it. One just as near takes its place if it's
    # of a better kind (Geneva rather than Switzerland for Lyon); a further one is left out, as the nearer one
    # already leads there (York for Lancashire; Gothenburg for Copenhagen, where Sweden is Malmö, next door).
    keep = []
    for km, q in found:
        rival = next((k for k in keep if k[1]["id"] in chain(q["id"]) or q["id"] in chain(k[1]["id"])), None)
        if rival is None:
            keep.append((km, q))
        elif km <= rival[0] + 1 and better(q, rival[1]):
            keep[keep.index(rival)] = (km, q)
    near = [q for i, (km, q) in enumerate(keep) if km <= NEARBY_KM or i < NEARBY_MIN][:NEARBY_MAX]
    if linked is None:
        return keep, near
    # Remote places that list this one link back from it, so an island isn't left with almost no way in (Mallorca
    # from Catalonia and the Valencian Community).
    back = [places[r] for r in remote_nearby().get(p["id"], ()) if places[r]["path"] not in linked and places[r] not in near]
    return near + by_size(back)


_remote = None


def remote_nearby():
    """For each place, the remote places (none of their own neighbours within NEARBY_KM) whose "Nearby" lists it."""
    global _remote
    if _remote is None:
        _remote = {}
        for r in pages:
            if r["type"] not in ("country", "region", "city") or not starred_n[r["id"]]:
                continue
            keep, near = nearby(r, None)
            if keep and keep[0][0] > NEARBY_KM:
                for q in near:
                    _remote.setdefault(q["id"], []).append(r["id"])
    return _remote


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
    near = nearby(p, {i["path"] for row in rows for i in row["items"]})
    if near:
        rows.append({"label": "nearby", "items": [link(q) for q in near]})
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
            area = re.split("[,،] ", area)[0]  # Arabic areas use the Arabic comma
        if area and area != (r.get("cityNameZh") if zh else r.get("cityName")):
            counts[area] = counts.get(area, 0) + 1
    return max(sorted(counts), key=counts.get) if counts else ""


# ---------- Output helpers ----------
e = html.escape


def money(n, cur):
    if n is None:
        return ""
    symbol = CURRENCIES[cur]["symbol"]
    if symbol[-1].isalpha():  # "DKK 4,400", like the pages' own formatting
        symbol += "\u00a0"
    return symbol + (f"{n:,.0f}" if float(n).is_integer() else f"{n:,.2f}")


def inherited_name_fr(p):
    """How the place reads in a French sentence, e.g. "à Paris" or "en France"."""
    return p.get("inSentenceFr") or (f"à {p.get('nameFr') or p['name']}")


def inherited_name_es(p):
    """How the place reads in a Spanish sentence, e.g. "en Madrid" or "en el País Vasco"."""
    return p.get("inSentenceEs") or f"en {p.get('nameEs') or p['name']}"


def inherited_name_it(p):
    """How the place reads in an Italian sentence: "a Roma" for a city, "in Toscana" for a country or region, unless set (e.g. "nel Lazio")."""
    return p.get("inSentenceIt") or (("a " if p["type"] in ("city", "district") else "in ") + (p.get("nameIt") or p["name"]))


def in_sentence(p):
    return p.get("inSentence") or p["name"]


def in_sentences(p):
    """How the place reads mid-sentence in each language, as inSentence<Suffix> fields: "London", "à Paris", "en Madrid",
    "a Roma", Danish "i København", Icelandic "í Reykjavík" (a place can set its own, e.g. "á Íslandi"), Catalan
    "a Andorra", German "in München", and the declined forms each place sets (Finnish "Helsingissä")."""
    return {"inSentence": in_sentence(p), "inSentenceFr": inherited_name_fr(p), "inSentenceEs": inherited_name_es(p), "inSentenceIt": inherited_name_it(p),
            **{"inSentence" + sfx: p.get("inSentence" + sfx) or f"{prep}{'' if sfx == 'Th' else ' '}{p.get('name' + sfx) or p['name']}" for sfx, prep in IN_PREPOSITIONS},
            **{"inSentence" + sfx: p["inSentence" + sfx] for sfx in DECLINED if p.get("inSentence" + sfx)}}


def as_json(data):
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


assets = {}


def copy_assets():
    (OUT / "assets").mkdir(parents=True)
    for f in sorted((SRC / "assets").iterdir()):
        shutil.copy2(f, OUT / "assets" / f.name)
        assets[f.name] = hashlib.sha1(f.read_bytes()).hexdigest()[:10]


ICONS = (SRC / "icons.svg").read_text("utf-8").strip()
# The footer's © years: the year the site started, then to this year.
FIRST_YEAR = 2026
COPY_YEAR = str(FIRST_YEAR) if date.today().year <= FIRST_YEAR else "%d–%d" % (FIRST_YEAR, date.today().year)


# Who runs the site, for search engines (Google's site name and logo beside results). The homepage carries both in
# full; other pages point to them by @id. Add the site's social profiles to SAME_AS when it has some.
SAME_AS = []
ORGANIZATION = {"@type": "Organization", "@id": SITE_URL + "/#organization", "name": "The Starred Bill", "alternateName": "Starred Bill",
                "url": SITE_URL + "/", "logo": {"@type": "ImageObject", "@id": SITE_URL + "/#logo", "url": SITE_URL + "/icons/icon-512.png",
                                                "contentUrl": SITE_URL + "/icons/icon-512.png", "width": 512, "height": 512, "caption": "The Starred Bill"},
                **({"sameAs": SAME_AS} if SAME_AS else {})}
WEBSITE = {"@type": "WebSite", "@id": SITE_URL + "/#website", "name": "The Starred Bill", "alternateName": ["Starred Bill", "starredbill.com"],
           "url": SITE_URL + "/", "inLanguage": "en", "publisher": {"@id": ORGANIZATION["@id"]}}
SITE_JSONLD = '<script type="application/ld+json">' + as_json({"@context": "https://schema.org", "@graph": [WEBSITE, ORGANIZATION]}) + "</script>"


def render(template, values):
    out = (SRC / template).read_text("utf-8")
    out = re.sub(r"\{\{asset:([\w.-]+)\}\}", lambda m: f"/assets/{m.group(1)}?v={assets[m.group(1)]}", out)
    # Link-preview picture: the page's own (src/og/<place id>.png, from scripts/og_images.py) or the homepage's.
    values = dict({"ogImage": SITE_URL + "/og/default.png", "ogAlt": "The Starred Bill: what a Michelin star costs, city by city",
                   "jsonld": SITE_JSONLD},
                  **values, icons=ICONS, copyYear=COPY_YEAR)
    values.setdefault("footPlaces", FOOT_PLACES_EN)
    out = re.sub(r"\{\{(\w+)\}\}", lambda m: values[m.group(1)], out)
    return out


EXTERNAL_LINK = re.compile(r'<a\s[^>]*href="https?://([^/"]+)[^"]*"[^>]*>')


def link_targets(html_text):
    """The site's rule: links to other websites open in a new tab, links within starredbill.com stay in the same tab."""
    def fix(m):
        tag, host = m.group(0), m.group(1).lower()
        if host in ("starredbill.com", "www.starredbill.com"):
            return re.sub(r'\s+target="_blank"', "", tag)
        if "target=" not in tag:
            tag = tag[:-1] + ' target="_blank">'
        if "rel=" not in tag:
            tag = tag[:-1] + ' rel="noopener">'
        return tag
    return EXTERNAL_LINK.sub(fix, html_text)


def no_self_links(path, html_text):
    """The site's rule: a page never links to itself. Its own menu item, logo or footer link stays as a marked label."""
    return re.sub(r'<a\b([^>]*?)\shref="' + re.escape(path) + r'"([^>]*)>',
                  lambda m: "<a" + m.group(1) + m.group(2) + ("" if "aria-current" in m.group(0) else ' aria-current="page"') + ">", html_text)


def write(path, text):
    if path.endswith("/") or path.endswith(".html"):
        text = link_targets(text)
    if path.endswith("/"):
        text = no_self_links(path, text)
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
        "id": p["id"], "type": p["type"], **in_sentences(p),
        "lead": p.get("lead") or "", "path": p["path"], "currency": currency, "showCity": len({r["city"] for r in starred}) > 1,
        "crumbs": [dict(names(c), path=c["path"], n=starred_n[c["id"]]) for c in crumbs],
        "links": explore_links(p),
        "searchEx": search_example(starred, False), "searchExZh": search_example(starred, True),
        "searchExFr": search_example(starred, False, "areaFr"), "searchExJa": search_example(starred, False, "areaJa"),
        "searchExEs": search_example(starred, False, "areaEs"), "searchExIt": search_example(starred, False, "areaIt"),
        "searchExKo": search_example(starred, False, "areaKo"),
        "searchExAr": search_example(starred, False, "areaAr"),
    })
    for field in PLACE_TEXTS:
        for suffix in ("",) + LANG_SUFFIXES:
            page[field + suffix] = inherited(p, field + suffix) or ""
    langs = inherited(p, "languages") or DEFAULT_LANGUAGES
    suffixes = lang_suffixes(langs)
    titles = page["titles"] = page_titles(p, page, langs, starred)
    if p["id"] in SEARCH_NAMES:
        page["searchHeading"], page["searchIn"] = search_heading(p), search_intro(p)

    stars = [sum(1 for r in starred if r["stars"] == s) for s in (1, 2, 3)]
    menus = sorted((r for r in starred if r.get("dinnerType") == "menu" and r.get("dinner") is not None), key=lambda r: r["dinner"])
    where = in_sentence(p)
    description = p.get("description") or place_description(search_both(p), starred, stars, menus)
    intro = page["intro"]
    lang_paths = {lang: lang_path(p["path"], lang) for lang in langs}
    for item in page["crumbs"] + [i for row in page["links"] for i in row["items"]]:
        item_langs = place_langs(places[paths[item["path"]]])
        if len(item_langs) > 1:
            item["langs"] = item_langs
    # The website and city ids are only used by the build (structured data, page membership).
    rows = pack_restaurants([only_langs({k: v for k, v in public(r).items() if k not in ("website", "city", "cityPath")}, suffixes, RESTAURANT_TEXTS) for r in rs])
    data = {"page": only_langs(page, suffixes, PAGE_TEXTS), "languages": langs,
            "currencies": CURRENCIES, "switchable": currency_data.get("switchable", []), "rateDate": currency_data.get("rateDate")}
    # The biggest places (France, Italy, Japan…) keep their restaurants in a file of their own, which every language
    # version shares and browsers keep until it changes, so the page itself stays light.
    if len(as_json(rows)) > ROWS_INLINE_MAX:
        rows_script = f'<script src="{write_data("places/" + p["id"] + ".js", rows, "DATA.rows=")}"></script>\n'
    else:
        data["rows"], rows_script = rows, ""
    lang_scripts = "".join(f'<script src="/assets/lang-{c}.js?v={assets[f"lang-{c}.js"]}"></script>\n' for c in langs if c in LANG_FILES)
    if set(langs) & set(RTL_LANGUAGES):
        lang_scripts += f'<link rel="stylesheet" href="/assets/rtl.css?v={assets["rtl.css"]}">\n'
    # Every version names the others, so search engines show each visitor the one in their language (English for everyone else).
    alternates = "".join(f'<link rel="alternate" hreflang="{HREFLANG.get(lang, lang)}" href="{SITE_URL}{lang_paths[lang]}">\n' for lang in langs) + \
        f'<link rel="alternate" hreflang="x-default" href="{SITE_URL}{p["path"]}">\n' if len(langs) > 1 else ""
    # A line under the intro pointing to Near me (English only, like the page it opens), for "michelin star restaurants near me".
    # Then one to Help me pick with this place as the first answer (/pick/?w=<address>), on pages with starred restaurants.
    near_line = (f'<p class="hero-near">In {e(search_short(p))} or nearby? See the <a href="/near-me/">Michelin star restaurants near you</a>, nearest first.'
                 + (f' Can\'t choose? <a href="/pick/?w={p["path"]}" class="hero-pick">Help me pick in {e(search_short(p))}</a>.' if starred_n[p["id"]] and p["type"] != "group" else "") + "</p>")
    for lang in langs:
        if lang == "en":
            texts = {
                "description": description,
                "h1": f"Michelin star restaurants in {e(search_heading(p))}: what they <em>cost</em>.",
                "eyebrow": f"{p['name']} · Michelin Guide restaurants", "crumbHome": "All destinations",
                "heroText": ((p.get("lead") or f"Dinner, lunch and wine pairing prices per person at the starred restaurants in {search_intro(p)}, side by side.") + (" " + intro if intro else ""))
                if starred else f"There are currently no restaurants with a Michelin star in {where}, but we'll update this page as soon as one appears.",
            }
        else:
            texts = translated_texts(page, lang, starred)
        name = lambda o, f="name": pick_lang(o, f, lang)
        href = lambda c: lang_path(c["path"], lang) if lang in c.get("langs", ()) else c["path"]
        crumb_html = f'<a href="/">{e(texts["crumbHome"])}</a>' + "".join(f'<a href="{href(c)}">{e(name(c))}</a>' for c in page["crumbs"]) + \
            f'<span aria-current="page">{e(name(page))}</span>'
        place_links = lambda row: "".join(
            f'<span class="place-link" aria-current="page">{e(name(i))}</span>' if i["current"] else f'<a class="place-link" href="{href(i)}">{e(name(i))}</a>'
            for i in row["items"])
        # The fold of every area (including those still waiting for a star) is written in too, so search engines reach them.
        explore_html = "".join(
            f'<details class="explore-more"><summary>{e(word(lang, row["label"], {}))} <span class="count">{len(row["items"])}</span></summary>'
            f'<div class="explore-row">{place_links(row)}</div></details>' if row.get("more") else f'<div class="explore-row">{place_links(row)}</div>'
            for row in page["links"])
        ledger = '<ol class="prerender">' + "".join(
            (f'<li><strong><a href="{r["page"]}">{e(name(r))}</a></strong> · ' if r.get("page") else f"<li><strong>{e(name(r))}</strong> · ")
            + (f"{r['stars']} Michelin star{'s' if r['stars'] > 1 else ''}" if lang == "en" else "★" * r["stars"])
            + f" · {e(cuisine_in(r, lang))} · {e(name(r, 'area') or name(r, 'cityName'))}"
            + (f" · {'dinner ' if lang == 'en' else ''}{money(r['dinner'], r['cur'])}" if r.get("dinner") is not None else "") + "</li>"
            for r in sorted(starred, key=lambda r: (-r["stars"], r["name"]))) + "</ol>"
        version = dict(data, lang=lang, langPaths=lang_paths) if len(langs) > 1 else data
        quick = quick_answers(p, page, starred, lang)
        faq = destination_faq(p, page, starred, lang, quick=bool(quick))
        pilot = p["id"] in SEO_PILOT
        answer = short_answer(p, page, starred, lang) if lang in QA_LANGS else ""
        write(lang_paths[lang], (pilot_headings if pilot else lambda h, *a: h)(section_words(render("place.html", {
            "langScripts": lang_scripts, "htmlAttrs": html_attrs(lang), "alternates": alternates,
            "title": e(titles[lang]), "description": e(texts["description"]), "canonical": SITE_URL + lang_paths[lang],
            "eyebrow": e(texts["eyebrow"]), "h1": texts["h1"], "heroText": e(texts["heroText"]),
            "crumbs": crumb_html, "explore": explore_html, "nearLine": near_line if lang == "en" else "",
            # The language buttons, written in as links to each version so search engines reach them (common.js redraws them).
            "langLinks": "".join(f'<span aria-current="page">{e(LANG_LABELS.get(c, c.upper()))}</span>' if c == lang else
                                 f'<a href="{lang_paths[c]}" hreflang="{HREFLANG.get(c, c)}" lang="{HTML_LANG.get(c, ("en-GB",))[0]}">{e(LANG_LABELS.get(c, c.upper()))}</a>'
                                 for c in langs) if len(langs) > 1 else "", "ledger": ledger, "data": as_json(version), "rowsScript": rows_script,
            "ogImage": og_image(p), "ogAlt": e(f"What a Michelin star costs in {where}" if lang == "en" else plain(texts["h1"])),
            "areas": areas_html(p, lang) if starred else "", "footPlaces": foot_places_html(lang, p["id"]),
            "faq": faq_html(faq, lang, say_in(pilot_words(lang), "hFaq", page) if pilot else None),
            "answer": answer, "quick": quick_html(quick, page, lang), "pilot": pilot_sections(p, page, starred, lang) if pilot else "",
            "newStars": new_stars_html(p, page, lang),
            "guides": related_guides_html(p, starred) if lang == "en" else "", "jsonld": json_ld(p, crumbs, starred, texts["description"], lang, texts, faq),
            "tiers": tiers_html(starred, currency, lang), "lunchDeals": lunch_deals_html(p, page, starred, lang),
            "browse": browse_html(p, page, starred, lang) if starred else "",
        }), lang, page, starred), page, lang))


# A destination page's restaurants bigger than this (in characters) go in /data/places/<id>.js rather than the page.
ROWS_INLINE_MAX = 60000
# Restaurant fields every restaurant in one town shares, kept once per town by pack_restaurants().
TOWN_FIELDS = ("cityType", "country", "cur") + tuple("cityName" + s for s in ("",) + LANG_SUFFIXES)


def pack_restaurants(rs):
    """A page's restaurants as compact rows, read by unpackRows() in place.js: one list of values per restaurant in
    `cols` order (first the number of its town in `towns`, whose fields are in `townCols`), so field names and town
    names aren't repeated for every restaurant. Missing values are null, and trailing ones are left off."""
    town_cols = [c for c in TOWN_FIELDS if any(c in r for r in rs)]
    cols = ["town"] + list(dict.fromkeys(k for r in rs for k in r if k not in town_cols))
    towns, index, rows = [], {}, []
    for r in rs:
        town = tuple(r.get(c) for c in town_cols)
        if town not in index:
            index[town] = len(towns)
            towns.append(list(town))
        row = [index[town]] + [round(r[c], 6) if c in ("lat", "lng") and r.get(c) is not None else r.get(c) for c in cols[1:]]
        while row and row[-1] is None:
            row.pop()
        rows.append(row)
    return {"cols": cols, "townCols": town_cols, "towns": towns, "r": rows}


def lang_path(path, lang):
    """A destination page's address in a language: English keeps /france/paris/, French is /fr/france/paris/."""
    return path if lang == "en" else f"/{lang}{path}"


def place_langs(p):
    return inherited(p, "languages") or DEFAULT_LANGUAGES


def plain(text):
    return html.unescape(re.sub(r"<[^>]+>", "", text))


def pick_lang(o, field, lang):
    """A field in a language when it's there, like pick() in common.js: nameFr in French, nameYue then nameZh in Cantonese."""
    for sfx in (("Yue", "Zh") if lang == "yue" else () if lang == "en" else (lang[0].upper() + lang[1:],)):
        if o.get(field + sfx):
            return o[field + sfx]
    return o.get(field) or ""

# The fixed wording of a destination page's sections (headings, the map and "How the prices are counted" text, the
# star tiers), written into each language's page so search engines read it before the scripts run; common.js and
# place.js redraw the same words.
SECTION_KEYS = ("navCompare", "compareTitle", "compareText", "formerTitle", "formerNote", "navMap", "mapTitle", "mapText", "mapWait",
                "navStars", "starsTitle", "starsText", "navMethod", "methodTitle", "m1Title", "m1Text", "m2Title", "m2Text", "m3Title",
                "m3Text", "navContact", "contactTitle", "contactText")
TIER_KEYS = ("tierNames", "avgDinner", "tRestaurants", "tRange", "tRating", "tVs", "tNoPrices", "tNone", "starsAria")
# A place's own text replaces the general wording, as in place.js: its service, sources and stars notes.
OWN_SECTION_TEXTS = {"m1Text": "serviceText", "m2Text": "sourcesText", "m3Text": "starsText"}


def read_words():
    """The words the build writes into translated pages (title, heading, intro, breadcrumb, section headings and text), and each language's lang
    attribute and cuisine names, read from the same dictionaries the pages use: common.js and each lang-<code>.js."""
    keys = "heroEyebrow|heroTitle|heroText|emptyPlace|crumbHome|exploreAll|explore"
    def found(text):
        out = {}
        string = r'"(?:[^"\\]|\\.)*"'
        for m in re.finditer(r"\b(" + "|".join((keys,) + SECTION_KEYS + TIER_KEYS) + r"): (" + string + r"|\[(?:\s*" + string + r",?)+\s*\])", text):
            out.setdefault(m.group(1), json.loads(m.group(2).replace("\\'", "'")))
        return out
    words, attrs, cuisines = {}, {}, {}
    js = (SRC / "assets" / "common.js").read_text("utf-8")
    body = js[js.index("const I18N = {"):]
    body = body[:re.search(r"^};", body, re.M).start()]
    blocks = re.split(r"^  (\w+): \{$", body, flags=re.M)
    for lang, text in zip(blocks[1::2], blocks[2::2]):
        words[lang] = found(text)
    for m in re.finditer(r'^  (\w+): \{ label: "[^"]*", html: "([^"]+)"', js, re.M):
        attrs[m.group(1)] = (m.group(2), "")
    for code in LANG_FILES:
        text = (SRC / "assets" / f"lang-{code}.js").read_text("utf-8")
        words[code] = found(text[text.index("words: {"):])
        m = re.search(r'lang: \{[^}]*html: "([^"]+)"(?:, dir: "(\w+)")?', text)
        attrs[code] = (m.group(1), m.group(2) or "")
    # Cuisine names: CUISINE_FR etc. in common.js (CUISINES says which language uses which), `cuisines` in each lang-<code>.js.
    pairs = lambda text: dict(re.findall(r'"([^"]+)": "([^"]*)"', text))
    for lang, const in re.findall(r"(\w+): (CUISINE_[A-Z]+)", js[js.index("const CUISINES = {"):].split("\n")[0]):
        block = js[js.index(f"const {const} = {{"):]
        cuisines[lang] = pairs(block[:block.index("};")])
    for code in LANG_FILES:
        text = (SRC / "assets" / f"lang-{code}.js").read_text("utf-8")
        block = text[text.index("cuisines: {"):]
        cuisines[code] = pairs(block[:block.index("}")])
    for lang in LANGUAGES:
        missing = [k for k in keys.split("|") if k not in words.get(lang, {}) and not (lang == "yue" and k in words["zh"])]
        if missing or lang not in attrs:
            print(f"  Language {lang}: {', '.join(missing) or 'its LANGS entry'} not found for its pages' own addresses, so English is used")
    return words, attrs, cuisines


WORDS, HTML_LANG, CUISINE_NAMES = read_words()


# Each language's button label ("EN", "FR"), from LANGS in common.js and the lang files.
LANG_LABELS = dict(re.findall(r'^  (\w+): \{ label: "([^"]+)"', (SRC / "assets" / "common.js").read_text("utf-8"), re.M))
for _code in LANG_FILES:
    _m = re.search(r'lang: \{ label: "([^"]+)"', (SRC / "assets" / f"lang-{_code}.js").read_text("utf-8"))
    if _m:
        LANG_LABELS[_code] = _m.group(1)


def html_attrs(lang):
    code, direction = HTML_LANG.get(lang, ("en-GB", ""))
    return f'lang="{code}"' + (f' dir="{direction}"' if direction else "")


def word(lang, key, values):
    """One of the pages' own phrases in a language, like t() in common.js (Cantonese falls back to Chinese, others to English)."""
    text = WORDS.get(lang, {}).get(key) or (WORDS["zh"].get(key) if lang == "yue" else None) or WORDS["en"][key]
    return re.sub(r"\{(\w+)\}", lambda m: values.get(m.group(1), m.group(0)), text)


def sentences(text):
    """Text split into sentences, not at short abbreviations (Danish "pr. person", German "z. B.")."""
    out, start = [], 0
    for m in re.finditer(r"[.!?؟](?=\s|$)|[。！？]", text or ""):
        if m.group(0) == "." and re.search(r"(?:^|[\s(])[a-zæøåäöüß]{1,3}$", text[start:m.start()]):
            continue
        out.append(text[start:m.end()].strip())
        start = m.end()
    return [x for x in out + [(text or "")[start:].strip()] if x]


def cuisine_in(r, lang):
    """A restaurant's cuisine in a language, like cuisineOf() in common.js."""
    own = pick_lang(r, "cuisine", lang)
    return own if own != r.get("cuisine") else CUISINE_NAMES.get(lang, {}).get(own, own)


def translated_texts(page, lang, starred):
    """The heading, intro and description of a destination page in another language, for its own address (page_titles() writes its title)."""
    place = pick_lang(page, "name", lang)
    place_in = place if lang in CJK_NAMES else page.get("inSentence" + lang[0].upper() + lang[1:]) or page["inSentence"]
    values = {"place": place, "placeIn": place_in}
    h1 = word(lang, "heroTitle", {k: e(v) for k, v in values.items()})
    intro = pick_lang(page, "intro", lang)
    if starred:
        hero = word(lang, "heroText", values)
        text = hero + (" " + intro if intro else "")
        # The opening sentence, then as many of the place's own sentences as fit.
        description = sentences(hero)[0]
        for more in sentences(intro):
            if len(description) + len(more) + 1 > 155:
                break
            description += ("" if lang in CJK_NAMES else " ") + more
    else:
        text = description = word(lang, "emptyPlace", values)
    if len(description) > 155:
        cut = description[:154]
        description = (cut[:cut.rfind(" ")] if cut.rfind(" ") > 100 else cut).rstrip(",.;:、，") + "…"
    return {"description": description, "h1": h1, "eyebrow": word(lang, "heroEyebrow", values),
            "heroText": text, "crumbHome": word(lang, "crumbHome", values)}

FAQ_WORDS = read_json(SRC / "faq-words.json")


def read_months():
    """Each language's short month names, from MONTHS in common.js and `months` in each lang-<code>.js (as receipts show them)."""
    js = (SRC / "assets" / "common.js").read_text("utf-8")
    block = js[js.index("const MONTHS = {"):]
    out = {m.group(1): json.loads(m.group(2)) for m in re.finditer(r"(\w+): (\[[^\]]*\])", block[:block.index("};")])}
    for code in LANG_FILES:
        m = re.search(r"months: (\[[^\]]*\])", (SRC / "assets" / f"lang-{code}.js").read_text("utf-8"))
        if m:
            out[code] = json.loads(m.group(1))
    return out


MONTHS = read_months()


def month_year(ym, lang):
    """"Oct 2026" in a language, like monthYear() in common.js."""
    y, _, m = (ym or "").partition("-")
    if not m:
        return y
    if lang in ("zh", "yue", "zhs", "ja"):
        return f"{y}年{int(m)}月"
    if lang == "ko":
        return f"{y}년 {int(m)}월"
    return f"{(MONTHS.get(lang) or MONTHS['en'])[int(m) - 1]} {y}"


class FaqWords:
    """What a destination page's FAQ, quick answers and "In short" answer share in one of its languages: the wording
    (src/faq-words.json, English filling any gaps), and restaurant names, prices and lists written the way that language
    needs them (Arabic wraps names and prices in bidi isolates). say() gives plain text; say_html() escapes the wording
    and takes values already escaped (names may be links)."""

    def __init__(self, page, lang):
        self.lang = lang
        self.own = FAQ_WORDS.get(lang) or FAQ_WORDS["en"]
        self.w = dict(FAQ_WORDS["en"], **self.own)
        self.rtl = lang in RTL_LANGUAGES
        sfx = lang[0].upper() + lang[1:]
        self.where = (pick_lang(page, "name", lang) if lang in CJK_NAMES else
                      "in " + page["inSentence"] if lang == "en" else page.get("inSentence" + sfx) or page["inSentence"])
        self.gap = "" if lang in ("zh", "yue", "zhs", "ja") else " "  # between sentences

    def name(self, r):
        s = pick_lang(r, "name", self.lang)
        return f"⁨{s}⁩" if self.rtl else s

    def name_html(self, r):
        """A restaurant's name, linked to its own page where it has one (English pages: the restaurant pages are English only)."""
        if self.lang == "en" and r.get("page"):
            return f'<a href="{r["page"]}">{e(self.name(r))}</a>'
        return e(self.name(r))

    @staticmethod
    def usd(r, f):
        return r[f] / CURRENCIES[r["cur"]]["perUSD"]

    def price(self, r, f, usd=True):
        text = money(r[f], r["cur"]) + ("" if r["cur"] == "USD" or not usd else f" (≈ US${int(round(self.usd(r, f) / 5) * 5):,})")
        return f"⁦{text}⁩" if self.rtl else text

    def join(self, items, html_mode=False):
        """"A, B and C", with the language's own separator and "and" (and3 before the last of three or more)."""
        items = list(items)
        esc = e if html_mode else (lambda s: s)
        if len(items) < 2:
            return "".join(items)
        last = self.w["and3" if len(items) > 2 and "and3" in self.own else "and"]
        return esc(self.w["sep"]).join(items[:-1]) + esc(last) + items[-1]

    def listed(self, rs, limit=6, html_mode=False):
        """Up to six names, then "and 3 more"."""
        names = [self.name_html(r) if html_mode else self.name(r) for r in rs[:limit]]
        if len(rs) > limit:
            sep = e(self.w["sep"]) if html_mode else self.w["sep"]
            more = e(self.w["more"]) if html_mode else self.w["more"]
            return more.replace("{list}", sep.join(names)).replace("{m}", str(len(rs) - limit))
        return self.join(names, html_mode)

    def tier_split(self, by_stars):
        """"3 three-star, 5 two-star and 12 one-star", or "all one-star" when there's only one level."""
        tiers = [s for s in (3, 2, 1) if by_stars[s]]
        if len(tiers) == 1:
            return self.w[f"all{tiers[0]}"]
        return self.join(self.w[f"tier{s}"].replace("{n}", str(len(by_stars[s]))) for s in tiers)

    def _fill(self, template, values):
        values.setdefault("in", e(self.where) if values.pop("_html", False) else self.where)
        text = re.sub(r"\{(\w+)\}", lambda m: str(values.get(m.group(1), m.group(0))), template)
        return text[:1].upper() + text[1:]

    def say(self, key, **values):
        return self._fill(self.w[key], values)

    def say_html(self, key, **values):
        return self._fill(e(self.w[key]), dict(values, _html=True))


def by_star_level(k, starred):
    return {s: sorted((r for r in starred if r["stars"] == s), key=lambda r: k.name(r).lower()) for s in (3, 2, 1)}


def dinner_menus(k, starred):
    """Dinner tasting menus, cheapest first; and the typical spends some restaurants list instead (mainland China)."""
    menus = sorted((r for r in starred if is_menu(r, "dinner")), key=lambda r: k.usd(r, "dinner"))
    spends = sorted((r for r in starred if r.get("dinner") is not None and r.get("dinnerType") == "spend"), key=lambda r: k.usd(r, "dinner"))
    return menus, spends


def recent_stars(k, starred):
    """Restaurants that won or gained a star in the twelve months to the month we checked (first editions of a guide
    aren't marked, so a new guide's places have none): (new, up, latest changeDate)."""
    month = site.get("updated", "")
    since = f"{int(month[:4]) - 1}-{month[5:7]}" if re.fullmatch(r"\d{4}-\d{2}", month) else ""
    recent = [r for r in starred if r.get("change") in ("new", "up") and r.get("changeDate", "") > since]
    new = sorted((r for r in recent if r["change"] == "new"), key=lambda r: (-r["stars"], k.name(r).lower()))
    up = sorted((r for r in recent if r["change"] == "up"), key=lambda r: (-r["stars"], k.name(r).lower()))
    return new, up, max((r["changeDate"] for r in recent), default="")


def three_star_answer(k, by_stars, quick=False):
    """The FAQ's "Are there any three-star restaurants?" (aThree…), or the same as a quick answer under a heading (qkThree…,
    HTML, naming up to 12 three-stars as that's what the heading promises)."""
    say = k.say_html if quick else k.say
    key = "qkThree" if quick else "aThree"
    three, two = by_stars[3], by_stars[2]
    if len(three) == 1:
        return say(key + "One", names=k.listed(three, html_mode=quick))
    if three:
        return say(key + "Many", k=len(three), names=k.listed(three, 12 if quick else 6, html_mode=quick))
    return say(key + "NoTwo", names=k.listed(two, html_mode=quick)) if two else say(key + "NoOne")


def new_stars_answer(k, new, up, latest, html_mode=False):
    say = k.say_html if html_mode else k.say
    parts = []
    if new:
        parts.append(say("aNewOne" if len(new) == 1 and "aNewOne" in k.own else "aNew", names=k.listed(new, html_mode=html_mode),
                         when=month_year(latest, k.lang)))
    if up:
        parts.append(say("aUpOne" if len(up) == 1 and "aUpOne" in k.own else "aUp", names=k.listed(up, html_mode=html_mode)))
    return k.gap.join(parts)


def destination_faq(p, page, starred, lang, quick=False):
    """The questions and answers at the foot of a destination page, worked out from its restaurants in one of its
    languages (wording in src/faq-words.json): how many are starred, any three-star, what dinner costs, the cheapest
    meal, what's newly starred and how far ahead to book. Questions the data can't answer are left out, and so are
    those the page's quick answers already give (quick=True: three-star, cheapest, new stars; see quick_answers())."""
    if not starred:
        return []
    k = FaqWords(page, lang)
    w, say, name, price, usd = k.w, k.say, k.name, k.price, k.usd
    n = len(starred)
    by_stars = by_star_level(k, starred)
    faq = []

    checked = month_year(site.get("updated", ""), lang)
    count = say("aCountOne", r=name(starred[0]), stars=w[f"star{starred[0]['stars']}"], checked=checked) if n == 1 else \
        say("aCount", n=n, split=k.tier_split(by_stars), checked=checked)
    faq.append((say("qCount", **({"in": "in " + search_short(p)} if lang == "en" and p["id"] in SEARCH_NAMES else {})), count))

    if not quick:
        faq.append((say("qThree"), three_star_answer(k, by_stars)))

    dinners, spends = dinner_menus(k, starred)
    if len(dinners) >= 3:
        mid = dinners[len(dinners) // 2]
        faq.append((say("qPrice"), say("aPrice", lo=price(dinners[0], "dinner"), hi=price(dinners[-1], "dinner"), mid=price(mid, "dinner"))))

    lunches = sorted((r for r in starred if is_menu(r, "lunch")), key=lambda r: usd(r, "lunch"))
    # Some restaurants list a typical spend instead of a menu (mainland China): the lowest is added when it's lower still.
    cheapest = min([usd(r, "lunch") for r in lunches[:1]] + [usd(r, "dinner") for r in dinners[:1]] or [float("inf")])
    answer = ""
    if lunches and (not dinners or usd(lunches[0], "lunch") < usd(dinners[0], "dinner")):
        answer = say("aCheapLunch", r=name(lunches[0]), price=price(lunches[0], "lunch"))
        if dinners:
            answer += k.gap + say("aAlsoDinner", r=name(dinners[0]), price=price(dinners[0], "dinner"))
    elif dinners:
        answer = say("aCheapDinner", r=name(dinners[0]), price=price(dinners[0], "dinner"))
    if spends and usd(spends[0], "dinner") < cheapest:
        answer += (k.gap if answer else "") + say("aCheapSpend", r=name(spends[0]), price=price(spends[0], "dinner"))
    if answer and not quick:
        faq.append((say("qCheap"), answer))

    new, up, latest = recent_stars(k, starred)
    if (new or up) and not quick:
        faq.append((say("qNew"), new_stars_answer(k, new, up, latest)))

    lunch_n = sum(1 for r in starred if r.get("lunch") is not None)
    faq.append((say("qBook"), say("aBook") + (k.gap + say("aLunch", k=lunch_n, n=n) if lunch_n and n > 1 else "")))
    return faq


def quick_answers(p, page, starred, lang):
    """Short answers to what people search for about a place's starred restaurants ("cheapest michelin star restaurant
    in london", "three michelin star restaurants in london"), each a heading naming the place and one sentence from the
    data: the cheapest dinner, the cheapest lunch, the most expensive dinner, the three-star restaurants and the newest
    stars (where the page has no "New Michelin stars" section). [(heading, answer HTML)], or [] for a place with fewer than two starred restaurants (its "In short" answer
    says it all). The FAQ leaves out the questions these answer (destination_faq(quick=True))."""
    if len(starred) < 2:
        return []
    k = FaqWords(page, lang)
    say, usd = k.say_html, k.usd
    price = lambda r, f: e(k.price(r, f))
    out = []

    dinners, spends = dinner_menus(k, starred)
    parts = []
    if dinners:
        parts.append(say("qkDinner", r=k.name_html(dinners[0]), price=price(dinners[0], "dinner")))
    if spends and (not dinners or usd(spends[0], "dinner") < usd(dinners[0], "dinner")):
        parts.append(say("aCheapSpend", r=k.name_html(spends[0]), price=price(spends[0], "dinner")))
    if parts:
        out.append((k.say("qkDinnerH"), k.gap.join(parts)))

    lunches = sorted((r for r in starred if is_menu(r, "lunch")), key=lambda r: usd(r, "lunch"))
    if lunches:
        out.append((k.say("qkLunchH"), say("qkLunch", r=k.name_html(lunches[0]), price=price(lunches[0], "lunch"))))

    if len(dinners) >= 2:
        out.append((k.say("qkDearH"), say("qkDear", r=k.name_html(dinners[-1]), price=price(dinners[-1], "dinner"))))

    out.append((k.say("qkThreeH"), three_star_answer(k, by_star_level(k, starred), quick=True)))

    # The newest stars, unless the page has its own section on the latest guide (new_stars_html(), NEW_STARS_LANGS).
    new, up, latest = recent_stars(k, starred)
    if (new or up) and lang not in NEW_STARS_LANGS:
        out.append((k.say("qkNewH", year=latest[:4]), new_stars_answer(k, new, up, latest, html_mode=True)))
    return out


def quick_html(items, page, lang):
    if not items:
        return ""
    k = FaqWords(page, lang)
    return ('<section id="quick">\n    <div class="wrap">\n      <div class="section-head"><div>'
            f'<span class="eyebrow">{e(k.w["qkEyebrow"])}</span><h2 style="margin-top: 6px">{e(k.say("qkTitle"))}</h2></div></div>\n'
            '      <div class="faq">' + "".join(f'<div><h3>{e(h)}</h3><p>{a}</p></div>' for h, a in items) + "</div>\n    </div>\n  </section>\n")


def word_n(lang, key, n, values=None):
    """word() for a phrase with a count, choosing "one|many" like t() in common.js."""
    text = word(lang, key, dict(values or {}, n=str(n)))
    if "|" in text:
        one, many = text.split("|", 1)
        text = one if n == 1 else many
    return text


def section_words(html_text, lang, page, starred):
    """Fills a destination page's empty data-i18n headings and paragraphs in its language. Places with no starred
    restaurant left head the list "No longer starred", as place.js does."""
    own = {k: pick_lang(page, f, lang) for k, f in OWN_SECTION_TEXTS.items()}
    if not starred:
        own.update(compareTitle=None, compareText=None)
        swap = {"compareTitle": "formerTitle", "compareText": "formerNote"}
    else:
        swap = {}

    def fill(m):
        key = m.group(3)
        if key not in SECTION_KEYS:
            return m.group(0)
        text = e(own[key]) if own.get(key) else word(lang, swap.get(key, key), {})
        return m.group(1) + text + m.group(4)
    return re.sub(r'(<(\w+)\b[^>]*\bdata-i18n="(\w+)"[^>]*>)(</\2>)', fill, html_text)


def tiers_html(starred, currency, lang):
    """The "How much each extra star adds" cards at dinner in the page's own currency, drawn as renderTiers() in
    place.js draws them (which redraws them for the visitor's meal and currency)."""
    approx = any(r["cur"] != currency for r in starred)
    shown = lambda r, n: n if r["cur"] == currency else n * CURRENCIES[currency]["perUSD"] / CURRENCIES[r["cur"]]["perUSD"]
    js_round = lambda n: int(math.floor(n + 0.5))  # halves round up, like Math.round (Python's round() goes to even)

    def fmt(n):
        text = ("≈" + money(js_round(n), currency)) if approx else money(n, currency)
        return "⁦" + text + "⁩" if lang in RTL_LANGUAGES else text
    tiers = []
    for s in (1, 2, 3):
        group = [r for r in starred if r["stars"] == s]
        prices = [shown(r, r["dinner"]) for r in group if r.get("dinnerType") == "menu" and r.get("dinner") is not None]
        rated = [r["rating"] for r in group if r.get("rating")]
        tiers.append({"s": s, "n": len(group), "prices": prices, "avg": js_round(sum(prices) / len(prices)) if prices else 0,
                      "rating": sum(rated) / len(rated) if rated else None})
    top = max([x["avg"] for x in tiers] + [1])
    names = WORDS.get(lang, {}).get("tierNames") or (WORDS["zh"].get("tierNames") if lang == "yue" else None) or WORDS["en"]["tierNames"]
    out = ""
    for i, x in enumerate(tiers):
        stars = f'<span class="stars" aria-label="{e(word_n(lang, "starsAria", x["s"]))}">' + '<svg><use href="#star"/></svg>' * x["s"] + "</span>"
        out += f'<div class="tier"><div class="top"><h3>{names[x["s"] - 1]}</h3>{stars}</div>'
        if x["prices"]:
            prev = tiers[i - 1]
            vs, rating = "", f'{x["rating"]:.1f}' if x["rating"] else "–"
            if i and prev["prices"]:
                diff = x["avg"] - prev["avg"]
                vs = f'<dt>{word_n(lang, "tVs", x["s"] - 1)}</dt><dd>{"+" if diff >= 0 else "−"}{fmt(abs(diff)).replace("≈", "")}</dd>'
            out += (f'<div class="avg">{fmt(x["avg"])}<small>{word(lang, "avgDinner", {})}</small></div>'
                    f'<div class="bar"><span style="width:{x["avg"] / top * 100:.1f}%"></span></div>'
                    f'<dl><dt>{word(lang, "tRestaurants", {})}</dt><dd>{x["n"]}</dd>'
                    f'<dt>{word(lang, "tRange", {})}</dt><dd>{fmt(min(x["prices"]))}–{fmt(max(x["prices"]))}</dd>'
                    f'<dt>{word(lang, "tRating", {})}</dt><dd>{rating}</dd>{vs}</dl>')
        else:
            out += '<p style="color: var(--muted)">' + (word(lang, "tNoPrices", {}) if x["n"] else word(lang, "tNone", {"tier": names[x["s"] - 1]})) + "</p>"
        out += "</div>"
    return out


def faq_html(faq, lang, title=None):
    if not faq:
        return ""
    w = dict(FAQ_WORDS["en"], **FAQ_WORDS.get(lang, {}))
    return ('<section id="faq">\n    <div class="wrap">\n      <div class="section-head"><div>'
            f'<span class="eyebrow">{e(w["eyebrow"])}</span><h2 style="margin-top: 6px">{e(title or w["title"])}</h2></div></div>\n'
            '      <div class="faq">' + "".join(f'<div><h3>{e(q)}</h3><p>{e(a)}</p></div>' for q, a in faq) + "</div>\n    </div>\n  </section>\n")


def name_in(q, lang):
    """A place's name in a language, falling back from Cantonese or Simplified Chinese to Chinese, then to English."""
    sfx = lang[0].upper() + lang[1:]
    return next((q["name" + s] for s in ([sfx, "Zh"] if sfx in ("Yue", "Zhs") else [sfx]) if lang != "en" and q.get("name" + s)), q["name"])


def areas_html(p, lang):
    """A destination page's starred areas as plain links with their counts and cheapest dinner menu, e.g. "Cumbria 13 ·
    Dinner from £95": the regions inside (see regions_in()) and every city further down (a city's districts), so search engines
    reach them and visitors can go straight there. Plain names, as it's a list: keyword wording is for links in sentences."""
    if p["type"] == "district":
        return ""
    if p["type"] == "city":
        inside = [q for q in pages if q["type"] == "district" and q.get("parent") == p["id"]]
    elif p["type"] == "group":
        inside = [places[i] for i in p["includes"] if i in places]
    else:
        inside = regions_in(p["id"]) + [q for q in pages if q["type"] == "city" and p["id"] in chain(q["id"])[1:]]
    inside = by_size(q for q in inside if starred_n[q["id"]])
    if len(inside) < 2:
        return ""
    w = dict(FAQ_WORDS["en"], **FAQ_WORDS.get(lang, {}))
    rtl = lang in RTL_LANGUAGES

    def item(q):
        href = lang_path(q["path"], lang) if lang in place_langs(q) else q["path"]
        menus = [r for r in members(q) if not r.get("status") and r.get("dinnerType", "menu") == "menu" and r.get("dinner") is not None]
        cheapest = min(menus, key=lambda r: r["dinner"] / CURRENCIES[r["cur"]]["perUSD"]) if menus else None
        price = money(cheapest["dinner"], cheapest["cur"]) if cheapest else ""
        price = f"⁦{price}⁩" if price and rtl else price
        return (f'<li><a href="{href}">{e(name_in(q, lang))}</a> <span class="count">{starred_n[q["id"]]}</span>'
                + (f'<span class="area-from">{e(w["areaFrom"].replace("{p}", price))}</span>' if price else "") + "</li>")
    return ('<section id="areas">\n    <div class="wrap">\n      <div class="section-head"><div>'
            f'<span class="eyebrow">{e(word(lang, "explore", {}))}</span><h2 style="margin-top: 6px">{e(w["areasTitle"])}</h2></div></div>\n'
            '      <ul class="area-links">' + "".join(item(q) for q in inside) + "</ul>\n    </div>\n  </section>\n")


# ---------- SEO pilot (7 Oct 2026) ----------
# New parts of a destination page, tried on these places first so the owner can see them before every page gets
# them: a short answer under the title, section headings that say what the page is about, and lists worked out from
# the restaurants (by star level, the cheapest meals, dietary needs; "by cuisine" went live for big cities in browse_html()).
# English only for now; the wording is in src/faq-words.json ("en"), ready for other languages.
SEO_PILOT = ()  # in preview: ("london", "new-york"), waiting for the owner's look before it goes live
# Languages whose pages show the "In short" answer in the hero's right-hand column, above the figures (every destination
# page, 9 Oct 2026): those with their own qaLabel in src/faq-words.json. A page in a language without it shows the
# figures alone there.
QA_LANGS = tuple(lang for lang, words in FAQ_WORDS.items() if "qaLabel" in words)
# Where people search for a place by a shorter name than ours ("michelin star restaurants nyc", 10,000 searches a month in
# the US against 1,000 for "… new york"; Ahrefs, 7 Oct 2026), its English page uses it (9 Oct 2026). The first mention gives
# both, "New York (NYC)": in the heading with "heading", else in the intro. Later ones (the intro after such a heading, the
# "In short" answer, the Near me line, the first question) say just the short name. The search description stands alone in
# Google, so it gives both too. "title" puts the short name in place of the place's in the page title.
# Washington DC needs none, as "DC" is already in its name.
SEARCH_NAMES = {
    "new-york": {"short": "NYC", "title": True, "heading": True},
    "san-francisco": {"short": "SF"},
    "los-angeles": {"short": "LA"},
}


def search_both(p):
    """The place's first mention: our name with the short one people search ("New York (NYC)"), else just our name."""
    return f"{in_sentence(p)} ({SEARCH_NAMES[p['id']]['short']})" if p["id"] in SEARCH_NAMES else in_sentence(p)


def search_short(p):
    """The place in later mentions: the short name people search ("NYC"), else our name."""
    return SEARCH_NAMES[p["id"]]["short"] if p["id"] in SEARCH_NAMES else in_sentence(p)


def search_intro(p):
    """The place in the intro: the short name once the heading has introduced it, else both."""
    return search_short(p) if SEARCH_NAMES.get(p["id"], {}).get("heading") else search_both(p)


def search_heading(p):
    return search_both(p) if SEARCH_NAMES.get(p["id"], {}).get("heading") else in_sentence(p)
# The page's own section headings (common.js keys) swapped for ones naming the place, and the faq-words.json key for each.
PILOT_HEADINGS = {"compareTitle": "hCompare", "mapTitle": "hMap", "starsTitle": "hStars", "methodTitle": "hMethod"}
PILOT_NAMES = 6  # restaurants named in a sentence before it gives just the count


def pilot_words(lang):
    return dict(FAQ_WORDS["en"], **FAQ_WORDS.get(lang, {}))


def long_month(ym, lang):
    """"February 2026" in English (headings read better with the whole month); other languages as month_year()."""
    if lang == "en" and re.fullmatch(r"\d{4}-\d{2}", ym or ""):
        return f"{MONTH_NAMES[int(ym[5:]) - 1]} {ym[:4]}"
    return month_year(ym, lang)


def long_date(d, lang):
    """"9 February 2026" in English; other languages as month_year()."""
    if lang == "en" and re.fullmatch(r"\d{4}-\d{2}-\d{2}", d or ""):
        return f"{int(d[8:])} {MONTH_NAMES[int(d[5:7]) - 1]} {d[:4]}"
    return month_year((d or "")[:7], lang)


def say_in(w, key, page, **values):
    values.setdefault("in", "in " + page["inSentence"])
    values.setdefault("name", page["name"])
    text = re.sub(r"\{(\w+)\}", lambda m: str(values.get(m.group(1), m.group(0))), w[key])
    return text[:1].upper() + text[1:]


def priced(r, f, usd=True):
    """A price in its own currency, with US dollars beside it when it's another currency."""
    text = money(r[f], r["cur"])
    if usd and r["cur"] != "USD":
        text += f" (≈ US${int(round(r[f] / CURRENCIES[r['cur']]['perUSD'] / 5) * 5):,})"
    return text


def is_menu(r, f):
    return r.get(f) is not None and r.get(f + "Type", "menu") == "menu"


def to_usd(r, f):
    return r[f] / CURRENCIES[r["cur"]]["perUSD"]


def and_names(items, w):
    """"A, B and C" (with the language's own "and"), already escaped."""
    items = list(items)
    if len(items) < 2:
        return "".join(items)
    return w["sep"].join(items[:-1]) + e(w["and3" if len(items) > 2 else "and"]) + items[-1]


NUMBER_WORDS = ("one", "two", "three", "four", "five", "six", "seven", "eight", "nine")


def n_word(k, lang):
    """Small counts as words in English running text ("six three-star restaurants"), digits otherwise."""
    return NUMBER_WORDS[k - 1] if lang == "en" and 1 <= k <= 9 else str(k)


def and_plain(items, w):
    """"A, B and C" without the serial comma, for short words (star levels, diets)."""
    items = list(items)
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + w["and"] + items[-1]


def plain_names(rs, w):
    return and_names((e(r["name"]) for r in rs), w)


def most_stars(rs):
    """The restaurants with the most stars, by name."""
    top = max(r["stars"] for r in rs)
    return sorted((r for r in rs if r["stars"] == top), key=lambda r: r["name"].lower())


def busiest_areas(rs, w):
    """The areas with two or more, up to three, most first: [(count, area)]."""
    counts = {}
    for r in rs:
        area = (r.get("area") or "").split(",")[0].strip()
        if area:
            counts[area] = counts.get(area, 0) + 1
    return sorted(((k, a) for a, k in counts.items() if k > 1), key=lambda x: (-x[0], x[1]))[:3]


def cheapest_meal(rs):
    """The cheapest set menu among some restaurants, lunch or dinner: (restaurant, "lunch" or "dinner"), or None."""
    meals = [(to_usd(r, f), r["name"], r, f) for f in ("lunch", "dinner") for r in rs if is_menu(r, f)]
    return min(meals)[2:] if meals else None


def ceremony_guide(p):
    """The MICHELIN Guide whose ceremony gives a place its stars (ceremony_guides(), from content/ceremonies.json)."""
    return next((g for g in ceremony_guides() if set(g.get("places", [])) & set(chain(p["id"]))), None)


def short_answer(p, page, starred, lang):
    """The 40–50 word "In short:" answer beside the page title, in the page's language: how many, split by stars, what
    dinner costs and the cheapest way in. Wording qa… in src/faq-words.json; a language without its own qaFirst/qaAll
    words splits the count by stars the way its FAQ does (tier…, all…)."""
    if not starred:
        return ""
    k = FaqWords(page, lang)
    w, own = k.w, k.own
    name = SEARCH_NAMES[p["id"]]["short"] if p["id"] in SEARCH_NAMES and lang == "en" else pick_lang(page, "name", lang)
    say = lambda key, **v: k.say_html(key, name=e(name), checked=e(long_month(site.get("updated", ""), lang)), **v)
    price = lambda r, f: e(k.price(r, f, usd=False))
    by_stars = by_star_level(k, starred)
    tiers = [(s, len(by_stars[s])) for s in (3, 2, 1) if by_stars[s]]
    if len(starred) == 1:
        r = starred[0]
        stars = w["qaStars" + str(r["stars"])] if "qaStars1" in own else w["star" + str(r["stars"])]
        out = [say("qaCountOne", r=e(k.name(r)), stars=e(stars))]
    elif "qaFirst3" not in own:
        out = [say("qaCount", n=len(starred), split=e(k.tier_split(by_stars)))]
    elif len(tiers) == 1:
        out = [say("qaCountAll", n=len(starred), split=e(w[("qaBoth" if len(starred) == 2 else "qaAll") + str(tiers[0][0])]))]
    else:
        split = and_plain((w[("qaFirst" if i == 0 else "qaThen") + str(s)].replace("{n}", str(n)) for i, (s, n) in enumerate(tiers)), w)
        out = [say("qaCount", n=len(starred), split=e(split))]
    dinners = sorted((r for r in starred if is_menu(r, "dinner")), key=lambda r: to_usd(r, "dinner"))
    if len(dinners) >= 3:
        out.append(say("qaPrice", lo=price(dinners[0], "dinner"), hi=price(dinners[-1], "dinner"), mid=price(dinners[len(dinners) // 2], "dinner")))
    best = cheapest_meal(starred)
    if best:
        r, f = best
        key = ("qaOnly" if len(starred) == 1 else "qaCheap") + ("Lunch" if f == "lunch" else "Dinner")
        out.append(say(key, r=e(k.name(r)), price=price(r, f)))
    return f'<p class="answer"><span class="answer-label">{e(w["qaLabel"])}</span> ' + k.gap.join(out) + "</p>"


# Languages whose destination pages get the "Michelin star lunch deals" section (lunch_deals_html()); its wording is
# the ld… keys in src/faq-words.json, so a language joins once those are translated.
LUNCH_LANGS = ("en",)
LUNCH_DEALS_MIN = 2      # deals a page needs before it gets the section
LUNCH_DEALS_ROWS = 10    # restaurants in its table, the biggest saving first
LUNCH_DEALS_CUT = 0.2    # a lunch must cost at least this much less than dinner (20%) to make the table


def lunch_deals(starred):
    """The restaurants whose set lunch costs less than their dinner menu, as (restaurant, saving as a share of dinner),
    the biggest share first; and the restaurants that list both menus."""
    both = [r for r in starred if is_menu(r, "lunch") and is_menu(r, "dinner")]
    deals = [(r, 1 - r["lunch"] / r["dinner"]) for r in both if r["lunch"] < r["dinner"]]
    deals.sort(key=lambda d: (-d[1], -to_usd(d[0], "dinner"), d[0]["name"].lower()))
    return deals, both


def lunch_deals_html(p, page, starred, lang):
    """"Michelin star lunch deals in London" (9 Oct 2026, for "michelin star lunch deals" searches): how many starred
    restaurants serve a set lunch for less than dinner and the average saving, then a table of the biggest savings,
    each with its lunch, dinner and the saving per person. Local prices, as written into the page (not redrawn by currency)."""
    if lang not in LUNCH_LANGS:
        return ""
    deals, both = lunch_deals(starred)
    top = [(r, cut) for r, cut in deals if cut >= LUNCH_DEALS_CUT][:LUNCH_DEALS_ROWS]
    if len(top) < LUNCH_DEALS_MIN:
        return ""
    w = pilot_words(lang)
    say = lambda key, **v: say_in(w, key, page, **{k: (n_word(x, lang) if isinstance(x, int) else x) for k, x in v.items()})
    text = [say("ldAll" if len(deals) == len(both) else "ldSome", k=len(deals), n=len(both))]
    curs = {r["cur"] for r, _ in deals}
    if len(curs) == 1:
        cur = curs.pop()
        save = sum(r["dinner"] - r["lunch"] for r, _ in deals) / len(deals)
        step = 5 if save < 1000 else 10 ** (len(str(int(save))) - 2)  # £85, ¥13,000
        text.append(say("ldSave", save=money(int(round(save / step) * step), cur) + (
            "" if cur == "USD" else f" (≈\u00a0US${int(round(save / CURRENCIES[cur]['perUSD'] / 5) * 5):,})")))
    best, cut = top[0]
    text.append(say("ldBest", r=best["name"], pc=int(round(cut * 100)), lunch=money(best["lunch"], best["cur"]), dinner=money(best["dinner"], best["cur"])))
    text.append(say("ldTable"))
    stars = lambda r: f'<span class="stars" aria-label="{e(word_n(lang, "starsAria", r["stars"]))}">' + '<svg><use href="#star"/></svg>' * r["stars"] + "</span>"
    # Its own page where it has one, else its row in this page's list (place.js opens #r=<id>).
    href = lambda r: f'#r={r["id"]}' if not r.get("page") and r["cityPath"] == p["path"] else restaurant_href(r)
    link = lambda r: f'<a class="vt-name" href="{href(r)}">{e(r["name"])}</a>'
    rows = "".join(
        f'<tr><td>{link(r)} {stars(r)}<small class="ld-dinner">{e(w["ldDinner"])} {e(money(r["dinner"], r["cur"]))}</small></td>'
        f'<td class="num">{e(money(r["lunch"], r["cur"]))}</td><td class="num">{e(money(r["dinner"], r["cur"]))}</td>'
        f'<td class="num">{e(money(r["dinner"] - r["lunch"], r["cur"]))} <small>{int(round(cut * 100))}%</small></td></tr>'
        for r, cut in top)
    table = (f'<table class="value-table lunch-table"><thead><tr><th>{e(w["chRestaurant"])}</th><th class="num">{e(w["ldLunch"])}</th>'
             f'<th class="num">{e(w["ldDinner"])}</th><th class="num">{e(w["ldSaving"])}</th></tr></thead><tbody>{rows}</tbody></table>')
    return (f'<section id="lunch-deals">\n    <div class="wrap">\n      <div class="section-head"><div>'
            f'<span class="eyebrow">{e(w["ldEyebrow"])}</span><h2 style="margin-top: 6px">{e(say("ldTitle"))}</h2>'
            f'<p>{e(" ".join(text))}</p></div></div>\n      {table}\n      <p class="ld-note">{e(w["ldNote"])}</p>\n    </div>\n  </section>\n')


# Big cities' "By cuisine" and "By neighbourhood" sections (browse_html(), 9 Oct 2026, to-do item seo-cuisine-area-sections,
# for searches like "japanese michelin star restaurants london"): pages holding at least BROWSE_MIN starred restaurants
# themselves (or in their districts), cities and the city-states filed as regions or countries. English only for now;
# wording cu…/nb… in src/faq-words.json.
BROWSE_LANGS = ("en",)
BROWSE_MIN = 25
BROWSE_CITY_STATES = ("hong-kong", "singapore", "macau", "kyoto", "osaka", "shanghai", "beijing")


def area_key(r):
    """A restaurant's neighbourhood: the first part of its area ("Ginza" of "Ginza, Chuo"), as areaKey() in place.js."""
    return (r.get("area") or "").split(",")[0].strip()


def browse_html(p, page, starred, lang):
    """Two sections listing a big city's starred restaurants by cuisine (as the MICHELIN Guide names them) and by
    neighbourhood: a sentence on the biggest groups, then each group with its count and cheapest dinner menu. Each link
    shows just those restaurants in the list above (data-browse, read by place.js); without scripts it goes to the list."""
    if lang not in BROWSE_LANGS or not (p["type"] == "city" or p["id"] in BROWSE_CITY_STATES):
        return ""
    own = [r for r in starred if r["cityPath"] == p["path"] or places.get(r["city"], {}).get("parent") == p["id"]
           and places[r["city"]]["type"] == "district"]
    if len(own) < BROWSE_MIN:
        return ""
    w = pilot_words(lang)
    say = lambda key, **v: say_in(w, key, page, **{k: (n_word(x, lang) if isinstance(x, int) else x) for k, x in v.items()})

    def groups(key):
        found = {}
        for r in own:
            if key(r):
                found.setdefault(key(r), []).append(r)
        return sorted(found.items(), key=lambda g: (-len(g[1]), g[0].lower()))

    def item(kind, name, rs):
        menus = sorted((r for r in rs if is_menu(r, "dinner")), key=lambda r: to_usd(r, "dinner"))
        price = e(w["areaFrom"].replace("{p}", money(menus[0]["dinner"], menus[0]["cur"]))) if menus else ""
        top = max(r["stars"] for r in rs)
        stars = sum(1 for r in rs if r["stars"] == top)
        note = e(w["brStars"].replace("{k}", str(stars)).replace("{stars}", w["star" + str(top)])) if top > 1 else ""
        return (f'<li><a href="#compare" data-browse="{kind}" data-value="{e(name)}">{e(name)}</a> <span class="count">{len(rs)}</span>'
                + "".join(f'<span class="area-from">{x}</span>' for x in (note, price) if x) + "</li>")

    def section(sid, pre, kind, found, intro):
        many = [(n, rs) for n, rs in found if len(rs) > 1]
        single = sorted((n for n, rs in found if len(rs) == 1), key=str.lower)
        links = lambda names: and_names((f'<a href="#compare" data-browse="{kind}" data-value="{e(n)}">{e(n)}</a>' for n in names), w)
        also = f'<p class="also">{e(w["cuAlso"]).replace("{list}", links(single))}</p>' if single else ""
        return page_section(sid, w[pre + "Eyebrow"], say(pre + "Title"), intro + " " + e(say("brPick")),
                            '<ul class="area-links browse-links">' + "".join(item(kind, n, rs) for n, rs in many) + "</ul>" + also)

    out = []
    cuisines = groups(lambda r: r.get("cuisine"))
    if len(cuisines) >= 3:
        top = and_names((f"{e(c)} ({len(rs)})" for c, rs in cuisines[:3]), w)
        intro = e(say("cuIntro", k=len(cuisines), n=len(own))) + " " + say("cuMost", top=top)
        # A cuisine with its own guide here (Indian in London) links to it.
        for c, _ in cuisines:
            guide = "michelin-star-" + c.lower().replace(" ", "-") + "-restaurants-" + p["id"]
            if guide in guides:
                intro += " " + e(w["cuGuide"]).replace("{link}", f'<a href="/guides/{guide}/">{e(guides[guide]["h1"])}</a>')
        out.append(section("cuisines", "cu", "cuisine", cuisines, intro))
    areas = groups(area_key)
    # Neighbourhoods only where most restaurants name one and there are a few (Kyoto's have none, Macau's three are islands).
    if len(areas) >= 4 and sum(len(rs) for _, rs in areas) >= 0.8 * len(own):
        (a1, r1), rest = areas[0], [(a, rs) for a, rs in areas[1:3] if len(rs) > 1]
        intro = e(say("nbMost", area=a1, k=str(len(r1)), n=str(len(own))))
        if rest:
            intro += e(say("nbNext", next=and_plain([f"{a} ({len(rs)})" for a, rs in rest], w)))
        intro += "."
        out.append(section("neighbourhoods", "nb", "area", areas, intro))
    return "".join(out)


def page_section(sid, eyebrow, title, text, body):
    """A section of a destination page: eyebrow, heading, an optional line of text (already escaped), then the body."""
    return (f'<section id="{sid}">\n    <div class="wrap">\n      <div class="section-head"><div>'
            f'<span class="eyebrow">{e(eyebrow)}</span><h2 style="margin-top: 6px">{e(title)}</h2>'
            + (f"<p>{text}</p>" if text else "") + "</div></div>\n      " + body + "\n    </div>\n  </section>\n")


def fact_card(title, count, paragraphs, extra=""):
    """One card of a .facts grid: a heading (with an optional count) and paragraphs, already escaped."""
    head = f'<h3>{e(title)}' + (f' <span class="count">{count}</span>' if count is not None else "") + "</h3>"
    return "<div>" + head + "".join(f"<p>{t}</p>" for t in paragraphs if t) + extra + "</div>"


# ---------- New and lost stars (9 Oct 2026) ----------
# Every destination page with starred restaurants says what its MICHELIN Guide's latest edition changed there, dated:
# new stars, promotions, stars dropped, restaurants no longer starred, then when the stars are announced. It shows
# search engines the page is kept up to date and answers "new Michelin stars in London". A page several guides cover
# (the United States, Japan) gives each guide's changes, newest first. Worked out from change, changeDate and status
# on the restaurants and the ceremonies in content/ceremonies.json. Wording: nw… and cer… in src/faq-words.json.
NEW_STARS_LANGS = ("en",)  # add a language once its nw… and cer… words are translated
NEW_STARS_NAMES = 10       # restaurants named in a sentence before "and 4 more"


def guide_changes(g, rs):
    """The restaurants among rs whose stars changed in a guide's latest edition (changeDate from its month on), or
    None when our files don't hold that edition's changes: it revealed its stars after we last caught up, or not one of
    its restaurants carries a change from it (first editions aren't marked)."""
    month = g["last"]["date"][:7]
    changed = lambda r: (r.get("changeDate") or "") >= month and (r.get("change") in ("new", "up", "down") or r.get("status") in ("lost", "closed"))
    if g["status"] or not any(changed(r) for r in restaurants if set(g.get("places", [])) & set(r["_chain"])):
        return None
    return [r for r in rs if changed(r)]


def changes_text(now, w, say, when):
    """What a guide changed, as sentences: new, promoted, dropped a star, lost their stars, closed. Names link to
    restaurants' own pages where they have one."""
    alpha = lambda r: unicodedata.normalize("NFKD", r["name"]).encode("ascii", "ignore").decode().lower()  # Èter among the Es
    group = lambda test: sorted((r for r in now if test(r)), key=lambda r: (-r["stars"], -r.get("formerStars", 0), alpha(r)))
    new = group(lambda r: r.get("change") == "new" and not r.get("status"))
    up = group(lambda r: r.get("change") == "up" and not r.get("status"))
    down = group(lambda r: r.get("change") == "down" and not r.get("status"))
    lost = group(lambda r: r.get("status") in ("lost", "changed"))
    closed = group(lambda r: r.get("status") == "closed")
    names = lambda rs: and_names((f'<a href="{e(r["page"])}">{e(r["name"])}</a>' if r.get("page") else e(r["name"]) for r in rs), w)
    text = []
    if new:
        shown = new if len(new) <= NEW_STARS_NAMES + 1 else new[:NEW_STARS_NAMES]
        # A newcomer with two or three stars says so, which also explains why it comes first.
        listed = and_names([names([r]) + (e(w["nwNewStars"].replace("{stars}", w["star" + str(r["stars"])])) if r["stars"] > 1 else "") for r in shown]
                           + ([e(w["nwMore"].replace("{m}", str(len(new) - len(shown))))] if len(shown) < len(new) else []), w)
        text.append(say("nwNewOne" if len(new) == 1 else "nwNewText", when=when, k=len(new), names=listed))
    if up:
        text.append(say("nwUpText" if new else "nwUpFirst", when=when, names=and_plain([e(w["nwTo"].replace("{stars}", w["star" + str(st)])).replace("{r}", names([r for r in up if r["stars"] == st]))
                                                     for st in (3, 2) if any(r["stars"] == st for r in up)], w)))
    for rs, key in ((down, "nwDown"), (lost, "nwLost"), (closed, "nwClosed")):
        if rs:
            text.append(say(key + ("One" if len(rs) == 1 else "Text"), names=names(rs)))
    return text, bool(new or up)


def ceremony_card(g, w, say, lang):
    """When a guide's stars are announced: the latest ceremony, the next (or when it's due) and the past few."""
    last = g["last"]
    text = [say("cerText", guide=e(g["name"]), usual=e(g["usual"]))]
    key = "cerLastOnline" if last.get("online") else "cerLast" if last.get("where") else "cerLastNoPlace"
    text.append(say(key, date=long_date(last["date"], lang), where=e(last.get("where", ""))))
    nxt = g.get("coming")
    if nxt:
        text.append(say("cerNext" if nxt.get("where") else "cerNextNoPlace", date=long_date(nxt["date"], lang), where=e(nxt.get("where", ""))))
    elif g.get("due"):
        text.append(say("cerDue", month=long_month(g["due"][:7], lang)))
    if g.get("note"):
        text.append(e(g["note"]))
    # Every guide's dates are on the ceremony dates guide, its row for this one marked #cer-<id>.
    if "michelin-guide-ceremony-dates" in guides:
        text.append(e(w["cerAll"]).replace("{link}", f'<a href="/guides/michelin-guide-ceremony-dates/#cer-{e(g["id"])}">{e(w["cerAllLink"])}</a>'))
    past = [last] + [c for c in g.get("ceremonies", []) if c is not last and c.get("date") != last["date"]]
    rows = "".join(f'<li>{long_date(c["date"], lang)}'
                   + (" · " + e(w["cerOnline"]) if c.get("online") else " · " + e(re.sub(r"^the ", "", c["where"])) if c.get("where") else "") + "</li>"
                   for c in past[:4])
    return fact_card(say("cerTitle"), None, [" ".join(text)], f'<p class="past-label">{e(w["cerPast"])}</p><ul class="past">{rows}</ul>')


def new_stars_html(p, page, lang):
    """The "New Michelin stars in London: the February 2026 guide" section of a destination page (see above)."""
    rs_all = members(p)
    if lang not in NEW_STARS_LANGS or not any(not r.get("status") for r in rs_all):
        return ""
    w = pilot_words(lang)
    say = lambda key, **v: say_in(w, key, page, **{k: (n_word(x, lang) if isinstance(x, int) else x) for k, x in v.items()})
    found = []
    for g in ceremony_guides():
        rs = [r for r in rs_all if set(g.get("places", [])) & set(r["_chain"])]
        if g.get("last") and any(not r.get("status") for r in rs):
            found.append((g, rs))
    found.sort(key=lambda x: x[0]["last"]["date"], reverse=True)
    if not found:
        return ""
    if len(found) == 1:
        g, rs = found[0]
        when = long_month(g["last"]["date"][:7], lang)
        now = guide_changes(g, rs)
        cards = []
        if g["status"]:
            title = say("nwTitleNone", when=when)
            cards.append(fact_card(say("nwWhat", when=when), None, [say("nwUpdating", when=when, date=long_date(g["last"]["date"], lang))]))
        elif now is None:
            title = say("cerTitle")
        else:
            text, gained = changes_text(now, w, say, when) if now else ([say("nwNone", when=when)], False)
            title = say("nwTitle" if gained else "nwTitleChanges" if now else "nwTitleNone", when=when)
            cards.append(fact_card(say("nwWhat", when=when), None, [" ".join(text)]))
        cards.append(ceremony_card(g, w, say, lang))
        return page_section("latest", w["nwEyebrow"], title, "", '<div class="facts">' + "".join(cards) + "</div>")
    cards = []
    for g, rs in found:
        when = long_month(g["last"]["date"][:7], lang)
        now = guide_changes(g, rs)
        if g["status"]:
            text = [say("nwUpdating", when=when, date=long_date(g["last"]["date"], lang))]
        elif now is None:
            continue
        else:
            text = changes_text(now, w, say, when)[0] if now else [say("nwGuideNone")]
        cards.append(fact_card(say("nwGuide", guide=re.sub(r"^MICHELIN Guide ", "", g["name"]), when=when), None, [" ".join(text)]))
    if not cards:
        return ""
    intro = e(say("nwMany", k=len(found)))
    if "michelin-guide-ceremony-dates" in guides:
        intro += " " + e(w["cerAll"]).replace("{link}", f'<a href="/guides/michelin-guide-ceremony-dates/">{e(w["cerAllLink"])}</a>')
    return page_section("latest", w["nwEyebrow"], say("nwTitleMany"), intro, '<div class="facts">' + "".join(cards) + "</div>")


def pilot_sections(p, page, starred, lang):
    """The new sections, written into the page after "What each extra Michelin star costs": short paragraphs worked out
    from the restaurants, naming a few rather than listing them all (the list above has every one)."""
    if not starred:
        return ""
    w = pilot_words(lang)
    say = lambda key, **v: say_in(w, key, page, **{k: (n_word(x, lang) if isinstance(x, int) else x) for k, x in v.items()})
    tier_word = lambda s: w["tierWord" + str(s)]

    section, card = page_section, fact_card

    # The latest guide's changes, used by the star levels and the latest-guide section.
    dated = [r for r in members(p) if r.get("changeDate") and (r.get("change") or r.get("status") in ("lost", "closed"))]
    latest = max((r["changeDate"] for r in dated), default="")
    when = long_month(latest, lang) if latest else ""
    now = [r for r in dated if r["changeDate"] == latest]
    out = []

    # Star by star: for each level, how many, what dinner and lunch cost, the wine pairings, where they are and what's new.
    cards = []
    for s in (3, 2, 1):
        rs = sorted((r for r in starred if r["stars"] == s), key=lambda r: r["name"].lower())
        if not rs:
            continue
        k = len(rs)
        count = e(say("lvCountOne" if k == 1 else "lvCount", k=k, tier=tier_word(s)))
        # The three-star count links to the place's three-star guide, where there is one: the one link in this section.
        guide = f"three-michelin-star-restaurants-{p['id']}"
        if s == 3 and guide in guides:
            phrase = e(w["lvTierPhrase"].replace("{k}", n_word(k, lang)).replace("{tier}", tier_word(s)))
            count = count.replace(phrase, f'<a href="/guides/{guide}/">{phrase}</a>', 1)
        text = [count + (": " + plain_names(rs, w) if 1 < k <= PILOT_NAMES else (", " + e(rs[0]["name"]) if k == 1 else "")) + "."]
        menus = sorted((r for r in rs if is_menu(r, "dinner")), key=lambda r: to_usd(r, "dinner"))
        if len(menus) >= 2:
            sentence = say("lvRange", lo=e(money(menus[0]["dinner"], menus[0]["cur"])), rlo=e(menus[0]["name"]),
                           hi=e(money(menus[-1]["dinner"], menus[-1]["cur"])), rhi=e(menus[-1]["name"]))
            if len(menus) >= 5:
                sentence += e(w["lvMid"].replace("{mid}", money(menus[len(menus) // 2]["dinner"], menus[0]["cur"])))
            text.append(sentence + ".")
        elif menus:
            text.append(say("lvOnePrice", lo=e(money(menus[0]["dinner"], menus[0]["cur"]))))
        lunches = sorted((r for r in rs if is_menu(r, "lunch")), key=lambda r: to_usd(r, "lunch"))
        if lunches:
            text.append(say("lvLunchSolo" if k == 1 else "lvLunchAll" if len(lunches) == k else "lvLunchOne" if len(lunches) == 1 else "lvLunch",
                            k=len(lunches), lo=e(money(lunches[0]["lunch"], lunches[0]["cur"])), r=e(lunches[0]["name"])))
        elif k > 1:
            text.append(say("lvNoLunch"))
        wines = sorted(r["wine"] for r in rs if r.get("wine") is not None and r["cur"] == rs[0]["cur"])
        if len(wines) >= 2:
            text.append(say("lvWine", lo=e(money(wines[0], rs[0]["cur"])), hi=e(money(wines[-1], rs[0]["cur"]))))
        if k >= 4:
            areas = busiest_areas(rs, w)
            if len(areas) == 1:
                text.append(say("lvAreaOne", k=areas[0][0], area=e(areas[0][1])))
            elif areas:
                text.append(say("lvAreas", areas=and_names((f"{e(a)} ({k})" for k, a in areas), w)))
        moved = [r for r in now if r in rs and r.get("change") in ("new", "up")]
        if moved:
            text.append(say("lvNew", when=when, names=plain_names(moved, w)))
        cards.append(card(say("lv" + str(s)), k, [" ".join(text)]))
    out.append(section("levels", w["lvEyebrow"], say("lvTitle"), "", '<div class="facts">' + "".join(cards) + "</div>"))

    # The cheapest meals: a sentence on lunch and the cheapest way into each level, then each restaurant's cheapest set menu.
    best = {}
    for f in ("lunch", "dinner"):
        for r in starred:
            if is_menu(r, f) and (r["id"] not in best or to_usd(r, f) < to_usd(*best[r["id"]])):
                best[r["id"]] = (r, f)
    cheap = sorted(best.values(), key=lambda b: to_usd(*b))[:8]
    if len(cheap) >= 3:
        text = [say("chText")]
        both = [r for r in starred if is_menu(r, "lunch") and is_menu(r, "dinner")]
        lower = [r for r in both if r["lunch"] < r["dinner"]] if len({r["cur"] for r in both}) == 1 else []
        if len(lower) >= 3:
            save = sum(r["dinner"] - r["lunch"] for r in lower) / len(lower)
            text.append(say("chLunch", k=len(lower), n=len(both), save=money(int(round(save / 5) * 5), lower[0]["cur"])))
        for s in (3, 2):
            top = cheapest_meal([r for r in starred if r["stars"] == s])
            if top:
                r, f = top
                text.append(say("chTop", tier=tier_word(s), meal=w["mealLunch" if f == "lunch" else "mealDinner"], r=r["name"], price=priced(r, f)))
        stars = lambda r: f'<span class="stars" aria-label="{e(word_n(lang, "starsAria", r["stars"]))}">' + '<svg><use href="#star"/></svg>' * r["stars"] + "</span>"
        note = lambda r, f: pick_lang(r, f + "Note", lang)
        rows = "".join(f'<tr><td><span class="vt-name">{e(r["name"])}</span> {stars(r)}' + (f'<small>{e(note(r, f))}</small>' if note(r, f) else "") + "</td>"
                       f'<td>{e(w["chLunchWord" if f == "lunch" else "chDinnerWord"])}</td><td class="num">{e(priced(r, f))}</td></tr>'
                       for r, f in cheap)
        table = (f'<table class="value-table"><thead><tr><th>{e(w["chRestaurant"])}</th><th>{e(w["chMeal"])}</th>'
                 f'<th class="num">{e(w["chPrice"])}</th></tr></thead><tbody>{rows}</tbody></table>')
        out.append(section("cheapest", w["chEyebrow"], say("chTitle"), e(" ".join(text)), table))


    # Dietary needs, from the MICHELIN Guide's listings: vegetarian, vegan, then halal and kosher (which mean "on request").
    has = lambda d: sorted((r for r in starred if d in r.get("diets", [])), key=lambda r: (-r["stars"], r["name"].lower()))
    first = lambda rs: plain_names(rs[:3], w)
    cards, kinds = [], []
    only, menu, vegan, halal, kosher = has("vegetarian-only"), has("vegetarian-menu"), has("vegan"), has("halal"), has("kosher")
    text = []
    if only:
        text.append(say("dtOnlyOne" if len(only) == 1 else "dtOnlyMany", k=len(only), names=plain_names(only, w)))
    if menu:
        text.append(say("dtMenuOne" if len(menu) == 1 else "dtMenuText", k=len(menu), n=len(starred), names=first(menu)))
    if text:
        kinds.append(w["dtWordVeg"])
        cards.append(card(w["dtVegTitle"], None, [" ".join(text)]))
    if vegan:
        kinds.append(w["dtWordVegan"])
        cards.append(card(w["dtVeganTitle"], None, [say("dtVeganOne" if len(vegan) == 1 else "dtVeganText", k=len(vegan), n=len(starred), names=first(vegan))]))
    text = []
    if halal:
        kinds.append(w["dtWordHalal"])
        text.append(say("dtHalalOne" if len(halal) == 1 else "dtHalalText", k=len(halal), names=first(halal)))
    if kosher:
        kinds.append(w["dtWordKosher"])
        text.append(say("dtKosherOne" if len(kosher) == 1 else "dtKosherText", k=len(kosher), names=first(kosher)))
    if text:
        cards.append(card(w["dtFaithTitle"] if halal and kosher else w["dtHalalTitle"] if halal else w["dtKosherTitle"], None, [" ".join(text + [say("dtCertNote")])]))
    if cards:
        out.append(section("diets", w["dtEyebrow"], say("dtTitle", diets=and_plain(kinds, w)),
                           e(say("dtText")), '<div class="facts">' + "".join(cards) + "</div>"))
    return "".join(out)


def pilot_headings(html_text, page, lang):
    """The pilot pages' section headings, naming the place. Written in without data-i18n, so common.js leaves them be."""
    w = pilot_words(lang)
    for key, own in PILOT_HEADINGS.items():
        html_text = re.sub(r'(<h2\b[^>]*?)\sdata-i18n="' + key + r'"([^>]*>)[^<]*(</h2>)',
                           lambda m: m.group(1) + m.group(2) + e(say_in(w, own, page)) + m.group(3), html_text)
    return html_text


# The footer's popular destinations, on every page: the biggest and most searched-for places, one click from anywhere.
FOOT_PLACES = ("london", "paris", "tokyo", "new-york", "hong-kong", "singapore", "kyoto", "seoul", "bangkok", "shanghai", "taipei",
               "copenhagen", "barcelona", "madrid", "rome", "milan", "chicago", "san-francisco", "los-angeles", "dubai")


def foot_places_html(lang="en", current=None):
    w = dict(FAQ_WORDS["en"], **FAQ_WORDS.get(lang, {}))
    links = []
    for i in FOOT_PLACES:
        q = places.get(i)
        if not q or not starred_n.get(i):
            continue
        name = e(name_in(q, lang))
        links.append(f'<span aria-current="page">{name}</span>' if i == current else
                     f'<a href="{lang_path(q["path"], lang) if lang in place_langs(q) else q["path"]}">{name}</a>')
    return f'<nav class="foot-places" aria-label="{e(w["footPopular"])}"><span>{e(w["footPopular"])}</span> {" ".join(links)}</nav>'


FOOT_PLACES_EN = foot_places_html()


# Related guides on destination pages: at most this many, most specific first.
RELATED_MAX = 6


def related_guides(p, starred):
    """The guides that fit a destination page, best first: ones whose `places` include it or a place above it (the
    closer the place, the higher), then ones whose article links to this page (most links first), the world three-star
    list where the page has a three-star restaurant, and the by-country guide (higher on country pages). Topped up with the
    pillar and the inspection guide so every page has at least three."""
    above = chain(p["id"]) if p["type"] != "group" else [p["id"]] + countries_of(p)
    scores = {}
    for g in guides.values():
        hits = [above.index(i) for i in g.get("places", []) if i in above]
        links = len(re.findall(r'href="' + re.escape(p["path"]) + r'(?:#[^"]*)?"', guide_bodies()[g["id"]]))
        if hits:
            score = (4, -min(hits), links)
        elif links:
            score = (3, 0, links)
        elif g["id"] == "three-michelin-star-restaurants" and any(r["stars"] == 3 for r in starred):
            score = (2, 0, 0)
        elif g["id"] == "michelin-stars-by-country":
            score = (2 if p["type"] == "country" else 1, 0, 0)
        else:
            continue
        scores[g["id"]] = score
    picked = sorted(scores, key=lambda i: (tuple(-x for x in scores[i]), i))[:RELATED_MAX]
    for i in (GUIDE_PILLAR, "how-restaurants-get-a-michelin-star"):
        if len(picked) < 3 and i in guides and i not in picked:
            picked.append(i)
    return [guides[i] for i in picked]


def related_guides_html(p, starred, items=None):
    items = related_guides(p, starred) if items is None else items
    if not items:
        return ""
    def card(g):
        img = guide_image(g)
        pic = (f'<img src="{img}-card.jpg" alt="" width="800" height="450" loading="lazy" decoding="async">' if img else
               '<span class="guide-ph" aria-hidden="true">' + '<svg><use href="#star"/></svg>' * 3 + "</span>")
        return f'<li>{pic}<div><h3><a href="/guides/{g["id"]}/">{e(g["h1"])}</a></h3><p>{e(g["summary"])}</p></div></li>'
    return ('<section id="guides">\n    <div class="wrap">\n      <div class="section-head"><div>'
            '<span class="eyebrow">Guides</span><h2 style="margin-top: 6px">Related guides</h2></div>'
            '<a class="more-guides" href="/guides/">All guides</a></div>\n'
            '      <ul class="related-guides">' + "".join(card(g) for g in items) + "</ul>\n    </div>\n  </section>\n")


def place_description(where, starred, stars, menus):
    """The page's search-result snippet: the fullest wording that fits in 155 characters, as Google cuts off longer ones."""
    if not starred:
        return f"There are no Michelin-starred restaurants in {where} yet. We'll add their dinner, lunch and wine pairing prices here as soon as one gets a star."
    n = len(starred)
    places = f"{n} Michelin-starred restaurant{'s' if n > 1 else ''} in {where}"
    tiers = [(k, label) for k, label in zip(stars[::-1], ("three", "two", "one")) if k]
    mix = ", ".join(f"{k} {label}-star" for k, label in tiers) if len(tiers) > 1 else \
        f"all {tiers[0][1]}-star" if n > 1 else f"{tiers[0][1]} star{'s' if tiers[0][1] != 'one' else ''}"
    if menus:
        lo, hi = money(menus[0]["dinner"], menus[0]["cur"]), money(menus[-1]["dinner"], menus[-1]["cur"])
        span = f"from {lo} to {hi}" if lo != hi else lo
        dinner, short = f", from {lo} to {hi} for a dinner menu" if lo != hi else f", {lo} for a dinner menu", f", dinner menus {span}"
    else:
        dinner = short = ""
    options = [
        f"Dinner, lunch and wine pairing prices at {places} ({mix}){dinner}.",
        f"Dinner, lunch and wine pairing prices at {places} ({mix}){short}.",
        f"Dinner, lunch and wine pairing prices at {places}{dinner}.",
        f"Dinner, lunch and wine prices at {places}{short}.",
        f"Dinner, lunch and wine pairing prices at {places}.",
        f"Menu prices at {places}.",
    ]
    return next((o for o in options if len(o) <= 155), options[-1])


# Destination page titles (the blue link in Google), per language: page_titles() tries the fullest wording first and
# drops to shorter ones until it fits TITLE_MAX. {in} is the place as it reads mid-sentence ("à Paris", "Helsingissä"),
# {name} its plain name, {n} the number of starred restaurants. Keys: head / headOne (one restaurant), short (a shorter head),
# then what follows the colon: all (every one has a price; allOne when there's just one), some (some priced), none (none priced),
# empty (no stars yet), prices (the short fallback). sep and year default to ": " and " ({y})".
TITLE_MAX = 61
TITLE_WORDS = {
    "en": {"head": "Michelin Star Restaurants in {in}", "headOne": "Michelin Star Restaurant in {in}", "short": "{name} Michelin Star Restaurants",
           "all": "Prices for All {n}", "allOne": "Menu Prices", "some": "All {n}, With Prices", "none": "All {n}", "empty": "None Yet", "prices": "Prices"},
    "zh": {"head": "{name}米其林星級餐廳", "all": "全部{n}家價格", "allOne": "價格", "some": "全{n}家與價格", "none": "全{n}家", "empty": "尚無",
           "prices": "價格", "sep": "：", "year": "（{y}）"},
    "yue": {"head": "{name}米芝蓮星級餐廳", "all": "全部{n}間價錢", "allOne": "價錢", "some": "全{n}間連價錢", "none": "全{n}間", "empty": "暫時未有",
            "prices": "價錢", "sep": "：", "year": "（{y}）"},
    "zhs": {"head": "{name}米其林星级餐厅", "all": "全部{n}家价格", "allOne": "价格", "some": "全{n}家及价格", "none": "全{n}家", "empty": "暂无",
            "prices": "价格", "sep": "：", "year": "（{y}）"},
    "ja": {"head": "{name}のミシュラン星付きレストラン", "short": "{name}のミシュラン店", "all": "全{n}軒の料金", "allOne": "料金", "some": "全{n}軒と料金",
           "none": "全{n}軒", "empty": "まだなし", "prices": "料金", "sep": "：", "year": "（{y}年）"},
    "ko": {"head": "{name} 미쉐린 스타 레스토랑", "short": "{name} 미쉐린 레스토랑", "all": "{n}곳 전체 가격", "allOne": "가격", "some": "전체 {n}곳과 가격",
           "none": "전체 {n}곳", "empty": "아직 없음", "prices": "가격"},
    "fr": {"head": "Restaurants étoilés Michelin {in}", "headOne": "Restaurant étoilé Michelin {in}", "short": "Restaurants étoilés {in}",
           "all": "les prix des {n}", "allOne": "prix des menus", "some": "les {n}, avec leurs prix", "none": "les {n}", "empty": "aucun pour l'instant",
           "prices": "les prix", "sep": " : "},
    "es": {"head": "Restaurantes con estrella Michelin {in}", "headOne": "Restaurante con estrella Michelin {in}", "short": "Restaurantes Michelin {in}",
           "all": "precios de los {n}", "allOne": "precios", "some": "los {n}, con precios", "none": "los {n}", "empty": "aún ninguno", "prices": "precios"},
    "it": {"head": "Ristoranti stellati Michelin {in}", "headOne": "Ristorante stellato Michelin {in}", "short": "Ristoranti stellati {in}",
           "all": "prezzi di tutti i {n}", "allOne": "prezzi", "some": "tutti i {n}, con prezzi", "none": "tutti i {n}", "empty": "ancora nessuno", "prices": "prezzi"},
    "ca": {"head": "Restaurants amb estrella Michelin {in}", "headOne": "Restaurant amb estrella Michelin {in}", "short": "Restaurants amb estrella {in}",
           "all": "preus dels {n}", "allOne": "preus", "some": "els {n}, amb preus", "none": "els {n}", "empty": "encara cap", "prices": "preus"},
    "da": {"head": "Michelinrestauranter {in}", "headOne": "Michelinrestaurant {in}", "all": "priser på alle {n}", "allOne": "priser",
           "some": "alle {n} med priser", "none": "alle {n}", "empty": "ingen endnu", "prices": "priser"},
    "sv": {"head": "Michelinrestauranger {in}", "headOne": "Michelinrestaurang {in}", "all": "priser för alla {n}", "allOne": "priser",
           "some": "alla {n} med priser", "none": "alla {n}", "empty": "inga än", "prices": "priser"},
    "is": {"head": "Michelin-veitingastaðir {in}", "headOne": "Michelin-veitingastaður {in}", "all": "verð á öllum {n}", "allOne": "verð",
           "some": "allir {n} með verði", "none": "allir {n}", "empty": "enginn enn", "prices": "verð"},
    "nb": {"head": "Michelin-restauranter {in}", "headOne": "Michelin-restaurant {in}", "all": "priser for alle {n}", "allOne": "priser",
           "some": "alle {n} med priser", "none": "alle {n}", "empty": "ingen ennå", "prices": "priser"},
    "th": {"head": "ร้านอาหารมิชลินสตาร์{in}", "all": "ราคาทั้ง {n} ร้าน", "allOne": "ราคา", "some": "ทั้ง {n} ร้าน พร้อมราคา", "none": "ทั้ง {n} ร้าน",
           "empty": "ยังไม่มี", "prices": "ราคา"},
    "de": {"head": "Michelin-Sternerestaurants {in}", "headOne": "Michelin-Sternerestaurant {in}", "short": "Sternerestaurants {in}",
           "all": "Preise aller {n}", "allOne": "Preise", "some": "alle {n} mit Preisen", "none": "alle {n}", "empty": "noch keine", "prices": "Preise"},
    "nl": {"head": "Michelin-sterrenrestaurants {in}", "headOne": "Michelin-sterrenrestaurant {in}", "short": "Sterrenrestaurants {in}",
           "all": "prijzen van alle {n}", "allOne": "prijzen", "some": "alle {n} met prijzen", "none": "alle {n}", "empty": "nog geen", "prices": "prijzen"},
    "pt": {"head": "Restaurantes com estrela Michelin {in}", "headOne": "Restaurante com estrela Michelin {in}", "short": "Restaurantes Michelin {in}",
           "all": "preços dos {n}", "allOne": "preços", "some": "os {n}, com preços", "none": "os {n}", "empty": "ainda nenhum", "prices": "preços"},
    "fi": {"head": "Michelin-tähtiravintolat {in}", "headOne": "Michelin-tähtiravintola {in}", "short": "Tähtiravintolat {in}",
           "all": "kaikkien {n} hinnat", "allOne": "hinnat", "some": "kaikki {n} ja hinnat", "none": "kaikki {n}", "empty": "ei vielä yhtään", "prices": "hinnat"},
    "pl": {"head": "Restauracje z gwiazdką Michelin {in}", "headOne": "Restauracja z gwiazdką Michelin {in}", "short": "Restauracje z gwiazdką {in}",
           "all": "ceny wszystkich {n}", "allOne": "ceny", "some": "wszystkie {n} z cenami", "none": "wszystkie {n}", "empty": "jeszcze brak", "prices": "ceny"},
    "cs": {"head": "Restaurace s michelinskou hvězdou {in}", "short": "Michelinské restaurace {in}",
           "all": "ceny všech {n}", "allOne": "ceny", "some": "všech {n} a ceny", "none": "všech {n}", "empty": "zatím žádné", "prices": "ceny"},
    "hu": {"head": "Michelin-csillagos éttermek {in}", "headOne": "Michelin-csillagos étterem {in}", "short": "Csillagos éttermek {in}",
           "all": "mind a {n} árai", "allOne": "árak", "some": "mind a {n}, árakkal", "none": "mind a {n}", "empty": "még nincs", "prices": "árak"},
    "sl": {"head": "Restavracije z Michelinovo zvezdico {in}", "headOne": "Restavracija z Michelinovo zvezdico {in}", "short": "Michelinove restavracije {in}",
           "all": "cene vseh {n}", "allOne": "cene", "some": "vseh {n} s cenami", "none": "vseh {n}", "empty": "še nobene", "prices": "cene"},
    "hr": {"head": "Restorani s Michelinovom zvjezdicom {in}", "headOne": "Restoran s Michelinovom zvjezdicom {in}", "short": "Michelinovi restorani {in}",
           "all": "cijene svih {n}", "allOne": "cijene", "some": "svih {n} s cijenama", "none": "svih {n}", "empty": "još nijedan", "prices": "cijene"},
    "sr": {"head": "Ресторани са Мишелиновом звездицом {in}", "headOne": "Ресторан са Мишелиновом звездицом {in}", "short": "Мишелинови ресторани {in}",
           "all": "цене свих {n}", "allOne": "цене", "some": "свих {n} са ценама", "none": "свих {n}", "empty": "још ниједан", "prices": "цене"},
    "el": {"head": "Εστιατόρια με αστέρι Michelin {in}", "headOne": "Εστιατόριο με αστέρι Michelin {in}", "short": "Εστιατόρια Michelin {in}",
           "all": "τιμές και των {n}", "allOne": "τιμές", "some": "και τα {n}, με τιμές", "none": "και τα {n}", "empty": "κανένα ακόμη", "prices": "τιμές"},
    "tr": {"head": "{name} Michelin yıldızlı restoranları", "headOne": "{name} Michelin yıldızlı restoranı", "short": "{name} Michelin restoranları",
           "all": "tüm {n} restoranın fiyatları", "allOne": "fiyatlar", "some": "tüm {n} restoran ve fiyatlar", "none": "tüm {n} restoran", "empty": "henüz yok",
           "prices": "fiyatlar"},
    "lt": {"head": "Michelin žvaigždutės restoranai {in}", "headOne": "Michelin žvaigždutės restoranas {in}", "short": "Michelin restoranai {in}",
           "all": "visų {n} kainos", "allOne": "kainos", "some": "visi {n} su kainomis", "none": "visi {n}", "empty": "dar nėra", "prices": "kainos"},
    "lv": {"head": "Michelin zvaigžņu restorāni {in}", "headOne": "Michelin zvaigznes restorāns {in}", "short": "Michelin restorāni {in}",
           "all": "visu {n} cenas", "allOne": "cenas", "some": "visi {n} ar cenām", "none": "visi {n}", "empty": "vēl nav", "prices": "cenas"},
    "et": {"head": "Michelini tärniga restoranid {in}", "headOne": "Michelini tärniga restoran {in}", "short": "Michelini restoranid {in}",
           "all": "kõigi {n} hinnad", "allOne": "hinnad", "some": "kõik {n} koos hindadega", "none": "kõik {n}", "empty": "veel pole", "prices": "hinnad"},
    "mt": {"head": "Ristoranti bi stilla Michelin {in}", "headOne": "Ristorant bi stilla Michelin {in}", "short": "Ristoranti Michelin {in}",
           "all": "il-prezzijiet tal-{n} kollha", "allOne": "prezzijiet", "some": "il-{n} kollha bil-prezzijiet", "none": "il-{n} kollha", "empty": "għad m'hemmx",
           "prices": "prezzijiet"},
    "ms": {"head": "Restoran berbintang Michelin {in}", "short": "Restoran Michelin {in}",
           "all": "harga kesemua {n}", "allOne": "harga", "some": "kesemua {n} dengan harga", "none": "kesemua {n}", "empty": "belum ada", "prices": "harga"},
    "fil": {"head": "Mga Michelin-star na restawran {in}", "headOne": "Michelin-star na restawran {in}", "short": "Mga Michelin restawran {in}",
            "all": "presyo ng lahat ng {n}", "allOne": "presyo", "some": "lahat ng {n}, may presyo", "none": "lahat ng {n}", "empty": "wala pa", "prices": "presyo"},
    "vi": {"head": "Nhà hàng sao Michelin {in}", "short": "Nhà hàng Michelin {in}",
           "all": "giá của cả {n} nhà hàng", "allOne": "giá", "some": "cả {n} nhà hàng kèm giá", "none": "cả {n} nhà hàng", "empty": "chưa có", "prices": "giá"},
    "ar": {"head": "مطاعم ميشلان الحاصلة على نجوم {in}", "headOne": "مطعم حاصل على نجمة ميشلان {in}", "short": "مطاعم ميشلان {in}",
           "all": "أسعار المطاعم الـ{n} كلها", "allOne": "الأسعار", "some": "المطاعم الـ{n} كلها مع الأسعار", "none": "المطاعم الـ{n} كلها", "empty": "لا يوجد بعد",
           "prices": "الأسعار"},
}


def title_width(text):
    """Roughly how wide a title shows in Google: Chinese, Japanese and Korean characters count double."""
    return sum(2 if unicodedata.east_asian_width(c) in "WF" else 1 for c in text)


def page_titles(p, page, languages, starred):
    """The page's title in each of its languages, e.g. "Michelin Star Restaurants in London: Prices for All 84 (2026)"."""
    n = len(starred)
    priced = sum(1 for r in starred if r.get("dinner") is not None or r.get("lunch") is not None)
    year = site.get("updated", "")[:4]
    # Two places with the same name (Limburg in Belgium and the Netherlands, Luxembourg the country and the Belgian
    # province) get their country's name after it, so their titles differ.
    country = places[chain(p["id"])[-1]] if p["type"] != "country" and same_name.get(p["name"], 0) > 1 else None
    titles = {}
    for lang in languages:
        w = TITLE_WORDS.get(lang) or TITLE_WORDS["en"]
        sfx = "" if lang == "en" or lang not in TITLE_WORDS else LANG_SUFFIXES[LANGUAGES.index(lang) - 1]
        sfxs = [sfx, "Zh"] if sfx in ("Yue", "Zhs") else [sfx]
        name_of = lambda o: next((o["name" + s] for s in sfxs if s and o.get("name" + s)), o["name"])
        name, where = name_of(p), page.get("inSentence" + sfx) or page["inSentence"]
        if lang == "en" and SEARCH_NAMES.get(p["id"], {}).get("title"):
            name = where = SEARCH_NAMES[p["id"]]["short"]
        if country and name == p["name"]:
            # Only where the place reads as its bare name ("Limburg", "in Limburg"), not "Belgian Limburg" or "in Belgisch-Limburg".
            before = where[:-len(name)].strip() if where.endswith(name) else None
            if before == "" or (before and lang != "en" and " " not in before):
                where = f"{where} ({name_of(country)})"
            name = f"{name} ({name_of(country)})"
        tail = (w["empty"] if not n else (w.get("allOne") if n == 1 else w["all"]) if priced == n else w["some"] if priced else
                (w["none"] if n > 1 else ""))
        heads = [w.get("headOne", w["head"]) if n == 1 else w["head"]] + ([w["short"]] if w.get("short") else [])
        tails = [tail, w["prices"] if priced else "", ""]
        options = []
        for t in dict.fromkeys(tails):
            for h in heads:
                for dated in (True, False):
                    text = h + (w.get("sep", ": ") + t if t else "") + (w.get("year", " ({y})").replace("{y}", year) if dated and year else "")
                    options.append(text.replace("{in}", where).replace("{name}", name).replace("{n}", str(n)))
        titles[lang] = p["title"] if lang == "en" and p.get("title") else next((o for o in options if title_width(o) <= TITLE_MAX), options[-1])
    return titles


LD_LIST_MAX = 60  # the most restaurants a page's structured data lists (France's 646 in full came to 230 KB)


def json_ld(p, crumbs, starred, description, lang="en", texts=None, faq=()):
    """Structured data for search engines: the breadcrumb trail, the starred restaurants as a list and the FAQ.
    Google ratings are deliberately left out (Google doesn't allow ratings copied from elsewhere).
    A translated page names its trail in its language and links to the same language where the page above offers it."""
    at = lambda c: lang_path(c["path"], lang) if lang in place_langs(c) else c["path"]
    trail = [{"name": texts["crumbHome"] if texts else "All destinations", "path": "/"}] + \
        [{"name": pick_lang(c, "name", lang), "path": at(c)} for c in crumbs + [p]]
    graph = [{"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": c["name"], "item": SITE_URL + c["path"]} for i, c in enumerate(trail)]}]
    if starred:
        items = []
        # Big places list their top LD_LIST_MAX (most stars first), with numberOfItems giving the full count.
        for i, r in enumerate(sorted(starred, key=lambda r: (-r["stars"], r["name"]))[:LD_LIST_MAX]):
            item = {"@type": "Restaurant", "name": r["name"], "servesCuisine": r.get("cuisine"),
                    "award": f"{r['stars']} MICHELIN Star{'s' if r['stars'] > 1 else ''}"}
            if r.get("address"):
                item["address"] = r["address"]
            if r.get("lat") is not None:
                item["geo"] = {"@type": "GeoCoordinates", "latitude": r["lat"], "longitude": r["lng"]}
            if r.get("website"):
                item["url"] = r["website"]
            if r.get("dinner") is not None and r.get("dinnerType") == "menu":
                item["priceRange"] = f"Tasting menu {money(r['dinner'], r['cur'])}"
            items.append({"@type": "ListItem", "position": i + 1, "item": {k: v for k, v in item.items() if v}})
        graph.append({"@type": "ItemList", "name": f"Michelin-starred restaurants in {in_sentence(p)}" if lang == "en" else plain(texts["h1"]), "description": description,
                      "numberOfItems": len(starred), "itemListElement": items})
    if faq:
        graph.append({"@type": "FAQPage", "inLanguage": HREFLANG.get(lang, lang), "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
    return '<script type="application/ld+json">' + as_json({"@context": "https://schema.org", "@graph": graph}) + "</script>"


def og_image(p):
    """The page's link-preview picture, else the nearest place above it that has one, else the homepage's."""
    for pid in (chain(p["id"]) if p["type"] != "group" else [p["id"]]):
        if (SRC / "og" / f"{pid}.png").exists():
            return f"{SITE_URL}/og/{pid}.png"
    return f"{SITE_URL}/og/default.png"


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


def build_world(ours):
    """The homepage's pins for starred restaurants we don't have prices for yet, written to /data/world.json.
    Ours includes closed and destarred ones, so a restaurant the guide hasn't dropped yet doesn't come back as a pin."""
    path = CONTENT / "world-starred.json"
    if not path.exists():
        return None, 0
    rows = read_json(path).get("restaurants", [])
    near = {}
    for r in ours:
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


# Countries in the world list without a page of ours yet: the Michelin guide's name -> id, English and Chinese names.
# Countries we already cover (USA, Hong Kong SAR…) are left out by their id matching one of our pages.
WORLD_COUNTRIES = {
    "Abu Dhabi": ("uae", "United Arab Emirates", "阿拉伯聯合大公國"), "Dubai": ("uae", "United Arab Emirates", "阿拉伯聯合大公國"),
    "Andorra": ("andorra", "Andorra", "安道爾"), "Argentina": ("argentina", "Argentina", "阿根廷"), "Austria": ("austria", "Austria", "奧地利"),
    "Belgium": ("belgium", "Belgium", "比利時"), "Brazil": ("brazil", "Brazil", "巴西"), "Canada": ("canada", "Canada", "加拿大"),
    "Chinese Mainland": ("china", "China", "中國"), "Croatia": ("croatia", "Croatia", "克羅埃西亞"), "Czechia": ("czechia", "Czechia", "捷克"),
    "Estonia": ("estonia", "Estonia", "愛沙尼亞"), "Finland": ("finland", "Finland", "芬蘭"), "Germany": ("germany", "Germany", "德國"),
    "Greece": ("greece", "Greece", "希臘"), "Hungary": ("hungary", "Hungary", "匈牙利"), "Iceland": ("iceland", "Iceland", "冰島"),
    "Italy": ("italy", "Italy", "義大利"), "Latvia": ("latvia", "Latvia", "拉脫維亞"), "Liechtenstein": ("liechtenstein", "Liechtenstein", "列支敦斯登"),
    "Lithuania": ("lithuania", "Lithuania", "立陶宛"), "Luxembourg": ("luxembourg", "Luxembourg", "盧森堡"), "Malaysia": ("malaysia", "Malaysia", "馬來西亞"),
    "Malta": ("malta", "Malta", "馬爾他"), "Mexico": ("mexico", "Mexico", "墨西哥"), "Netherlands": ("netherlands", "Netherlands", "荷蘭"),
    "Norway": ("norway", "Norway", "挪威"), "Poland": ("poland", "Poland", "波蘭"), "Portugal": ("portugal", "Portugal", "葡萄牙"),
    "Qatar": ("qatar", "Qatar", "卡達"), "Serbia": ("serbia", "Serbia", "塞爾維亞"), "Slovenia": ("slovenia", "Slovenia", "斯洛維尼亞"),
    "Sweden": ("sweden", "Sweden", "瑞典"), "Switzerland": ("switzerland", "Switzerland", "瑞士"), "Thailand": ("thailand", "Thailand", "泰國"),
    "The Philippines": ("philippines", "Philippines", "菲律賓"), "Türkiye": ("turkiye", "Türkiye", "土耳其"), "Vietnam": ("vietnam", "Vietnam", "越南"),
    "USA": ("usa", "", ""), "Hong Kong SAR": ("hong-kong", "", ""), "Macau SAR": ("macau", "", ""), "Taiwan Region": ("taiwan", "", ""),
    "Principality of Monaco": ("monaco", "", ""),
}


# Each country's continent, for the homepage's continent filter. A country missing here is listed by the build.
CONTINENTS = {
    "europe": "andorra austria belgium croatia czechia denmark estonia finland france germany greece hungary iceland ireland italy latvia "
              "liechtenstein lithuania luxembourg malta monaco netherlands norway poland portugal serbia slovenia spain sweden switzerland turkiye uk",
    "asia": "china hong-kong macau taiwan japan south-korea singapore malaysia thailand vietnam philippines",
    "middle-east": "uae qatar saudi-arabia",
    "americas": "usa canada mexico brazil argentina",
    "oceania": "new-zealand",
}
CONTINENT_OF = {cid: k for k, v in CONTINENTS.items() for cid in v.split()}


def world_countries():
    """The "Pick a country" cards for countries we have no page for yet (star counts and a box around their restaurants
    for the map), and the guide's star counts for the countries we do have, which may cover only some of their cities."""
    rows = json.loads((CONTENT / "world-starred.json").read_text(encoding="utf-8"))["restaurants"]
    ours = {p["id"] for p in pages if p["type"] == "country"}
    by_name = {p["name"]: p["id"] for p in pages if p["type"] == "country"}
    out, guide, unknown = {}, {}, set()
    for name, stars, lat, lng, cuisine, where, path in rows:
        country = where.split(", ")[-1]
        cid = by_name.get(country) or WORLD_COUNTRIES.get(country, (None,))[0]
        if cid in ours:
            guide.setdefault(cid, [0, 0, 0])[stars - 1] += 1
            continue
        if country not in WORLD_COUNTRIES:
            unknown.add(country)
            continue
        cid, en, zh = WORLD_COUNTRIES[country]
        c = out.setdefault(cid, {"id": cid, "name": en, "nameZh": zh, "continent": CONTINENT_OF.get(cid, ""), "stars": [0, 0, 0], "box": [lat, lng, lat, lng]})
        c["stars"][stars - 1] += 1
        c["box"] = [min(c["box"][0], lat), min(c["box"][1], lng), max(c["box"][2], lat), max(c["box"][3], lng)]
    if unknown:
        print("  Countries in world-starred.json missing from WORLD_COUNTRIES in build.py (left off the homepage):", ", ".join(sorted(unknown)))
    return sorted(out.values(), key=lambda c: c["name"]), guide


def no_star_countries():
    """The homepage's list of countries without a Michelin star (content/no-stars.json), by region."""
    data = json.loads((CONTENT / "no-stars.json").read_text(encoding="utf-8"))
    starred = {p["name"] for p in pages if p["type"] == "country"} | {v[1] for v in WORLD_COUNTRIES.values() if v[1]}
    clash = sorted(c["name"] for g in data["regions"] for c in g["countries"] if c["name"] in starred)
    if clash:
        print("  These countries now have Michelin stars, so delete them from content/no-stars.json:", ", ".join(clash))
    return [dict(g, countries=[c for c in g["countries"] if c["name"] not in starred]) for g in data["regions"]]


def write_data(name, obj, assign=""):
    """A file under /data/ that pages load; its address carries a version, so browsers and the app keep it until it changes.
    With `assign` (e.g. "DATA.rows=") it's a script that hands the data to the page's own scripts as it loads."""
    body = (assign + as_json(obj) + (";" if assign else "")).encode("utf-8")
    path = OUT / "data" / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(body)
    return f"/data/{name}?v={hashlib.sha1(body).hexdigest()[:10]}"


def rows_with_cities(rs, cols, city_cols, value):
    """Compact rows for a data file: one list of values per restaurant in `cols` order, its place given as a number
    in a separate list of places (`city_cols`), so the place's address and names aren't repeated for every restaurant.
    Missing values are null, and trailing ones are left off."""
    cities, index, rows = [], {}, []
    for r in rs:
        if r["cityPath"] not in index:
            index[r["cityPath"]] = len(cities)
            cities.append([r.get(c, "") for c in city_cols])
        row = [index[r["cityPath"]] if c == "city" else value(r, c) for c in cols]
        while row and row[-1] in (None, ""):
            row.pop()
        rows.append(row)
    return {"cols": cols, "cityCols": city_cols, "cities": cities, "r": rows}


FEW_REVIEWS = 20  # Google ratings from fewer reviews than this get a "Few reviews" note; keep in step with common.js


def build_home_data(starred):
    """/data/home.json: the homepage's restaurants for the map, search and wishlist, plus those that lost their stars
    but are still open (the map's grey pins; home.js picks the recent ones). Read by homeRows() in home.js."""
    def value(r, c):
        if c == "town":  # restaurants listed under a region or country rather than a city carry their town, e.g. Aughton
            return r["area"].split(", ")[0] if r["cityType"] != "city" and r.get("area") else None
        if c in ("lat", "lng"):
            return round(r[c], 5) if r.get(c) is not None else None
        if c == "dinnerType":  # set menus, the usual kind, are left blank
            return None if r.get(c, "menu") == "menu" else r[c]
        if c == "changeDate":  # only needed to tell how recently a restaurant lost its stars
            return r.get(c) if r.get("status") else None
        if c == "few":  # the Google review count, only when it's too low to trust the rating (FEW_REVIEWS in common.js)
            return r["reviews"] if r.get("rating") and r.get("reviews") is not None and r["reviews"] < FEW_REVIEWS else None
        return r.get(c)
    former = [r for r in restaurants if r.get("status") in ("lost", "changed") and r.get("lat") is not None]
    cols = ["id", "name", "stars", "cuisine", "lat", "lng", "dinner", "dinnerType", "rating", "city", "chef", "town", "nameZh", "nameJa", "cuisineZh",
            "status", "formerStars", "changeDate", "statusNote", "few"]
    city_cols = ["cityPath", "cityName", "cityNameZh", "country", "cur"]
    return write_data("home.json", dict(rows_with_cities(starred, cols, city_cols, value),
                                        former=rows_with_cities(former, cols, city_cols, value)))


CONTINENT_NAMES = {"europe": "Europe", "asia": "Asia", "middle-east": "Middle East", "americas": "Americas", "oceania": "Oceania"}
# The homepage's "Popular destinations" links, near the top: the places people search for most (Ahrefs, 7 Oct 2026).
HOME_POPULAR = ("london", "paris", "tokyo", "new-york", "chicago", "hong-kong", "singapore", "copenhagen", "kyoto", "san-francisco",
                "barcelona", "dubai")
# The guides shown on the homepage, in order (the rest are a click away at /guides/).
HOME_GUIDES = ("what-is-a-michelin-star", "three-michelin-star-restaurants", "michelin-stars-by-country",
               "top-michelin-star-restaurants-in-the-world", "celebrity-chefs-michelin-stars", "bib-gourmand-vs-michelin-star")


def star_icons(n):
    return '<span class="stars" aria-hidden="true">' + '<svg><use href="#star"/></svg>' * n + "</span>"


def home_ways_html():
    """The homepage's ways in, under the search box: Near me, Help me pick, Compare and Guides, then popular destinations."""
    tiles = (("/near-me/", "locate", "Near me", "Every starred restaurant around you, nearest first", "near-me"),
             ("/pick/", "spark", "Help me pick", "Six quick questions, three picks to fit your budget", "pick"),
             ("/compare/", "heart", "Compare", "Put two or three saved restaurants side by side", "compare"),
             ("/guides/", "star", "Guides", "What the stars mean, and what a starred meal costs", "guides"))
    ways = "".join(f'<a class="way" href="{href}" data-home="{key}"><svg aria-hidden="true"><use href="#{icon}"/></svg>'
                   f'<strong>{e(title)}</strong><span>{e(text)}</span></a>' for href, icon, title, text, key in tiles)
    chips = "".join(f'<a class="city-link" href="{places[i]["path"]}" data-home="popular">{e(places[i]["name"])}<span class="count">{starred_n[i]}</span></a>'
                    for i in HOME_POPULAR if i in places and starred_n.get(i))
    return (f'<h2 class="sr-only">Ways to find a table</h2><div class="ways">{ways}</div>'
            f'<h2 class="pop-title">Popular destinations</h2><div class="dest-cities pop">{chips}</div>')


def home_countries_html(countries, soon):
    """Every country, one short row each, folded by continent (the rows sort in home.js; on computers the folds open)."""
    def stars_of(c):
        return c["stars"] if "box" in c else c["guide"] or c["own"]

    def row(c):
        s = stars_of(c)
        total = sum(s)
        tiers = "".join(f'<span class="crow-tier">{star_icons(n)}<span class="sr-only">{("one", "two", "three")[n - 1]}-star: </span>{s[n - 1]}</span>'
                        for n in (3, 2, 1) if s[n - 1])
        attrs = f'id="dest-{e(c["id"])}" data-name="{e(c["name"])}" data-n="{total}" data-s1="{s[0]}" data-s2="{s[1]}" data-s3="{s[2]}"'
        meta = f'<span class="crow-meta"><span>{total:,} starred</span>{tiers}</span>'
        if "box" in c:  # in the MICHELIN Guide but no page here yet
            return (f'<li class="crow crow-soon" {attrs}><span class="crow-name">{e(c["name"])}</span>'
                    f'<button type="button" class="crow-from" data-map-box="{",".join(str(x) for x in c["box"])}">Show on map</button>{meta}</li>')
        price = f'<span class="crow-from">from {e(money(c["from"]["price"], c["from"]["cur"]))}</span>' if c["from"] else '<span class="crow-from"></span>'
        areas = [q for q in c["cities"] if q["path"] != c["path"]]
        toggle = fold = ""
        if areas:
            regions, cities = [q for q in areas if q["type"] == "region"], [q for q in areas if q["type"] != "region"]
            label = "areas" if regions and cities else "regions" if regions else "cities" if len(cities) > 1 else "city"
            chip = lambda q: f'<a class="city-link" href="{q["path"]}">{e(q["name"])}<span class="count">{q["n"]}</span></a>'
            group = lambda title, qs: ((f'<p class="dest-sub">{title}</p>' if regions and cities else "")
                                       + f'<div class="dest-cities">{"".join(chip(q) for q in qs)}</div>') if qs else ""
            toggle = (f'<button type="button" class="crow-toggle" aria-expanded="false" aria-controls="areas-{e(c["id"])}">'
                      f'{len(areas)} {label}</button>')
            fold = f'<div class="crow-areas" id="areas-{e(c["id"])}" hidden>{group("Regions", regions)}{group("Cities", cities)}</div>'
        return (f'<li class="crow" {attrs}><a class="crow-name" href="{c["path"]}">{e(c["name"])}</a>{price}{meta}{toggle}{fold}</li>')

    out = ""
    for k, title in CONTINENT_NAMES.items():
        here = sorted((c for c in countries + soon if c["continent"] == k), key=lambda c: c["name"])
        if not here:
            continue
        n = sum(sum(stars_of(c)) for c in here)
        top = [c["name"] for c in sorted(here, key=lambda c: -sum(stars_of(c)))[:3]]
        more = f" and {len(here) - 3} more" if len(here) > 3 else ""
        out += (f'<details class="cont" id="cont-{k}"><summary><span class="cont-name">{title}</span>'
                f'<span class="cont-count">{len(here)} {"country" if len(here) == 1 else "countries"} · {n:,} starred</span>'
                f'<span class="cont-top">{e(", ".join(top))}{more}</span></summary>'
                f'<ul class="crows">{"".join(row(c) for c in here)}</ul></details>')
    return out


def home_less_html(starred):
    """"Starred for less": the cheapest set menu (lunch or dinner) at each star level, and the three-star restaurant where
    lunch saves the most on dinner, each linked to its row on our page for its town."""
    usd = lambda r, f: r[f] / CURRENCIES[r["cur"]]["perUSD"]
    menu = lambda r, f: r.get(f) is not None and r.get(f + "Type", "menu") == "menu"
    about = lambda r, n: "" if r["cur"] == "USD" else f'<span class="less-usd">about {usd_text(n)}</span>'
    named = lambda r: (f'<a href="{e(r["cityPath"])}#r={e(r["id"])}" data-home="less">{e(r["name"])}</a> '
                       f'{star_icons(r["stars"])}, {e(place_name(r))}')
    note = lambda r, f: (f'<p class="less-note">{e(r[f + "Note"])}</p>'
                         if r.get(f + "Note") and r[f + "Note"].lower() not in ("lunch menu", "dinner menu", "set lunch", "tasting menu") else "")
    cards = []
    for s, label in ((3, "Three stars from"), (2, "Two stars from"), (1, "One star from")):
        rows = sorted((usd(r, f), r["name"], f, r) for r in starred if r["stars"] == s for f in ("dinner", "lunch") if menu(r, f))
        if rows:
            n, _, f, r = rows[0]
            cards.append(f'<li><p class="less-label">{label}</p><p class="less-price">{e(money(r[f], r["cur"]))}{about(r, n)}</p>'
                         f'<p class="less-what">{"Lunch" if f == "lunch" else "Dinner"} menu at {named(r)}</p>{note(r, f)}</li>')
    saves = sorted((usd(r, "dinner") - usd(r, "lunch"), r["name"], r) for r in starred
                   if r["stars"] == 3 and menu(r, "dinner") and menu(r, "lunch") and r["lunch"] < r["dinner"])
    if saves:
        n, _, r = saves[-1]
        cards.append(f'<li><p class="less-label">Lunch saves up to</p><p class="less-price">{e(money(r["dinner"] - r["lunch"], r["cur"]))}{about(r, n)}</p>'
                     f'<p class="less-what">Lunch {e(money(r["lunch"], r["cur"]))} instead of dinner {e(money(r["dinner"], r["cur"]))} at {named(r)}</p></li>')
    return f'<ul class="less">{"".join(cards)}</ul>'


def home_guides_html():
    """A row of guide cards (one to swipe through on phones), then a link to them all."""
    def card(g):
        img = guide_image(g)
        pic = (f'<img src="{img}-card.jpg" alt="" width="800" height="450" loading="lazy" decoding="async">' if img else
               '<span class="guide-ph" aria-hidden="true">' + '<svg><use href="#star"/></svg>' * 3 + "</span>")
        return f'<li>{pic}<div><h3><a href="/guides/{g["id"]}/" data-home="guide">{e(g["h1"])}</a></h3><p>{e(g["summary"])}</p></div></li>'
    shown = [guides[i] for i in HOME_GUIDES if i in guides]
    return (f'<ul class="guide-list home-guides">{"".join(card(g) for g in shown)}</ul>'
            f'<p class="home-more"><a href="/guides/" data-home="guides">All {len(guides)} guides →</a></p>')


def build_home():
    starred = [r for r in restaurants if not r.get("status")]
    world_url, world_total = build_world(restaurants)
    soon, guide = world_countries()
    countries = []
    for c in by_size(p for p in pages if p["type"] == "country"):
        mine = [r for r in starred if r["country"] == c["id"]]
        menus = sorted((r for r in mine if r.get("dinnerType") == "menu" and r.get("dinner") is not None), key=lambda r: r["dinner"])
        # The regions inside the country (e.g. England, Scotland, and Perthshire within Scotland), then its cities.
        cities = by_size(regions_in(c["id"])) + \
            by_size(q for q in pages if q["type"] == "city" and country_of(q["id"]) == c["id"])
        countries.append({
            **names(c), "id": c["id"], "path": c["path"], "n": starred_n[c["id"]],
            "from": {"price": menus[0]["dinner"], "cur": menus[0]["cur"], "name": menus[0]["name"], "nameZh": menus[0].get("nameZh", "")} if menus else None,
            "cities": [dict(link(q), type=q["type"]) for q in cities],
            "guide": guide.get(c["id"]), "continent": CONTINENT_OF.get(c["id"], ""),
            "own": [sum(1 for r in mine if r["stars"] == s) for s in (1, 2, 3)],  # our own [one-, two-, three-star] counts
        })
    no_continent = sorted(c["name"] for c in countries + soon if not c["continent"])
    if no_continent:
        print("  Countries with no continent (add them to CONTINENTS in build.py):", ", ".join(no_continent))
    groups = [link(g) for g in by_size(g for g in pages if g["type"] == "group")]
    data = {
        # The restaurants themselves (map pins, search, the wishlist) are in /data/home.json, loaded as the page opens.
        "homeUrl": build_home_data(starred),
        "starCounts": [len(starred)] + [sum(1 for r in starred if r["stars"] == s) for s in (1, 2, 3)],
        "countries": countries, "groups": groups, "soon": soon, "noStars": no_star_countries(),
        "places": [dict(link(p), type=p["type"]) for p in by_size(pages)],
        "currencies": CURRENCIES, "switchable": currency_data.get("switchable", []), "updated": site.get("updated", ""),
        "worldUrl": world_url, "worldTotal": world_total, "languages": DEFAULT_LANGUAGES,
    }
    write("/", render("home.html", {
        "title": "Michelin Star Restaurants, With Prices · The Starred Bill",
        "description": e(f"Compare dinner, lunch and wine pairing prices at {len(starred):,} Michelin-starred restaurants in {len(countries)} countries, from London and Paris to Tokyo."),
        "canonical": SITE_URL + "/",
        "eyebrow": "Michelin star restaurants, priced",
        "h1": "Michelin star restaurants: what they <em>cost</em>, city by city.",
        "heroText": "Dinner, lunch and wine pairing prices per person at Michelin-starred restaurants, side by side and linked to where each price came from.",
        # English only; Chinese names stay for searching.
        "destinations": home_countries_html(countries, soon), "ways": home_ways_html(), "less": home_less_html(starred),
        "guides": home_guides_html(), "data": as_json(only_langs(data, {"Zh"}, PAGE_TEXTS)), "homeUrl": data["homeUrl"],
    }))


def near_where(r):
    """Where a restaurant is for the near-me list, e.g. "Notting Hill, London" or "Aughton, Lancashire, England"."""
    city = r["cityName"]
    if r["cityType"] in ("city", "district"):
        return f"{r['area']}, {city}" if r.get("area") and city not in r["area"] else city
    return r.get("area") or city if not r.get("area") or city in r["area"] else f"{r['area']}, {city}"


NEAR_DIETS = {d: i for i, d in enumerate(DIETS)}


def build_bill_data(starred):
    """/data/bill.json: the lunch and wine prices the homepage's wishlist bill adds up (the homepage itself carries only dinner).
    One row per restaurant with any of them, keyed by id; noLunch is 1 when there's no lunch service, noPairing 1 when there's no wine pairing. Loaded only when the wishlist has something in it."""
    cols = ["lunch", "lunchType", "noLunch", "wine", "lunchWine", "noPairing"]
    rows = {}
    for r in starred:
        row = [r.get("lunch"), r.get("lunchType", "menu"), 1 if r.get("noLunch") else 0, r.get("wine"), r.get("lunchWine"), 1 if r.get("noPairing") else 0]
        if row[0] is not None or row[2] or row[3] is not None or row[4] is not None or row[5]:
            rows[r["id"]] = row
    (OUT / "data" / "bill.json").write_bytes(as_json({"cols": cols, "r": rows}).encode("utf-8"))


def near_slug(name):
    """A restaurant's name as an id, worked out the way nearRows() in common.js does: accents dropped, lower case, hyphens."""
    name = re.sub("[\u0300-\u036f]", "", unicodedata.normalize("NFD", name)).lower()
    return re.sub("[^a-z0-9]+", "-", name).strip("-")


def pack_near(rows):
    """Packs the near-me rows small (8 Oct 2026 audit: the file was 700 KB, the heaviest on the site); nearRows() in common.js unpacks them.
    - `place` points into `places` ([path, currency, name]), so a town's address, currency and name are written once.
    - `where` is 0 when it's just the town's name, a string when it's "<that>, <town's name>", else [the whole text].
    - `id` is 0 when it's the name as an id (near_slug()).
    - Columns in `lists` hold a number pointing into that list, or null for "".
    - Trailing nulls are dropped from each row."""
    cols = ["id", "name", "stars", "lat", "lng", "place", "where", "cuisine", "dinnerType", "dinner", "lunch", "diets", "rating", "reviews",
            "chef", "wine", "lunchWine", "changed", "change"]
    listed = ("cuisine", "dinnerType", "diets", "changed", "change")
    lists = {c: sorted({r[c] for r in rows if r[c]}, key=lambda v: (-sum(1 for r in rows if r[c] == v), v)) for c in listed}
    index = {c: {v: i for i, v in enumerate(lists[c])} for c in listed}
    places, place_ix, out = [], {}, []
    for r in rows:
        key = (r["path"], r["cur"], r["town"])
        if key not in place_ix:
            place_ix[key] = len(places)
            places.append(list(key))
        town, where = r["town"], r["where"]
        row = dict(r, id=0 if r["id"] and r["id"] == near_slug(r["name"]) else r["id"], place=place_ix[key],
                   where=0 if town and where == town else where[:-len(town) - 2] if town and where.endswith(", " + town) else [where],
                   lat=round(r["lat"], 5), lng=round(r["lng"], 5))
        for c in listed:
            row[c] = index[c][r[c]] if r[c] else None
        cells = [row[c] for c in cols]
        while cells and cells[-1] is None:
            cells.pop()
        out.append(cells)
    return {"cols": cols, "lists": lists, "places": places, "diets": list(DIETS), "r": out}


def build_near_me(starred):
    """/near-me/: finds the visitor (or a place they type) and lists the starred restaurants around them on a map.
    The restaurants come from /data/near.json, packed small by pack_near()."""
    rows = []
    for r in starred:
        if r.get("lat") is None:
            continue
        lunch = -1 if r.get("noLunch") else (r["lunch"] if r.get("lunch") is not None and r.get("lunchType", "menu") == "menu" else None)
        rows.append({"id": r["id"], "name": r["name"], "stars": r["stars"], "lat": r["lat"], "lng": r["lng"], "cuisine": r.get("cuisine", ""),
                     "where": near_where(r), "town": r["cityName"], "path": r["cityPath"], "cur": r["cur"],
                     "dinner": r.get("dinner"), "dinnerType": r.get("dinnerType", "menu"), "lunch": lunch,
                     "diets": "".join(str(NEAR_DIETS[d]) for d in r.get("diets", [])), "chef": r.get("chef") or None,
                     "rating": r.get("rating"), "reviews": r.get("reviews"),
                     "wine": r.get("wine") if r.get("dinnerType", "menu") == "menu" else None,
                     "lunchWine": r.get("lunchWine") if lunch and lunch > 0 else None,
                     "change": r.get("change", ""), "changed": r.get("changeDate", "")[:7]})
    # Starred restaurants in the MICHELIN Guide we don't have a file for yet (none since 5 Oct 2026, but the list can run ahead).
    world = json.loads((OUT / "data" / "world.json").read_text("utf-8"))["r"] if (OUT / "data" / "world.json").exists() else []
    for name, stars, lat, lng, cuisine, where, mpath in world:
        rows.append({"id": "", "name": name, "stars": stars, "lat": lat, "lng": lng, "cuisine": cuisine, "where": where, "town": "",
                     "path": "https://guide.michelin.com/en" + mpath, "cur": "", "dinner": None, "dinnerType": "menu", "lunch": None,
                     "diets": "", "chef": None, "rating": None, "reviews": None, "wine": None, "lunchWine": None, "change": "", "changed": ""})
    near_url = write_data("near.json", pack_near(rows))
    # Opening hours for the "Open on" filter, in their own file so Help me pick (which shares near.json) doesn't load them.
    hours_url = write_data("hours.json", {"checked": HOURS_CHECKED, "h": {r["id"]: HOURS[r["id"]] for r in starred if r["id"] in HOURS}})
    stats = guide_stats()
    cities = [p for p in by_size(pages) if (p["type"] == "city" or p["id"] in ("hong-kong", "macau", "singapore")) and starred_n[p["id"]] >= 5][:36]
    popular = "".join(f'<a class="city-link" href="{p["path"]}">{e(p["name"])}<span class="count">{starred_n[p["id"]]}</span></a>' for p in cities)
    faq = [
        ("How do I find Michelin star restaurants near me?",
         "Tap “Use my location” at the top of this page, or type a town, city or postcode. The map and list then show every Michelin-starred "
         "restaurant within the distance you choose, nearest first, with its dinner and lunch prices and a link to the full price comparison."),
        ("How many Michelin star restaurants are there?",
         f"{stats['total']} restaurants in {stats['countries']} countries and territories hold Michelin stars in the current guides: "
         f"{stats['n3']} with three stars, {stats['n2']} with two and {stats['n1']} with one. Every one of them is on this map."),
        ("What's the cheapest Michelin star restaurant near me?",
         "Choose “Cheapest first” under Sort once you've found your location. Lunch is usually the cheapest way in: switch to Lunch to compare "
         f"lunch menus, which cost a median {stats['lunch1']} at one-star restaurants, against {stats['price1']} for a one-star dinner tasting menu."),
        ("Which Michelin star restaurants near me are open today?",
         "Set “Open on” to Today once you've found your location: the list then shows only the starred restaurants open that day, with "
         f"their hours where the guide gives them. Opening days come from the MICHELIN Guide and are listed for {len(HOURS):,} of the "
         "restaurants; they change with holidays and private events, so check with the restaurant before you go."),
        ("Can I find Michelin star restaurants along a road trip?",
         "Yes. Choose “Along a route”, type where you're starting and where you're going, and the map shows every starred restaurant within "
         "the distance you pick of the way there, in the order you'll pass them."),
        ("Do you store my location?",
         "No. Your browser works out the distances on your device, and your location is never sent to The Starred Bill. If you ask for "
         "travel times or a route, the places are sent to Google to work them out. If you tick “Remember this location”, it's saved in your "
         "browser only, and you can forget it with one tap."),
        ("Which Michelin restaurants near me have vegetarian or vegan menus?",
         "Use the Dietary filter to show only restaurants with a vegetarian tasting menu, vegan options, gluten-free, halal or kosher options, "
         "as listed by the MICHELIN Guide."),
    ]
    faq_html = '<section class="guide-faq" id="faq"><h2>Frequently asked questions</h2>' + "".join(f"<h3>{e(q)}</h3><p>{e(a)}</p>" for q, a in faq) + "</section>"
    static = (f'<h2>Popular cities for Michelin star restaurants</h2>\n<p>Not where you are? Browse the cities with the most starred restaurants, '
              f'each with its dinner, lunch and wine pairing prices side by side.</p>\n<div class="dest-cities near-popular">{popular}</div>\n'
              f'<p><a href="/#destinations">All {len([p for p in pages if p["type"] == "country"])} countries →</a></p>\n{faq_html}')
    # Answers the search in plain words, answer first.
    lede = (f"Use your location, or type a town, city or postcode, to see every Michelin star restaurant near you on a map, nearest first, "
            f"with what dinner and lunch cost at each. It covers all {stats['total']} restaurants with Michelin stars in {stats['countries']} countries, "
            f"so wherever you are, the closest one is a tap away.")
    graph = [
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "All destinations", "item": SITE_URL + "/"},
            {"@type": "ListItem", "position": 2, "name": "Near me", "item": SITE_URL + "/near-me/"}]},
        {"@type": "WebPage", "name": "Michelin star restaurants near me", "url": SITE_URL + "/near-me/", "description": lede},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
    ]
    write("/near-me/", render("near.html", {
        "title": "Michelin Star Restaurants Near Me, With Prices",
        "description": e(f"Find Michelin-starred restaurants near you on a map, nearest first, with dinner and lunch prices. {stats['total']} restaurants in {stats['countries']} countries."),
        "canonical": SITE_URL + "/near-me/", "htmlLang": "en", "ogType": "website", "ogAlt": "Michelin star restaurants near me",
        "jsonld": '<script type="application/ld+json">' + as_json({"@context": "https://schema.org", "@graph": graph}) + "</script>",
        "crumbs": '<a href="/">All destinations</a><span aria-current="page">Near me</span>',
        "lede": e(lede), "static": static,
        "data": as_json({"currencies": CURRENCIES, "languages": DEFAULT_LANGUAGES, "knownIds": [r["id"] for r in starred],
                         "nearUrl": near_url, "hoursUrl": hours_url}),
    }))
    return near_url


def build_pick(near_url):
    """/pick/ ("Help me pick"): six quick questions (where, which meal, budget, stars, food, dietary needs), one per screen,
    then three picks with a reason each: best match, best value and a wildcard. It all runs in the browser (pick.js),
    reading the same /data/near.json as Near me. The answers go in the web address, so a result can be shared."""
    stats = guide_stats()
    # Every country, region, city and district with starred restaurants, biggest first: [name, path, count, where it is].
    spots, popular = [], []
    for p in by_size(q for q in pages if q["type"] != "group" and starred_n[q["id"]]):
        above = [places[c]["name"] for c in chain(p["id"])[1:]]
        spots.append([p["name"], p["path"], starred_n[p["id"]], ", ".join(above[:1] + above[-1:]) if len(above) > 1 else "".join(above)])
        if p["type"] == "city" or p["id"] in ("hong-kong", "macau", "singapore"):
            popular.append(p["path"])
    popular = popular[:8]
    faq = [
        ("How do I choose a Michelin star restaurant?",
         "Start with where and when you'll eat, then your budget per person. Lunch is often the cheapest way into a starred kitchen. "
         "Then decide how many stars you want, what kind of food you're in the mood for and any dietary needs. This page asks those six "
         "questions and suggests three restaurants that fit."),
        ("Is a three-star restaurant always better than a one-star?",
         "Not for every meal. Three stars mark exceptional cooking worth a special journey, but a one-star tasting menu can be just as memorable "
         f"for far less: one-star dinners cost a median {stats['price1']} per person against {stats['price3']} at three stars."),
        ("What's the cheapest way to eat at a Michelin star restaurant?",
         f"Book lunch. Where a starred restaurant serves it, the lunch menu is usually much cheaper than dinner: a median {stats['lunch1']} at "
         f"one-star restaurants. Choose “Whichever's better value” on this page to compare each restaurant's cheapest menu."),
        ("How much should I budget for wine?",
         f"A wine pairing typically adds about half to two-thirds of the menu price: a median {stats['wine1']} at one-star restaurants. "
         "Switch on “Include wine pairing” and we'll count it in. Where a restaurant's pairing price isn't listed, we leave room for one."),
        ("Can it plan a lunch and a dinner for a weekend away?",
         "Yes. Choose “A lunch and a dinner” and set one budget for both meals. We'll pair a starred lunch with a starred dinner at "
         "another restaurant no more than 40 km (25 miles) away, and show the best match, the best value and a wildcard, with the total per person."),
        ("Where do the stars and prices come from?",
         "Stars come only from the MICHELIN Guide. Prices are per person before service, taken from each restaurant's own website where "
         "possible, or recent reviews and booking sites, and each one links to its source on the destination pages."),
    ]
    faq_html = '<section class="guide-faq" id="faq"><h2>Frequently asked questions</h2>' + "".join(f"<h3>{e(q)}</h3><p>{e(a)}</p>" for q, a in faq) + "</section>"
    static = (
        "<h2>How to pick a Michelin star restaurant</h2>\n"
        "<p>With " + stats["total"] + " starred restaurants in " + stats["countries"] + " countries, the hard part is choosing. "
        "These are the things that make the most difference to the meal and the bill:</p>\n<ul>"
        "<li><strong>Lunch or dinner.</strong> Many starred kitchens serve a shorter lunch menu for much less than dinner.</li>"
        "<li><strong>Stars.</strong> One star is high-quality cooking worth a stop, two is excellent cooking worth a detour, three is "
        "exceptional cuisine worth a special journey (see <a href=\"/guides/three-michelin-star-restaurants/\">every three-Michelin-star restaurant</a>).</li>"
        "<li><strong>Budget.</strong> Prices here are per person before service. Add a wine pairing and the bill can rise by half again.</li>"
        "<li><strong>Food and diet.</strong> The MICHELIN Guide lists which restaurants offer vegetarian menus, vegan options and more.</li></ul>\n"
        '<p>Want to read more first? Start with <a href="/guides/what-is-a-michelin-star/">What is a Michelin star?</a>, browse the '
        '<a href="/guides/top-michelin-star-restaurants-in-the-world/">most popular Michelin star restaurants in the world</a>, or see every '
        'starred restaurant around you with <a href="/near-me/">Near me</a>.</p>\n' + faq_html)
    lede = ("Answer six quick questions and we'll suggest three Michelin-starred restaurants that fit: the best match, the best value "
            "and a wildcard, with what each one costs.")
    graph = [
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "All destinations", "item": SITE_URL + "/"},
            {"@type": "ListItem", "position": 2, "name": "Help me pick", "item": SITE_URL + "/pick/"}]},
        {"@type": "WebPage", "name": "Help me pick a Michelin star restaurant", "url": SITE_URL + "/pick/", "description": lede},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
    ]
    write("/pick/", render("pick.html", {
        "title": "Help Me Pick a Michelin Star Restaurant",
        "description": e(f"Six quick questions, three Michelin-starred restaurants that fit your budget, taste and diet. From {stats['total']} restaurants in {stats['countries']} countries."),
        "canonical": SITE_URL + "/pick/", "htmlLang": "en", "ogType": "website", "ogAlt": "Help me pick a Michelin star restaurant",
        "ogImage": SITE_URL + "/og/pick.png",
        "jsonld": '<script type="application/ld+json">' + as_json({"@context": "https://schema.org", "@graph": graph}) + "</script>",
        "crumbs": '<a href="/">All destinations</a><span aria-current="page">Help me pick</span>',
        "lede": e(lede), "static": static,
        "data": as_json({"currencies": CURRENCIES, "switchable": currency_data.get("switchable", ["GBP", "EUR", "USD"]),
                         "languages": DEFAULT_LANGUAGES, "spots": spots, "popular": popular, "nearUrl": near_url}),
    }))


COMPARE_PARTS = 64


def compare_part(rid):
    """Which /data/compare/ file holds a restaurant. compare.js works it out the same way (partOf)."""
    h = 0
    for ch in rid:
        h = (h * 31 + ord(ch)) % 1000003
    return h % COMPARE_PARTS


def build_compare(starred):
    """/compare/: up to three restaurants from the visitor's wishlist as till receipts side by side, in one currency.
    The prices come from /data/compare/<n>.json: the starred restaurants shared between COMPARE_PARTS small files by
    compare_part() of their id, one compact row each (columns listed in each file), so the page loads only the files
    holding the visitor's wishlist. The page is personal (it reads the wishlist in the browser), so it stays out of search engines and the sitemap."""
    cols = ["id", "name", "stars", "cuisine", "where", "path", "country", "cur", "dinner", "dinnerType", "dinnerNote", "lunch", "lunchType",
            "lunchNote", "noLunch", "wine", "lunchWine", "source", "sourceType", "lunchSource", "lunchSourceType", "notice", "noPairing"]
    rows = [[r["id"], r["name"], r["stars"], r.get("cuisine", ""), near_where(r), r["cityPath"], r["country"], r["cur"],
             r.get("dinner"), r.get("dinnerType", "menu"), r.get("dinnerNote", ""), r.get("lunch"), r.get("lunchType", "menu"),
             r.get("lunchNote", ""), 1 if r.get("noLunch") else 0, r.get("wine"), r.get("lunchWine"),
             r.get("source", ""), r.get("sourceType", ""), r.get("lunchSource", ""), r.get("lunchSourceType", ""), 1 if r.get("notice") else 0,
             1 if r.get("noPairing") else 0]
            for r in starred]
    parts = [[] for _ in range(COMPARE_PARTS)]
    for row in rows:
        parts[compare_part(row[0])].append(row)
    urls = [write_data(f"compare/{i}.json", {"cols": cols, "r": part}) for i, part in enumerate(parts)]
    lede = ("Tick two or three restaurants from your wishlist to see their bills side by side: dinner, lunch and the wine pairing, "
            "all in the currency you choose.")
    write("/compare/", render("compare.html", {
        "title": "Compare your saved restaurants · The Starred Bill",
        "description": e("Compare Michelin-starred restaurants from your wishlist side by side: dinner, lunch and wine pairing prices in one currency."),
        "canonical": SITE_URL + "/compare/", "htmlLang": "en", "ogType": "website", "ogAlt": "Compare Michelin-starred restaurants side by side",
        "crumbs": '<a href="/">All destinations</a><span aria-current="page">Compare</span>',
        "lede": e(lede),
        "data": as_json({"currencies": CURRENCIES, "languages": DEFAULT_LANGUAGES, "switchable": currency_data.get("switchable", []),
                         "rateDate": currency_data.get("rateDate"),
                         "compareParts": urls}),
    }))


def build_redirects():
    """Pages at old addresses that send visitors on to where the page lives now, keeping any ?q= search.
    A page offered in other languages also forwards its old translated addresses (/fil/philippines/…)."""
    for (old, pid), lang in ((r, lang) for r in sorted(redirects.items()) for lang in place_langs(places[r[1]])):
        old, new = lang_path(old, lang), lang_path(places[pid]["path"], lang)
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
    # The restaurants (for the lists and progress) are in /data/account.json, loaded only once someone is signed in.
    # The page is English only, so the file carries English names; each restaurant's place is a number in its list of places.
    cols = ["id", "name", "stars", "formerStars", "status", "area", "city", "dinner", "dinnerType"]
    data = {
        "accountUrl": write_data("account.json", rows_with_cities(restaurants, cols, ["cityPath", "cityName", "country", "cur"], lambda r, c: r.get(c))),
        "places": [dict(link(p), id=p["id"], type=p["type"]) for p in by_size(q for q in pages if q["type"] != "group" and starred_n[q["id"]])],
        "currencies": CURRENCIES, "languages": DEFAULT_LANGUAGES,
    }
    write("/account/", render("account.html", {
        "title": "Your account · The Starred Bill", "description": "Your wishlist and the Michelin-starred restaurants you've been to, on any device.",
        "canonical": SITE_URL + "/account/", "data": as_json(only_langs(data, set(), PAGE_TEXTS)),
    }))
    write("/privacy/", render("privacy.html", {
        "title": "Privacy notice · The Starred Bill", "description": "What The Starred Bill keeps about you and why: your wishlist and been-there list, visit statistics, cookie choices, and how to see or delete your data.",
        "canonical": SITE_URL + "/privacy/", "data": as_json({"currencies": CURRENCIES, "languages": DEFAULT_LANGUAGES}),
    }))


# ---------- Guides ----------
def guide_stats():
    """Figures the guides can quote, worked out from the restaurant data so they stay current:
    star counts, the countries with the most stars, and typical prices in US dollars."""
    live = [r for r in restaurants if r.get("stars") in (1, 2, 3) and not r.get("status")]
    usd = lambda r, field: r[field] / CURRENCIES[r["cur"]]["perUSD"]
    def median(values):
        v = sorted(values)
        return v[len(v) // 2] if v else None
    def dollars(n, step=5):
        return f"${int(round(n / step) * step):,}" if n is not None else "–"
    stats = {"total": len(live), "countries": len({r["country"] for r in live})}
    priced = 0
    for s in (1, 2, 3):
        at = [r for r in live if r["stars"] == s]
        menus = sorted(usd(r, "dinner") for r in at if r.get("dinner") is not None and r.get("dinnerType", "menu") == "menu")
        lunches = [usd(r, "lunch") for r in at if r.get("lunch") is not None and r.get("lunchType", "menu") == "menu"]
        wines = [usd(r, "wine") for r in at if r.get("wine") is not None]
        priced += len(menus)
        stats.update({f"n{s}": f"{len(at):,}", f"price{s}": dollars(median(menus)), f"lunch{s}": dollars(median(lunches)),
                      f"wine{s}": dollars(median(wines)),
                      f"range{s}": f"{dollars(menus[len(menus) // 4])} and {dollars(menus[3 * len(menus) // 4])}" if menus else "–"})
    stats["priced"] = f"{priced:,}"
    stats["oneIn3"] = str(round(len(live) / max(1, sum(1 for r in live if r["stars"] == 3))))
    by_country = sorted(((sum(1 for r in live if r["country"] == c), c) for c in {r["country"] for r in live}), reverse=True)
    by_three = sorted(((sum(1 for r in live if r["country"] == c and r["stars"] == 3), c) for c in {r["country"] for r in live}), reverse=True)
    for i, key in enumerate(("top", "second", "third")):
        stats[f"{key}Country"], stats[f"{key}CountryN"] = places[by_country[i][1]]["name"], f"{by_country[i][0]:,}"
    for i, key in enumerate(("top3", "second3")):
        stats[f"{key}Country"], stats[f"{key}N"] = places[by_three[i][1]]["name"], str(by_three[i][0])
    stats["total"] = f"{stats['total']:,}"
    stats["countries"] = str(stats["countries"])
    month = site.get("updated", "")
    stats["checked"] = (MONTH_NAMES[int(month[5:7]) - 1] + " " + month[:4]) if re.fullmatch(r"\d{4}-\d{2}", month) else ""
    stats["guideYear"] = month[:4]
    stats.update(list_stats(live, stats["guideYear"]))
    stats.update(popular_stats())
    stats.update(chef_stats(live))
    stats.update(diet_stats(live))
    return stats


def usd_text(n, step=5):
    return f"${int(round(n / step) * step):,}" if n is not None else "–"


def in_london(r):
    return "london" in r["_chain"]


def three_star_changes(year, keep=lambda r: True):
    """Restaurants that reached three stars in the latest guides (marked new or up that year), and those that lost them."""
    gained = [r for r in restaurants if r.get("stars") == 3 and not r.get("status") and r.get("change") in ("new", "up")
              and r.get("changeDate", "").startswith(year) and keep(r)]
    lost = [r for r in restaurants if r.get("changeDate", "").startswith(year) and keep(r) and (
        (r.get("status") and r.get("formerStars") == 3) or (r.get("stars") == 2 and r.get("change") == "down" and not r.get("status")))]
    return sorted(gained, key=lambda r: r["name"].lower()), sorted(lost, key=lambda r: r["name"].lower())


# The MICHELIN Guide's own round-up of its starred Indian restaurants (February 2026) also counts these, though their cuisine label isn't Indian.
INDIAN_ALSO = {"thevar"}


def is_indian(r):
    return "indian" in (r.get("cuisine") or "").lower() or r["id"] in INDIAN_ALSO


def indian_city(r):
    """The city a starred Indian restaurant is in; city-states (Singapore, Hong Kong) by their own name, not the neighbourhood."""
    return r["cityName"] if r["cityType"] == "country" else place_name(r)


def star_split(c):
    """[one, two, three] star counts -> "1 three-star, 5 two-star and 17 one-star" (highest first)."""
    parts = [f"{n:,} {w}-star" for n, w in zip(c[::-1], ("three", "two", "one")) if n]
    return parts[0] if len(parts) == 1 else ", ".join(parts[:-1]) + " and " + parts[-1]


def list_stats(live, year):
    """Figures for the data guides: the US by state, the UK and London, the cheapest three-star menus and the starred Indian restaurants."""
    usd = lambda r: r["dinner"] / CURRENCIES[r["cur"]]["perUSD"]
    out = {}
    indian = [r for r in live if is_indian(r)]
    c = [sum(1 for r in indian if r["stars"] == n) for n in (1, 2, 3)]
    cities = sorted({indian_city(r) for r in indian}, key=lambda p: (-sum(1 for r in indian if indian_city(r) == p), p))
    out.update({"indianTotal": str(len(indian)), "indian1": str(c[0]), "indian2": str(c[1]), "indian3": str(c[2]), "indianSplit": star_split(c),
                "indianCountries": str(len({r["country"] for r in indian})), "indianCities": str(len(cities)),
                "indianTopCity": cities[0] if cities else "–", "indianTopCityN": str(sum(1 for r in indian if indian_city(r) == cities[0])) if cities else "0"})
    three = [r for r in live if r["stars"] == 3]
    for key, rows in (("", three), ("UK", [r for r in three if r["country"] == "uk"]), ("London", [r for r in three if in_london(r)])):
        out[f"n3{key}"] = str(len(rows))
        menus = sorted((r for r in rows if r.get("dinner") is not None and r.get("dinnerType", "menu") == "menu"), key=usd)
        if menus:
            r = menus[0]
            out[f"cheapest3{key}"], out[f"cheapest3{key}Place"] = r["name"], place_name(r)
            out[f"cheapest3{key}Price"] = money(r["dinner"], r["cur"]) + ("" if r["cur"] == "USD" else f" (about {usd_text(usd(r))})")
    # Per country, e.g. {{in_canada}} (starred restaurants), {{n3_sweden}} (three-star), {{split_ireland}} ("14 one-star and 2 two-star").
    for cid in {r["country"] for r in live}:
        c = [sum(1 for r in live if r["country"] == cid and r["stars"] == n) for n in (1, 2, 3)]
        key = cid.replace("-", "_")
        out[f"in_{key}"], out[f"n3_{key}"] = f"{sum(c):,}", str(c[2])
        parts = [f"{n:,} {w}-star" for n, w in zip(c, ("one", "two", "three")) if n]
        out[f"split_{key}"] = parts[0] if len(parts) == 1 else ", ".join(parts[:-1]) + " and " + parts[-1]
    out["ukTotal"] = f"{sum(1 for r in live if r['country'] == 'uk'):,}"
    out["londonTotal"] = str(sum(1 for r in live if in_london(r)))
    us = [r for r in live if r["country"] == "usa"]
    states = {}
    for r in us:
        states[us_state(r)] = states.get(us_state(r), 0) + 1
    ranked = sorted(states.items(), key=lambda s: -s[1])
    out.update({"usTotal": f"{len(us):,}", "usStates": str(len(states)), "n3us": str(sum(1 for r in us if r["stars"] == 3))})
    for i, key in enumerate(("topState", "secondState", "thirdState")):
        if len(ranked) > i:
            out[key], out[key + "N"] = places[ranked[i][0]]["name"], str(ranked[i][1])
    gained, lost = three_star_changes(year)
    out["new3"], out["lost3"] = str(len(gained)), str(len(lost))
    return out


# The kosher and halal guides: starred restaurants the MICHELIN Guide lists with "Kosher options" or "Halal options"
# (`diets`). These are what restaurants tell the guide they can offer, often on request, not certification.
DIET_TAGS = ("kosher", "halal")
DIET_WORDS = {"kosher": "Kosher options", "halal": "Halal options"}
# The cities whose tagged restaurants the guides list in full, as {{table:diet-kosher-paris}} and so on.
DIET_LISTS = {"kosher": ("paris", "new-york", "london"), "halal": ("london", "dubai", "paris", "new-york")}
DIET_CITIES_MAX = 15  # rows in {{table:diet-kosher-cities}} / {{table:diet-halal-cities}}


DIET_CITY_STATES = ("singapore", "hong-kong", "macau", "monaco")


def diet_city(r):
    """The city a tagged restaurant counts under in the diet guides: city-states by their own name, else its town."""
    return r["cityName"] if r["cityType"] == "country" and r["country"] in DIET_CITY_STATES else place_name(r)


def diet_stats(live):
    """Figures for the kosher and halal guides, e.g. {{kosherTotal}}, {{halalSplit}}, {{kosherCities}},
    and {{halal_london}} / {{kosher_france}} (tagged restaurants in any place, by its id)."""
    out = {}
    for tag in DIET_TAGS:
        rows = [r for r in live if tag in (r.get("diets") or [])]
        c = [sum(1 for r in rows if r["stars"] == n) for n in (1, 2, 3)]
        out.update({f"{tag}Total": f"{len(rows):,}", f"{tag}Split": star_split(c), f"{tag}3": str(c[2]),
                    f"{tag}Countries": str(len({r["country"] for r in rows})), f"{tag}Cities": str(len({diet_city(r) for r in rows})),
                    f"{tag}Pct": f"{round(100 * len(rows) / max(1, len(live)))}%"})
        for r in rows:
            for p in set(r["_chain"]):
                key = f"{tag}_{p.replace('-', '_')}"
                out[key] = str(int(out.get(key, "0")) + 1)
    return out


def diet_blocks(live, name_html, stars_cell, price_cell, note):
    """{{table:diet-kosher-cities}} and -halal-cities (the cities with the most tagged starred restaurants), and
    {{table:diet-kosher-paris}} etc. (every tagged restaurant in a city, from DIET_LISTS)."""
    blocks = {}
    usd = lambda r: r["dinner"] / CURRENCIES[r["cur"]]["perUSD"]
    def lunch_cell(r):
        if r.get("lunch") is None:
            return '<span class="muted">–</span>'
        return money(r["lunch"], r["cur"]) + ("" if r["cur"] == "USD" else f'<br><span class="muted">about {usd_text(r["lunch"] / CURRENCIES[r["cur"]]["perUSD"])}</span>')
    for tag in DIET_TAGS:
        rows = [r for r in live if tag in (r.get("diets") or [])]
        word = DIET_WORDS[tag]
        caveat = (f"Restaurants the MICHELIN Guide lists with “{word}”, as each restaurant reports them: dishes it can prepare, "
                  f"usually on request, not {tag} certification. Ask when you book, and give as much notice as you can.")
        cities = {}
        for r in rows:
            cities.setdefault(diet_city(r), []).append(r)
        top = sorted(cities.items(), key=lambda kv: (-len(kv[1]), -sum(r["stars"] for r in kv[1]), kv[0]))[:DIET_CITIES_MAX]
        body = ""
        for city, rs in top:
            first = rs[0]
            # The page named after the city, wherever it sits in the restaurants' chain (a city, a region like Shanghai, a city-state).
            pages = [{p for p in r["_chain"] if places[p]["name"] == city} for r in rs]
            shared = set.intersection(*pages)
            path = places[sorted(shared)[0]]["path"] if shared else None
            split = " · ".join(f'{stars_cell(n)}&nbsp;{sum(1 for r in rs if r["stars"] == n)}' for n in (3, 2, 1) if any(r["stars"] == n for r in rs))
            priced = sorted((r for r in rs if r.get("dinner") is not None and r.get("dinnerType", "menu") == "menu"), key=usd)
            cheapest = (f'{price_cell(priced[0])}<br><span class="muted">{e(priced[0]["name"])}</span>') if priced else '<span class="muted">–</span>'
            name = f'<a href="{e(path)}">{e(city)}</a>' if path else e(city)
            body += (f'<tr><td data-label="City">{name}</td><td data-label="Country">{e(places[first["country"]]["name"])}</td>'
                     f'<td class="num" data-label="Restaurants"><strong>{len(rs)}</strong></td>'
                     f'<td data-label="Stars">{split}</td><td class="num" data-label="Lowest tasting menu">{cheapest}</td></tr>')
        heads = "".join(f'<th scope="col">{h}</th>' for h in ("City", "Country", "Restaurants", "Stars", "Lowest tasting menu"))
        blocks[f"diet-{tag}-cities"] = (f'<div class="table-wrap"><table class="guide-table data"><thead><tr>{heads}</tr></thead><tbody>{body}</tbody></table></div>'
                                        + note(caveat + " Prices are the main dinner tasting menu per person in local currency, before service and drinks."))
        for pid in DIET_LISTS[tag]:
            here = sorted((r for r in rows if pid in r["_chain"]), key=lambda r: (-r["stars"], r["name"].lower()))
            body = "".join(
                f'<tr><td data-label="Restaurant">{name_html(r)}</td><td data-label="Stars">{stars_cell(r["stars"])}</td>'
                f'<td data-label="Cuisine">{e(r.get("cuisine") or "–")}</td><td data-label="Area">{e((r.get("area") or "–").split(", ")[0])}</td>'
                f'<td class="num" data-label="Tasting menu, per person">{price_cell(r)}</td><td class="num" data-label="Lunch, per person">{lunch_cell(r)}</td></tr>'
                for r in here)
            heads = "".join(f'<th scope="col">{h}</th>' for h in ("Restaurant", "Stars", "Cuisine", "Area", "Tasting menu, per person", "Lunch, per person"))
            blocks[f"diet-{tag}-{pid}"] = (f'<div class="table-wrap"><table class="guide-table data"><thead><tr>{heads}</tr></thead><tbody>{body}</tbody></table></div>'
                                           + note(caveat + " Names open each restaurant’s prices on The Starred Bill and arrows its MICHELIN Guide page. "
                                                  "Prices per person before service and drinks; lunch is the cheapest set lunch, where there is one."))
    return blocks


def us_state(r):
    """The state (or Washington DC) a US restaurant sits in."""
    c = r["_chain"]
    return c[-2] if len(c) > 1 else c[-1]


def place_name(r):
    """Where a restaurant is, as a list would name it: its city, else the town from its area ("Bray, Berkshire" -> Bray)."""
    if r["cityType"] == "district":
        return places[r["_chain"][1]]["name"]
    if r["cityType"] == "city":
        return r["cityName"]
    return (r.get("area") or r["cityName"]).split(", ")[0]


def restaurant_link(r, links):
    """A restaurant's name in a guide's table: it opens the restaurant's own page, else its row on our page for its town
    (place.js reads #r=<id>), with a small arrow beside it to its page on the MICHELIN Guide."""
    out = f'<a href="{e(restaurant_href(r))}">{e(r["name"])}</a>'
    if r["id"] in links:
        out += (f' <a class="mg-link" href="{e(links[r["id"]])}" title="{e(r["name"])} on the MICHELIN Guide" '
                f'aria-label="{e(r["name"])} on the MICHELIN Guide">↗</a>')
    return out


def michelin_links():
    """Our restaurants' pages on the MICHELIN Guide, matched against content/world-starred.json by name and position."""
    path = CONTENT / "world-starred.json"
    if not path.exists():
        return {}
    near = {}
    for w in read_json(path).get("restaurants", []):
        near.setdefault((round(w[2]), round(w[3])), []).append(w)
    out = {}
    for r in restaurants:
        if r.get("lat") is None or r.get("status"):
            continue
        cands = [w for dy in (-1, 0, 1) for dx in (-1, 0, 1) for w in near.get((round(r["lat"]) + dy, round(r["lng"]) + dx), [])]
        match = next((w for w in cands if same_restaurant(w, r)), None)
        if match:
            out[r["id"]] = "https://guide.michelin.com/en" + match[6]
    return out


# The Michelin star chefs guide: head chefs ranked by the stars of the restaurants they run ({{table:chefs}}), and the
# chefs whose names are on starred restaurants that others run day to day ({{table:chef-names}}).
CHEF_TABLE_MIN = 4  # stars a head chef needs, across two or more restaurants, to make {{table:chefs}}
# Names over the door: (key for {{names_<key>}} and {{names_<key>N}}, the chef, a pattern matching the restaurants' names, extra
# restaurant ids). A restaurant whose head chef is that chef counts too.
CHEF_NAMES = (
    ("robuchon", "Joël Robuchon", r"robuchon", ()),
    ("alleno", "Yannick Alléno", r"all[ée]no|pavyllon|l'abysse", ("la-table-de-pavie",)),
    ("ducasse", "Alain Ducasse", r"ducasse", ()),
    ("bombana", "Umberto Bombana", r"bombana", ()),
    ("ramsay", "Gordon Ramsay", r"ramsay", ()),
    ("pic", "Anne-Sophie Pic", r"\bpic\b", ()),
    ("gagnaire", "Pierre Gagnaire", r"gagnaire", ()),
    ("colagreco", "Mauro Colagreco", r"colagreco|mirazur", ()),
    ("romito", "Niko Romito", r"romito", ()),
    ("keller", "Thomas Keller", "", ()),
    ("blumenthal", "Heston Blumenthal", r"heston|fat duck", ()),
)
CHEFS_DECEASED = {"robuchon"}  # left out of {{nameLiving}}, the living chef whose name is on the most stars
# The celebrity chefs guide's {{table:celebrity-chefs}}: TV chefs and the starred restaurants that carry their name or that they run.
CELEBRITY_CHEFS = (
    ("Gordon Ramsay", ("restaurant-gordon-ramsay", "le-pressoir-d-argent-gordon-ramsay", "gordon-ramsay-au-trianon", "petrus-by-gordon-ramsay",
                       "restaurant-gordon-ramsay-high", "1890-by-gordon-ramsay")),
    ("Heston Blumenthal", ("the-fat-duck", "dinner-by-heston-blumenthal", "dinner-by-heston-blumenthal-dubai")),
    ("José Andrés", ("minibar-by-jose-andres", "e-by-jose-andres")),
    ("Tom Kerridge", ("hand-and-flowers",)),
    ("Jason Atherton", ("row-on-45",)),
    ("Michael Caines", ("lympstone-manor", "michael-caines-at-the-stafford")),
    ("Angela Hartnett", ("murano",)),
    ("Paul Ainsworth", ("paul-ainsworth-at-no-6",)),
    ("Tommy Banks", ("black-swan-oldstead",)),
    ("Jan Hendrik van der Westhuizen", ("jan",)),
    ("Wolfgang Puck", ("cut",)),
)


def chef_names(text):
    """A restaurant's chef field as a list of chefs: "Juan Mari Arzak and Elena Arzak" gives both, "Ludovic and Tabata Mey"
    gives Ludovic Mey and Tabata Mey."""
    parts = [p.strip() for p in re.split(r"\s+(?:and|&)\s+|\s*/\s*", text or "") if p.strip()]
    return [p if " " in p else f"{p} {parts[-1].split()[-1]}" for p in parts]


def stars_of(rows):
    return sum(r["stars"] for r in rows)


def head_chefs(live):
    """Each head chef with the starred restaurants they run, most stars first, then most restaurants."""
    by = {}
    for r in live:
        for c in chef_names(r.get("chef")):
            by.setdefault(c, []).append(r)
    return sorted(((c, sorted(rows, key=lambda r: (-r["stars"], r["name"].lower()))) for c, rows in by.items()),
                  key=lambda t: (-stars_of(t[1]), -len(t[1]), t[0]))


def named_restaurants(live):
    """CHEF_NAMES with each chef's starred restaurants (their name on the door, or they run the kitchen), most stars first."""
    out = []
    for key, chef, pattern, extra in CHEF_NAMES:
        rows = [r for r in live if (pattern and re.search(pattern, r["name"], re.I)) or chef in chef_names(r.get("chef")) or r["id"] in extra]
        out.append((key, chef, sorted(rows, key=lambda r: (-r["stars"], r["name"].lower()))))
    return sorted(out, key=lambda t: (-stars_of(t[2]), -len(t[2]), t[1]))


def and_list(items):
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " and " + items[-1]


def chef_stats(live):
    """Figures for the chefs guide, e.g. {{chefTop}} (the head chef with the most stars), {{names_ducasse}} (stars on
    restaurants carrying Alain Ducasse's name) and {{chefTwoThree}} (chefs running two three-star restaurants)."""
    ranked = head_chefs(live)
    multi = [(c, rows) for c, rows in ranked if len(rows) > 1]
    two_three = [c for c, rows in ranked if sum(1 for r in rows if r["stars"] == 3) > 1]
    out = {"chefNamed": f"{sum(1 for r in live if r.get('chef')):,}", "chefMulti": str(len(multi)),
           "chefListed": str(sum(1 for c, rows in multi if stars_of(rows) >= CHEF_TABLE_MIN)), "chefMin": str(CHEF_TABLE_MIN),
           "chefTwoThree": str(len(two_three)), "chefTwoThreeNames": and_list(sorted(two_three, key=lambda c: c.split()[-1]))}
    if multi:
        out.update({"chefTop": multi[0][0], "chefTopStars": str(stars_of(multi[0][1])), "chefTopN": str(len(multi[0][1])),
                    "chefSecond": multi[1][0], "chefSecondStars": str(stars_of(multi[1][1])), "chefSecondN": str(len(multi[1][1]))})
    named = named_restaurants(live)
    for key, chef, rows in named:
        out[f"names_{key}"], out[f"names_{key}N"] = str(stars_of(rows)), str(len(rows))
        out[f"names_{key}3"] = str(sum(1 for r in rows if r["stars"] == 3))
    living = [t for t in named if t[0] not in CHEFS_DECEASED]
    out.update({"nameTop": named[0][1], "nameTopStars": str(stars_of(named[0][2])), "nameTopN": str(len(named[0][2])),
                "nameLiving": living[0][1], "nameLivingStars": str(stars_of(living[0][2])), "nameLivingN": str(len(living[0][2]))})
    return out


def chef_blocks(live, links, stars_cell, note):
    """{{table:chefs}} and {{table:chef-names}}."""
    def where(r):
        city = r["cityName"] if r["cityType"] == "country" else place_name(r)
        return city if city == places[r["country"]]["name"] else f'{city}, {places[r["country"]]["name"]}'

    def line(r, chef=None):
        led = chef and r.get("chef") and chef not in chef_names(r["chef"])
        return (f'{stars_cell(r["stars"])} {restaurant_link(r, links)} <span class="muted">{e(where(r))}'
                + (f' · chef {e(r["chef"])}' if led else "") + "</span>")

    def cheapest(rows):
        menus = [r for r in rows if r.get("dinner") is not None and r.get("dinnerType", "menu") == "menu"]
        if not menus:
            return '<span class="muted">Not published</span>'
        r = min(menus, key=lambda r: r["dinner"] / CURRENCIES[r["cur"]]["perUSD"])
        return (money(r["dinner"], r["cur"]) + ("" if r["cur"] == "USD" else f'<br><span class="muted">about {usd_text(r["dinner"] / CURRENCIES[r["cur"]]["perUSD"])}</span>')
                + f'<br><span class="muted">{e(r["name"])}</span>')

    def table(groups, first, chef_lines):
        body = "".join(
            f'<tr><td data-label="{first}"><span class="rank">{i + 1}</span> {e(chef)}</td>'
            f'<td class="num" data-label="Stars"><strong>{stars_of(rows)}</strong><br><span class="muted">{len(rows)} restaurant{"s" if len(rows) > 1 else ""}</span></td>'
            f'<td data-label="Starred restaurants">' + "<br>".join(line(r, chef if chef_lines else None) for r in rows) + "</td>"
            f'<td class="num" data-label="Cheapest dinner menu">{cheapest(rows)}</td></tr>'
            for i, (chef, rows) in enumerate(groups))
        heads = "".join(f'<th scope="col">{h}</th>' for h in (first, "Stars", "Starred restaurants", "Cheapest dinner menu"))
        return f'<div class="table-wrap"><table class="guide-table data chef-list"><thead><tr>{heads}</tr></thead><tbody>{body}</tbody></table></div>'

    about = ("Each restaurant’s name opens its prices on The Starred Bill and the arrow its MICHELIN Guide page. "
             "Cheapest dinner menu is the lowest-priced main dinner tasting menu among them, per person in local currency before service and drinks, "
             "with US dollars at recent exchange rates.")
    ranked = [(c, rows) for c, rows in head_chefs(live) if len(rows) > 1 and stars_of(rows) >= CHEF_TABLE_MIN]
    named = [(chef, rows) for key, chef, rows in named_restaurants(live)]
    by_id = {r["id"]: r for r in live}
    celebs = [(chef, sorted((by_id[i] for i in ids if i in by_id), key=lambda r: (-r["stars"], r["name"].lower())))
              for chef, ids in CELEBRITY_CHEFS]
    celebs = sorted((t for t in celebs if t[1]), key=lambda t: (-stars_of(t[1]), -len(t[1]), t[0]))
    known = {r["id"] for r in restaurants}
    for i in [i for chef, ids in CELEBRITY_CHEFS for i in ids if i not in known]:
        print(f"  CELEBRITY_CHEFS in build.py names \"{i}\", which isn't a restaurant file name")
    return {
        "celebrity-chefs": table(celebs, "Chef", True) + note(
            "TV chefs’ starred restaurants, those that carry the chef’s name or that the chef runs, from the current MICHELIN Guide editions; "
            "where someone else leads the kitchen day to day, their name follows the restaurant’s. " + about),
        "chefs": table(ranked, "Head chef", False) + note(
            f"Every chef named as head chef of two or more Michelin-starred restaurants with {CHEF_TABLE_MIN} or more stars between them, from the current "
            "MICHELIN Guide editions. Head chefs are as the MICHELIN Guide or the restaurant names them, else recent press. " + about),
        "chef-names": table(named, "Chef", True) + note(
            "Starred restaurants that carry each chef’s name or that the chef runs, from the current MICHELIN Guide editions; "
            "where someone else leads the kitchen day to day, their name follows the restaurant’s. " + about),
    }



# ---------- Michelin Guide ceremony dates (7 Oct 2026) ----------
# When each MICHELIN Guide reveals its stars, from content/ceremonies.json: the tables on the ceremony dates guide
# ({{table:ceremonies}} and friends), and, for us, a reminder at every build of which guides have announced stars our
# restaurant files haven't caught up with (`starsUpdated`) and which ceremonies are coming up.
CEREMONY_SOON_DAYS = 30      # "coming up" in the build's reminder
CEREMONY_AHEAD_DAYS = 120    # dates not yet announced join "Coming up" when last year's fell within this many days
CEREMONY_RECENT_DAYS = 60    # "Just announced"
CONTINENT_NAMES = {"europe": "Europe", "asia": "Asia", "middle-east": "The Middle East", "americas": "The Americas", "oceania": "Oceania"}
TODAY = date.today().isoformat()
_ceremony_guides = []


def short_date(d):
    """2026-10-05 -> Oct 5, 2026."""
    return f"{MONTH_NAMES[int(d[5:7]) - 1][:3]} {int(d[8:10])}, {d[:4]}"


def ceremony_guides():
    """The guides in content/ceremonies.json, each with `last` (its latest ceremony, counting an announced one whose day
    has come), `coming` (the next announced ceremony, if any), `due` (a year after the last, when nothing is announced),
    `status` ("updating" when the last is newer than our files) and `continent`. Checked once: bad place ids stop the
    build, and the reminders print."""
    if _ceremony_guides:
        return _ceremony_guides
    data = read_json(CONTENT / "ceremonies.json") or {"guides": []}
    covered = set()
    for g in data["guides"]:
        g = dict(g)
        for pid in g.get("places", []) + g.get("show", []):
            if pid not in places:
                problem("ceremonies.json", f"{g['id']} lists {pid}, which isn't a place id")
        if g.get("guide") and g["guide"] not in guides:
            problem("ceremonies.json", f"{g['id']} links to the guide {g['guide']}, which doesn't exist")
        for c in g.get("ceremonies", []) + ([g["next"]] if g.get("next") else []):
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", c.get("date", "")):
                problem("ceremonies.json", f"{g['id']} has a ceremony date that isn't YYYY-MM-DD: {c.get('date')!r}")
        past = list(g.get("ceremonies", []))
        nxt = g.get("next")
        if nxt and nxt.get("date", "") <= TODAY:
            print(f"  Ceremonies: {g['id']}'s announced ceremony ({nxt['date']}) has come; move it from `next` into `ceremonies`")
            past.insert(0, nxt)
            nxt = None
        g["last"] = past[0] if past else None
        g["coming"] = nxt
        g["due"] = None if nxt or not g["last"] else f"{int(g['last']['date'][:4]) + 1}{g['last']['date'][4:]}"
        if g.get("expected") and not nxt:
            g["due"] = g["expected"] + "-01"
        g["status"] = "updating" if g["last"] and g["last"]["date"] > g.get("starsUpdated", "") else ""
        first = (g.get("places") or [""])[0]
        g["continent"] = g.get("continent") or CONTINENT_OF.get(country_of(first) if first in places else "", "")
        covered.update(g.get("places", []))
        _ceremony_guides.append(g)
    # Every starred restaurant should sit under some guide, so no destination is left without a date.
    loose = sorted({places[r["country"]]["name"] for r in restaurants if r.get("stars") in (1, 2, 3) and not r.get("status")
                    and not covered & set(r["_chain"])})
    if loose:
        print("  Ceremonies: no guide in content/ceremonies.json covers the starred restaurants in " + ", ".join(loose))
    for g in _ceremony_guides:
        if g["status"]:
            print(f"  Ceremonies: {g['name']} revealed its stars on {g['last']['date']}, after our files were last updated "
                  f"({g.get('starsUpdated') or 'never'}). Update its restaurants, then set starsUpdated.")
    soon = (datetime.strptime(TODAY, "%Y-%m-%d").date().toordinal() + CEREMONY_SOON_DAYS)
    for g in sorted((g for g in _ceremony_guides if g["coming"]), key=lambda g: g["coming"]["date"]):
        if datetime.strptime(g["coming"]["date"], "%Y-%m-%d").date().toordinal() <= soon:
            print(f"  Ceremonies: {g['name']} is coming up on {g['coming']['date']}")
    return _ceremony_guides


def days_from_today(d):
    return datetime.strptime(d, "%Y-%m-%d").date().toordinal() - datetime.strptime(TODAY, "%Y-%m-%d").date().toordinal()


def ceremony_places_html(g):
    if g.get("guide"):
        return f'<a href="/guides/{e(g["guide"])}/">{e(g.get("showName") or g["name"])}</a>' if g["guide"] in guides else e(g.get("showName") or g["name"])
    return ", ".join(f'<a href="{e(places[p]["path"])}">{e(places[p]["name"])}</a>' for p in g.get("show") or g.get("places", []) if p in places)


def ceremony_text(c, with_where=True):
    """"Feb 9, 2026 · the Convention Centre Dublin", or "… · online, no ceremony"."""
    where = "online, no ceremony" if c.get("online") else re.sub(r"^the ", "", c.get("where", ""))
    return (f'<a href="{e(c["source"])}">{short_date(c["date"])}</a>' if c.get("source") else short_date(c["date"])) + (
        f'<br><span class="muted">{e(where)}</span>' if with_where and where else "")


def ceremony_stats():
    """Figures for the ceremony dates guide: {{cerGuides}}, the next ceremony ({{cerNext}}, {{cerNextDate}}, {{cerNextWhere}})
    and the busiest months."""
    gs = ceremony_guides()
    coming = sorted((g for g in gs if g["coming"]), key=lambda g: g["coming"]["date"])
    out = {"cerGuides": str(len(gs)), "cerChecked": month_year(max(g.get("checked", "") for g in gs), "en") if gs else ""}
    if coming:
        c = coming[0]["coming"]
        out.update({"cerNext": coming[0]["name"], "cerNextDate": us_date(c["date"]),
                    "cerNextWhere": "online" if c.get("online") else c.get("where") or "a venue still to be named"})
    # {{cerSay_northeast_cities}} and so on: a sentence on when that guide's stars come next, or last came.
    for g in gs:
        if g["coming"]:
            c = g["coming"]
            text = f"The {g['name']} reveals its next stars on {us_date(c['date'])}" + (
                ", online, with no ceremony." if c.get("online") else f" at {c['where']}." if c.get("where") else ".")
        elif g["last"]:
            c = g["last"]
            text = (f"The {g['name']} last revealed its stars on {us_date(c['date'])}" + (" online" if c.get("online") else f" at {c['where']}" if c.get("where") else "")
                    + f". Michelin hasn’t announced the next date yet; it’s usually in {g['usual']}.")
        else:
            text = f"The {g['name']} hasn’t announced a date yet."
        out["cerSay_" + g["id"].replace("-", "_")] = text
    # {{cerBusy}}: the months with the most ceremonies.
    counts = {}
    for g in gs:
        m = ceremony_month(g)
        if m:
            counts[m] = counts.get(m, 0) + 1
    top = sorted(counts, key=lambda m: (-counts[m], m))[:3]
    out["cerBusy"] = and_list([f"{MONTH_NAMES[m - 1]} ({counts[m]} guides)" for m in top])
    return out


def ceremony_month(g):
    """The month a guide's stars are next due (or were last revealed), for the year-at-a-glance calendar."""
    c = g["coming"] or g["last"]
    return int(c["date"][5:7]) if c else None


def ceremony_blocks():
    """{{table:ceremonies}} (every guide, continent by continent), {{table:ceremonies-next}} (what's coming up),
    {{table:ceremonies-recent}} (just announced) and {{table:ceremonies-calendar}} (the year at a glance)."""
    gs = ceremony_guides()
    if not gs:
        return {}
    blocks = {}
    updating = '<span class="cer-flag">We’re updating our pages</span>'

    def row(g):
        last = (ceremony_text(g["last"]) + (f"<br>{updating}" if g["status"] else "")) if g["last"] else '<span class="muted">–</span>'
        nxt = ceremony_text(g["coming"]) if g["coming"] else '<span class="muted">Not announced yet</span>'
        return (f'<tr id="cer-{e(g["id"])}"><td data-label="Destination">{ceremony_places_html(g)}</td>'
                f'<td data-label="Guide">{e(g["name"])}' + (f'<br><span class="muted">{e(g["note"])}</span>' if g.get("note") else "") + f'</td><td data-label="Usually">{e(g["usual"][:1].upper() + g["usual"][1:])}</td>'
                f'<td data-label="Latest">{last}</td><td data-label="Next">{nxt}</td></tr>')
    heads = "".join(f'<th scope="col">{h}</th>' for h in ("Destination", "Guide", "Usually", "Latest stars revealed", "Next ceremony"))
    out = ""
    for key, title in CONTINENT_NAMES.items():
        rows = sorted((g for g in gs if g["continent"] == key), key=lambda g: re.sub(r"<[^>]+>", "", ceremony_places_html(g)).lower())
        if rows:
            out += (f'<h3 id="cer-{key}">{e(title)}</h3><div class="table-wrap"><table class="guide-table data cer-table"><thead><tr>{heads}</tr></thead>'
                    f'<tbody>{"".join(row(g) for g in rows)}</tbody></table></div>')
    blocks["ceremonies"] = out + (
        '<p class="table-note">Dates are when each guide revealed or will reveal its stars, from the MICHELIN Guide’s announcements and the host '
        'cities’ (each date links to its source). “Usually” is the guide’s habit in recent years, not a promise. '
        f'Last checked {e(month_year(max(g.get("checked", "") for g in gs), "en"))}.</p>')

    # Coming up: announced dates first, in order, then guides whose date isn't out yet but whose turn comes round soon.
    items = [(g["coming"]["date"], g, True) for g in gs if g["coming"]]
    items += [(g["due"], g, False) for g in gs if g["due"] and not g["coming"] and -31 <= days_from_today(g["due"]) <= CEREMONY_AHEAD_DAYS]
    lis = ""
    for d, g, announced in sorted(items, key=lambda x: x[0]):
        when = f'<strong class="cer-when">{us_date(d)}</strong>' if announced else f'<span class="cer-when">{MONTH_NAMES[int(d[5:7]) - 1]}, date to come</span>'
        where = ("online, with no ceremony" if g["coming"].get("online") else g["coming"].get("where", "")) if announced else \
            f'last time on {us_date(g["last"]["date"])}'
        lis += (f'<li>{when} <span class="cer-name"><a href="#cer-{e(g["id"])}">{e(g["name"])}</a></span>'
                + (f'<span class="muted">{e(where)}</span>' if where else "") + "</li>")
    blocks["ceremonies-next"] = f'<ol class="cer-list">{lis}</ol>' if lis else "<p>No dates are announced for the coming months yet.</p>"

    # Just announced, with whether our pages have caught up.
    recent = sorted((g for g in gs if g["last"] and 0 <= -days_from_today(g["last"]["date"]) <= CEREMONY_RECENT_DAYS),
                    key=lambda g: g["last"]["date"], reverse=True)
    lis = "".join(f'<li><strong class="cer-when">{us_date(g["last"]["date"])}</strong> <span class="cer-name"><a href="#cer-{e(g["id"])}">{e(g["name"])}</a></span>'
                  f'<span class="muted">{ceremony_places_html(g)}</span>' + (updating if g["status"] else '<span class="cer-done">On our pages</span>') + "</li>"
                  for g in recent)
    blocks["ceremonies-recent"] = f'<ol class="cer-list">{lis}</ol>' if lis else "<p>No guide has revealed its stars in the last two months.</p>"

    # The year at a glance: each month and the guides that reveal their stars in it.
    months = {}
    for g in gs:
        m = ceremony_month(g)
        if m:
            months.setdefault(m, []).append(g)
    cells = "".join(
        f'<div><h4>{MONTH_NAMES[m - 1]}</h4>' + ("<ul>" + "".join(f'<li><a href="#cer-{e(g["id"])}">{e(re.sub(r"^MICHELIN Guide ", "", g["name"]))}</a></li>'
                                                                    for g in sorted(months[m], key=lambda g: g["name"])) + "</ul>" if m in months else '<p class="muted">None</p>') + "</div>"
        for m in range(1, 13))
    blocks["ceremonies-calendar"] = f'<div class="cer-calendar">{cells}</div>'
    return blocks


def guide_blocks(stats):
    """Tables the data guides drop in with {{table:name}}, built from the restaurant data at every build."""
    live = [r for r in restaurants if r.get("stars") in (1, 2, 3) and not r.get("status")]
    links = michelin_links()
    year, checked = stats["guideYear"], stats["checked"]
    stars_cell = lambda n: f'<span class="g-stars" aria-label="{n} star{"s" if n > 1 else ""}">{"★" * n}</span>'
    note = lambda text: f'<p class="table-note">{text} Last checked {e(checked)}.</p>'
    name_html = lambda r: restaurant_link(r, links)

    def counts_table(groups, first):
        rows = "".join(
            f'<tr><td data-label="{first}" data-sort="{e(name)}"><a href="{e(path)}">{e(name)}</a></td>'
            + "".join(f'<td class="num" data-label="{label}" data-sort="{c[i]}">{c[i]:,}</td>' for i, label in enumerate(("One star", "Two stars", "Three stars")))
            + f'<td class="num" data-label="Total" data-sort="{sum(c)}"><strong>{sum(c):,}</strong></td></tr>'
            for name, path, c in sorted(groups, key=lambda g: (-sum(g[2]), -g[2][2], g[0])))
        heads = "".join(f'<th scope="col" aria-sort="{"descending" if h == "Total" else "none"}">{h}</th>' if h != first else f'<th scope="col">{h}</th>'
                        for h in (first, "One star", "Two stars", "Three stars", "Total"))
        return f'<div class="table-wrap"><table class="guide-table data" data-sortable><thead><tr>{heads}</tr></thead><tbody>{rows}</tbody></table></div>'

    def tally(rows, key):
        out = {}
        for r in rows:
            out.setdefault(key(r), [0, 0, 0])[r["stars"] - 1] += 1
        return out

    def price_cell(r):
        if r.get("dinner") is None:
            return '<span class="muted">Not published</span>'
        text = money(r["dinner"], r["cur"])
        if r["cur"] != "USD":
            text += f'<br><span class="muted">about {usd_text(r["dinner"] / CURRENCIES[r["cur"]]["perUSD"])}</span>'
        if r.get("dinnerType", "menu") != "menu":
            text += '<br><span class="muted">à la carte main course</span>' if r["dinnerType"] == "main" else '<br><span class="muted">typical spend</span>'
        return text

    def restaurant_table(rows):
        body = ""
        for r in sorted(rows, key=lambda r: (place_name(r).lower(), r["name"].lower())):
            body += (f'<tr><td data-label="Restaurant">{name_html(r)}</td>'
                     f'<td data-label="City"><a href="{e(r["cityPath"])}">{e(place_name(r))}</a></td>'
                     f'<td data-label="Chef">{e(r.get("chef") or "–")}</td>'
                     f'<td data-label="Cuisine">{e(r.get("cuisine") or "–")}</td>'
                     f'<td class="num" data-label="Tasting menu, per person">{price_cell(r)}</td></tr>')
        heads = "".join(f'<th scope="col">{h}</th>' for h in ("Restaurant", "City", "Chef", "Cuisine", "Tasting menu, per person"))
        return f'<div class="table-wrap"><table class="guide-table data three-list"><thead><tr>{heads}</tr></thead><tbody>{body}</tbody></table></div>'

    list_note = note(f"Stars from the {e(year)} MICHELIN Guide editions; each restaurant’s name opens its prices on The Starred Bill, its city every starred restaurant there, "
                     "and the arrow its MICHELIN Guide page. "
                     "Prices are the main dinner tasting menu per person in local currency, before service and drinks, with US dollars at recent exchange rates.")

    def change_lists(keep):
        gained, lost = three_star_changes(year, keep)
        item = lambda r, text: (f'<li><strong><a href="{e(r["cityPath"])}#r={e(r["id"])}">{e(r["name"])}</a></strong>, {e(place_name(r))}, {e(places[r["country"]]["name"])}'
                                + (f" · {e(text)}" if text else "") + "</li>")
        new_html = "".join(item(r, r.get("changeNote", "")) for r in gained) or "<li>None in the guides published so far this year.</li>"
        lost_html = "".join(item(r, r.get("statusNote") or r.get("changeNote", "")) for r in lost) or "<li>None in the guides published so far this year.</li>"
        return (f'<div class="change-lists"><div><h3>New three stars in {e(year)}</h3><ul>{new_html}</ul></div>'
                f'<div><h3>Lost three stars in {e(year)}</h3><ul>{lost_html}</ul></div></div>')

    blocks = {}
    by_country = tally(live, lambda r: r["country"])
    blocks["countries"] = counts_table([(places[c]["name"], places[c]["path"], n) for c, n in by_country.items()], "Country") + note(
        f"Every Michelin-starred restaurant on The Starred Bill, which follows the current MICHELIN Guide edition for each country and territory "
        f"({e(year)} or the latest before it). Tap a column heading to sort.")
    by_state = tally([r for r in live if r["country"] == "usa"], us_state)
    blocks["us-states"] = counts_table([(places[s]["name"], places[s]["path"], n) for s, n in by_state.items()], "State") + note(
        "States and districts covered by a current MICHELIN Guide edition. Tap a column heading to sort.")
    three = [r for r in live if r["stars"] == 3]
    countries3 = sorted({r["country"] for r in three}, key=lambda c: (-sum(1 for r in three if r["country"] == c), places[c]["name"]))
    jump = '<nav class="jump-links" aria-label="Jump to a country">' + "".join(
        f'<a href="#three-{c}">{e(places[c]["name"])} <span>{sum(1 for r in three if r["country"] == c)}</span></a>' for c in countries3) + "</nav>"
    sections = "".join(f'<h3 id="three-{c}">{e(places[c]["name"])}: {sum(1 for r in three if r["country"] == c)} three-star restaurant'
                       f'{"s" if sum(1 for r in three if r["country"] == c) > 1 else ""}</h3>'
                       + restaurant_table([r for r in three if r["country"] == c]) for c in countries3)
    blocks["three-star-jump"] = jump
    blocks["three-star"] = sections + list_note
    blocks["three-star-uk"] = restaurant_table([r for r in three if r["country"] == "uk"]) + list_note
    blocks["three-star-london"] = restaurant_table([r for r in three if in_london(r)]) + list_note
    blocks["three-star-changes"] = change_lists(lambda r: True)
    blocks["three-star-changes-uk"] = change_lists(lambda r: r["country"] == "uk")
    blocks["three-star-changes-london"] = change_lists(in_london)

    def indian_table(rows, first, where, lunch=False):
        body = ""
        for r in rows:
            name = name_html(r)
            lunch_cell = ""
            if lunch:
                lunch_text = '<span class="muted">Not published</span>' if r.get("lunch") is None else money(r["lunch"], r["cur"]) + (
                    "" if r["cur"] == "USD" else f'<br><span class="muted">about {usd_text(r["lunch"] / CURRENCIES[r["cur"]]["perUSD"])}</span>')
                lunch_cell = f'<td class="num" data-label="Set lunch, per person">{lunch_text}</td>'
            body += (f'<tr><td data-label="Restaurant">{name}</td><td data-label="{first}">{where(r)}</td>'
                     f'<td data-label="Stars">{stars_cell(r["stars"])}</td><td data-label="Head chef">{e(r.get("chef") or "–")}</td>'
                     f'<td class="num" data-label="Tasting menu, per person">{price_cell(r)}</td>{lunch_cell}</tr>')
        heads = "".join(f'<th scope="col">{h}</th>' for h in (["Restaurant", first, "Stars", "Head chef", "Tasting menu, per person"] + (["Set lunch, per person"] if lunch else [])))
        return f'<div class="table-wrap"><table class="guide-table data"><thead><tr>{heads}</tr></thead><tbody>{body}</tbody></table></div>'

    indian = sorted((r for r in live if is_indian(r)), key=lambda r: (-r["stars"], indian_city(r).lower(), r["name"].lower()))
    blocks["indian"] = indian_table(indian, "City", lambda r: f'<a href="{e(r["cityPath"])}">{e(indian_city(r))}</a>') + note(
        f"Every Michelin-starred restaurant serving Indian cuisine, from the current MICHELIN Guide editions ({e(year)} or the latest before it). "
        "Names open each restaurant’s prices on The Starred Bill, cities our full price lists and arrows the MICHELIN Guide. Head chefs are as the MICHELIN Guide or the restaurant names them, "
        "else recent press. Prices are the main dinner tasting menu per person in local currency, before service and drinks, with US dollars at recent exchange rates.")
    blocks["indian-london"] = indian_table([r for r in indian if in_london(r)], "Area", lambda r: e(r.get("area") or "–"), lunch=True) + note(
        f"Stars from the MICHELIN Guide Great Britain &amp; Ireland {e(year)}; names open each restaurant’s prices on The Starred Bill and arrows its MICHELIN Guide page. "
        "Prices per person before service (usually 12.5–15% in London) and drinks, with US dollars at recent exchange rates. "
        "Set lunch is the cheapest set menu at lunch, where there is one.")
    blocks.update(chef_blocks(live, links, stars_cell, note))
    blocks.update(diet_blocks(live, name_html, stars_cell, price_cell, note))
    blocks.update(popular_blocks(stars_cell, price_cell, links, checked))
    blocks.update(ceremony_blocks())
    return blocks


# The popularity rankings (Top Michelin star restaurants in the world): starred restaurants by their number of Google reviews.
RATED_MIN = 1000   # reviews a restaurant needs for the "highest rated" lists, so a handful of 5.0s can't top them
VALUE_USD = 100    # the "under $100" list: the cheapest meal (dinner or lunch) at or below this, in US dollars
VALUE_RATING = 4.5
RATINGS_CHECKED = "October 2026"  # when the Google ratings and review counts were last fetched


def reviewed():
    """Starred restaurants with a Google review count, most reviewed first."""
    return sorted((r for r in restaurants if r.get("stars") in (1, 2, 3) and not r.get("status") and r.get("reviews") and r.get("rating")),
                  key=lambda r: (-r["reviews"], r["name"].lower()))


def cheapest_usd(r):
    """The lowest listed meal price (dinner or lunch, menu or à la carte) in US dollars, and which field it came from."""
    got = [(r[f] / CURRENCIES[r["cur"]]["perUSD"], f) for f in ("dinner", "lunch") if r.get(f) is not None]
    return min(got) if got else (None, None)


def rated_rank(rows):
    return sorted((r for r in rows if r.get("rating") and r["reviews"] >= RATED_MIN), key=lambda r: (-r["rating"], -r["reviews"], r["name"].lower()))


def popular_stats():
    """Figures for the popularity guide, e.g. {{popTop}} (the most reviewed starred restaurant) and {{ratedN}}."""
    rows = reviewed()
    if not rows:
        return {}
    top50 = rows[:50]
    total = sum(r["reviews"] for r in rows)
    out = {"popN": f"{len(rows):,}", "popReviews": f"{total / 1e6:.1f} million", "popMedian": f"{rows[len(rows) // 2]['reviews']:,}",
           "popTop": rows[0]["name"], "popTopPlace": place_name(rows[0]), "popTopReviews": f"{rows[0]['reviews']:,}",
           "pop50Min": f"{top50[-1]['reviews']:,}", "pop50One": str(sum(1 for r in top50 if r["stars"] == 1)),
           "pop50Three": str(sum(1 for r in top50 if r["stars"] == 3)),
           "pop50Countries": str(len({r["country"] for r in top50})),
           "ratedMin": f"{RATED_MIN:,}", "ratedN": str(sum(1 for r in rated_rank(rows) if r["rating"] >= 4.9)),
           "valueUSD": f"${VALUE_USD}", "valueRating": str(VALUE_RATING), "ratingsChecked": RATINGS_CHECKED}
    for s in (1, 2, 3):
        at = [r for r in rows if r["stars"] == s]
        out[f"pop{s}Top"], out[f"pop{s}TopReviews"] = at[0]["name"], f"{at[0]['reviews']:,}"
    rated = rated_rank(rows)
    if rated:
        out["ratedTop"], out["ratedTopPlace"] = rated[0]["name"], f'{place_name(rated[0])}, {places[rated[0]["country"]]["name"]}'
        out["ratedTopRating"], out["ratedTopReviews"] = f"{rated[0]['rating']:.1f}", f"{rated[0]['reviews']:,}"
    best3 = rated_rank([r for r in rows if r["stars"] == 3])
    if best3:
        out["best3Top"], out["best3TopRating"] = best3[0]["name"], f"{best3[0]['rating']:.1f}"
    top_countries = {}
    for r in top50:
        top_countries[r["country"]] = top_countries.get(r["country"], 0) + 1
    lead = max(sorted(top_countries), key=top_countries.get)
    out["pop50Lead"], out["pop50LeadN"] = places[lead]["name"], str(top_countries[lead])
    return out


def popular_blocks(stars_cell, price_cell, links, checked):
    """The ranked tables: {{table:popular-50}}, popular-rated, popular-3/-2/-1, popular-best-3, popular-value and popular-countries,
    plus {{table:popular-top10}}, the top ten written up from the guides' `picks`."""
    rows = reviewed()
    if not rows:
        return {}
    note = (f'<p class="table-note">Stars from the current MICHELIN Guide editions. Google review counts and ratings checked {RATINGS_CHECKED}; '
            f'they grow every day, so the order shifts a little between updates. Prices are per person in local currency, before service and drinks, '
            f'with US dollars at recent exchange rates. Star counts and prices last checked {e(checked)}.</p>')

    def name_cell(r, rank):
        return f'<td data-label="Restaurant"><span class="rank">{rank}</span> {restaurant_link(r, links)}</td>'

    def where_cell(r):
        return (f'<td data-label="Where"><a href="{e(r["cityPath"])}">{e(place_name(r))}</a>'
                f'<br><span class="muted">{e(places[r["country"]]["name"])}</span></td>')

    def cheap_cell(r):
        usd, field = cheapest_usd(r)
        if usd is None:
            return '<span class="muted">Not published</span>'
        kind = r.get(field + "Type", "menu")
        text = money(r[field], r["cur"]) + ("" if r["cur"] == "USD" else f'<br><span class="muted">about {usd_text(usd)}</span>')
        label = {"main": "à la carte main course", "spend": "typical spend"}.get(kind, "lunch menu" if field == "lunch" else "dinner menu")
        return text + f'<br><span class="muted">{label}</span>'

    def table(picked, price=None, price_head="Dinner, per person"):
        price = price or price_cell
        body = "".join(
            f'<tr>{name_cell(r, i + 1)}<td data-label="Stars">{stars_cell(r["stars"])}</td>{where_cell(r)}'
            f'<td class="num" data-label="Google reviews">{r["reviews"]:,}</td>'
            f'<td class="num" data-label="Google rating">{r["rating"]:.1f}</td>'
            f'<td class="num" data-label="{e(price_head)}">{price(r)}</td></tr>' for i, r in enumerate(picked))
        heads = "".join(f'<th scope="col">{h}</th>' for h in ("Restaurant", "Stars", "Where", "Google reviews", "Rating", price_head))
        return f'<div class="table-wrap"><table class="guide-table data rank-list"><thead><tr>{heads}</tr></thead><tbody>{body}</tbody></table></div>' + note

    blocks = {
        "popular-50": table(rows[:50]),
        "popular-rated": table(rated_rank(rows)[:10]),
        "popular-best-3": table(rated_rank([r for r in rows if r["stars"] == 3])[:10]),
        "popular-value": table([r for r in rows if (r.get("rating") or 0) >= VALUE_RATING and cheapest_usd(r)[0] is not None
                                and cheapest_usd(r)[0] <= VALUE_USD][:10], cheap_cell, "Cheapest meal"),
    }
    for s in (1, 2, 3):
        blocks[f"popular-{s}"] = table([r for r in rows if r["stars"] == s][:10])
    # The most reviewed starred restaurant in each country.
    firsts = {}
    for r in rows:
        firsts.setdefault(r["country"], r)
    body = "".join(
        f'<tr><td data-label="Country"><a href="{e(places[c]["path"])}">{e(places[c]["name"])}</a></td>'
        + name_cell(r, "").replace('<span class="rank"></span> ', "")
        + f'<td data-label="Stars">{stars_cell(r["stars"])}</td>'
        f'<td class="num" data-label="Google reviews">{r["reviews"]:,}</td><td class="num" data-label="Google rating">{r["rating"]:.1f}</td></tr>'
        for c, r in sorted(firsts.items(), key=lambda kv: places[kv[0]]["name"]))
    heads = "".join(f'<th scope="col">{h}</th>' for h in ("Country", "Restaurant", "Stars", "Google reviews", "Rating"))
    blocks["popular-countries"] = (f'<div class="table-wrap"><table class="guide-table data rank-list" data-sortable><thead><tr>{heads}</tr></thead>'
                                   f'<tbody>{body}</tbody></table></div>' + note)
    # The top ten written up: each restaurant's line of facts, then its `picks` text from the guide.
    picks = {p["restaurant"]: p["text"] for g in guides.values() for p in g.get("picks", [])}
    items = ""
    for i, r in enumerate(rows[:10]):
        if r["id"] not in picks:
            print(f"  Guides: {r['name']} ({r['id']}) is now in the top ten most reviewed but has no write-up in a guide's picks")
        facts = [f'{"★" * r["stars"]} {r["stars"]} star{"s" if r["stars"] > 1 else ""}', e(r.get("cuisine") or "")]
        if r.get("chef"):
            facts.append("Chef " + e(r["chef"]))
        facts.append(f'{r["reviews"]:,} Google reviews, rated {r["rating"]:.1f}')
        usd, field = cheapest_usd(r)
        if usd is not None:
            facts.append("From " + money(r[field], r["cur"]) + ("" if r["cur"] == "USD" else f" (about {usd_text(usd)})"))
        if r["id"] in links:
            facts.append(f'<a href="{e(links[r["id"]])}">MICHELIN Guide page</a>')
        items += (f'<li><h3><span class="rank">{i + 1}</span> <a href="{e(r["cityPath"])}#r={e(r["id"])}">{e(r["name"])}</a>, {e(place_name(r))}, {e(places[r["country"]]["name"])}</h3>'
                  f'<p class="rank-facts">{" · ".join(f for f in facts if f)}</p>' + (f'<p>{picks[r["id"]]}</p>' if r["id"] in picks else "") + "</li>")
    blocks["popular-top10"] = f'<ol class="rank-cards">{items}</ol>'
    return blocks


MONTH_NAMES = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")


KEYWORD_FILLER = {"a", "an", "the", "in", "is", "are", "there", "of"}


def keyword_words(text):
    """A phrase reduced to its words, so a keyword check ignores case, punctuation and small words ("what is michelin star" is found in "What is a Michelin star?")."""
    return " " + " ".join(w for w in re.findall(r"[a-z0-9]+", text.lower().replace("’", "'").replace("'", "")) if w not in KEYWORD_FILLER) + " "


def uk_date(d):
    """2026-10-05 -> 5 October 2026 (guides in UK English)."""
    return f"{int(d[8:10])} {MONTH_NAMES[int(d[5:7]) - 1]} {d[:4]}"


def us_date(d):
    """2026-10-05 -> October 5, 2026 (the guides use US English)."""
    return f"{MONTH_NAMES[int(d[5:7]) - 1]} {int(d[8:10])}, {d[:4]}"


def dinner_text(rid, meal="dinner"):
    """A restaurant's dinner (or lunch) price for a sentence, e.g. "AED 1,350 (about $370)", or None when it has none."""
    r = next((r for r in restaurants if r["id"] == rid), None)
    if not r or r.get(meal) is None:
        return None
    return money(r[meal], r["cur"]) + ("" if r["cur"] == "USD" else f" (about {usd_text(r[meal] / CURRENCIES[r['cur']]['perUSD'])})")


def stars_text(ids, count=False):
    """{{stars:a,b,c}}: the stars those restaurants hold between them today; {{starred:a,b,c}}: how many of them still hold
    any. Lost or closed ones count nothing. None when an id isn't a restaurant file name, so the token shows as written."""
    rows = [next((r for r in restaurants if r["id"] == i), None) for i in ids.split(",")]
    if None in rows:
        return None
    live = [r for r in rows if r.get("stars") in (1, 2, 3) and not r.get("status")]
    return str(len(live) if count else stars_of(live))


def guide_text(text, stats, blocks=None):
    """Fill in {{figures}} and {{table:name}} blocks, and turn <a data-guide="name"> into a link once that guide exists (plain text until then)."""
    # A table on a line of its own may arrive wrapped in <p> from the editor; a table can't sit inside a paragraph.
    text = re.sub(r"(?:<p>\s*)?\{\{table:([\w-]+)\}\}(?:\s*</p>)?", lambda m: (blocks or {}).get(m.group(1), m.group(0)), text)
    text = re.sub(r"\{\{(dinner|lunch):([\w-]+)\}\}", lambda m: dinner_text(m.group(2), m.group(1)) or m.group(0), text)
    text = re.sub(r"\{\{(stars|starred):([\w,-]+)\}\}", lambda m: stars_text(m.group(2), m.group(1) == "starred") or m.group(0), text)
    text = re.sub(r"\{\{(\w+)\}\}", lambda m: e(stats[m.group(1)]) if m.group(1) in stats else m.group(0), text)
    return re.sub(r'<a data-guide="([\w-]+)">(.*?)</a>',
                  lambda m: f'<a href="/guides/{m.group(1)}/">{m.group(2)}</a>' if m.group(1) in guides else m.group(2), text)


# The order of the Guides page for guides published the same day: the pillar first, then as the content briefs number them.
GUIDE_ORDER = ("what-is-a-michelin-star", "how-restaurants-get-a-michelin-star", "michelin-stars-by-country", "green-michelin-star",
               "bib-gourmand-vs-michelin-star", "three-michelin-star-restaurants", "three-michelin-star-restaurants-london",
               "three-michelin-star-restaurants-uk")


# The Guides page leads with this one (also linked from every footer), then the rest under their sections.
GUIDE_PILLAR = "what-is-a-michelin-star"
# "Popular" destination links at the foot of the Guides page.
GUIDE_CITIES = ("london", "paris", "tokyo", "new-york", "hong-kong", "singapore", "copenhagen")


GUIDE_IMAGES = SRC / "img" / "guides"


def guide_image(g):
    """A guide's featured picture (src/img/guides/<id>.jpg, made by scripts/guide_images.py), or None."""
    return f"/img/guides/{g['id']}" if (GUIDE_IMAGES / f"{g['id']}.jpg").exists() else None


_guide_bodies = {}


def guide_bodies():
    """Each guide's article as published, with its figures and tables filled in (worked out once, as related_guides()
    counts the links in them, tables included)."""
    if not _guide_bodies and guides:
        stats = dict(guide_stats(), **ceremony_stats())
        blocks = guide_blocks(stats)
        _guide_bodies.update({g["id"]: guide_text(g["body"], stats, blocks) for g in guides.values()})
        _guide_bodies["_stats"] = stats
    return _guide_bodies


def build_guides():
    """Each guide at /guides/<name>/, and a list of them at /guides/."""
    if not guides:
        return
    stats = guide_bodies()["_stats"]
    data = as_json({"currencies": CURRENCIES, "languages": DEFAULT_LANGUAGES})
    home_crumb = '<a href="/">All destinations</a>'
    for g in guides.values():
        path = f"/guides/{g['id']}/"
        body = guide_bodies()[g["id"]]
        for leftover in sorted(set(re.findall(r"\{\{[\w:,-]+\}\}", body))):
            print(f"  Guide {g['id']}: {leftover} isn't a figure or table the build knows, so it shows as written")
        text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", " ".join([g["title"], g["h1"], body] + [f["q"] + " " + f["a"] for f in g["faq"]]))).lower()
        missing = [k for k in g["keywords"] if keyword_words(k) not in keyword_words(text)]
        if missing:
            print(f"  Guide {g['id']}: these keywords don't appear word for word: " + "; ".join(missing))
        faqs = [{"q": guide_text(f["q"], stats), "a": guide_text(f["a"], stats)} for f in g["faq"]]
        faq_html = ('<section class="guide-faq" id="faq"><h2>Frequently asked questions</h2>' + "".join(
            f'<h3>{f["q"]}</h3><p>{f["a"]}</p>' for f in faqs) + "</section>") if faqs else ""
        img = guide_image(g)
        hero = (f'<figure class="guide-hero"><img src="{img}.jpg" alt="{e(g.get("imageAlt", ""))}" width="1600" height="900" '
                f'fetchpriority="high" decoding="async"></figure>\n') if img else ""
        main = (f'<article lang="{e(g.get("lang", "en-US"))}">\n<h1>{e(g["h1"])}</h1>\n'
                f'<p class="prose-date">Updated {(uk_date if g.get("lang") == "en-GB" else us_date)(g["updated"])} · Star counts and prices checked {stats["checked"]}</p>\n'
                f'{hero}{body}\n{faq_html}\n</article>')
        strip = lambda t: re.sub(r"<[^>]+>", "", t)
        graph = [
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "All destinations", "item": SITE_URL + "/"},
                {"@type": "ListItem", "position": 2, "name": "Guides", "item": SITE_URL + "/guides/"},
                {"@type": "ListItem", "position": 3, "name": g["h1"], "item": SITE_URL + path}]},
            {"@type": "Article", "headline": g["h1"], "description": g["description"], "inLanguage": g.get("lang", "en-US"),
             "datePublished": g["published"], "dateModified": g["updated"], "mainEntityOfPage": SITE_URL + path,
             **({"keywords": ", ".join(g["keywords"])} if g["keywords"] else {}),
             "image": [SITE_URL + img + ".jpg", SITE_URL + img + "-og.jpg"] if img else SITE_URL + "/og/default.png",
             "author": {"@type": "Organization", "@id": ORGANIZATION["@id"], "name": "The Starred Bill", "url": SITE_URL + "/"},
             "publisher": ORGANIZATION, "isPartOf": {"@id": WEBSITE["@id"]}},
        ]
        if faqs:
            graph.append({"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": strip(f["q"]), "acceptedAnswer": {"@type": "Answer", "text": strip(f["a"])}} for f in faqs]})
        write(path, render("guide.html", {
            "title": e(g["title"]), "description": e(g["description"]), "canonical": SITE_URL + path, "htmlLang": e(g.get("lang", "en-US")),
            "ogType": "article", "ogAlt": e(g.get("imageAlt") or g["h1"]),
            **({"ogImage": SITE_URL + img + "-og.jpg"} if img else {}),
            "keywordsMeta": f'<meta name="keywords" content="{e(", ".join(g["keywords"]))}">\n' if g["keywords"] else "",
            "jsonld": '<script type="application/ld+json">' + as_json({"@context": "https://schema.org", "@graph": graph}) + "</script>",
            "crumbs": home_crumb + '<a href="/guides/">Guides</a>' + f'<span aria-current="page">{e(g["h1"])}</span>',
            "main": main, "mainClass": "wrap prose guide", "data": data,
        }))
    order = lambda g: (g["published"], GUIDE_ORDER.index(g["id"]) if g["id"] in GUIDE_ORDER else len(GUIDE_ORDER), g["id"])
    def read_time(g):
        words = len(re.sub(r"<[^>]+>|\{\{[^}]+\}\}", " ", " ".join([g["body"]] + [f["q"] + " " + f["a"] for f in g["faq"]])).split())
        return f"{max(2, -(-words // 220))} min read"
    def picture(g, size):
        img = guide_image(g)
        if img:
            return f'<img src="{img}-card.jpg" alt="" width="800" height="450" {size} decoding="async">'
        # Until a guide has its picture: cream paper with gold stars, in the house style (docs/image-style.md).
        return '<span class="guide-ph" aria-hidden="true">' + '<svg><use href="#star"/></svg>' * 3 + "</span>"
    def meta(g):
        fig = guide_text(e(g["figure"]), stats) if g.get("figure") else ""
        return (f'<p class="guide-meta">' + (f'<span class="guide-fig">{fig}</span>' if fig else "")
                + f'<span class="guide-time">{read_time(g)}</span></p>')
    LAZY, EAGER = 'loading="lazy"', 'fetchpriority="high"'
    def card(g):
        return (f'<li>{picture(g, LAZY)}<div><h3><a href="/guides/{g["id"]}/">{e(g["h1"])}</a></h3>'
                f'<p>{e(g["summary"])}</p>{meta(g)}</div></li>')
    pillar = guides.get(GUIDE_PILLAR)
    feature = (f'<article class="guide-feature">{picture(pillar, EAGER)}<div>'
               f'<p class="guide-kicker">Start here</p><h2><a href="/guides/{pillar["id"]}/">{e(pillar["h1"])}</a></h2>'
               f'<p>{e(pillar["description"])}</p>{meta(pillar)}<span class="guide-go" aria-hidden="true">Read the guide →</span></div></article>') if pillar else ""
    rest = sorted((g for g in guides.values() if g is not pillar), key=order)
    groups = [(key, *GUIDE_SECTIONS[key], [g for g in rest if g.get("section") == key]) for key in GUIDE_SECTIONS]
    groups.append(("more", "More guides", "", [g for g in rest if g.get("section") not in GUIDE_SECTIONS]))
    groups = [grp for grp in groups if grp[3]]
    jump = '<nav class="guide-jump" aria-label="Guide topics">' + "".join(f'<a href="#{k}">{e(t)}</a>' for k, t, _, _ in groups) + "</nav>"
    sections = "".join(f'<section class="guide-group" id="{k}"><h2>{e(t)}</h2>' + (f'<p class="guide-group-note">{e(note)}</p>' if note else "")
                       + f'<ul class="guide-list">{"".join(card(g) for g in gs)}</ul></section>' for k, t, note, gs in groups)
    cities = "".join(f'<a href="{places[p]["path"]}">{e(places[p]["name"])}</a>' for p in GUIDE_CITIES if p in places)
    onward = ('<aside class="guide-next"><h2>Put the guides to use</h2><div class="guide-next-links">'
              '<a href="/near-me/"><svg aria-hidden="true"><use href="#locate"/></svg><strong>Near me</strong><span>Every starred restaurant around you, nearest first</span></a>'
              '<a href="/pick/"><svg aria-hidden="true"><use href="#spark"/></svg><strong>Help me pick</strong><span>Six quick questions, three picks to fit your budget</span></a>'
              '<a href="/#destinations"><svg aria-hidden="true"><use href="#pin"/></svg><strong>All destinations</strong><span>Dinner, lunch and wine pairing prices, city by city</span></a>'
              f'</div>' + (f'<p class="guide-cities"><span>Popular:</span>{cities}</p>' if cities else "") + '</aside>')
    lede = (f'Plain-English guides to Michelin stars: what one, two and three stars mean, how restaurants earn them, where to find them '
            f'and what a starred meal really costs. Every figure comes from the {stats["total"]} starred restaurants on The Starred Bill, '
            f'so the guides stay up to date as the prices do.')
    intro = (f'<h1>Michelin Star Guides</h1>\n<p class="lede">{lede}</p>\n'
             f'<p class="prose-date">{len(guides)} guides · Stars from the MICHELIN Guide · Figures and prices checked {stats["checked"]}</p>\n')
    description = "Plain-English guides to Michelin stars: what they mean, how restaurants earn them, where to find them and what a starred meal costs."
    graph = [
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "All destinations", "item": SITE_URL + "/"},
            {"@type": "ListItem", "position": 2, "name": "Guides", "item": SITE_URL + "/guides/"}]},
        {"@type": "CollectionPage", "name": "Michelin Star Guides", "description": description, "url": SITE_URL + "/guides/", "inLanguage": "en",
         "isPartOf": {"@type": "WebSite", "@id": WEBSITE["@id"], "name": "The Starred Bill", "url": SITE_URL + "/"},
         "mainEntity": {"@type": "ItemList", "itemListElement": [
             {"@type": "ListItem", "position": i + 1, "url": SITE_URL + f"/guides/{g['id']}/", "name": g["h1"]}
             for i, g in enumerate(([pillar] if pillar else []) + [g for grp in groups for g in grp[3]])]}},
    ]
    write("/guides/", render("guide.html", {
        "title": "Michelin Star Guides: What the Stars Mean and Cost",
        "description": description,
        "canonical": SITE_URL + "/guides/", "htmlLang": "en", "ogType": "website", "ogAlt": "The Starred Bill guides", "keywordsMeta": "",
        **({"ogImage": SITE_URL + guide_image(pillar) + "-og.jpg", "ogAlt": e(pillar.get("imageAlt") or pillar["h1"])} if pillar and guide_image(pillar) else {}),
        "jsonld": '<script type="application/ld+json">' + as_json({"@context": "https://schema.org", "@graph": graph}) + "</script>",
        "crumbs": home_crumb + '<span aria-current="page">Guides</span>',
        "main": intro + jump + feature + sections + onward,
        "mainClass": "wrap prose guide guide-index", "data": data,
    }))

# ---------- Restaurant pages (7 Oct 2026) ----------
# A page per restaurant at /restaurants/<file name>/, for searches like "Le Bernardin price": a short answer and the till
# receipt, what a meal comes to with service, the facts (stars, chef, cuisine, dietary options), how its prices compare with
# its peers, a map of the starred restaurants nearby and a FAQ. The address is the file name, which never changes (wishlists
# store it), so a restaurant keeps its page if it moves to another place page. English only. RESTAURANT_PAGES lists the
# ones built so far: the most-searched first, for the owner to check before the rest follow.
RESTAURANT_PAGES = ("le-bernardin",)
NEAR_KM = 5          # nearby starred restaurants within this distance...
NEAR_MAX = 6         # ...up to this many, nearest first (topped up from further away, up to NEAR_FAR_KM, for remote places)
NEAR_FAR_KM = 60
PEERS_SHOWN = 9      # rows in the "how it compares" table, centred on the restaurant
MILES = ("usa", "uk")  # countries whose distances read in miles first
STAR_WORDS = {1: "one", 2: "two", 3: "three"}
DIET_WORDS = {"vegetarian-only": "a vegetarian restaurant", "vegetarian-menu": "a vegetarian tasting menu", "vegetarian": "vegetarian",
              "vegan": "vegan", "gluten-free": "gluten-free", "halal": "halal", "kosher": "kosher"}


def read_service():
    """Each country's service rule, from SERVICE in common.js: (kind, the percentage usually added on top)."""
    js = (SRC / "assets" / "common.js").read_text("utf-8")
    block = js[js.index("const SERVICE = {"):]
    out = {m.group(1): (m.group(2), float(m.group(3))) for m in re.finditer(r'"?([\w-]+)"?: \["(\w+)", ([\d.]+)\]', block[:block.index("};")])}
    m = re.search(r'\[([^\]]+)\]\.forEach\(\(c\) => \{ SERVICE\[c\] = \["(\w+)", ([\d.]+)\]', block)
    for c in re.findall(r'"([\w-]+)"', m.group(1)) if m else []:
        out[c] = (m.group(2), float(m.group(3)))
    return out


SERVICE = read_service()
# The receipt's footer line for each kind, as SERVICE_LABEL and the English words in common.js; and how the same reads mid-sentence.
SERVICE_FOOT = {"before": "Per person, before service", "included": "Per person, service included", "plusplus": "Per person, ++ (service and tax added)",
                "taxtip": "Per person, before tax and tip", "tip": "Per person, before tip", "tax": "Per person, tax included"}
SERVICE_SAYS = {"before": "before service", "included": "including service", "plusplus": "before service and tax (“++”)",
                "taxtip": "before tax and tip", "tip": "before tip", "tax": "including tax"}
SERVICE_ADDS = {"before": "service", "plusplus": "service and tax", "taxtip": "tax and tip", "tip": "a tip"}

for _r in restaurants:
    if _r["id"] in RESTAURANT_PAGES and not _r.get("status"):
        _r["page"] = f"/restaurants/{_r['id']}/"
for _p in places.values():
    if _p["path"].startswith("/restaurants/"):
        print(f"Place {_p['id']}: its address {_p['path']} is where the restaurant pages go; give it another id")
        sys.exit(1)


def restaurant_href(r):
    """Where a mention of a restaurant leads: its own page, else its row on the page for its town."""
    return r.get("page") or f'{r["cityPath"]}#r={r["id"]}'


def dist_text(km, country):
    miles = km / 1.609344
    metric = f"{round(km * 1000, -1):,.0f} m" if km < 1 else f"{km:.1f} km"
    imperial = f"{miles:.1f} mi"
    return f"{imperial} ({metric})" if country in MILES else f"{metric} ({imperial})"


def usd_after(n, cur):
    """ " (about US$185)" after a price in another currency, nothing after US dollars."""
    return "" if cur == "USD" or n is None else f" (about US${n / CURRENCIES[cur]['perUSD']:,.0f})"


def area_line(r):
    """Where it is, e.g. "Midtown, Manhattan, New York" (the area, then the places above it down to the city)."""
    bits = [r.get("area") or ""]
    for pid in r["_chain"]:
        q = places[pid]
        if q["type"] in ("country", "region") and len(bits) > 1:
            break
        if q["name"] not in ", ".join(bits):
            bits.append(q["name"])
        if q["type"] in ("city", "country", "region"):
            break
    return ", ".join(b for b in bits if b)


# ---------- Restaurant pages: menus, past prices, cheaper ways in, before you go (9 Oct 2026) ----------
# Optional fields a restaurant's file can carry for its own page (README lists them): every `menus` entry, `priceHistory`
# (what the main dinner menu cost on past dates, e.g. from copies of the restaurant's own menu page on the Internet Archive),
# `starsSince`, and the practical details `dressCode`, `booking`, `bookingUrl`, `cancellation` and `children`, with
# `infoSource`/`infoChecked`. Each part of the page is left out when its fields aren't there.
BOOKING_SITES = (("resy.com", "Resy"), ("exploretock.com", "Tock"), ("opentable.", "OpenTable"), ("sevenrooms.com", "SevenRooms"),
                 ("thefork.", "TheFork"), ("tablecheck.com", "TableCheck"), ("omakase.in", "OMAKASE"))


def main_menu(r):
    """The menu the receipt's dinner price is: a dinner entry in `menus` at that price."""
    return next((m for m in r.get("menus", []) if m.get("meal", "dinner") == "dinner" and m["price"] == r.get("dinner")), None)


def cheapest_menu(r):
    """A menu cheaper than both the dinner and lunch prices on the receipt, if `menus` lists one (Le Bernardin's lounge lunch)."""
    floor = min(x for x in (r.get("dinner"), r.get("lunch"), float("inf")) if x is not None)
    cheaper = sorted((m for m in r.get("menus", []) if m["price"] < floor), key=lambda m: m["price"])
    return cheaper[0] if cheaper else None


def menu_label(m):
    """How a menu reads mid-sentence: "Chef's Tasting Menu" stays, "Prix fixe" becomes "prix fixe"."""
    name = m["name"]
    return name if any(w[:1].isupper() for w in name.split()[1:]) else name[:1].lower() + name[1:]


def nice_date(iso):
    """2026-10-09 -> 9 October 2026."""
    y, mo, d = iso.split("-")
    return f"{int(d)} {MONTH_NAMES[int(mo) - 1]} {y}"


def booking_site(url):
    host = urllib.parse.urlsplit(url).netloc.lower()
    return next((name for key, name in BOOKING_SITES if key in host), None)


def history_points(r):
    """The main dinner menu's past prices, oldest first, ending with today's (when it's newer or different)."""
    points = sorted(r.get("priceHistory", []), key=lambda h: h["date"])
    now = (r.get("menusChecked") or site.get("updated", ""))[:7]
    if points and r.get("dinner") is not None and (points[-1]["date"] < now or points[-1]["price"] != r["dinner"]):
        points.append({"date": now, "price": r["dinner"], "wine": r.get("wine"), "now": True})
    return points


def history_sentence(r):
    points = history_points(r)
    if len(points) < 2:
        return ""
    first, last = points[0], points[-1]
    cur, menu = r["cur"], (main_menu(r) or {}).get("name", "dinner menu")
    rise = round((last["price"] / first["price"] - 1) * 100)
    years = int(last["date"][:4]) - int(first["date"][:4])
    out = (f"The {menu} cost {money(first['price'], cur)} in {full_month(first['date'])} and costs {money(last['price'], cur)} today, "
           + (f"{rise}% more in {years} years" if rise > 0 else f"{-rise}% less" if rise < 0 else "the same") + ".")
    if first.get("wine") and last.get("wine"):
        out += f" With the wine pairing it has gone from {money(first['price'] + first['wine'], cur)} to {money(last['price'] + last['wine'], cur)}."
    return out


def full_month(ym):
    """2017-10 -> October 2017."""
    return f"{MONTH_NAMES[int(ym[5:7]) - 1]} {ym[:4]}"


def history_html(r):
    """A bar for each past price of the main dinner menu, drawn as an SVG, with a table of the figures and their sources."""
    points = history_points(r)
    if len(points) < 2:
        return ""
    cur = r["cur"]
    top = max(p["price"] + (p.get("wine") or 0) for p in points)
    w, h, gap, left = 640, 240, 10, 8
    bw = (w - left * 2 - gap * (len(points) - 1)) / len(points)
    bars = []
    for i, p in enumerate(points):
        x = left + i * (bw + gap)
        ph = (h - 70) * p["price"] / top
        wh = (h - 70) * (p.get("wine") or 0) / top
        y = h - 30 - ph
        bars.append(f'<rect class="h-wine" x="{x:.1f}" y="{y - wh:.1f}" width="{bw:.1f}" height="{wh:.1f}" rx="2"/>' if wh else "")
        bars.append(f'<rect class="h-menu{" now" if p.get("now") else ""}" x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" height="{ph:.1f}" rx="2"/>'
                    f'<text class="h-val" x="{x + bw / 2:.1f}" y="{y + 18:.1f}">{e(money(p["price"], cur))}</text>'
                    + (f'<text class="h-tot" x="{x + bw / 2:.1f}" y="{y - wh - 6:.1f}">{e(money(p["price"] + p["wine"], cur))}</text>' if wh else "")
                    + f'<text class="h-year" x="{x + bw / 2:.1f}" y="{h - 10}">{"Now" if p.get("now") else p["date"][:4]}</text>')
    svg = (f'<svg class="rp-history-chart" viewBox="0 0 {w} {h}" role="img" aria-label="{e(history_sentence(r))}">' + "".join(bars) + "</svg>")
    rows = "".join(f'<tr><td>{"Now" if p.get("now") else e(full_month(p["date"]))}</td><td class="num">{money(p["price"], cur)}</td>'
                   f'<td class="num">{money(p["price"] + p["wine"], cur) if p.get("wine") else "–"}</td>'
                   f'<td>' + (f'<a href="{e(p["source"])}">{"Internet Archive copy" if "web.archive.org" in p["source"] else urllib.parse.urlsplit(p["source"]).netloc.replace("www.", "")}</a>' if p.get("source") else "Our latest check") + "</td></tr>"
                   for p in points)
    return ('<section id="history" data-nocx>\n  <div class="wrap">\n    <div class="section-head"><div><span class="eyebrow">Price history</span>'
            f'<h2 style="margin-top: 6px">How {e(r["name"])}’s price has changed</h2><p>{e(history_sentence(r))}</p></div></div>\n'
            f'    <div class="rp-history">{svg}<p class="rp-key"><span><i class="k-menu"></i>{e((main_menu(r) or {}).get("name", "Dinner menu"))}</span>'
            + ('<span><i class="k-wine"></i>Wine pairing (the figure above each bar is the total with wine)</span>' if any(p.get("wine") for p in points) else "") + "</p></div>\n"
            '    <details class="rp-fold"><summary>The figures and where they come from</summary><div class="table-scroll"><table class="rp-table">'
            '<thead><tr><th>When</th><th class="num">Menu</th><th class="num">With wine</th><th>Source</th></tr></thead>'
            f"<tbody>{rows}</tbody></table></div>"
            '<p class="rp-note">Past prices come from copies of the restaurant’s own menu page saved by the Internet Archive’s Wayback Machine, on the date shown.</p></details>\n'
            "  </div>\n</section>\n")


def cheaper_html(r, peers_place, peers, live):
    """Cheaper ways in: the restaurant's own cheaper menus, the cheapest restaurant with the same stars in its city, and
    the other starred restaurants its chef runs."""
    cur, name = r["cur"], r["name"]
    d = r.get("dinner")
    items = []
    menus = [m for m in r.get("menus", []) if d is not None and m["price"] < d]
    if not menus and r.get("lunch") is not None and d is not None and r["lunch"] < d and not r.get("noLunch"):
        menus = [{"name": "Lunch", "meal": "lunch", "price": r["lunch"], "note": r.get("lunchNote", "")}]
    main = (main_menu(r) or {}).get("name", "dinner menu")
    for m in sorted(menus, key=lambda m: m["price"]):
        bits = [str(m["courses"]) + " courses" if m.get("courses") else "", m.get("note", ""), money(d - m["price"], cur) + " less than the " + main]
        items.append(f'<li><strong>{e(m["name"])}</strong> <span class="num">{money(m["price"], cur)}</span>'
                     f'<span>{e(" · ".join(x for x in bits if x))}</span></li>')
    if peers_place and peers and peers[0] is not r and d is not None and peers[0]["dinner"] < d:
        q = peers[0]
        items.append(f'<li><a href="{e(restaurant_href(q))}">{e(q["name"])}</a> <span class="num">{money(q["dinner"], cur)}</span>'
                     f'<span>The cheapest {STAR_WORDS[r["stars"]]}-star dinner menu in {e(in_sentence(peers_place))}{", " + e(q["cuisine"]) if q.get("cuisine") else ""}</span></li>')
    chefs = set(chef_names(r.get("chef")))
    for q in sorted((q for q in live if q is not r and chefs & set(chef_names(q.get("chef")))), key=lambda q: (q.get("dinner") or 1e9)):
        items.append(f'<li><a href="{e(restaurant_href(q))}">{e(q["name"])}</a> <span class="num">{money(q["dinner"], q["cur"]) if q.get("dinner") is not None else ""}</span>'
                     f'<span>Also run by {e(r["chef"])} · {q["stars"]} MICHELIN star{"s" if q["stars"] > 1 else ""} · {e(place_name(q))}</span></li>')
    if not items:
        return ""
    return ('<section id="cheaper">\n  <div class="wrap">\n    <div class="section-head"><div><span class="eyebrow">Spend less</span>'
            f'<h2 style="margin-top: 6px">Cheaper ways to eat at {e(name)}</h2></div></div>\n'
            f'    <ul class="rp-list">{"".join(items)}</ul>\n  </div>\n</section>\n')


def visit_html(r):
    """Before you go: dress code, booking, cancellation, children and opening hours, from the restaurant's own website."""
    rows = []
    if r.get("dressCode"):
        rows.append(("Dress code", e(r["dressCode"])))
    if r.get("booking") or r.get("bookingUrl"):
        site_name = booking_site(r["bookingUrl"]) if r.get("bookingUrl") else None
        rows.append(("Booking", e(r.get("booking", "")) + (f'<small><a href="{e(r["bookingUrl"])}">Book on {e(site_name)}' if site_name
                     else f'<small><a href="{e(r["bookingUrl"])}">Book a table') + "</a></small>" if r.get("bookingUrl") else ""))
    if r.get("cancellation"):
        rows.append(("Cancellations", e(r["cancellation"])))
    if r.get("children"):
        rows.append(("Children", e(r["children"])))
    if not rows:
        return ""
    if hours_lines(r):
        rows.append(("Opening hours" if any(h not in ("open", "closed") for d, h in hours_lines(r)) else "Open",
                     "".join(f'<span class="rp-hours"><b>{e(d)}</b> {e(h)}</span>' for d, h in hours_lines(r))
                     + f"<small>From the MICHELIN Guide, {e(month_year(HOURS_CHECKED[:7], 'en'))}</small>"))
    note = (f'<p class="rp-note">From <a href="{e(r["infoSource"])}">{e(r["name"])}’s website</a>'
            + (f", checked {nice_date(r['infoChecked'])}" if r.get("infoChecked") else "") + ". Rules change, so check when you book.</p>") if r.get("infoSource") else ""
    return ('<section id="visit">\n  <div class="wrap">\n    <div class="section-head"><div><span class="eyebrow">Before you go</span>'
            f'<h2 style="margin-top: 6px">Booking, dress code and the rules at {e(r["name"])}</h2></div></div>\n'
            '    <dl class="rp-facts rp-visit">' + "".join(f"<div><dt>{e(k)}</dt><dd>{v}</dd></div>" for k, v in rows) + f"</dl>\n    {note}\n  </div>\n</section>\n")


# Cuisine names the MICHELIN Guide words differently from one country to another, counted as the same for "Elsewhere".
CUISINE_SAME = {"fish and seafood": "seafood"}


def similar_elsewhere(r, live, peers):
    """Restaurants like it in other cities: the same cuisine with the same stars (topped up with one star fewer), the most
    reviewed first."""
    if not r.get("cuisine"):
        return []
    here = {q["id"] for q in peers} | {r["id"]}
    city = r["_chain"][1] if r["cityType"] == "district" else r["_chain"][0]
    kind = CUISINE_SAME.get(r["cuisine"].lower(), r["cuisine"].lower())
    same = [q for q in live if q["id"] not in here and q["stars"] >= max(1, r["stars"] - 1) and city not in q["_chain"]
            and CUISINE_SAME.get((q.get("cuisine") or "").lower(), (q.get("cuisine") or "").lower()) == kind]
    return sorted(same, key=lambda q: (q["stars"] != r["stars"], -(q.get("reviews") or 0)))[:6]


def similar_html(r, live, peers):
    found = similar_elsewhere(r, live, peers)
    if len(found) < 2:
        return ""
    items = "".join(
        f'<li><a href="{e(restaurant_href(q))}">{e(q["name"])}</a> <span class="stars" aria-label="{q["stars"]} MICHELIN star{"s" if q["stars"] > 1 else ""}">'
        + '<svg><use href="#star"/></svg>' * q["stars"] + f'</span> <span class="num">{(money(q["dinner"], q["cur"]) + usd_after(q["dinner"], q["cur"])) if q.get("dinner") is not None else ""}</span>'
        f'<span>{e(place_name(q))}, {e(places[q["country"]]["name"])}' + (f' · Chef {e(q["chef"])}' if q.get("chef") else "") + "</span></li>" for q in found)
    levels = sorted({q["stars"] for q in found}, reverse=True)
    stars = "- and ".join(STAR_WORDS[x] for x in levels) + "-star"  # "three- and two-star"
    return ('<section id="similar">\n  <div class="wrap">\n    <div class="section-head"><div><span class="eyebrow">Elsewhere</span>'
            f'<h2 style="margin-top: 6px">Other {stars} {e(r["cuisine"].lower())} restaurants</h2>'
            f'<p>If you like {e(r["name"])}: the most reviewed {stars} {e(r["cuisine"].lower())} restaurants in other cities, with their dinner menus.</p></div></div>\n'
            f'    <ul class="rp-list">{items}</ul>\n  </div>\n</section>\n')


def restaurant_og(r):
    """The restaurant's own link-preview picture (its till receipt, from scripts/restaurant_images.py), if drawn."""
    return f"{SITE_URL}/og/restaurants/{r['id']}.png" if (SRC / "og" / "restaurants" / f"{r['id']}.png").exists() else None


def report_link(r):
    """"Seen a different price?": an email to the site with the restaurant filled in (counted as a contact event)."""
    body = f"Restaurant: {r['name']} ({SITE_URL}{r['page']})\nThe price I've seen: \nWhere I saw it (a link helps): \n"
    return (f'<a class="rp-report" data-report href="mailto:hello@starredbill.com?subject={urllib.parse.quote("Price check: " + r["name"])}'
            f'&amp;body={urllib.parse.quote(body)}">Seen a different price? Tell us</a>')


def restaurant_answer(r, stay):
    """The short answer at the top (and the FAQ's first answer): what dinner, lunch and the wine pairing cost, and roughly
    what dinner for two comes to once the country's usual service, tax or tip is added."""
    name, cur, kind, pct = r["name"], r["cur"], *stay
    m = lambda n: money(n, cur)
    out = []
    d, w, lunch = r.get("dinner"), r.get("wine"), r.get("lunch")
    dtype = r.get("dinnerType", "menu")
    main, cheapest = main_menu(r), cheapest_menu(r)
    if d is not None:
        if dtype == "menu":
            out.append(f"The {main['name'] if main else 'dinner tasting menu'} at {name} costs {m(d)}{usd_after(d, cur)} per person"
                       + (f", or {m(d + w)} with the wine pairing." if w else "; there’s no wine pairing." if r.get("noPairing") else "."))
        elif dtype == "main":
            out.append(f"Main courses at {name} cost about {m(d)}{usd_after(d, cur)} at dinner.")
        else:
            out.append(f"A typical dinner at {name} costs about {m(d)}{usd_after(d, cur)} per person.")
    else:
        out.append(f"{name} doesn't publish a dinner price.")
    if r.get("noLunch"):
        out.append("It’s open for dinner only.")
    elif lunch is not None:
        out.append(f"{'Lunch' if d is not None else 'Lunch there'} is {m(lunch)}" + (f" ({m(lunch + r['lunchWine'])} with wine)" if r.get("lunchWine") else "")
                   + (", the cheaper way in." if d is not None and lunch < d and not cheapest else "."))
    if cheapest:
        out.append(f"The cheapest way in is the {m(cheapest['price'])} {menu_label(cheapest)}.")
    if d is not None and dtype in ("menu", "spend"):
        out.append(f"Prices are {SERVICE_SAYS.get(kind, 'before service')}" + (
            f"; with about {pct:g}% for {SERVICE_ADDS[kind]}, dinner for two{' with wine' if w else ''} comes to roughly {m(round((d + (w or 0)) * 2 * (1 + pct / 100), -1))}."
            if pct and kind in SERVICE_ADDS else f", so dinner for two{' with wine' if w else ''} comes to {m((d + (w or 0)) * 2)}."))
    return " ".join(out)


def receipt_html(r, kind, src_links):
    """The till receipt, drawn as receipt() in place.js draws it (dinner, lunch, wine pairing, dinner + wine)."""
    cur = r["cur"]
    def line(label, value, note="", on=False, muted=False):
        return (f'<span class="rc-line{" on" if on else ""}"><span class="rc-k">{e(label)}</span><span class="rc-dots" aria-hidden="true"></span>'
                f'<span class="sr-only">, </span><span class="rc-v{" muted" if muted else ""}">{e(value)}</span>'
                + (f'<span class="sr-only">, </span><span class="rc-note">{e(note)}</span>' if note else "") + "</span>")
    def meal(field, note_field, type_field):
        n = r.get(field)
        if field == "lunch" and r.get("noLunch"):
            return line("Lunch", "Dinner only", muted=True)
        if n is None:
            return line("Dinner" if field == "dinner" else "Lunch", "not listed", muted=True)
        t = r.get(type_field, "menu")
        extra = "per main" if t == "main" else "typical spend" if t == "spend" else ""
        return line("Dinner" if field == "dinner" else "Lunch", money(n, cur), " · ".join(x for x in (extra, r.get(note_field)) if x), on=field == "dinner")
    w = r.get("wine")
    total = r["dinner"] + w if w and r.get("dinner") is not None and r.get("dinnerType", "menu") == "menu" else None
    month = site.get("updated", "")
    checked = (MONTH_NAMES[int(month[5:7]) - 1][:3] + " " + month[:4]) if re.fullmatch(r"\d{4}-\d{2}", month) else ""
    return ('<div class="receipt rp-receipt"><span class="rc-paper">'
            '<span class="rc-head" aria-hidden="true">The Starred Bill · Table for 1</span>'
            + (f'<span class="notice">Temporarily closed</span>' if r.get("notice") else "")
            + meal("dinner", "dinnerNote", "dinnerType") + meal("lunch", "lunchNote", "lunchType")
            + (line("Wine pairing", money(w, cur)) if w else line("Wine pairing", "–", "no pairing offered" if r.get("noPairing") else "no pairing listed", muted=True))
            + (f'<span class="rc-line rc-total"><span class="rc-k">Dinner + wine</span><span class="rc-dots" aria-hidden="true"></span>'
               f'<span class="sr-only">, </span><span class="rc-v">{money(total, cur)}</span></span>' if total is not None else "")
            + f'<span class="rc-foot">{e(SERVICE_FOOT.get(kind, SERVICE_FOOT["before"]))}<br>Checked {checked}'
            + (" · " + src_links if src_links else "") + "</span></span></div>")


def ordinal(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def peers_of(r, live):
    """The restaurants it's compared with: the same stars and a dinner menu price, in its city (the city above a district),
    or the place above that when the city has fewer than three; with that place."""
    same = lambda q: q["stars"] == r["stars"] and q.get("dinner") is not None and q.get("dinnerType", "menu") == "menu" and q["cur"] == r["cur"]
    start = 1 if r["cityType"] == "district" else 0
    for pid in r["_chain"][start:]:
        group = [q for q in live if pid in q["_chain"] and same(q)]
        if len(group) >= 3:
            return places[pid], sorted(group, key=lambda q: (q["dinner"], q["name"]))
    return None, []


def near_restaurants(r, live):
    if r.get("lat") is None:
        return []
    found = sorted((metres(r["lat"], r["lng"], q["lat"], q["lng"]) / 1000, q) for q in live
                   if q is not r and q.get("lat") is not None and abs(q["lat"] - r["lat"]) < 1 and abs(q["lng"] - r["lng"]) < 1.5)
    found = [(km, q) for km, q in found if km <= NEAR_FAR_KM]
    close = [f for f in found if f[0] <= NEAR_KM]
    return (close if len(close) >= 3 else found)[:NEAR_MAX]


def restaurant_title(r, year):
    """The page's title (the blue link in Google): the fullest wording that fits TITLE_MAX."""
    name, has_menu = r["name"], r.get("dinnerType", "menu") == "menu" and r.get("dinner") is not None
    what = [x for x in ("Tasting Menu" if has_menu else "Menu" if r.get("dinner") is not None else "", "Lunch" if r.get("lunch") is not None else "",
                        "Wine" if r.get("wine") else "") if x]
    listed = ", ".join(what[:-1]) + " and " + what[-1] if len(what) > 1 else (what[0] if what else "")
    options = [f"{name} Prices: {listed} ({year})", f"{name} Prices: {listed}", f"{name} Prices ({year})", f"{name} Prices"]
    return next((o for o in options if title_width(o) <= TITLE_MAX and not o.startswith(f"{name} Prices: (")), options[-1])


def restaurant_description(r, where):
    """The search snippet: prices first, then stars, area and chef, as much as fits in 155 characters."""
    cur, d, w, lunch = r["cur"], r.get("dinner"), r.get("wine"), r.get("lunch")
    bits = []
    if d is not None:
        bits.append((f"the tasting menu is {money(d, cur)} per person" if r.get("dinnerType", "menu") == "menu" else f"dinner is about {money(d, cur)}")
                    + (f", {money(d + w, cur)} with wine" if w and r.get("dinnerType", "menu") == "menu" else ""))
    if lunch is not None:
        bits.append(f"lunch is {money(lunch, cur)}")
    head = f"What {r['name']} costs: " + "; ".join(bits) + ". " if bits else f"{r['name']}: prices, menus and what to expect. "
    tails = [f"{STAR_WORDS[r['stars']].capitalize()} MICHELIN star{'s' if r['stars'] > 1 else ''}, {where}" + (f", chef {r['chef']}." if r.get("chef") else "."),
             f"{STAR_WORDS[r['stars']].capitalize()} MICHELIN star{'s' if r['stars'] > 1 else ''}, {where}.",
             f"{STAR_WORDS[r['stars']].capitalize()} MICHELIN star{'s' if r['stars'] > 1 else ''}.", ""]
    return next(head + t for t in tails if len(head + t) <= 155).strip()


DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
TWELVE_HOUR = {"usa", "canada", "philippines"}  # countries whose readers expect "6:30pm" rather than "18:30"


def clock(hhmm, country):
    h, m = int(hhmm[:2]), hhmm[2:]
    if hhmm in ("0000", "2400"):
        return "midnight"
    if country in TWELVE_HOUR:
        return f"{(h - 1) % 12 + 1}{':' + m if m != '00' else ''}{'am' if h < 12 else 'pm'}"
    return f"{h:02d}:{m}"


def week_of(r):
    """A restaurant's sittings from HOURS, Monday first: [[("1200", "1430"), ("1800", "2230")], [], …], or None."""
    week = HOURS.get(r["id"])
    return [[tuple(x.split("-")) for x in d.split(",")] if d else [] for d in week.split(";")] if week else None


def dinner_sitting(a, b):
    return int(a) >= 1500 or int(b) > 1800 or int(b) <= int(a)


def hours_lines(r):
    """A restaurant's week as [(days, hours)], runs of days with the same hours together:
    [("Mon", "closed"), ("Tue–Sat", "12:00–14:00, 19:00–22:00")]. The MICHELIN Guide often records only a day's first
    sitting, so times are given only when every open day has two sittings or a dinner one; otherwise just which days
    it opens ("open"). Empty when the guide lists no hours."""
    week = week_of(r)
    if not week:
        return []
    timed = all(len(d) > 1 or dinner_sitting(*d[0]) for d in week if d)
    text = [(", ".join(clock(a, r["country"]) + "–" + clock(b, r["country"]) for a, b in d) if timed else "open") if d else "closed" for d in week]
    out, i = [], 0
    while i < 7:
        j = i
        while j + 1 < 7 and text[j + 1] == text[i]:
            j += 1
        out.append((DAY_SHORT[i] + ("–" + DAY_SHORT[j] if j > i else ""), text[i]))
        i = j + 1
    return out


def hours_sentence(r):
    """"It's open Tuesday to Saturday, closed on Sunday and Monday." from HOURS, or "" without hours."""
    week = week_of(r)
    if not week:
        return ""
    open_days = [i for i, d in enumerate(week) if d]
    closed = [DAY_LONG[i] for i in range(7) if i not in open_days]
    if not closed:
        return "It's open every day of the week."
    # Name a run of open days that wraps round the week (Wednesday to Sunday) as one stretch.
    start = next(i for i in range(7) if i in open_days and (i - 1) % 7 not in open_days)
    run = [(start + k) % 7 for k in range(7)]
    run = run[:next((k for k, d in enumerate(run) if d not in open_days), 7)]
    opened = f"{DAY_LONG[run[0]]} to {DAY_LONG[run[-1]]}" if len(run) == len(open_days) and len(run) > 2 else and_list([DAY_LONG[i] for i in open_days])
    return f"It's open {opened}, closed on {and_list(closed)}."


def restaurant_faq(r, answer, kind, peers_place, peers, live):
    name, cur, s = r["name"], r["cur"], r["stars"]
    faq = [(f"How much does {name} cost?", answer)]
    if len(r.get("menus", [])) > 1:
        faq.append((f"What menus does {name} serve?", "; ".join(
            f"{m['name']}, {money(m['price'], cur)}" + (f" ({m['courses']} courses)" if m.get("courses") else "") + (f", {money(m['price'] + m['wine'], cur)} with wine" if m.get("wine") else "")
            for m in r["menus"]) + f". All {SERVICE_SAYS.get(kind, 'before service')}, per person."))
    cheapest = cheapest_menu(r)
    if cheapest:
        faq.append((f"What is the cheapest way to eat at {name}?", f"The {menu_label(cheapest)}, at {money(cheapest['price'], cur)} per person"
                    + (f" for {cheapest['courses']} courses" if cheapest.get("courses") else "") + "." + (f" {cheapest['note'].rstrip('.')}." if cheapest.get("note") else "")))
    if r.get("dressCode"):
        faq.append((f"What is the dress code at {name}?", r["dressCode"]))
    if r.get("booking") or r.get("bookingUrl"):
        via = booking_site(r["bookingUrl"]) if r.get("bookingUrl") else None
        faq.append((f"How do you book a table at {name}?", " ".join(x for x in (r.get("booking", ""), f"Online bookings are on {via}." if via else "", r.get("cancellation", "")) if x)))
    if r.get("children"):
        faq.append((f"Can you take children to {name}?", r["children"]))
    if history_sentence(r):
        faq.append((f"Has {name} got more expensive?", history_sentence(r)))
    if r.get("noLunch"):
        faq.append((f"Is {name} open for lunch?", f"No. {name} serves dinner only."))
    elif r.get("lunch") is not None:
        faq.append((f"How much is lunch at {name}?", f"Lunch at {name} is {money(r['lunch'], cur)}{usd_after(r['lunch'], cur)} per person"
                    + (f", or {money(r['lunch'] + r['lunchWine'], cur)} with wine" if r.get("lunchWine") else "")
                    + (f", {money(r['dinner'] - r['lunch'], cur)} less than the dinner menu." if r.get("dinner") is not None and r.get("dinnerType", "menu") == "menu" and r["lunch"] < r["dinner"] else ".")))
    if r.get("wine"):
        faq.append((f"How much is the wine pairing at {name}?", f"The wine pairing is {money(r['wine'], cur)}{usd_after(r['wine'], cur)} per person on top of the menu"
                    + (f", which brings dinner to {money(r['dinner'] + r['wine'], cur)} {SERVICE_SAYS.get(kind, 'before service')}." if r.get("dinner") is not None and r.get("dinnerType", "menu") == "menu" else ".")))
    elif r.get("noPairing"):
        faq.append((f"Does {name} offer a wine pairing?", f"No. {name} doesn’t offer a wine pairing with its menu, so the prices here are for the food only."))
    country = places.get(r["country"])
    same = sum(1 for q in live if q["country"] == r["country"] and q["stars"] == s)
    change = {"new": f" It won {'them' if s > 1 else 'it'} in the guide of {month_year(r.get('changeDate'), 'en')}." if r.get("changeDate") else "",
              "up": f" It gained its {ordinal(s)} star in {month_year(r.get('changeDate'), 'en')}." if r.get("changeDate") else "",
              "down": f" It dropped from {s + 1} stars in {month_year(r.get('changeDate'), 'en')}." if r.get("changeDate") else ""}.get(r.get("change"), "")
    faq.append((f"How many Michelin stars does {name} have?",
                f"{STAR_WORDS[s].capitalize()}. {name} holds {STAR_WORDS[s]} MICHELIN star{'s' if s > 1 else ''}" + (", the guide’s highest award" if s == 3 else "")
                + f", one of {same} {STAR_WORDS[s]}-star restaurants in {in_sentence(country) if country else 'its country'}.{change}"
                + (f" It has held {STAR_WORDS[s]} star{'s' if s > 1 else ''} every year since {r['starsSince']}." if r.get("starsSince") else "")))
    if r.get("chef"):
        faq.append((f"Who is the chef at {name}?", f"The head chef is {r['chef']}."))
    if hours_lines(r):
        timed = any(h not in ("open", "closed") for d, h in hours_lines(r))
        faq.append((f"When is {name} open?", hours_sentence(r) + (" Its hours, from the MICHELIN Guide: " + "; ".join(f"{d} {h}" for d, h in hours_lines(r)) + "."
                    if timed else " That's from the MICHELIN Guide.") + " Check with the restaurant before you go, as hours change on holidays."))
    diets = [d for d in r.get("diets", []) if d in DIET_WORDS]
    if "vegetarian-only" in diets:
        faq.append((f"Is {name} vegetarian?", f"Yes. The MICHELIN Guide lists {name} as a vegetarian restaurant."))
    elif diets:
        menu = "vegetarian-menu" in diets
        kinds = [DIET_WORDS[d] for d in diets if d not in ("vegetarian-menu", "vegetarian-only")]
        faq.append((f"Can {name} cater for vegetarian or other diets?",
                    (f"Yes: it has a vegetarian tasting menu" + (", and " if kinds else ".") if menu else "")
                    + (f"{'Yes: ' if not menu else ''}the MICHELIN Guide says it can cater for {and_list(kinds)} diets." if kinds else "")
                    + " Tell the restaurant when you book."))
    if peers_place and len(peers) > 1 and r in peers:
        i = peers.index(r) + 1
        where = in_sentence(peers_place)
        rank = "the cheapest" if i == 1 else "the most expensive" if i == len(peers) else f"the {ordinal(i)} cheapest"
        faq.append((f"Is {name} expensive for a {STAR_WORDS[s]}-star restaurant?",
                    f"Its {money(r['dinner'], cur)} dinner menu is {rank} of the {len(peers)} {STAR_WORDS[s]}-star dinner menus in {where} we list; "
                    f"the middle price is {money(peers[len(peers) // 2]['dinner'], cur)}."))
    return faq


def build_restaurant_pages():
    live = [r for r in restaurants if not r.get("status")]
    mg = michelin_links()
    site_dates = last_changed()
    for r in (x for x in live if x.get("page")):
        city = places[r["city"]]
        stay = SERVICE.get(r["country"], ("before", 0))
        kind = stay[0]
        cur = r["cur"]
        where = area_line(r)
        crumbs = [places[c] for c in reversed(r["_chain"])]
        src = lambda url, typ, label: f'<a class="src" href="{e(url)}">{label}</a>' if url and typ != "none" else ""
        two = bool(r.get("lunchSource")) and r.get("lunchSource") != r.get("source")
        src_links = " · ".join(x for x in (
            src(r.get("source"), r.get("sourceType"), "dinner source" if two else "restaurant’s website" if r.get("sourceType") == "site" else "source"),
            src(r.get("lunchSource"), r.get("lunchSourceType"), "lunch source") if two else "") if x)
        answer = restaurant_answer(r, stay)
        peers_place, peers = peers_of(r, live)
        near = near_restaurants(r, live)
        faq = restaurant_faq(r, answer, kind, peers_place, peers, live)
        year = site.get("updated", "")[:4]
        title = restaurant_title(r, year)
        description = restaurant_description(r, where)
        stars_html = '<span class="stars" aria-hidden="true">' + '<svg><use href="#star"/></svg>' * r["stars"] + "</span>"
        stars_label = f"{STAR_WORDS[r['stars']].capitalize()} MICHELIN star{'s' if r['stars'] > 1 else ''}"
        maps = ("https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(", ".join([r["name"], r.get("address") or where]))
                + (f"&query_place_id={urllib.parse.quote(r['placeId'])}" if r.get("placeId") else ""))

        hero = (f'<div class="hero rp-hero" id="top">\n  <div class="wrap">\n    <div>\n'
                f'      <span class="eyebrow" style="color: var(--band-muted)">{stars_html} {e(stars_label)} · {e(r.get("cuisine", ""))}</span>\n'
                f'      <h1 style="margin-top: 12px">{e(r["name"])}: what it <em>costs</em></h1>\n'
                f'      <p class="rp-where">{e(where)}' + (f' · Chef {e(r["chef"])}' if r.get("chef") else "") + '</p>\n'
                f'      <p class="rp-answer">{e(answer)}</p>\n'
                f'      <div class="rp-actions"><button type="button" class="rp-wish" id="rpWish" data-wish="{e(r["id"])}" aria-pressed="false">'
                f'<svg aria-hidden="true"><use href="#heart"/></svg><span>Save to wishlist</span></button>'
                + (f'<a class="rp-btn" href="{e(r["bookingUrl"])}">Book on {e(booking_site(r["bookingUrl"]) or "their website")}</a>' if r.get("bookingUrl") else "")
                + (f'<a class="rp-btn" href="{e(r["website"])}">Restaurant’s website</a>' if r.get("website") else "")
                + f'<a class="rp-btn" href="{e(maps)}">Google Maps</a></div>\n'
                '      <div class="rp-cur" id="rpCur" role="group" aria-label="Show prices in" hidden></div>\n'
                f'    </div>\n    <div class="rp-side">{receipt_html(r, kind, src_links)}</div>\n  </div>\n</div>\n')

        # The facts.
        change = r.get("change")
        change_text = {"new": "New in", "up": "Gained a star in", "down": "Lost a star in"}.get(change, "")
        facts = [("MICHELIN stars", f'{stars_html} {e(stars_label)}' + (f'<small>{e(change_text)} {e(month_year(r.get("changeDate"), "en"))}'
                  + (f': {e(r["changeNote"])}' if r.get("changeNote") else "") + "</small>" if change and r.get("changeDate") else "")
                  + (f'<small>Every year since {r["starsSince"]}</small>' if r.get("starsSince") and not change else ""))]
        if r.get("cuisine"):
            facts.append(("Cuisine", e(r["cuisine"])))
        if r.get("chef"):
            facts.append(("Head chef", e(r["chef"])))
        up = [c for c in r["_chain"] if places[c]["type"] in ("district", "city")] or r["_chain"][:1]
        up += [c for c in r["_chain"][-1:] if c not in up]
        facts.append(("Where", (e(r["area"]) + " · " if r.get("area") and r["area"] != city["name"] else "") + " · ".join(
            f'<a href="{places[c]["path"]}">{e(places[c]["name"])}</a>' for c in up)))
        visit = visit_html(r)
        if hours_lines(r) and not visit:
            facts.append(("Opening hours" if any(h not in ("open", "closed") for d, h in hours_lines(r)) else "Open",
                          "".join(f'<span class="rp-hours"><b>{e(d)}</b> {e(h)}</span>' for d, h in hours_lines(r))
                          + f"<small>From the MICHELIN Guide, {e(month_year(HOURS_CHECKED[:7], 'en'))}; check before you go</small>"))
        if r.get("address"):
            facts.append(("Address", f'{e(r["address"])}<small><a href="{e(maps)}">Open in Google Maps</a></small>'))
        diets = [d for d in r.get("diets", []) if d in DIET_WORDS]
        if diets:
            plain_diets = [DIET_WORDS[d] for d in diets if d not in ("vegetarian-only", "vegetarian-menu")]
            facts.append(("Dietary needs", e("; ".join(x for x in (
                "A vegetarian restaurant" if "vegetarian-only" in diets else "", "Has a vegetarian tasting menu" if "vegetarian-menu" in diets else "",
                ("Can cater for " + and_list(plain_diets) + " diets") if plain_diets else "") if x)) + "<small>From the MICHELIN Guide; say when you book</small>"))
        if r.get("rating"):
            facts.append(("Google rating", f'{r["rating"]:.1f} out of 5' + (f'<small>{r["reviews"]:,} reviews, checked {RATINGS_CHECKED}</small>' if r.get("reviews") else "")))
        links = [f'<a href="{e(r["website"])}">Restaurant’s website</a>'] if r.get("website") else []
        if r["id"] in mg:
            links.append(f'<a href="{e(mg[r["id"]])}">MICHELIN Guide page</a>')
        if links:
            facts.append(("Links", " · ".join(links)))
        facts_html = ('<section id="facts">\n  <div class="wrap">\n    <div class="section-head"><div><span class="eyebrow">At a glance</span>'
                      f'<h2 style="margin-top: 6px">{e(r["name"])} in brief</h2></div></div>\n    <dl class="rp-facts">'
                      + "".join(f"<div><dt>{e(k)}</dt><dd>{v}</dd></div>" for k, v in facts) + "</dl>\n  </div>\n</section>\n")

        # What you'll pay, with the country's service note and the sources.
        service_text = inherited(city, "serviceText") or ""
        pay_rows = []
        d, w, lunch = r.get("dinner"), r.get("wine"), r.get("lunch")
        pct = stay[1] if kind in SERVICE_ADDS else 0
        def bill_row(label, n, note=""):
            if n is None:
                return ""
            plus = f'<td class="num">{money(round(n * (1 + pct / 100)), cur)}</td>' if pct else ""
            return f'<tr><th scope="row">{e(label)}' + (f"<small>{e(note)}</small>" if note else "") + f'</th><td class="num">{money(n, cur)}</td>{plus}<td class="num">{money(n * 2, cur)}</td>' + \
                (f'<td class="num">{money(round(n * 2 * (1 + pct / 100)), cur)}</td>' if pct else "") + "</tr>"
        for m in r.get("menus", []):
            where = {"lunch": "Lunch", "lounge": "In the lounge"}.get(m.get("meal"), "")
            note = " · ".join(x for x in ((f"{m['courses']} courses" if m.get("courses") else ""), "" if where.lower().split()[-1:] and where.lower().split()[-1] in m["name"].lower() else where) if x)
            pay_rows.append(bill_row(m["name"], m["price"], note))
            if m.get("wine"):
                pay_rows.append(bill_row(m["name"] + " with wine pairing", m["price"] + m["wine"]))
        if d is not None and not r.get("menus"):
            dlabel = "Dinner menu" if r.get("dinnerType", "menu") == "menu" else "Dinner, a main course" if r["dinnerType"] == "main" else "Dinner, typical spend"
            pay_rows.append(bill_row(dlabel, d, r.get("dinnerNote", "")))
            if w and r.get("dinnerType", "menu") == "menu":
                pay_rows.append(bill_row("Dinner menu with wine pairing", d + w))
        if lunch is not None and not r.get("noLunch") and not r.get("menus"):
            pay_rows.append(bill_row("Lunch", lunch, r.get("lunchNote", "")))
            if r.get("lunchWine"):
                pay_rows.append(bill_row("Lunch with wine", lunch + r["lunchWine"]))
        heads = "<th>Per person</th>" + (f"<th>With {pct:g}% {e(SERVICE_ADDS[kind])}</th>" if pct else "") + "<th>For two</th>" + (f"<th>For two, with {e(SERVICE_ADDS[kind])}</th>" if pct else "")
        sources = []
        for label, url, typ in (("Dinner", r.get("source"), r.get("sourceType")), ("Lunch", r.get("lunchSource"), r.get("lunchSourceType"))):
            if url and typ != "none" and url not in [s[1] for s in sources]:
                sources.append((label, url, typ))
        if r.get("menusSource"):
            sources = [("Menus", r["menusSource"], "site")]
        pay_html = ('<section id="prices">\n  <div class="wrap">\n    <div class="section-head"><div><span class="eyebrow">The bill</span>'
                    f'<h2 style="margin-top: 6px">{"Menus and prices at " + e(r["name"]) if r.get("menus") else "What a meal at " + e(r["name"]) + " comes to"}</h2>'
                    f'<p>Per person in {cur}, {e(SERVICE_SAYS.get(kind, "before service"))}'
                    + (f", and with the {pct:g}% usually added for {e(SERVICE_ADDS[kind])}. That figure is an estimate; the restaurant’s bill is what counts." if pct else ".") + "</p></div></div>\n"
                    + (f'    <div class="table-scroll"><table class="rp-table rp-bill"><thead><tr><th></th>{heads}</tr></thead><tbody>{"".join(pay_rows)}</tbody></table></div>\n' if pay_rows else "<p>No prices are published yet.</p>\n")
                    + (f'    <p class="rp-note">{e(service_text)}</p>\n' if service_text else "")
                    + ('    <p class="rp-note">Sources: ' + " · ".join(
                        f'<a href="{e(u)}">{"the restaurant’s website" if t == "site" else urllib.parse.urlsplit(u).netloc.replace("www.", "")}</a> ({label.lower()}' + (" and wine" if label == "Dinner" and w else "") + ")"
                        for label, u, t in sources) + f'. Prices checked {e(nice_date(r["menusChecked"]) if r.get("menusChecked") else guide_stats_checked())}; menus change, so check with {e(r["name"])} before you book. {report_link(r)}</p>\n' if sources else "")
                    + "  </div>\n</section>\n")

        # How it compares with the same stars nearby.
        compare_html = ""
        if peers_place and r in peers and len(peers) > 1:
            i = peers.index(r)
            lo = max(0, min(i - PEERS_SHOWN // 2, len(peers) - PEERS_SHOWN))
            shown = peers[lo:lo + PEERS_SHOWN]
            mid = peers[len(peers) // 2]["dinner"]
            rank = "the cheapest" if i == 0 else "the most expensive" if i == len(peers) - 1 else f"the {ordinal(i + 1)} cheapest"
            row = lambda q: (f'<tr{" class=on" if q is r else ""}><td>' + (f'<strong>{e(q["name"])}</strong>' if q is r else f'<a href="{e(restaurant_href(q))}">{e(q["name"])}</a>')
                             + f'<small>{e(q.get("area") or q["cityName"])}</small></td><td>{e(q.get("cuisine", ""))}</td><td class="num">{money(q["dinner"], cur)}</td>'
                             f'<td class="num">{money(q["lunch"], cur) if q.get("lunch") is not None and q.get("lunchType", "menu") == "menu" else "–"}</td>'
                             f'<td class="num">{money(q["wine"], cur) if q.get("wine") else "–"}</td></tr>')
            compare_html = ('<section id="compare">\n  <div class="wrap">\n    <div class="section-head"><div><span class="eyebrow">How it compares</span>'
                            f'<h2 style="margin-top: 6px">{e(r["name"])} against {e(peers_place["name"])}’s other {STAR_WORDS[r["stars"]]}-star restaurants</h2>'
                            f'<p>Its {money(r["dinner"], cur)} dinner menu is {rank} of the {len(peers)} {STAR_WORDS[r["stars"]]}-star dinner menus in {e(in_sentence(peers_place))} with a published price. '
                            f'The middle price is {money(mid, cur)}' + (f", so it costs {money(abs(r['dinner'] - mid), cur)} {'more' if r['dinner'] > mid else 'less'} than a typical one." if r["dinner"] != mid else ", which it matches.") + "</p></div></div>\n"
                            '    <div class="table-scroll"><table class="rp-table rp-peers"><thead><tr><th>Restaurant</th><th>Cuisine</th><th class="num">Dinner</th><th class="num">Lunch</th><th class="num">Wine pairing</th></tr></thead><tbody>'
                            + "".join(row(q) for q in shown) + "</tbody></table></div>\n"
                            f'    <p class="rp-more"><a href="{peers_place["path"]}">All {starred_n[peers_place["id"]]} starred restaurants in {e(in_sentence(peers_place))}, with prices</a></p>\n'
                            "  </div>\n</section>\n")

        # The map and the starred restaurants nearby.
        near_items = "".join(
            f'<li><a href="{e(restaurant_href(q))}">{e(q["name"])}</a> <span class="stars" aria-label="{q["stars"]} MICHELIN star{"s" if q["stars"] > 1 else ""}">'
            + '<svg><use href="#star"/></svg>' * q["stars"] + f'</span><span>{e(" · ".join(x for x in (q.get("cuisine"), dist_text(km, r["country"]) + " away", (("dinner " + money(q["dinner"], q["cur"])) if q.get("dinner") is not None else "")) if x))}</span></li>'
            for km, q in near)
        home = places[r["_chain"][1]] if r["cityType"] == "district" else city
        near_html = ('<section id="nearby">\n  <div class="wrap">\n    <div class="section-head"><div><span class="eyebrow">Map</span>'
                     f'<h2 style="margin-top: 6px">Starred restaurants near {e(r["name"])}</h2>'
                     + (f'<p>The {len(near)} nearest, all within {dist_text(near[-1][0], r["country"]).split(" (")[0]}.</p>' if near else "") + "</div></div>\n"
                     '    <div class="rp-near"><div class="rp-map" id="rpMap" hidden></div>'
                     + (f'<ul class="rp-near-list">{near_items}</ul>' if near else "") + "</div>\n"
                     f'    <p class="rp-more"><a href="{home["path"]}">All {starred_n[home["id"]]} starred restaurants in {e(in_sentence(home))}, with prices</a> · '
                     '<a href="/near-me/">Starred restaurants near you</a></p>\n  </div>\n</section>\n')

        faq_block = ('<section id="faq">\n  <div class="wrap">\n    <div class="section-head"><div><span class="eyebrow">Questions</span>'
                     f'<h2 style="margin-top: 6px">{e(r["name"])}: questions and answers</h2></div></div>\n'
                     '    <div class="faq">' + "".join(f"<div><h3>{e(q)}</h3><p>{e(a)}</p></div>" for q, a in faq) + "</div>\n  </div>\n</section>\n")
        guides_block = related_guides_html(city, [r], restaurant_guides(r)) if guides else ""

        path = r["page"]
        trail = [("All destinations", "/")] + [(c["name"], c["path"]) for c in crumbs] + [(r["name"], path)]
        item = {"@type": "Restaurant", "@id": SITE_URL + path + "#restaurant", "name": r["name"], "servesCuisine": r.get("cuisine"),
                "address": r.get("address"), "url": r.get("website"),
                "sameAs": [u for u in (r.get("website"), mg.get(r["id"])) if u] or None,
                "award": f"{r['stars']} MICHELIN Star{'s' if r['stars'] > 1 else ''}",
                "starRating": {"@type": "Rating", "ratingValue": r["stars"], "bestRating": 3, "author": {"@type": "Organization", "name": "MICHELIN Guide"}},
                "priceRange": f"{money(d, cur)} tasting menu" if d is not None and r.get("dinnerType", "menu") == "menu" else None,
                "geo": {"@type": "GeoCoordinates", "latitude": r["lat"], "longitude": r["lng"]} if r.get("lat") is not None else None,
                "acceptsReservations": r.get("bookingUrl"),
                "image": restaurant_og(r),
                "hasMenu": [{"@type": "Menu", "name": m["name"], "offers": {"@type": "Offer", "price": m["price"], "priceCurrency": cur}} for m in r.get("menus", [])]
                or [{"@type": "Menu", "name": n, "offers": {"@type": "Offer", "price": p, "priceCurrency": cur}}
                            for n, p in (("Dinner tasting menu" if r.get("dinnerType", "menu") == "menu" else None, d), ("Wine pairing", w),
                                         ("Lunch menu" if r.get("lunchType", "menu") == "menu" and not r.get("noLunch") else None, lunch)) if n and p is not None] or None}
        graph = [{"@type": "BreadcrumbList", "itemListElement": [
                     {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE_URL + u} for i, (n, u) in enumerate(trail)]},
                 {"@type": "WebPage", "@id": SITE_URL + path, "url": SITE_URL + path, "name": title, "description": description, "inLanguage": "en",
                  "about": {"@id": item["@id"]}, "isPartOf": {"@id": WEBSITE["@id"]}, "dateModified": site_dates.get(source_files[r["id"]])},
                 {k: v for k, v in item.items() if v is not None},
                 {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}]
        graph[1] = {k: v for k, v in graph[1].items() if v}
        data = {"currencies": CURRENCIES, "languages": DEFAULT_LANGUAGES, "knownIds": None, "cur": cur, "switchable": currency_data.get("switchable", []),
                "restaurant": {"id": r["id"], "name": r["name"], "stars": r["stars"], "lat": r.get("lat"), "lng": r.get("lng"), "placeId": r.get("placeId")},
                "nearby": [{"name": q["name"], "stars": q["stars"], "lat": q["lat"], "lng": q["lng"], "href": restaurant_href(q),
                            "dinner": money(q["dinner"], q["cur"]) if q.get("dinner") is not None else ""} for km, q in near]}
        del data["knownIds"]
        page_html = render("restaurant.html", {
            "title": e(title), "description": e(description), "canonical": SITE_URL + path, "ogImage": restaurant_og(r) or og_image(city),
            "ogAlt": e(f"What a meal at {r['name']} costs"),
            "jsonld": '<script type="application/ld+json">' + as_json({"@context": "https://schema.org", "@graph": graph}) + "</script>",
            "crumbs": '<a href="/">All destinations</a>' + "".join(f'<a href="{c["path"]}">{e(c["name"])}</a>' for c in crumbs) + f'<span aria-current="page">{e(r["name"])}</span>',
            "hero": hero, "main": pay_html + history_html(r) + cheaper_html(r, peers_place, peers, live) + visit + facts_html + compare_html
            + similar_html(r, live, peers) + near_html + faq_block + guides_block, "data": as_json(data),
        })
        # Dollar prices on a US restaurant's page read "$350", as the guides write them.
        write(path, page_html.replace("US$", "$") if cur == "USD" else page_html)


def restaurant_guides(r):
    """The guides that fit a restaurant's page, best first: those that link to or name it, the world three-star list for a
    three-star restaurant, then those about the places it's in; topped up with the pillar. Up to four."""
    above = r["_chain"]
    name = re.compile(r"(?<![\w-])" + re.escape(r["name"]) + r"(?![\w-])")
    scores = {}
    for g in guides.values():
        body = guide_bodies()[g["id"]]
        hits = [above.index(i) for i in g.get("places", []) if i in above]
        if f"#r={r['id']}\"" in body or f'href="{r.get("page")}"' in body or name.search(re.sub(r"<[^>]+>", " ", body)):
            scores[g["id"]] = (3, 0)
        elif g["id"] == "three-michelin-star-restaurants" and r["stars"] == 3:
            scores[g["id"]] = (2, 0)
        elif hits:
            scores[g["id"]] = (1, -min(hits))
    picked = sorted(scores, key=lambda i: (tuple(-x for x in scores[i]), i))[:4]
    for i in (GUIDE_PILLAR, "michelin-stars-by-country"):
        if len(picked) < 3 and i in guides and i not in picked:
            picked.append(i)
    return [guides[i] for i in picked]


def guide_stats_checked():
    month = site.get("updated", "")
    return (MONTH_NAMES[int(month[5:7]) - 1] + " " + month[:4]) if re.fullmatch(r"\d{4}-\d{2}", month) else ""


def last_changed():
    """The day each file in content/ (and the privacy page) last changed, from the git history, for the sitemap's
    <lastmod>. Empty when there's no history to read (no git, or a shallow copy where every file looks new)."""
    try:
        run = lambda *a: subprocess.run(["git", "-c", "core.quotepath=off", *a], cwd=ROOT, capture_output=True, text=True, check=True).stdout
        if run("rev-parse", "--is-shallow-repository").strip() == "true":
            print("Note: the sitemap has no last-changed dates, as this copy of the repository has no history.")
            return {}
        log = run("log", "--format=@%ct", "--name-only", "--", "content", "src/privacy.html")
    except (OSError, subprocess.CalledProcessError):
        return {}
    days, day = {}, None
    for line in log.splitlines():
        if line.startswith("@"):
            day = datetime.fromtimestamp(int(line[1:]), timezone.utc).date().isoformat()
        elif line and line not in days:  # newest first, so the first sighting is the latest change
            days[line] = day
    return days


def sitemap_dates():
    """Each sitemap address's last-changed day: a destination page (in every language) changes when its place file or any of
    its restaurants does; a guide on its `updated` date; the homepage, Near me and Help me pick with the latest restaurant."""
    days = last_changed()
    if not days:
        return {}
    latest = lambda files: max((days[f] for f in files if f in days), default=None)
    out = {}
    for p in pages:
        day = latest([source_files.get("place:" + p["id"])] + [source_files[r["id"]] for r in members(p)])
        for lang in place_langs(p):
            out[lang_path(p["path"], lang)] = day
    out["/"] = out["/near-me/"] = out["/pick/"] = latest(source_files.values())
    for gid, g in guides.items():
        out[f"/guides/{gid}/"] = g["updated"]
    out["/guides/"] = max((g["updated"] for g in guides.values()), default=None)
    out["/privacy/"] = days.get("src/privacy.html")
    for r in restaurants:
        if r.get("page"):
            out[r["page"]] = days.get(source_files[r["id"]])
    return out


def build_extras():
    shutil.copy2(SRC / "favicon.svg", OUT / "favicon.svg")
    # The stylesheet carries its version, like every other page's, since /assets/ is cached for a year (_headers).
    (OUT / "404.html").write_text((SRC / "404.html").read_text("utf-8").replace('"/assets/site.css"', f'"/assets/site.css?v={assets["site.css"]}"'), "utf-8")
    shutil.copy2(SRC / "manifest.webmanifest", OUT / "manifest.webmanifest")
    shutil.copytree(SRC / "icons", OUT / "icons")
    if (SRC / "og").exists():
        shutil.copytree(SRC / "og", OUT / "og")
    if (SRC / "img").exists():
        # Featured pictures; the full-size originals (<id>-src.*) stay out of the site.
        shutil.copytree(SRC / "img", OUT / "img", ignore=shutil.ignore_patterns("*-src.*"))
    if (ROOT / "CNAME").exists():
        shutil.copy2(ROOT / "CNAME", OUT / "CNAME")
    urls = ["/", "/near-me/", "/pick/"] + [lang_path(p["path"], lang) for p in by_size(pages) for lang in place_langs(p)] + (["/guides/"] + [f"/guides/{g}/" for g in guides] if guides else []) + [r["page"] for r in restaurants if r.get("page")] + ["/privacy/"]
    dates = sitemap_dates()
    (OUT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{SITE_URL}{u}</loc>" + (f"<lastmod>{dates[u]}</lastmod>" if dates.get(u) else "") + "</url>\n" for u in urls)
        + "</urlset>\n", "utf-8")
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n", "utf-8")


# Security headers on every page (Cloudflare Pages reads _headers). CSP_REPORT is the full policy, only reported in the
# browser's console for now; once a few weeks pass with nothing it would block, move it into Content-Security-Policy.
CSP = "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests"
CSP_REPORT = "; ".join([
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cloud.umami.is https://www.googletagmanager.com https://maps.googleapis.com https://maps.gstatic.com https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cloud.umami.is https://api-gateway.umami.dev https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.googleapis.com https://maps.gstatic.com https://open.er-api.com https://cdn.jsdelivr.net",
    "frame-src 'self' https://*.google.com",
    "worker-src 'self' blob:",
    "form-action 'self'",
    "frame-ancestors 'self'", "base-uri 'self'", "object-src 'none'",
])


def build_cloudflare():
    """Files Cloudflare Pages reads: _redirects (real 301s from each place's old addresses, in every language it offers)
    and _headers (security headers; long caching for files whose address carries a ?v= version)."""
    lines = []
    for (old, pid) in sorted(redirects.items()):
        for lang in place_langs(places[pid]):
            src, dest = lang_path(old, lang), lang_path(places[pid]["path"], lang)
            lines += [f"{src} {dest} 301", f"{src.rstrip('/')} {dest} 301"]
    (OUT / "_redirects").write_text("".join(l + "\n" for l in lines), "utf-8")
    (OUT / "_headers").write_text(f"""/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), payment=(), usb=(), geolocation=(self)
  Content-Security-Policy: {CSP}
  Content-Security-Policy-Report-Only: {CSP_REPORT}

# Scripts, styles and these data files are always linked with ?v=<their contents>, so a changed file gets a new address.
# Other /data/ files are sometimes fetched without a version (bill.json, hours.json), so they keep Cloudflare's default
# (checked each time, cheap when unchanged). Rules must not overlap: Cloudflare joins a header two rules both set.
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/data/places/*
  Cache-Control: public, max-age=31536000, immutable
/data/compare/*
  Cache-Control: public, max-age=31536000, immutable
/data/near.json
  Cache-Control: public, max-age=31536000, immutable
/icons/*
  Cache-Control: public, max-age=604800
/og/*
  Cache-Control: public, max-age=604800
/img/*
  Cache-Control: public, max-age=604800
/sw.js
  Cache-Control: no-cache

# The Cloudflare copies (starred-bill.pages.dev and each change's preview link) stay out of search results.
https://:project.pages.dev/*
  X-Robots-Tag: noindex
https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex
""", "utf-8")


def build_service_worker():
    """The offline helper. Its version changes whenever any file in the site does, so phones pick up updates."""
    digest = hashlib.sha1()
    for f in sorted(OUT.rglob("*")):
        if f.is_file():
            digest.update(str(f.relative_to(OUT)).encode() + f.read_bytes())
    # Language files are left out: each is saved the first time a page that offers it is opened.
    precache = ["/", "/manifest.webmanifest", "/favicon.svg", "/icons/icon-192.png"] + [f"/assets/{name}?v={v}" for name, v in sorted(assets.items()) if not name.startswith("lang-") and name != "rtl.css"]
    sw = (SRC / "sw.js").read_text("utf-8").replace("{{version}}", digest.hexdigest()[:12]).replace("{{precache}}", json.dumps(precache))
    (OUT / "sw.js").write_text(sw, "utf-8")


if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
copy_assets()
for p in pages:
    build_place(p)
build_home()
build_pick(build_near_me([r for r in restaurants if not r.get("status")]))
build_bill_data([r for r in restaurants if not r.get("status")])
build_compare([r for r in restaurants if not r.get("status")])
build_account_pages()
build_guides()
build_restaurant_pages()
build_redirects()
build_extras()
build_cloudflare()
build_service_worker()
print(f"Built {len(pages) + 1} pages from {len(restaurants)} restaurants into {OUT.relative_to(ROOT)}/:")
print("  /  (homepage)")
for g in guides:
    print(f"  /guides/{g}/  {guides[g]['h1']}")
for r in restaurants:
    if r.get("page"):
        print(f"  {r['page']}  {r['name']}")
for p in sorted(pages, key=lambda p: p["path"]):
    print(f"  {p['path']}  {p['name']}, {starred_n[p['id']]} starred")
for old, pid in sorted(redirects.items()):
    print(f"  {old}  now sends visitors to {places[pid]['path']}")
