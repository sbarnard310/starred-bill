#!/usr/bin/env python3
"""Looks for head chefs on restaurants' own websites, for restaurants the MICHELIN Guide doesn't name one for.

    python3 scripts/chef_from_sites.py OUT.json      fetch and write candidate sentences for review

It visits each website's homepage plus up to three linked pages that look like "team", "about" or "chef" pages,
and keeps the sentences that mention a head chef in any of the site's languages. Nothing is written to content/:
the candidates are checked by hand, then added with  python3 scripts/michelin_details.py chefs FILE  (source "site").
"""
import concurrent.futures
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
LINK_WORDS = re.compile(r"chef|team|equipe|équipe|equipo|about|uber-uns|ueber-uns|über|chi-siamo|nosotros|sobre|story|histoire|storia|historia|"
                        r"philosoph|kitchen|kueche|küche|keuken|cucina|cocina|cuisine|brigade|people|staff|シェフ|셰프|主廚|主厨|เชฟ", re.I)
CHEF_WORDS = re.compile(r"head chef|executive chef|chef de cuisine|chef[- ]owner|chef[- ]patron|chef cuisinier|cheffe|küchenchef|kuechenchef|"
                        r"chefkoch|küchenchefin|chef[- ]kok|chefkok|chef cuoco|cuoco|executive|jefe de cocina|chefe de cozinha|chef ejecutivo|"
                        r"köksmästare|kjøkkensjef|køkkenchef|keittiömestari|料理長|シェフ|主廚|主厨|行政總廚|總廚|셰프|총괄|เชฟ|\bchef\b", re.I)
SKIP = re.compile(r"sous[- ]chef|pastry|pâtissi|patissi|pasticc|reposter|sommeli", re.I)


def fetch(url, timeout=12):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en,*;q=0.5"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        if "html" not in (r.headers.get("Content-Type") or "html"):
            return ""
        raw = r.read(1_500_000)
        enc = r.headers.get_content_charset() or "utf-8"
        return raw.decode(enc, "replace")


def text_of(page):
    page = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", page)
    page = re.sub(r"(?i)<br\s*/?>|</p>|</h\d>|</li>|</div>", ". ", page)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", page))).strip()


def links_of(page, base):
    out = []
    for href, label in re.findall(r'(?is)<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', page):
        url = urllib.parse.urljoin(base, href)
        if urllib.parse.urlparse(url).netloc != urllib.parse.urlparse(base).netloc:
            continue
        if LINK_WORDS.search(urllib.parse.unquote(url)) or LINK_WORDS.search(re.sub(r"<[^>]+>", "", label)):
            if url not in out and url.rstrip("/") != base.rstrip("/"):
                out.append(url)
    return out[:3]


def snippets(text):
    out = []
    for sentence in re.split(r"(?<=[.!?。！？])\s+", text):
        if len(sentence) < 12 or len(sentence) > 400 or not CHEF_WORDS.search(sentence):
            continue
        s = sentence.strip()
        if s not in out:
            out.append(s)
    # sentences about the head chef first, then any other mention of a chef
    out.sort(key=lambda s: (bool(SKIP.search(s)), not re.search(r"head|executive|de cuisine|owner|patron|küchenchef|料理長|主廚|总厨|總廚|총괄", s, re.I)))
    return out[:5]


def look(item):
    rid, name, site = item
    found, pages = [], []
    try:
        home = fetch(site)
        pages.append(site)
        found += snippets(text_of(home))
        for url in links_of(home, site):
            try:
                found += snippets(text_of(fetch(url)))
                pages.append(url)
            except Exception:
                pass
    except Exception as e:
        return rid, {"name": name, "site": site, "error": str(e)[:80]}
    seen, keep = set(), []
    for s in found:
        if s not in seen:
            seen.add(s); keep.append(s[:240])
    return rid, {"name": name, "site": site, "pages": pages, "snippets": keep[:6]}


def main(out):
    todo = []
    base = os.path.join(ROOT, "content", "restaurants")
    for country in sorted(os.listdir(base)):
        folder = os.path.join(base, country)
        if not os.path.isdir(folder):
            continue
        for f in sorted(os.listdir(folder)):
            r = json.load(open(os.path.join(folder, f), encoding="utf-8"))
            if r.get("stars") in (1, 2, 3) and not r.get("status") and not r.get("chef") and r.get("website"):
                todo.append((f[:-5], r["name"], r["website"]))
    results = {}
    with concurrent.futures.ThreadPoolExecutor(24) as pool:
        for i, (rid, res) in enumerate(pool.map(look, todo), 1):
            results[rid] = res
            if i % 100 == 0:
                print(f"  {i} of {len(todo)}", flush=True)
    json.dump(results, open(out, "w"), ensure_ascii=False, indent=1)
    print(f"Checked {len(todo)} websites; {sum(1 for r in results.values() if r.get('snippets'))} mention a chef")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
    else:
        main(sys.argv[1])
