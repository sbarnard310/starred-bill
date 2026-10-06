#!/usr/bin/env python3
"""Sizes a guide's featured image (see docs/image-style.md).

    python3 scripts/guide_images.py <guide-id> [<guide-id> ...]
    python3 scripts/guide_images.py --all

Takes src/img/guides/<id>-src.jpg (or .png), the full-size AI image, and writes with macOS `sips`:
  <id>.jpg       1600×900  the picture at the top of the guide
  <id>-card.jpg   800×450  the /guides/ list
  <id>-og.jpg    1200×630  the link-preview picture (cropped from the middle)
"""
import subprocess
import sys
from pathlib import Path

DIR = Path(__file__).resolve().parent.parent / "src" / "img" / "guides"


def sips(*args):
    subprocess.run(["sips", *args], check=True, capture_output=True)


def size(src, out, width, height):
    """Scale to cover width×height, then crop the middle, as a JPEG."""
    w, h = (int(x) for x in subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(src)],
                                            capture_output=True, text=True, check=True).stdout.split()[-3::2])
    scale = max(width / w, height / h)
    sips("-s", "format", "jpeg", "-s", "formatOptions", "78", "--resampleHeightWidth",
         str(round(h * scale)), str(round(w * scale)), str(src), "--out", str(out))
    sips("-c", str(height), str(width), str(out), "--out", str(out))


def make(gid):
    src = next((p for p in (DIR / f"{gid}-src.jpg", DIR / f"{gid}-src.png") if p.exists()), None)
    if not src:
        print(f"{gid}: no {gid}-src.jpg or .png in {DIR}")
        return
    for suffix, w, h in (("", 1600, 900), ("-card", 800, 450), ("-og", 1200, 630)):
        size(src, DIR / f"{gid}{suffix}.jpg", w, h)
    print(f"{gid}: done")


if __name__ == "__main__":
    ids = sys.argv[1:]
    if ids == ["--all"]:
        ids = sorted(p.name[:-8] for p in DIR.glob("*-src.*") if p.suffix in (".jpg", ".png"))
    if not ids:
        print(__doc__)
    for gid in ids:
        make(gid)
