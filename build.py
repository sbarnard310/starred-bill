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
PRICE_TYPES = ("menu", "main", "spend")
STATUSES = ("lost", "closed", "changed")
CHANGES = ("new", "up", "down")
# Dietary options, from the MICHELIN Guide (scripts/michelin_details.py). "vegetarian-only" marks a vegetarian or vegan restaurant.
DIETS = ("vegetarian-only", "vegetarian-menu", "vegetarian", "vegan", "gluten-free", "halal", "kosher")
CHEF_SOURCES = ("michelin", "site", "press", "manual")
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
# In languages that decline names, every place offering the language says how it reads mid-sentence (Polish "w Warszawie").
for pid, p in places.items():
    for lang in inherited(p, "languages") or []:
        sfx = lang[0].upper() + lang[1:]
        if sfx in DECLINED and not p.get("inSentence" + sfx):
            problem(f"places ({pid})", f"is offered in {lang}, so it needs inSentence{sfx}: its name as it reads after \"in\" in that language")

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
    if r.get("diets") is not None and (not isinstance(r["diets"], list) or set(r["diets"]) - set(DIETS)):
        problem(where, f"diets must be a list made from {', '.join(DIETS)}")
    if r.get("chef") is not None and not isinstance(r["chef"], str):
        problem(where, "chef must be a name in quotes, e.g. \"Clare Smyth\"")
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
    for field in ("published", "updated"):
        if g.get(field) and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", g[field]):
            problem(where, f"{field} must be a date like 2026-10-05")
    g["faq"] = [tidy(f) for f in g.get("faq", []) if tidy(f).get("q") and tidy(f).get("a")]
    if not isinstance(g.get("keywords", []), list) or not all(isinstance(k, str) and k.strip() for k in g.get("keywords", [])):
        problem(where, "keywords must be a list of search phrases, the main one first")
    g["keywords"] = [k.strip() for k in g.get("keywords", []) if isinstance(k, str) and k.strip()]
    g["id"] = gid
    guides[gid] = g

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


def public(r):
    return {k: v for k, v in r.items() if not k.startswith("_") and k not in ("chefSource", "michelinId")}


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
    # Link-preview picture: the page's own (src/og/<place id>.png, from scripts/og_images.py) or the homepage's.
    values = dict({"ogImage": SITE_URL + "/og/default.png", "ogAlt": "The Starred Bill: what a Michelin star costs, city by city",
                   "jsonld": '<script type="application/ld+json">' + as_json({"@context": "https://schema.org", "@type": "WebSite", "name": "The Starred Bill", "url": SITE_URL + "/"}) + "</script>"},
                  **values, icons=ICONS)
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


