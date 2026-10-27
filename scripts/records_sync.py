#!/usr/bin/env python3
"""Keeps the routines' saved figures in the private records repository (sbarnard310/starred-bill-records), so the
history isn't only on the Mac.

    python3 scripts/records_sync.py

Copies each day's morning figures (figures/<date>.json) and morning audit (audits/<date>.json) from
~/starred-bill-research into the repository's own figures/ and audits/ (visit_report.py writes history/ straight
into it), then commits and pushes whatever is new. Only totals live there: visit_report.py keeps no visit-level
records, and the figures and audits never had any. Where STARREDBILL_RESEARCH already points at the repository (the
cloud routines) there's nothing to copy, only the commit.

Standard library only, Python 3.9.
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from visit_report import RECORDS  # noqa: E402
import morning_figures as mf  # noqa: E402

DATED = re.compile(r"^\d{4}-\d{2}-\d{2}\.json$")


def git(*args):
    return subprocess.run(["git", "-C", str(RECORDS), *args], capture_output=True, text=True, timeout=120)


def main():
    if not (RECORDS / ".git").exists():
        print(f"No records repository at {RECORDS}: clone sbarnard310/starred-bill-records there first.")
        sys.exit(1)
    git("pull", "--rebase", "--quiet")
    copied = 0
    if RECORDS.resolve() != mf.RESEARCH.resolve():
        for folder in ("figures", "audits"):
            src = mf.RESEARCH / folder
            for f in sorted(src.glob("*.json")) if src.exists() else []:
                dest = RECORDS / folder / f.name
                if DATED.match(f.name) and (not dest.exists() or dest.stat().st_size != f.stat().st_size):
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(f, dest)
                    copied += 1
    git("add", "-A", "figures", "audits", "history")
    if not git("status", "--porcelain").stdout.strip():
        print("Records: nothing new.")
        return
    day = subprocess.run(["date", "+%Y-%m-%d"], capture_output=True, text=True).stdout.strip()
    git("commit", "-q", "-m", f"Figures and history for {day}")
    push = git("push", "-q")
    print(f"Records: {copied} files copied, committed" + (" and pushed." if push.returncode == 0 else f", but the push failed: {push.stderr.strip()[:200]}"))


if __name__ == "__main__":
    main()
