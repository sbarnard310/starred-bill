#!/usr/bin/env python3
"""A health check of the built site and its data, used by the "Starred Bill · Morning audit" routine.

    python3 scripts/site_audit.py SITE_DIR OUT.json [PREVIOUS.json]

SITE_DIR is a folder holding a fresh copy of the site with _site/ already built (python3 build.py). The audit
checks every page (titles, descriptions, headings, structured data, broken links, sitemap, page weight) and the
restaurant data (missing prices, ratings, chefs, positions, duplicates, odd prices), then the live site's
basics (HTTPS, redirects, 404 page, robots.txt, sitemap). It writes the figures to OUT.json and prints a
plain report; with PREVIOUS.json it also says what changed since then. It only reads; nothing is changed.
"""
import collections
import html
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


def page_checks(site):
    S = site / "_site"
    files = {str(p.relative_to(S)) for p in S.rglob("*") if p.is_file()}

    def exists(href):
        h = href.split("#")[0].split("?")[0]
        rel = h.lstrip("/")
        if h.endswith("/") or rel == "":
            return rel + "index.html" in files
        return rel in files or rel + "/index.html" in files

    out = collections.defaultdict(list)
    titles, descs, sizes, broken = collections.defaultdict(list), collections.defaultdict(list), [], collections.Counter()
    for p in sorted(S.rglob("index.html")):
        s = p.read_text("utf-8", errors="replace")
        if 'http-equiv="refresh"' in s:
            continue  # forwarding pages for old addresses
        url = "/" + str(p.parent.relative_to(S)).strip(".") + "/"
        url = url.replace("//", "/")
        sizes.append((len(s.encode()), url))
        m = re.search(r"<title>(.*?)</title>", s, re.S)
        t = html.unescape(m.group(1).strip()) if m else ""
        titles[t].append(url)
        if not t:
            out["no_title"].append(url)
        elif len(t) > 65:
            out["title_too_long"].append(url)
        if "noindex" in s:
            continue  # private pages (account, compare): search engines are told to skip them
        m = re.search(r'<meta name="description" content="(.*?)"', s)
        d = html.unescape(m.group(1)) if m else ""
        descs[d].append(url)
        if not d:
            out["no_description"].append(url)
        elif len(d) > 160:
            out["description_too_long"].append(url)
        elif len(d) < 70:
            out["description_too_short"].append(url)
        if 'rel="canonical"' not in s:
            out["no_canonical"].append(url)
        if len(re.findall(r"<h1[\s>]", s)) != 1:
            out["not_one_h1"].append(url)
        for j in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
            try:
                json.loads(j)
            except ValueError:
                out["bad_structured_data"].append(url)
        m = re.search(r'og:image" content="https://starredbill.com(/[^"]+)"', s)
        if m and m.group(1).lstrip("/") not in files:
            out["missing_preview_picture"].append(url)
        if any("alt=" not in img for img in re.findall(r"<img\b[^>]*>", s)):
            out["image_without_alt"].append(url)
        for h in set(re.findall(r'href="(/[^"]*)"', s)):
            if not exists(h):
                broken[h] += 1
                out["broken_links"].append(f"{h} (on {url})")
    out["duplicate_titles"] = [f"{t} ({', '.join(u)})" for t, u in titles.items() if t and len(u) > 1]
    out["duplicate_descriptions"] = [", ".join(u[:3]) for d, u in descs.items() if d and len(u) > 1]
    sitemap = re.findall(r"<loc>https://starredbill.com(.*?)</loc>", (S / "sitemap.xml").read_text("utf-8"))
    out["sitemap_missing_page"] = [u for u in sitemap if not exists(u)]
    sizes.sort(reverse=True)
    heavy = [f"{u} ({b // 1024} KB)" for b, u in sizes if b > 500 * 1024]
    data = [f"{p.relative_to(S)} ({p.stat().st_size // 1024} KB)" for p in sorted((S / "data").glob("*.json")) if p.stat().st_size > 500 * 1024]
    return dict(out), {"pages": len(sizes), "heavy_pages": heavy, "heavy_data": data,
                       "median_page_kb": sizes[len(sizes) // 2][0] // 1024 if sizes else 0}


def data_checks(site):
    C = site / "content"
    places = {p.stem: json.loads(p.read_text("utf-8")) for p in (C / "places").glob("*.json")}
    cur = {c["code"]: c["perUSD"] for c in json.loads((C / "currencies.json").read_text("utf-8"))["currencies"]}

    def country(pid):
        seen = set()
        while pid in places and places[pid].get("parent") and pid not in seen:
            seen.add(pid)
            pid = places[pid]["parent"]
        return pid

    rows = []
    for f in (C / "restaurants").rglob("*.json"):
        r = json.loads(f.read_text("utf-8"))
        r["_id"], r["_country"] = f.stem, f.parent.name
        rows.append(r)
    live = [r for r in rows if r.get("stars") in (1, 2, 3) and not r.get("status")]
    gaps = collections.defaultdict(collections.Counter)
    for r in live:
        g = gaps[r["_country"]]
        g["starred"] += 1
        g["no_price"] += r.get("dinner") is None
        g["no_rating"] += r.get("rating") is None
        g["few_reviews"] += r.get("rating") is not None and (r.get("reviews") or 0) < 20
        g["no_chef"] += not r.get("chef")
        g["no_wine"] += r.get("wine") is None
        g["lunch_unknown"] += r.get("lunch") is None and not r.get("noLunch")
        g["no_position"] += r.get("lat") is None
        g["no_photo"] += not r.get("placeId")
        g["no_website"] += not r.get("website")
        g["price_without_source"] += r.get("dinner") is not None and not r.get("source")
    total = collections.Counter()
    for g in gaps.values():
        total.update(g)
    seen = collections.defaultdict(list)
    for r in live:
        seen[(r["name"].lower(), round(r.get("lat") or 0, 3), round(r.get("lng") or 0, 3))].append(r["_id"])
    odd = []
    for r in live:
        if r.get("dinner") is not None and r.get("dinnerType", "menu") == "menu":
            c = r.get("cur") or places.get(country(r["city"]), {}).get("currency")
            if c in cur:
                usd = r["dinner"] / cur[c]
                if usd < 30 or usd > 1200 or (r["stars"] == 3 and usd < 120):
                    odd.append(f"{r['name']} ({r['_country']}, {r['stars']} star, about ${round(usd)})")
    stale = [r["name"] for r in live if r.get("dinner") is not None and "still to be added" in (r.get("dinnerNote") or "")]
    by_gap = {k: sorted(((g[k], c, g["starred"]) for c, g in gaps.items() if g[k]), reverse=True)[:8]
              for k in ("no_price", "no_chef", "no_rating")}
    return {"restaurants": len(rows), "starred": len(live), "totals": dict(total),
            "worst_countries": {k: [f"{c}: {n} of {s}" for n, c, s in v] for k, v in by_gap.items()},
            "duplicates": [v for v in seen.values() if len(v) > 1], "odd_prices": odd, "stale_notes": stale,
            "english_only_countries": sorted(p for p, v in places.items() if v["type"] == "country" and not v.get("languages")),
            "site_updated": json.loads((C / "site.json").read_text("utf-8")).get("updated")}


def live_checks():
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    opener = urllib.request.build_opener(NoRedirect)
    want = {"https://starredbill.com/": 200, "https://www.starredbill.com/": 301, "http://starredbill.com/": 301,
            "https://starredbill.com/this-page-does-not-exist/": 404, "https://starredbill.com/robots.txt": 200,
            "https://starredbill.com/sitemap.xml": 200, "https://starredbill.com/uk/england/london/": 200}
    problems = []
    for url, code in want.items():
        try:
            got = opener.open(urllib.request.Request(url, headers={"User-Agent": "starredbill-audit"}), timeout=20).status
        except urllib.error.HTTPError as e:
            got = e.code
        except Exception as e:
            got = f"no answer ({type(e).__name__})"
        if got != code:
            problems.append(f"{url} gave {got}, expected {code}")
    return problems


def main(site, out_path, prev_path=None):
    site = Path(site)
    pages, weight = page_checks(site)
    data = data_checks(site)
    live = live_checks()
    result = {"pages": {k: len(v) for k, v in pages.items()}, "page_examples": {k: v[:6] for k, v in pages.items() if v},
              "weight": weight, "data": data, "live_problems": live}
    Path(out_path).write_text(json.dumps(result, indent=1, ensure_ascii=False), "utf-8")
    print(json.dumps(result, indent=1, ensure_ascii=False))
    if prev_path and Path(prev_path).exists():
        prev = json.loads(Path(prev_path).read_text("utf-8"))
        print("\nCHANGES SINCE THE PREVIOUS AUDIT:")
        for k in sorted(set(result["pages"]) | set(prev.get("pages", {}))):
            a, b = prev.get("pages", {}).get(k, 0), result["pages"].get(k, 0)
            if a != b:
                print(f"  pages {k}: {a} -> {b}")
        for k in sorted(set(data["totals"]) | set(prev.get("data", {}).get("totals", {}))):
            a, b = prev.get("data", {}).get("totals", {}).get(k, 0), data["totals"].get(k, 0)
            if a != b:
                print(f"  restaurants {k}: {a} -> {b}")
        a, b = prev.get("data", {}).get("starred", 0), data["starred"]
        if a != b:
            print(f"  starred restaurants: {a} -> {b}")


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        print(__doc__)
        sys.exit(1)
    main(*sys.argv[1:])