def write(path, text):
    if path.endswith("/") or path.endswith(".html"):
        text = link_targets(text)
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
        "inSentenceEs": inherited_name_es(p), "inSentenceIt": inherited_name_it(p),
        # Danish "i København", Icelandic "í Reykjavík" (a place can set its own, e.g. "á Íslandi"), Catalan "a Andorra", German "in München".
        **{"inSentence" + sfx: p.get("inSentence" + sfx) or f"{prep}{'' if sfx == 'Th' else ' '}{p.get('name' + sfx) or p['name']}" for sfx, prep in IN_PREPOSITIONS},
        **{"inSentence" + sfx: p["inSentence" + sfx] for sfx in DECLINED if p.get("inSentence" + sfx)},
        "path": p["path"], "currency": currency, "showCity": len({r["city"] for r in starred}) > 1,
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
    data = {"page": page, "languages": inherited(p, "languages") or DEFAULT_LANGUAGES, "restaurants": [public(r) for r in rs], "currencies": CURRENCIES,
            "switchable": currency_data.get("switchable", []), "rateDate": currency_data.get("rateDate")}
    titles = page["titles"] = page_titles(p, page, data["languages"], starred)

    stars = [sum(1 for r in starred if r["stars"] == s) for s in (1, 2, 3)]
    menus = sorted((r for r in starred if r.get("dinnerType") == "menu" and r.get("dinner") is not None), key=lambda r: r["dinner"])
    where = in_sentence(p)
    description = place_description(where, starred, stars, menus)
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
    lang_scripts = "".join(f'<script src="/assets/lang-{c}.js?v={assets[f"lang-{c}.js"]}"></script>\n' for c in data["languages"] if c in LANG_FILES)
    if set(data["languages"]) & set(RTL_LANGUAGES):
        lang_scripts += f'<link rel="stylesheet" href="/assets/rtl.css?v={assets["rtl.css"]}">\n'
    write(p["path"], render("place.html", {
        "langScripts": lang_scripts,
        "title": e(titles["en"]), "description": e(description), "canonical": SITE_URL + p["path"],
        "eyebrow": e(f"{p['name']} · Michelin Guide restaurants"),
        "h1": f"What a Michelin star <em>costs</em> in {e(where)}.",
        "heroText": e((f"Dinner, lunch and wine pairing prices per person at the starred restaurants in {where}, side by side." + (" " + intro if intro else ""))
                      if starred else f"There are currently no restaurants with a Michelin star in {where}, but we'll update this page as soon as one appears."),
        "crumbs": crumb_html, "explore": explore_html, "ledger": ledger, "data": as_json(data),
        "ogImage": og_image(p), "ogAlt": e(f"What a Michelin star costs in {where}"),
        "jsonld": json_ld(p, crumbs, starred, description),
    }))


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
        titles[lang] = next((o for o in options if title_width(o) <= TITLE_MAX), options[-1])
    return titles


def json_ld(p, crumbs, starred, description):
    """Structured data for search engines: the breadcrumb trail, and the starred restaurants as a list.
    Google ratings are deliberately left out (Google doesn't allow ratings copied from elsewhere)."""
    trail = [{"name": "All destinations", "path": "/"}] + [{"name": c["name"], "path": c["path"]} for c in crumbs] + [{"name": p["name"], "path": p["path"]}]
    graph = [{"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": c["name"], "item": SITE_URL + c["path"]} for i, c in enumerate(trail)]}]
    if starred:
        items = []
        for i, r in enumerate(sorted(starred, key=lambda r: (-r["stars"], r["name"]))):
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
        graph.append({"@type": "ItemList", "name": f"Michelin-starred restaurants in {in_sentence(p)}", "description": description,
                      "numberOfItems": len(items), "itemListElement": items})
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


