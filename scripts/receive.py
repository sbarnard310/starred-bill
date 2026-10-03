#!/usr/bin/env python3
"""Helps refresh content/world-starred.json (see scripts/michelin_world.js).

    python3 scripts/receive.py           listen on http://localhost:8798 and save what the browser sends into scripts/
    python3 scripts/receive.py --world   turn scripts/michelin-world-export.json into content/world-starred.json
"""
import datetime
import http.server
import json
import os
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


class Receiver(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        name = os.path.basename(urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("name", ["upload.json"])[0])
        data = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if "x-www-form-urlencoded" in self.headers.get("Content-Type", ""):
            data = urllib.parse.parse_qs(data.decode("utf-8"), max_num_fields=10).get("data", [""])[0].encode("utf-8")
        with open(os.path.join(HERE, name), "wb") as f:
            f.write(data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"saved %d bytes" % len(data))
        print(f"Saved {len(data):,} bytes to scripts/{name}")

    def log_message(self, *args):
        pass


def write_world():
    rows = json.load(open(os.path.join(HERE, "michelin-world-export.json"), encoding="utf-8"))["world"]
    rows.sort(key=lambda w: (-int(w["dist"][0]), w["where"], w["name"]))
    lines = [json.dumps([w["name"], int(w["dist"][0]), round(w["lat"], 6), round(w["lng"], 6), w["cuisine"], w["where"],
                         w["href"][3:] if w["href"].startswith("/en/") else w["href"]], ensure_ascii=False) for w in rows]
    header = {
        "about": "Every Michelin-starred restaurant in the world, shown as pins on the homepage map. Generated from guide.michelin.com (see scripts/michelin_world.js); don't edit by hand. Restaurants that have their own file in content/restaurants are matched by name and location and shown with prices instead.",
        "updated": datetime.date.today().isoformat(),
        "columns": ["name", "stars", "lat", "lng", "cuisine", "where", "michelinPath"],
    }
    out = "{\n" + ",\n".join(f'  "{k}": {json.dumps(v, ensure_ascii=False)}' for k, v in header.items()) + \
        ',\n  "restaurants": [\n    ' + ",\n    ".join(lines) + "\n  ]\n}\n"
    with open(os.path.join(ROOT, "content", "world-starred.json"), "w", encoding="utf-8") as f:
        f.write(out)
    print(f"Wrote {len(lines):,} restaurants to content/world-starred.json")


if __name__ == "__main__":
    if "--world" in sys.argv:
        write_world()
    else:
        print("Listening on http://localhost:8798 (Ctrl+C to stop)")
        http.server.HTTPServer(("127.0.0.1", 8798), Receiver).serve_forever()
