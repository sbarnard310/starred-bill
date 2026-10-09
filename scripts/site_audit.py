#!/usr/bin/env python3
"""A health check of the built site and its data, used by the "Starred Bill · Morning audit" routine.

    python3 scripts/site_audit.py SITE_DIR OUT.json [PREVIOUS.json]

SITE_DIR is a folder holding a fresh copy of the site with _site/ already built (python3 build.py). The audit
checks every page (titles, descriptions, headings, structured data, broken links, sitemap, page weight), the internal
links (orphan pages, pages with few links in or out, self-links, vague anchor text, and the guides' own links) and the
restaurant data (missing prices, ratings, chefs, positions, duplicates, odd prices), the MICHELIN Guide ceremonies
(stars announced since our files caught up, ceremonies in the next two weeks), then the live site's
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
    alternates, translated = {}, 0  # each page's language versions (hreflang), and how many pages aren't in English
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
        m = re.search(r'<html lang="([^"]+)"', s)
        translated += bool(m and not m.group(1).startswith("en"))
        alts = dict(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="https://starredbill.com([^"]*)"', s))
        if alts:
            alternates[url] = alts
        if len(re.findall(r"<h1[\s>]", s)) != 1:
            out["not_one_h1"].append(url)
        for j in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
            try:
                json.loads(j)
            except ValueError:
                out["bad_structured_data"].append(url)
        # Destination pages with starred restaurants carry a FAQ (destination_faq() in build.py), in the page and as FAQPage data.
        if '<ol class="prerender"><li>' in s and not ('<section id="faq">' in s and '"FAQPage"' in s):
            out["destination_without_faq"].append(url)
        m = re.search(r'og:image" content="https://starredbill.com(/[^"]+)"', s)
        if m and m.group(1).lstrip("/") not in files:
            out["missing_preview_picture"].append(url)
        if any("alt=" not in img for img in re.findall(r"<img\b[^>]*>", s)):
            out["image_without_alt"].append(url)
        for h in set(re.findall(r'href="(/[^"]*)"', s)):
            if not exists(h):
                broken[h] += 1
                out["broken_links"].append(f"{h} (on {url})")
    # Language versions must each list all the others, including themselves, and point at pages that exist.
    out.setdefault("hreflang_problems", [])
    for url, alts in alternates.items():
        if url not in alts.values():
            out["hreflang_problems"].append(f"{url} doesn't list itself")
        for lang, other in alts.items():
            if not exists(other):
                out["hreflang_problems"].append(f"{url} names {other} ({lang}), which doesn't exist")
            elif lang != "x-default" and alternates.get(other) != alts:
                out["hreflang_problems"].append(f"{url} and {other} ({lang}) list different versions")
    out["duplicate_titles"] = [f"{t} ({', '.join(u)})" for t, u in titles.items() if t and len(u) > 1]
    out["duplicate_descriptions"] = [", ".join(u[:3]) for d, u in descs.items() if d and len(u) > 1]
    sitemap = re.findall(r"<loc>https://starredbill.com(.*?)</loc>", (S / "sitemap.xml").read_text("utf-8"))
    out["sitemap_missing_page"] = [u for u in sitemap if not exists(u)]
    sizes.sort(reverse=True)
    heavy = [f"{u} ({b // 1024} KB)" for b, u in sizes if b > 500 * 1024]
    data = [f"{p.relative_to(S)} ({p.stat().st_size // 1024} KB)" for p in sorted(p for p in (S / "data").rglob("*") if p.suffix in (".json", ".js")) if p.stat().st_size > 500 * 1024]
    return dict(out), {"pages": len(sizes), "translated_pages": translated, "heavy_pages": heavy, "heavy_data": data,
                       "median_page_kb": sizes[len(sizes) // 2][0] // 1024 if sizes else 0}


# Internal links, against the "Internal links" rules in the Handbook's content style guide: keyword anchor text, links
# inside relevant sentences, no self-links, one link per page per article, enough links in and out of every page.
LANG_PREFIX = re.compile(r"^/(?:zh|yue|zhs|fr|ja|es|it|ko|da|sv|is|ca|th|de|nl|pt|nb|fi|pl|cs|hu|sl|hr|sr|el|tr|lt|lv|et|mt|ms|fil|vi|ar)/")
VAGUE = re.compile(r"^(?:here|click here|this|this page|this guide|this link|page|link|more|read more|see more|learn more|find out more|see|go|our page)$", re.I)
FEW_LINKS_IN = 3       # an indexed English page with fewer links to it than this is hard for Google to find
FEW_CONTENT_LINKS = 2  # a page with fewer links of its own (beyond the menu and footer every page has) is a dead end
LISTS = re.compile(r'<table.*?</table>|<(ol|nav) class="(?:rank-cards|jump-links)[^"]*".*?</\1>|<div class="change-lists">(?:.*?</ul></div>){2}</div>|<h3 id="three-[^"]*">.*?</h3>|<div class="results-top">.*?</div>', re.S)  # built from the data


def link_checks(site):
    S = site / "_site"
    files = {str(p.relative_to(S)) for p in S.rglob("*") if p.is_file()}
    pages, noindex, names = {}, set(), {}
    for p in S.rglob("index.html"):
        s = p.read_text("utf-8", errors="replace")
        if 'http-equiv="refresh"' in s:
            continue
        url = ("/" + str(p.parent.relative_to(S)).strip(".") + "/").replace("//", "/")
        pages[url] = s
        if "noindex" in s:
            noindex.add(url)
        m = re.search(r'"page":\{"name":"([^"]+)".*?"path":"([^"]+)"', s)
        if m and not LANG_PREFIX.match(url):
            names.setdefault(json.loads('"' + m.group(1) + '"'), m.group(2))

    def target(href):
        h = href.split("#")[0].split("?")[0]
        if not h.startswith("/") or h.startswith("//"):
            return None
        return h if h.endswith("/") or (h.lstrip("/") in files and "." in h.rsplit("/", 1)[-1]) else h + "/"

    anchors = re.compile(r'<a\b([^>]*)\bhref="([^"]*)"([^>]*)>(.*?)</a>', re.S)
    links_in, links_out = collections.defaultdict(set), {}
    out = collections.defaultdict(list)
    for url, s in pages.items():
        found = set()
        for before, href, after, inner in anchors.findall(s):
            t = target(href)
            if t is None:
                continue
            text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", inner))).strip()
            if t == url and not href.startswith("#") and "#" not in href:
                out["self_links"].append(f"{url} ({text or 'no text'})")
            if text and VAGUE.match(text):
                out["vague_anchor_text"].append(f'"{text}" to {t} (on {url})')
            if t != url:
                found.add(t)
                links_in[t].add(url)
        links_out[url] = found
    # Links found on nearly every page are the menu and footer; what's left is each page's own.
    common = {t for t in set().union(*links_out.values()) if sum(t in v for v in links_out.values()) > 0.9 * len(links_out)}
    for url in sorted(pages):
        if url in noindex:
            continue
        if not links_in[url]:
            out["orphan_pages"].append(url)
        elif len(links_in[url]) < FEW_LINKS_IN and not LANG_PREFIX.match(url) and ('class="prerender"><li>' in pages[url] or url.startswith("/guides/")):
            out["few_links_in"].append(f"{url} ({len(links_in[url])})")  # destination pages with starred restaurants, and guides
        if len(links_out[url] - common) < FEW_CONTENT_LINKS and not LANG_PREFIX.match(url):
            out["few_links_out"].append(f"{url} ({len(links_out[url] - common)})")
    # Guides: the article's own text (the data-built tables and lists aside) follows the writing rules.
    by_length = sorted(names, key=len, reverse=True)
    for url, s in sorted(pages.items()):
        if not re.match(r"^/guides/[^/]+/$", url):
            continue
        main = s[s.find("<main"):s.find("</main>")]
        main = main[:main.find('<section id="guides"')] if '<section id="guides"' in main else main
        linked = {target(h) for h in re.findall(r'href="(/[^"]*)"', main)}
        prose = LISTS.sub(" ", main)
        seen = collections.Counter()
        for m in anchors.finditer(prose):
            t, text = target(m.group(2)), re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", m.group(4)))).strip()
            if t is None or t.startswith("/guides/") and t == url:
                continue
            seen[t] += 1
            lead = prose[max(0, m.start() - 12):m.start()]
            if re.search(r"(?:<p[^>]*>|<li>|<h\d[^>]*>)\s*$", lead) or re.search(r"[.!?]\s+$", lead):
                out["guide_link_starts_sentence"].append(f"{url}: {text}")
            if text[-1:] in ".,;:" or "  " in m.group(4):
                out["guide_link_untidy"].append(f"{url}: {text!r}")
            if text in names and names[text] != t:
                out["anchor_names_other_page"].append(f'{url}: "{text}" goes to {t}, not {names[text]}')
        out["guide_repeat_links"] += [f"{url}: {t} ({n} times)" for t, n in seen.items() if n > 1]
        # Places with a page of their own that the article names but doesn't link anywhere (longest names first, so
        # "New York" isn't also counted as York). For a writer to judge: not every mention deserves a link.
        text = " " + html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<a\b.*?</a>", " ", prose, flags=re.S))) + " "
        missed = []
        for n in by_length:
            if len(n) > 3 and re.search(r"(?<![\w-])" + re.escape(n) + r"(?![\w-])", text):
                text = re.sub(r"(?<![\w-])" + re.escape(n) + r"(?![\w-])", " ", text)
                if names[n] not in linked:
                    missed.append(n)
        if missed:
            out["guide_unlinked_places"].append(f"{url}: {', '.join(sorted(missed))}")
    counts = sorted(len(links_in[u]) for u in pages if u not in noindex and not LANG_PREFIX.match(u))
    return dict(out), {"median_links_in": counts[len(counts) // 2] if counts else 0}


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
    hours_file = C / "opening-hours.json"
    hours = json.loads(hours_file.read_text("utf-8")).get("hours", {}) if hours_file.exists() else {}
    gaps = collections.defaultdict(collections.Counter)
    for r in live:
        g = gaps[r["_country"]]
        g["starred"] += 1
        g["no_price"] += r.get("dinner") is None
        g["no_rating"] += r.get("rating") is None
        g["few_reviews"] += r.get("rating") is not None and (r.get("reviews") or 0) < 20
        g["no_chef"] += not r.get("chef")
        g["no_wine"] += r.get("wine") is None and not r.get("noPairing")  # restaurants that don't offer one aren't a gap
        g["no_pairing_offered"] += bool(r.get("noPairing"))
        g["lunch_unknown"] += r.get("lunch") is None and not r.get("noLunch") and not r.get("lunchNote")  # a note like "Open for lunch · Wed–Sun" answers it
        g["no_position"] += r.get("lat") is None
        g["no_photo"] += not r.get("placeId")
        g["no_website"] += not r.get("website")
        g["no_hours"] += r["_id"] not in hours  # opening days for Near me's "Open on" filter (scripts/michelin_details.py hours)
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
              for k in ("no_price", "no_chef", "no_rating", "no_hours")}
    return {"restaurants": len(rows), "starred": len(live), "totals": dict(total),
            "worst_countries": {k: [f"{c}: {n} of {s}" for n, c, s in v] for k, v in by_gap.items()},
            "duplicates": [v for v in seen.values() if len(v) > 1], "odd_prices": odd, "stale_notes": stale,
            "english_only_countries": sorted(p for p, v in places.items() if v["type"] == "country" and not v.get("languages")),
            "site_updated": json.loads((C / "site.json").read_text("utf-8")).get("updated")}


def ceremony_checks(site):
    """From content/ceremonies.json: guides whose stars came out after our files last caught up (`starsUpdated`), the
    ceremonies in the next 14 days, announced dates that have passed but are still under `next`, and guides not
    checked for a new date for over a month."""
    from datetime import date, timedelta
    path = site / "content" / "ceremonies.json"
    if not path.exists():
        return {}
    today = date.today()
    out = {"stars_to_update": [], "coming_14_days": [], "next_date_passed": [], "not_checked_lately": []}
    for g in json.loads(path.read_text("utf-8")).get("guides", []):
        past = g.get("ceremonies") or []
        nxt = g.get("next") or {}
        last = nxt.get("date") if nxt.get("date", "9999") <= today.isoformat() else (past[0]["date"] if past else "")
        if nxt.get("date", "9999") <= today.isoformat():
            out["next_date_passed"].append(f"{g['name']} ({nxt['date']})")
        if last and last > g.get("starsUpdated", ""):
            out["stars_to_update"].append(f"{g['name']}: stars revealed {last}, our files updated {g.get('starsUpdated') or 'never'}")
        if nxt.get("date") and today.isoformat() < nxt["date"] <= (today + timedelta(days=14)).isoformat():
            out["coming_14_days"].append(f"{g['name']}: {nxt['date']}")
        if g.get("checked", "") < (today.replace(day=1) - timedelta(days=1)).strftime("%Y-%m"):
            out["not_checked_lately"].append(g["name"])
    return out


def live_checks():
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    opener = urllib.request.build_opener(NoRedirect)
    want = {"https://starredbill.com/": 200, "https://www.starredbill.com/": 301, "http://starredbill.com/": 301,
            "https://starredbill.com/this-page-does-not-exist/": 404, "https://starredbill.com/robots.txt": 200,
            "https://starredbill.com/sitemap.xml": 200, "https://starredbill.com/uk/england/london/": 200,
            "https://starredbill.com/uk/london/": 301}  # an old address (redirectFrom), forwarded by Cloudflare's _redirects
    problems = []
    for url, code in want.items():
        try:
            res = opener.open(urllib.request.Request(url, headers={"User-Agent": "starredbill-audit"}), timeout=20)
            got = res.status
            # Cloudflare Pages adds the security headers from _headers (build_cloudflare() in build.py).
            if url == "https://starredbill.com/" and not res.headers.get("Strict-Transport-Security"):
                problems.append(f"{url} has no security headers (is _headers being published?)")
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
    links, link_figures = link_checks(site)
    pages.update(links)
    weight.update(link_figures)
    data = data_checks(site)
    data["ceremonies"] = ceremony_checks(site)
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
