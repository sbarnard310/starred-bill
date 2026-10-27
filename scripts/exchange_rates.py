#!/usr/bin/env python3
"""Refresh the exchange rates in content/currencies.json (27 Oct 2026).

    python3 scripts/exchange_rates.py           show what would change
    python3 scripts/exchange_rates.py --write   write the new rates and their date

Rates come from ExchangeRate-API's free open endpoint (https://open.er-api.com/v6/latest/USD, no key; credited on every
page as EXCHANGE_RATES in build.py), which updates once a day. Each currency's `perUSD` is replaced (six significant
figures) and `rateDate` becomes the day the provider last updated them, which pages show beside converted prices.
Currencies the provider doesn't list keep their old rate, and the script says which. .github/workflows/exchange-rates.yml
runs it on the 1st of each month and commits the file when it changed. Standard library only, Python 3.9.
"""
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILE = ROOT / "content" / "currencies.json"
URL = "https://open.er-api.com/v6/latest/USD"


def sig(x, n=6):
    """A rate to n significant figures, as the file keeps them (0.757127, 157.81511)."""
    return float(f"{x:.{n}g}")


def main():
    req = urllib.request.Request(URL, headers={"User-Agent": "StarredBill-rates/1.0 (+https://starredbill.com)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    if data.get("result") != "success" or data.get("base_code") != "USD":
        sys.exit(f"The rates didn't come back as expected: {data.get('result')} {data.get('error-type', '')}")
    day = datetime.fromtimestamp(data["time_last_update_unix"], timezone.utc).date().isoformat()
    cur = json.loads(FILE.read_text("utf-8"))
    missing, changed = [], 0
    for c in cur["currencies"]:
        rate = data["rates"].get(c["code"])
        if rate is None:
            missing.append(c["code"])
            continue
        new = 1 if c["code"] == "USD" else sig(rate)
        if new != c["perUSD"]:
            if changed < 8:
                print(f"{c['code']}: {c['perUSD']} → {new}")
            changed += 1
            c["perUSD"] = new
    was = cur.get("rateDate")
    cur["rateDate"] = day
    print(f"{changed} rates changed; rates dated {day} (were {was})" + (f"; not listed, kept: {', '.join(missing)}" if missing else ""))
    if "--write" in sys.argv:
        FILE.write_text(json.dumps(cur, ensure_ascii=False, indent=2) + "\n", "utf-8")


if __name__ == "__main__":
    main()