def build_home():
    starred = [r for r in restaurants if not r.get("status")]
    world_url, world_total = build_world(starred)
    soon, guide = world_countries()
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
            "guide": guide.get(c["id"]), "continent": CONTINENT_OF.get(c["id"], ""),
        })
    no_continent = sorted(c["name"] for c in countries + soon if not c["continent"])
    if no_continent:
        print("  Countries with no continent (add them to CONTINENTS in build.py):", ", ".join(no_continent))
    groups = [link(g) for g in by_size(g for g in pages if g["type"] == "group")]
    keep = ("id", "name", "nameZh", "nameJa", "stars", "cuisine", "cuisineZh", "lat", "lng", "dinner", "dinnerType", "cur", "rating",
            "country", "cityName", "cityNameZh", "cityPath", "chef")
    data = {
        # Restaurants listed under a region or country rather than a city also carry their town, e.g. Aughton.
        "restaurants": [dict({k: r[k] for k in keep if r.get(k) is not None}, **({"town": r["area"].split(", ")[0]} if r["cityType"] != "city" and r.get("area") else {}))
                        for r in starred],
        "knownIds": [r["id"] for r in starred],
        # Restaurants that lost their stars but are still open, for the map's grey pins (home.js picks the recent ones).
        "former": [dict({k: r[k] for k in keep + ("status", "formerStars", "changeDate") if r.get(k) is not None},
                        **{k: v for k, v in r.items() if k.startswith("statusNote")},
                        **({"town": r["area"].split(", ")[0]} if r["cityType"] != "city" and r.get("area") else {}))
                   for r in restaurants if r.get("status") in ("lost", "changed") and r.get("lat") is not None],
        "countries": countries, "groups": groups, "soon": soon, "noStars": no_star_countries(),
        "places": [dict(link(p), type=p["type"]) for p in by_size(pages)],
        "currencies": CURRENCIES, "switchable": currency_data.get("switchable", []), "updated": site.get("updated", ""),
        "worldUrl": world_url, "worldTotal": world_total, "languages": DEFAULT_LANGUAGES,
    }
    countries.sort(key=lambda c: c["name"])  # A to Z (the page re-sorts in the visitor's language)
    cards = "".join(
        f'<article class="dest"><div class="dest-top"><h3><a href="{c["path"]}">{e(c["name"])}</a></h3></div>'
        f'<p class="dest-meta">{c["n"]} starred restaurants</p>'
        + "".join(f'<a class="city-link" href="{q["path"]}">{e(q["name"])}</a> ' for q in c["cities"]) + "</article>"
        for c in countries)
    write("/", render("home.html", {
        "title": "The Starred Bill · Michelin-starred restaurant prices",
        "description": e(f"Compare dinner, lunch and wine pairing prices at {len(starred):,} Michelin-starred restaurants in {len(countries)} countries, from London and Paris to Tokyo."),
        "canonical": SITE_URL + "/",
        "eyebrow": "Michelin star restaurants, priced",
        "h1": "What a Michelin star <em>costs</em>, city by city.",
        "heroText": "Dinner, lunch and wine pairing prices per person at Michelin-starred restaurants, side by side and linked to where each price came from.",
        "destinations": cards, "data": as_json(data),
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
    One row per restaurant with any of them, keyed by id; noLunch is 1 when there's no lunch service. Loaded only when the wishlist has something in it."""
    cols = ["lunch", "lunchType", "noLunch", "wine", "lunchWine"]
    rows = {}
    for r in starred:
        row = [r.get("lunch"), r.get("lunchType", "menu"), 1 if r.get("noLunch") else 0, r.get("wine"), r.get("lunchWine")]
        if row[0] is not None or row[2] or row[3] is not None or row[4] is not None:
            rows[r["id"]] = row
    (OUT / "data" / "bill.json").write_bytes(as_json({"cols": cols, "r": rows}).encode("utf-8"))


def build_near_me(starred):
    """/near-me/: finds the visitor (or a place they type) and lists the starred restaurants around them on a map.
    The restaurants come from /data/near.json, one compact row each (columns listed in the file)."""
    cols = ["id", "name", "stars", "lat", "lng", "cuisine", "where", "path", "dinner", "dinnerType", "lunch", "cur", "diets", "chef", "rating",
            "reviews", "wine", "lunchWine", "change"]
    rows = []
    for r in starred:
        if r.get("lat") is None:
            continue
        lunch = -1 if r.get("noLunch") else (r["lunch"] if r.get("lunch") is not None and r.get("lunchType", "menu") == "menu" else None)
        rows.append([r["id"], r["name"], r["stars"], round(r["lat"], 6), round(r["lng"], 6), r.get("cuisine", ""), near_where(r), r["cityPath"],
                     r.get("dinner"), r.get("dinnerType", "menu"), lunch, r["cur"], "".join(str(NEAR_DIETS[d]) for d in r.get("diets", [])),
                     r.get("chef", ""), r.get("rating"), r.get("reviews"),
                     r.get("wine") if r.get("dinnerType", "menu") == "menu" else None, r.get("lunchWine") if lunch and lunch > 0 else None, r.get("change", "")])
    # Starred restaurants in the MICHELIN Guide we don't have a file for yet (none since 5 Oct 2026, but the list can run ahead).
    world = json.loads((OUT / "data" / "world.json").read_text("utf-8"))["r"] if (OUT / "data" / "world.json").exists() else []
    for name, stars, lat, lng, cuisine, where, mpath in world:
        rows.append(["", name, stars, lat, lng, cuisine, where, "https://guide.michelin.com/en" + mpath, None, "menu", None, "", "", "", None, None, None, None, ""])
    body = as_json({"cols": cols, "diets": list(DIETS), "r": rows}).encode("utf-8")
    (OUT / "data" / "near.json").write_bytes(body)
    near_url = f"/data/near.json?v={hashlib.sha1(body).hexdigest()[:10]}"
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
        ("Do you store my location?",
         "No. Your browser works out the distances on your device, and your location is never sent to The Starred Bill. If you tick "
         "“Remember this location”, it's saved in your browser only, and you can forget it with one tap."),
        ("Which Michelin restaurants near me have vegetarian or vegan menus?",
         "Use the Dietary filter to show only restaurants with a vegetarian tasting menu, vegan options, gluten-free, halal or kosher options, "
         "as listed by the MICHELIN Guide."),
    ]
    faq_html = '<section class="guide-faq" id="faq"><h2>Frequently asked questions</h2>' + "".join(f"<h3>{e(q)}</h3><p>{e(a)}</p>" for q, a in faq) + "</section>"
    static = (f'<h2>Popular cities for Michelin star restaurants</h2>\n<p>Not where you are? Browse the cities with the most starred restaurants, '
              f'each with its dinner, lunch and wine pairing prices side by side.</p>\n<div class="dest-cities near-popular">{popular}</div>\n'
              f'<p><a href="/#destinations">All {len([p for p in pages if p["type"] == "country"])} countries →</a></p>\n{faq_html}')
    lede = (f"Find the Michelin-starred restaurants closest to you, with what dinner and lunch cost at each. Use your location or type a town, "
            f"and see every starred restaurant nearby on a map, nearest first, from {stats['total']} in {stats['countries']} countries.")
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
                         "nearUrl": near_url}),
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
        "exceptional cuisine worth a special journey.</li>"
        "<li><strong>Budget.</strong> Prices here are per person before service. Add a wine pairing and the bill can rise by half again.</li>"
        "<li><strong>Food and diet.</strong> The MICHELIN Guide lists which restaurants offer vegetarian menus, vegan options and more.</li></ul>\n"
        '<p>Want to read more first? Start with <a href="/guides/what-is-a-michelin-star/">What is a Michelin star?</a>, or see every '
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
        "jsonld": '<script type="application/ld+json">' + as_json({"@context": "https://schema.org", "@graph": graph}) + "</script>",
        "crumbs": '<a href="/">All destinations</a><span aria-current="page">Help me pick</span>',
        "lede": e(lede), "static": static,
        "data": as_json({"currencies": CURRENCIES, "switchable": currency_data.get("switchable", ["GBP", "EUR", "USD"]),
                         "languages": DEFAULT_LANGUAGES, "spots": spots, "popular": popular, "nearUrl": near_url}),
    }))


