"""Members' reports of a price, closure or new chef (the "Report a price or change" button; supabase/reports.sql).

    python3 scripts/reports.py pending                 the reports waiting to be checked, beside what our files say,
                                                       with each photo saved to ~/starred-bill-research/reports/
    python3 scripts/reports.py review ID STATUS [NOTE]  record our check: used (we changed the site with it),
                                                       confirmed (our page already had it right) or not-used (we couldn't
                                                       confirm it). The member sees the status and the note on their
                                                       account page; used and confirmed earn the Price checker badge.
                                                       The report's photo is deleted at once.
    python3 scripts/reports.py clean                   deletes leftover photos (checked reports, over 90 days old,
                                                       deleted accounts); run at the end of each review

The weekly review: for each pending report, check the restaurant's own website (then booking sites) before changing
anything. Where the member's report is the only source for a price, set the price's sourceType to "member" and its
sourceDate (lunchSourceType/lunchSourceDate for lunch) to the month they saw it, e.g. "2026-10"; never their name.
Calls go to the report-photos Supabase function with the review token from the Keychain ("starredbill-review").
Standard library only, Python 3.9.
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

FUNCTION = "https://uvdaclbhskkukyngikhq.supabase.co/functions/v1/report-photos"
ROOT = Path(__file__).resolve().parent.parent
PHOTOS = Path.home() / "starred-bill-research" / "reports"
KIND = {"price": "Price", "closed": "Closed", "chef": "New chef", "other": "Something else"}


def token():
    return subprocess.run(["security", "find-generic-password", "-s", "starredbill-review", "-w"],
                          capture_output=True, text=True, check=True).stdout.strip()


def call(query="", body=None):
    req = urllib.request.Request(FUNCTION + query, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"x-review-token": token(), "Content-Type": "application/json",
                                          "User-Agent": "StarredBill-reports/1.0"},
                                 method="POST" if body is not None else "GET")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def restaurant(rid):
    for f in (ROOT / "content" / "restaurants").glob(f"*/{rid}.json"):
        return json.loads(f.read_text("utf-8")), f.relative_to(ROOT)
    return None, None


def pending():
    rows = call("?pending=1")
    if not rows:
        print("No reports waiting.")
        return
    PHOTOS.mkdir(parents=True, exist_ok=True)
    for r in rows:
        print("=" * 72)
        print(f"{r['id']}  {r['created_at'][:10]}  {KIND.get(r['kind'], r['kind'])}: {r.get('restaurant_name') or r['restaurant_id']}")
        if r["kind"] == "price":
            print(f"  {r.get('meal') or ''}{' (' + r['menu_name'] + ')' if r.get('menu_name') else ''}: "
                  f"{r.get('currency') or ''} {r.get('price')}  seen {r.get('seen_on') or '?'}")
        if r.get("chef"):
            print(f"  New chef: {r['chef']}")
        for k in ("details", "link"):
            if r.get(k):
                print(f"  {k.capitalize()}: {r[k]}")
        if r.get("photo"):
            out = PHOTOS / f"{r['id']}.jpg"
            urllib.request.urlretrieve(r["photo"], out)
            print(f"  Photo: {out}")
        data, path = restaurant(r["restaurant_id"])
        if data:
            print(f"  Our file {path}: dinner {data.get('dinner')} lunch {data.get('lunch')} wine {data.get('wine')} "
                  f"chef {data.get('chef')} status {data.get('status')}")
            print(f"  Source {data.get('sourceType')} {data.get('source') or ''}  website {data.get('website') or ''}")
        else:
            print("  (no restaurant file with that id)")
    print("=" * 72)
    print(f"{len(rows)} waiting.")


def main(args):
    if not args or args[0] == "pending":
        pending()
    elif args[0] == "review" and len(args) >= 3:
        print(call(body={"action": "review", "id": args[1], "status": args[2], "note": " ".join(args[3:]) or None}))
    elif args[0] == "clean":
        print(call(body={"action": "clean"}))
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1:])
