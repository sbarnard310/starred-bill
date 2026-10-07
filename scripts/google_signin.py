#!/usr/bin/env python3
"""One-time Google sign-in for the morning figures (Search Console and Analytics, read-only).

    python3 scripts/google_signin.py

Used instead of a service account key, which Google blocks on this project. It needs a "Desktop app" OAuth
client from the Google Cloud project, saved as ~/starred-bill-research/keys/google-oauth-client.json (or the
path in config.json's "google_oauth"). It opens the sign-in page in the browser, catches Google's reply on
127.0.0.1, and keeps the refresh token in the Mac's Keychain as "starredbill-google", where
morning_figures.py reads it. Run it again if Google ever asks to sign in afresh.
Standard library only, Python 3.9.
"""
import base64
import hashlib
import http.server
import json
import os
import secrets
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

CONFIG = Path.home() / "starred-bill-research" / "figures" / "config.json"
DEFAULT_CLIENT = "~/starred-bill-research/keys/google-oauth-client.json"
SCOPES = "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly"


def main():
    cfg = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    path = Path(os.path.expanduser(cfg.get("google_oauth", DEFAULT_CLIENT)))
    if not path.exists():
        sys.exit(f"No OAuth client file at {path}")
    client = json.loads(path.read_text())
    client = client.get("installed") or client.get("web") or client
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = secrets.token_urlsafe(16)
    got = {}

    class Reply(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(self.path).query))
            if "code" not in q and "error" not in q:
                self.send_response(404)
                self.end_headers()
                return
            got.update(q)
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            ok = "code" in q and q.get("state") == state
            self.wfile.write(("<p style='font:18px sans-serif;margin:3em'>" +
                              ("Signed in. You can close this tab." if ok else "Sign-in didn't finish. Please try again.") +
                              "</p>").encode())

        def log_message(self, *a):
            pass

    server = http.server.HTTPServer(("127.0.0.1", 0), Reply)
    redirect = f"http://127.0.0.1:{server.server_port}/"
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": client["client_id"], "redirect_uri": redirect, "response_type": "code", "scope": SCOPES,
        "access_type": "offline", "prompt": "consent", "state": state,
        "code_challenge": challenge, "code_challenge_method": "S256"})
    print("Opening Google sign-in in your browser...")
    subprocess.run(["open", url])
    server.timeout = 300
    while not got:
        server.handle_request()
    if got.get("state") != state or "code" not in got:
        sys.exit(f"Sign-in didn't finish: {got.get('error', 'unexpected reply')}")
    form = urllib.parse.urlencode({"grant_type": "authorization_code", "code": got["code"], "redirect_uri": redirect,
                                   "client_id": client["client_id"], "client_secret": client["client_secret"],
                                   "code_verifier": verifier}).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=form,
                                 headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        tokens = json.loads(r.read())
    if not tokens.get("refresh_token"):
        sys.exit("Google didn't send a refresh token; please run this again.")
    subprocess.run(["security", "add-generic-password", "-U", "-a", os.environ.get("USER", "starredbill"),
                    "-s", "starredbill-google", "-w", tokens["refresh_token"]], check=True)
    if "google_oauth" not in cfg:
        cfg["google_oauth"] = DEFAULT_CLIENT
        CONFIG.write_text(json.dumps(cfg, indent=1) + "\n")
    print("Done: Google sign-in saved in the Keychain as starredbill-google.")


if __name__ == "__main__":
    main()