def build_compare(starred):
    """/compare/: up to three restaurants from the visitor's wishlist as till receipts side by side, in one currency.
    The prices come from /data/compare.json, one compact row per starred restaurant (columns listed in the file).
    The page is personal (it reads the wishlist in the browser), so it stays out of search engines and the sitemap."""
    cols = ["id", "name", "stars", "cuisine", "where", "path", "country", "cur", "dinner", "dinnerType", "dinnerNote", "lunch", "lunchType",
            "lunchNote", "noLunch", "wine", "lunchWine", "source", "sourceType", "lunchSource", "lunchSourceType", "notice"]
    rows = [[r["id"], r["name"], r["stars"], r.get("cuisine", ""), near_where(r), r["cityPath"], r["country"], r["cur"],
             r.get("dinner"), r.get("dinnerType", "menu"), r.get("dinnerNote", ""), r.get("lunch"), r.get("lunchType", "menu"),
             r.get("lunchNote", ""), 1 if r.get("noLunch") else 0, r.get("wine"), r.get("lunchWine"),
             r.get("source", ""), r.get("sourceType", ""), r.get("lunchSource", ""), r.get("lunchSourceType", ""), 1 if r.get("notice") else 0]
            for r in starred]
    body = as_json({"cols": cols, "r": rows}).encode("utf-8")
    (OUT / "data" / "compare.json").write_bytes(body)
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
                         "compareUrl": f"/data/compare.json?v={hashlib.sha1(body).hexdigest()[:10]}"}),
    }))


