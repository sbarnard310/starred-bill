#!/usr/bin/env python3
"""Copies a restaurant's photo of our own into src/img/restaurants/ and records its credit in the restaurant's file.

    python3 scripts/restaurant_photos.py commons <restaurant id> "File:Le Bernardin entrance.jpg" ["alt text"]
    python3 scripts/restaurant_photos.py picks <picks.json>      # many at once: {id: {"file": "File:…", "alt": "…"}}
    python3 scripts/restaurant_photos.py press <restaurant id> <image file> <press page or permission note> ["alt text"]
    python3 scripts/restaurant_photos.py resize <restaurant id>  # remake the sizes from src/img/restaurants/<id>-src.jpg

Wikimedia Commons photos: only free licences (CC0, public domain, CC BY, CC BY-SA); the file's author, licence and Commons
page go into `photoCredit`, `photoLicence`, `photoLicenceUrl` and `photoSource`, which the pages show under the photo, as
the licence asks. Press photos: `photoSourceType` press (the restaurant's media page allows editorial use; give its link)
or permission (the restaurant said yes by email; give who, how and when), credited "Courtesy of <restaurant>".

Each photo is written as <id>.jpg (up to 1000px on its long side) and <id>-sm.jpg (240px on its short side, the list
thumbnail), with macOS `sips`. Standard library only. Wikimedia allows bots 200 requests a minute with a User-Agent
naming them; this sends one or two per photo.
"""
import html
import json
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "src" / "img" / "restaurants"
UA = "StarredBillPhotos/1.0 (https://starredbill.com; sam@starredbill.com) python-urllib/3"
COMMONS = "https://commons.wikimedia.org/w/api.php"
FREE = re.compile(r"^(CC0|Public domain|PD\b|CC BY(-SA)? \d|CC BY(-SA)?$)", re.I)
FULL, SMALL = 1000, 240


def fetch(url, data=None):
    for n in range(5):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or n == 4:
                raise
            time.sleep(int(e.headers.get("Retry-After") or 0) or 20)
    return None


def files():
    """Restaurant id -> its JSON file."""
    return {f.stem: f for f in (ROOT / "content" / "restaurants").glob("*/*.json")}


def sips(*args):
    subprocess.run(["sips", *args], check=True, capture_output=True)


def dims(path):
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)], capture_output=True, text=True, check=True).stdout
    return int(re.search(r"pixelWidth: (\d+)", out).group(1)), int(re.search(r"pixelHeight: (\d+)", out).group(1))


def make_sizes(rid, src):
    """<id>.jpg fitting FULL×FULL and <id>-sm.jpg with its short side SMALL, both JPEG. Returns the big one's size."""
    w, h = dims(src)
    big = DIR / f"{rid}.jpg"
    k = min(1, FULL / max(w, h))
    sips("-s", "format", "jpeg", "-s", "formatOptions", "62", "--resampleHeightWidth", str(round(h * k)), str(round(w * k)), str(src), "--out", str(big))
    k = min(1, SMALL / min(w, h))
    sips("-s", "format", "jpeg", "-s", "formatOptions", "65", "--resampleHeightWidth", str(round(h * k)), str(round(w * k)), str(src), "--out", str(DIR / f"{rid}-sm.jpg"))
    return dims(big)


def write_fields(rid, fields):
    """Writes the photo fields into the restaurant's file, keeping its other fields and their order."""
    f = files()[rid]
    d = json.loads(f.read_text("utf-8"))
    for k in [k for k in d if k.startswith("photo")]:
        del d[k]
    d.update({k: v for k, v in fields.items() if v})
    f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", "utf-8")


def plain(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h or ""))).strip()


