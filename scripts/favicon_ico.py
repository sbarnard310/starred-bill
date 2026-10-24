#!/usr/bin/env python3
"""Makes favicon.ico from the brand's site icons, for browsers and robots that ask for /favicon.ico by habit
(981 requests a week went unanswered before it existed, 24 Oct 2026; pages themselves link favicon.svg).

    python3 scripts/favicon_ico.py

Packs brand/site-icons/favicon-16.png, favicon-32.png and a 48px copy of icon-192.png (sized with the Mac's sips)
into brand/site-icons/favicon.ico as PNG images, which every current browser reads, and copies it to src/favicon.ico.
Run it again after redrawing the icons. Standard library only.
"""
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "brand" / "site-icons"


def main():
    with tempfile.TemporaryDirectory() as tmp:
        big = Path(tmp) / "favicon-48.png"
        subprocess.run(["sips", "-z", "48", "48", str(ICONS / "icon-192.png"), "--out", str(big)],
                       check=True, capture_output=True)
        images = [(16, (ICONS / "favicon-16.png").read_bytes()), (32, (ICONS / "favicon-32.png").read_bytes()),
                  (48, big.read_bytes())]
    # ICONDIR, then one 16-byte ICONDIRENTRY per image, then the images themselves.
    head = struct.pack("<HHH", 0, 1, len(images))
    offset = len(head) + 16 * len(images)
    entries, data = b"", b""
    for size, png in images:
        entries += struct.pack("<BBBBHHII", size, size, 0, 0, 1, 32, len(png), offset + len(data))
        data += png
    out = ICONS / "favicon.ico"
    out.write_bytes(head + entries + data)
    shutil.copy2(out, ROOT / "src" / "favicon.ico")
    print(f"Wrote {out.relative_to(ROOT)} and src/favicon.ico ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