def build_compare(starred):
    """/compare/: up to three restaurants from the visitor's wishlist as till receipts side by side, in one currency.
    The prices come from /data/compare.json, one compact row per starred restaurant (columns listed in the file).
    The page is personal (it reads the wishlist in the browser), so it stays out of search engines and the sitemap."""
    cols = ["id", "name", "stars", "cuisine", "where", "path", "country", "cur", "dinner", "dinnerType", "dinnerNote", "lunch", "lunchType",
            "lunchNote", "noLunch", "wine", "lunchWine", "source", "sourceType", "lunchSource", "lunchSourceType", "notice"]
    rows = [[r["id"], r["name"], r["stars"], r.get("cuisine", ""), near_where(r), r["cityPath"], r["country"], r["cur"],
             r.get("dinner"), r.get("dinnerType", "menu"), r.get("dinnerNote", ""), r.get("lunch"), r.get("lunchType", "menu"),
             r.get("lunchNote", ""), 1 if r.get("noLunch") else 0, r.get("wine"), r.get("lunchWine"),
             r.get("source", ""), r.get("sourceType", ""), r.get("lunchSource", ""), r.get("lunchSourceType", ""), 1 if r.get("notice") else 0]
            for r in starred]
    body = as_json({"cols": cols, "r": rows}).encode("utf-8")
    (OUT / "data" / "compare.json").write_bytes(body)
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
                         "compareUrl": f"/data/compare.json?v={hashlib.sha1(body).hexdigest()[:10]}"}),
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
    keep = ("id", "name", "nameZh", "nameJa", "stars", "formerStars", "status", "area", "areaZh", "areaJa", "areaEs", "areaIt", "areaKo", "nameKo", "areaDa", "areaSv", "areaIs", "areaCa", "areaTh", "nameTh",
            "cityName", "cityNameZh", "cityNameJa", "cityNameEs", "cityNameIt", "cityNameKo", "cityPath", "country", "cur", "dinner", "dinnerType")
    data = {
        "restaurants": [dict({k: r[k] for k in keep if r.get(k) not in (None, "")}, chain=r["_chain"]) for r in restaurants],
        "places": [dict(link(p), id=p["id"], type=p["type"]) for p in by_size(q for q in pages if q["type"] != "group" and starred_n[q["id"]])],
        "knownIds": [r["id"] for r in restaurants],
        "currencies": CURRENCIES, "languages": DEFAULT_LANGUAGES,
    }
    write("/account/", render("account.html", {
        "title": "Your account · The Starred Bill", "description": "Your wishlist and the Michelin-starred restaurants you've been to, on any device.",
        "canonical": SITE_URL + "/account/", "data": as_json(data),
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


def list_stats(live, year):
    """Figures for the data guides: the US by state, the UK and London, and the cheapest three-star menus."""
    usd = lambda r: r["dinner"] / CURRENCIES[r["cur"]]["perUSD"]
    out = {}
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


def guide_blocks(stats):
    """Tables the data guides drop in with {{table:name}}, built from the restaurant data at every build."""
    live = [r for r in restaurants if r.get("stars") in (1, 2, 3) and not r.get("status")]
    links = michelin_links()
    year, checked = stats["guideYear"], stats["checked"]
    stars_cell = lambda n: f'<span class="g-stars" aria-label="{n} star{"s" if n > 1 else ""}">{"★" * n}</span>'
    note = lambda text: f'<p class="table-note">{text} Last checked {e(checked)}.</p>'

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
            name = e(r["name"])
            if r["id"] in links:
                name = f'<a href="{e(links[r["id"]])}">{name}</a>'
            body += (f'<tr><td data-label="Restaurant">{name}</td>'
                     f'<td data-label="City"><a href="{e(r["cityPath"])}">{e(place_name(r))}</a></td>'
                     f'<td data-label="Chef">{e(r.get("chef") or "–")}</td>'
                     f'<td data-label="Cuisine">{e(r.get("cuisine") or "–")}</td>'
                     f'<td class="num" data-label="Tasting menu, per person">{price_cell(r)}</td></tr>')
        heads = "".join(f'<th scope="col">{h}</th>' for h in ("Restaurant", "City", "Chef", "Cuisine", "Tasting menu, per person"))
        return f'<div class="table-wrap"><table class="guide-table data three-list"><thead><tr>{heads}</tr></thead><tbody>{body}</tbody></table></div>'

    list_note = note(f"Stars from the {e(year)} MICHELIN Guide editions; each restaurant’s name links to its MICHELIN Guide page and its city to our prices there. "
                     "Prices are the main dinner tasting menu per person in local currency, before service and drinks, with US dollars at recent exchange rates.")

    def change_lists(keep):
        gained, lost = three_star_changes(year, keep)
        item = lambda r, text: (f'<li><strong>{e(r["name"])}</strong>, {e(place_name(r))}, {e(places[r["country"]]["name"])}'
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


def guide_text(text, stats, blocks=None):
    """Fill in {{figures}} and {{table:name}} blocks, and turn <a data-guide="name"> into a link once that guide exists (plain text until then)."""
    # A table on a line of its own may arrive wrapped in <p> from the editor; a table can't sit inside a paragraph.
    text = re.sub(r"(?:<p>\s*)?\{\{table:([\w-]+)\}\}(?:\s*</p>)?", lambda m: (blocks or {}).get(m.group(1), m.group(0)), text)
    text = re.sub(r"\{\{(\w+)\}\}", lambda m: e(stats[m.group(1)]) if m.group(1) in stats else m.group(0), text)
    return re.sub(r'<a data-guide="([\w-]+)">(.*?)</a>',
                  lambda m: f'<a href="/guides/{m.group(1)}/">{m.group(2)}</a>' if m.group(1) in guides else m.group(2), text)


# The order of the Guides page for guides published the same day: the pillar first, then as the content briefs number them.
GUIDE_ORDER = ("what-is-a-michelin-star", "how-restaurants-get-a-michelin-star", "michelin-stars-by-country", "green-michelin-star",
               "bib-gourmand-vs-michelin-star", "three-michelin-star-restaurants", "three-michelin-star-restaurants-london",
               "three-michelin-star-restaurants-uk")


def build_guides():
    """Each guide at /guides/<name>/, and a list of them at /guides/."""
    if not guides:
        return
    stats = guide_stats()
    blocks = guide_blocks(stats)
    data = as_json({"currencies": CURRENCIES, "languages": DEFAULT_LANGUAGES})
    home_crumb = '<a href="/">All destinations</a>'
    for g in guides.values():
        path = f"/guides/{g['id']}/"
        body = guide_text(g["body"], stats, blocks)
        for leftover in sorted(set(re.findall(r"\{\{[\w:-]+\}\}", body))):
            print(f"  Guide {g['id']}: {leftover} isn't a figure or table the build knows, so it shows as written")
        text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", " ".join([g["title"], g["h1"], body] + [f["q"] + " " + f["a"] for f in g["faq"]]))).lower()
        missing = [k for k in g["keywords"] if keyword_words(k) not in keyword_words(text)]
        if missing:
            print(f"  Guide {g['id']}: these keywords don't appear word for word: " + "; ".join(missing))
        faqs = [{"q": guide_text(f["q"], stats), "a": guide_text(f["a"], stats)} for f in g["faq"]]
        faq_html = ('<section class="guide-faq" id="faq"><h2>Frequently asked questions</h2>' + "".join(
            f'<h3>{f["q"]}</h3><p>{f["a"]}</p>' for f in faqs) + "</section>") if faqs else ""
        main = (f'<article lang="{e(g.get("lang", "en-US"))}">\n<h1>{e(g["h1"])}</h1>\n'
                f'<p class="prose-date">Updated {(uk_date if g.get("lang") == "en-GB" else us_date)(g["updated"])} · Star counts and prices checked {stats["checked"]}</p>\n'
                f'{body}\n{faq_html}\n</article>')
        strip = lambda t: re.sub(r"<[^>]+>", "", t)
        graph = [
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "All destinations", "item": SITE_URL + "/"},
                {"@type": "ListItem", "position": 2, "name": "Guides", "item": SITE_URL + "/guides/"},
                {"@type": "ListItem", "position": 3, "name": g["h1"], "item": SITE_URL + path}]},
            {"@type": "Article", "headline": g["h1"], "description": g["description"], "inLanguage": g.get("lang", "en-US"),
             "datePublished": g["published"], "dateModified": g["updated"], "mainEntityOfPage": SITE_URL + path,
             **({"keywords": ", ".join(g["keywords"])} if g["keywords"] else {}),
             "image": SITE_URL + "/og/default.png",
             "author": {"@type": "Organization", "name": "The Starred Bill", "url": SITE_URL + "/"},
             "publisher": {"@type": "Organization", "name": "The Starred Bill", "url": SITE_URL + "/",
                           "logo": {"@type": "ImageObject", "url": SITE_URL + "/icons/icon-512.png"}}},
        ]
        if faqs:
            graph.append({"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": strip(f["q"]), "acceptedAnswer": {"@type": "Answer", "text": strip(f["a"])}} for f in faqs]})
        write(path, render("guide.html", {
            "title": e(g["title"]), "description": e(g["description"]), "canonical": SITE_URL + path, "htmlLang": e(g.get("lang", "en-US")),
            "ogType": "article", "ogAlt": e(g["h1"]),
            "keywordsMeta": f'<meta name="keywords" content="{e(", ".join(g["keywords"]))}">\n' if g["keywords"] else "",
            "jsonld": '<script type="application/ld+json">' + as_json({"@context": "https://schema.org", "@graph": graph}) + "</script>",
            "crumbs": home_crumb + '<a href="/guides/">Guides</a>' + f'<span aria-current="page">{e(g["h1"])}</span>',
            "main": main, "data": data,
        }))
    cards = "".join(f'<li><a href="/guides/{g["id"]}/"><strong>{e(g["h1"])}</strong></a><span>{e(g["summary"])}</span></li>'
                    for g in sorted(guides.values(), key=lambda g: (g["published"], GUIDE_ORDER.index(g["id"]) if g["id"] in GUIDE_ORDER else len(GUIDE_ORDER), g["id"])))
    write("/guides/", render("guide.html", {
        "title": "Michelin Guides and Explainers · The Starred Bill",
        "description": "Plain-English explainers on Michelin stars: what they mean, how restaurants earn them and what a starred meal costs.",
        "canonical": SITE_URL + "/guides/", "htmlLang": "en", "ogType": "website", "ogAlt": "The Starred Bill guides", "keywordsMeta": "",
        "crumbs": home_crumb + '<span aria-current="page">Guides</span>',
        "main": f'<h1>Guides</h1>\n<p>Explainers on Michelin stars, written to go with the prices on The Starred Bill.</p>\n<ul class="guide-list">{cards}</ul>',
        "data": data,
    }))


