#!/usr/bin/env python3
"""Members' scores: brings each restaurant's average score and count down from Supabase into content/member-scores.json,
which build.py shows beside the Google rating ("Members: 4.6 (12)") on destination rows, map pop-ups and restaurant pages.

Members who have ticked a restaurant as "been there" can score it from 1 to 5 in their diary (one score each, kept in
their own `saved` row, supabase/scores.sql). Only member_scores() reads them, with the secret key, and it returns just
the average and count for restaurants five or more members have scored, leaving out accounts less than a day old and
members in `score_excluded`. Nothing here ever says who gave which score.

The file changes only when an average or count does (its `updated` day moves with it), so the daily run
(.github/workflows/member-scores.yml) commits only then. Standard library only, Python 3.9 compatible.

  python3 scripts/member_scores.py           # fetch and write content/member-scores.json (needs SUPABASE_SERVICE_KEY)
  python3 scripts/member_scores.py --dry-run # say what would change, write nothing
"""
import argparse
import json
import os
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from star_alerts import ROOT, SUPABASE_URL, call  # noqa: E402

OUT = ROOT / "content" / "member-scores.json"
MIN = 5  # keep in step with MEMBER_MIN in build.py and member_scores() in supabase/scores.sql


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="say what would change, write nothing")
    args = ap.parse_args()
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not key:
        print("Not set up: SUPABASE_SERVICE_KEY isn't set, so the members' scores weren't fetched.")
        return
    rows = call(f"{SUPABASE_URL}/rest/v1/rpc/member_scores", key, "POST", {"min_count": MIN}) or []
    scores = {r["restaurant_id"]: [round(float(r["average"]), 2), int(r["scores"])] for r in rows if int(r["scores"]) >= MIN}
    old = json.loads(OUT.read_text("utf-8")) if OUT.exists() else {}
    before = old.get("scores") or {}
    if scores == before:
        print(f"No change: {len(scores)} restaurant(s) have five or more members' scores.")
        return
    new = sorted(set(scores) - set(before))
    gone = sorted(set(before) - set(scores))
    moved = sorted(k for k in scores if k in before and scores[k] != before[k])
    print(f"{len(scores)} restaurant(s) with members' scores: {len(new)} new, {len(moved)} changed, {len(gone)} dropped.")
    for label, ids in (("New", new), ("Changed", moved), ("Dropped", gone)):
        if ids:
            print(f"  {label}: " + ", ".join(ids))
    if args.dry_run:
        return
    out = {"updated": date.today().isoformat(),
           "about": "Written by scripts/member_scores.py from Supabase: each restaurant's average members' score out of 5 and how many gave one, only where five or more have. Don't edit by hand.",
           "scores": dict(sorted(scores.items()))}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}.")


if __name__ == "__main__":
    main()
