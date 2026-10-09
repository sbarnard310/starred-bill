#!/usr/bin/env python3
"""Draws the logo files in brand/ (see brand/README.md).

    python3 scripts/brand_images.py    serve brand/ on http://localhost:8797

Open http://localhost:8797/make.html in the browser pane and press "Save all files": the page draws every logo,
icon and banner from one source (make.html) and posts each SVG and PNG back here, which saves it under brand/.
"""
import functools
import http.server
import os
import urllib.parse

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "brand")


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        name = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("name", [""])[0]
        path = os.path.normpath(os.path.join(ROOT, name))
        if not path.startswith(ROOT + os.sep) or os.path.splitext(path)[1] not in (".png", ".svg"):
            self.send_response(400)
            self.end_headers()
            return
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(self.rfile.read(int(self.headers.get("Content-Length", 0))))
        self.send_response(200)
        self.end_headers()
        print("Saved brand/" + name)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("127.0.0.1", 8797), functools.partial(Handler, directory=ROOT)).serve_forever()