def commons_info(titles):
    """Licence, author, page and a 1600px copy's address for each Commons file title."""
    body = urllib.parse.urlencode({"action": "query", "titles": "|".join(titles), "prop": "imageinfo", "iiprop": "url|extmetadata",
                                   "iiurlwidth": 1600, "format": "json", "formatversion": 2}).encode()
    out = {}
    for p in json.loads(fetch(COMMONS, body))["query"]["pages"]:
        ii = (p.get("imageinfo") or [{}])[0]
        em = {k: v.get("value") for k, v in (ii.get("extmetadata") or {}).items()}
        out[p["title"]] = {"url": ii.get("thumburl") or ii.get("url"), "page": ii.get("descriptionurl"), "licence": em.get("LicenseShortName") or "",
                           "licenceUrl": em.get("LicenseUrl") or "", "artist": plain(em.get("Artist")), "credit": plain(em.get("Credit")),
                           "attribution": plain(em.get("Attribution"))}
    return out


def author(info):
    """The name to credit: the file's own attribution line if it asks for one, else its author."""
    who = info["attribution"] or info["artist"]
    who = re.sub(r"\s*\((talk|discussion)\)\s*$", "", who)
    if not who and FREE.match(info["licence"]) and re.match(r"(CC0|Public domain|PD)", info["licence"], re.I):
        who = "Unknown author"
    return who[:120]


def add_commons(rid, title, alt, info):
    if not info.get("url"):
        print(f"{rid}: {title} not found on Commons")
        return False
    if not FREE.match(info["licence"]):
        print(f"{rid}: {title} has licence {info['licence']!r}, not a free one we use")
        return False
    who = author(info)
    if not who:
        print(f"{rid}: {title} names no author, so it can't be credited")
        return False
    src = DIR / f"{rid}-src.jpg"
    src.write_bytes(fetch(info["url"]))
    w, h = make_sizes(rid, src)
    licence_url = info["licenceUrl"].replace("http://", "https://")
    write_fields(rid, {"photo": f"{rid}.jpg", "photoAlt": alt, "photoCredit": who, "photoLicence": info["licence"],
                       "photoLicenceUrl": licence_url, "photoSource": info["page"], "photoSourceType": "commons",
                       "photoWidth": w, "photoHeight": h, "photoChecked": date.today().isoformat()})
    print(f"{rid}: {title} · {who} · {info['licence']}")
    return True


def main(args):
    DIR.mkdir(parents=True, exist_ok=True)
    if not args:
        print(__doc__)
    elif args[0] == "commons" and len(args) >= 3:
        title = args[2] if args[2].startswith("File:") else "File:" + args[2]
        add_commons(args[1], title, args[3] if len(args) > 3 else "", commons_info([title]).get(title, {}))
    elif args[0] == "picks" and len(args) == 2:
        picks = json.loads(Path(args[1]).read_text("utf-8"))
        known = files()
        items = [(rid, p) for rid, p in picks.items() if rid in known]
        done = 0
        for i in range(0, len(items), 40):
            chunk = items[i:i + 40]
            info = commons_info([p["file"] for rid, p in chunk])
            for rid, p in chunk:
                done += add_commons(rid, p["file"], p.get("alt", ""), info.get(p["file"].replace("_", " "), {}))
                time.sleep(0.4)
        print(f"{done} of {len(items)} photos added")
    elif args[0] == "press" and len(args) >= 4:
        rid, image, note = args[1], Path(args[2]), args[3]
        d = json.loads(files()[rid].read_text("utf-8"))
        name = d["name"]
        w, h = make_sizes(rid, image)
        is_link = note.startswith("http")
        write_fields(rid, {"photo": f"{rid}.jpg", "photoAlt": args[4] if len(args) > 4 else "", "photoCredit": f"Courtesy of {name}",
                           "photoSource": note if is_link else d.get("website", ""), "photoSourceType": "press" if is_link else "permission",
                           "photoPermission": "" if is_link else note, "photoWidth": w, "photoHeight": h, "photoChecked": date.today().isoformat()})
        print(f"{rid}: press photo added")
    elif args[0] == "resize" and len(args) == 2:
        print(make_sizes(args[1], DIR / f"{args[1]}-src.jpg"))
    else:
        print(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
