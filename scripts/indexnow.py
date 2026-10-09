"""Tell Bing and the other IndexNow search engines (Yandex, Naver, Seznam…) which pages a publish changed.

    python3 scripts/indexnow.py OLD_SITE NEW_SITE [--send]

OLD_SITE and NEW_SITE are two builds of the site (_site folders): the one that was live before the push and the one
it published. A page counts as changed when it's new, gone, or its HTML differs once the versions in asset and data file
names are taken out (they change with any edit to a script or style, not with the page). Only the sitemap's pages count.
Without --send it just lists them. .github/workflows/indexnow.yml runs it after each push to main, once Cloudflare has
published that commit. If OLD_SITE is missing (the old commit didn't build), pages whose sitemap date is on or after
--since YYYY-MM-DD are sent instead.

The key is the <32 hex>.txt file build.py writes at the site's root (INDEXNOW_KEY); IndexNow checks it there.
Standard library only, Python 3.9 compatible.
"""
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ENDPOINT = "https://api.indexnow.org/indexnow"
BATCH = 10000  # IndexNow takes up to 10,000 addresses a request
VERSIONED = re.compile(r"/(assets|data)/v/([^\"'\s?#]+?)\.[0-9a-f]{10}(\.[a-z]+)")
QUERY_VERSION = re.compile(r"\?v=[0-9a-f]+")  # the older way of versioning, before 9 Oct 2026


def sitemap(site):
    """Each page in the site's sitemap: {address: lastmod or ""}."""
    text = (site / "sitemap.xml").read_text("utf-8")
    return {m.group(1): m.group(2) or "" for m in re.finditer(r"<loc>([^<]+)</loc>(?:<lastmod>([^<]+)</lastmod>)?", text)}


def page_file(site, url):
    path = re.sub(r"^https?://[^/]+", "", url)
    return site / path.lstrip("/") / "index.html" if path.endswith("/") else site / path.lstrip("/")


def page_text(site, url):
    """The page as visitors get it, its versioned file names made plain. Big destination pages keep their restaurants in
    /data/v/places/<id>.<hash>.js, so that file's contents count as part of the page."""
    f = page_file(site, url)
    if not f.exists():
        return None
    text = f.read_text("utf-8")
    for rows in sorted(set(re.findall(r"/data/(?:v/)?places/[^\"'\s?#]+", text))):
        g = site / rows.lstrip("/")
        text += g.read_text("utf-8") if g.exists() else ""
    return QUERY_VERSION.sub("", VERSIONED.sub(r"/\1/\2\3", text))


def changed(old, new, since=""):
    new_pages = sitemap(new)
    if old is None:
        return sorted(u for u, day in new_pages.items() if day and day >= since)
    old_pages = sitemap(old)
    out = [u for u in new_pages if u not in old_pages or page_text(old, u) != page_text(new, u)]
    out += [u for u in old_pages if u not in new_pages]  # gone: they now redirect or 404, which is worth knowing too
    return sorted(out)


def key_of(site):
    for f in site.glob("*.txt"):
        if re.fullmatch(r"[0-9a-f]{32}", f.stem) and f.read_text("utf-8").strip() == f.stem:
            return f.stem
    sys.exit("No IndexNow key file (<32 hex>.txt) in " + str(site))


def send(urls, key):
    host = re.sub(r"^https?://([^/]+).*", r"\1", urls[0])
    for i in range(0, len(urls), BATCH):
        body = json.dumps({"host": host, "key": key, "keyLocation": f"https://{host}/{key}.txt", "urlList": urls[i:i + BATCH]}).encode()
        req = urllib.request.Request(ENDPOINT, data=body, headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": "StarredBill-IndexNow/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                print(f"IndexNow took {len(urls[i:i + BATCH])} addresses (HTTP {r.status}).")
        except urllib.error.HTTPError as e:
            # 400 bad request, 403 key not found or wrong, 422 addresses not on the key's host, 429 too many requests.
            sys.exit(f"IndexNow refused the list: HTTP {e.code} {e.read().decode('utf-8', 'replace')[:300]}")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    since = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--since=")), "")
    if len(args) != 2:
        sys.exit(__doc__)
    old, new = Path(args[0]), Path(args[1])
    old = old if (old / "sitemap.xml").exists() else None
    urls = changed(old, new, since)
    print(f"{len(urls)} changed page{'s' if len(urls) != 1 else ''}" + ("" if old else f" (sitemap dates from {since or 'any day'})") + ":")
    for u in urls[:50]:
        print("  " + u)
    if len(urls) > 50:
        print(f"  … and {len(urls) - 50} more")
    if urls and "--send" in sys.argv:
        send(urls, key_of(new))


if __name__ == "__main__":
    main()