def build_extras():
    shutil.copy2(SRC / "favicon.svg", OUT / "favicon.svg")
    shutil.copy2(SRC / "404.html", OUT / "404.html")
    shutil.copy2(SRC / "manifest.webmanifest", OUT / "manifest.webmanifest")
    shutil.copytree(SRC / "icons", OUT / "icons")
    if (SRC / "og").exists():
        shutil.copytree(SRC / "og", OUT / "og")
    if (ROOT / "CNAME").exists():
        shutil.copy2(ROOT / "CNAME", OUT / "CNAME")
    urls = ["/", "/near-me/", "/pick/"] + [p["path"] for p in by_size(pages)] + (["/guides/"] + [f"/guides/{g}/" for g in guides] if guides else []) + ["/privacy/"]
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
build_redirects()
build_extras()
build_service_worker()
print(f"Built {len(pages) + 1} pages from {len(restaurants)} restaurants into {OUT.relative_to(ROOT)}/:")
print("  /  (homepage)")
for g in guides:
    print(f"  /guides/{g}/  {guides[g]['h1']}")
for p in sorted(pages, key=lambda p: p["path"]):
    print(f"  {p['path']}  {p['name']}, {starred_n[p['id']]} starred")
for old, pid in sorted(redirects.items()):
    print(f"  {old}  now sends visitors to {places[pid]['path']}")
