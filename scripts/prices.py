#!/usr/bin/env python3
"""Record price checks and price changes in a restaurant's file (Phase 1, 27 Oct 2026; README "Price dates and provenance").

    python3 scripts/prices.py verify <id> [dinner|lunch|both] [--on 2026-10-27]
        You've just looked at the source and the recorded price is still right: sets priceVerifiedAt (and/or
        lunchVerifiedAt) to today, or the day given. Nothing else changes.

    python3 scripts/prices.py set <id> <dinner|wine|lunch|lunchWine> <amount> [--source URL] [--type site|press|member]
            [--kind restaurant|booking|guide|press|member] [--derived "how it was worked out"] [--on 2026-10-27]
        The price has changed: writes the new amount, sets the meal's ChangedAt and VerifiedAt to the day, and (for the
        dinner menu) keeps the old amount in priceHistory, dated the month it was last checked or recorded.

    python3 scripts/prices.py show <id>
        Prints the restaurant's prices with their provenance.

A check is only a check when someone has read the source that day: never set VerifiedAt for a price you haven't looked at.
Standard library only, Python 3.9.
"""
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "content" / "restaurants"
MEAL_OF = {"dinner": "dinner", "wine": "dinner", "lunch": "lunch", "lunchWine": "lunch"}
PRE = {"dinner": "price", "lunch": "lunch"}


def find(rid):
    hits = list(DIR.glob(f"*/{rid}.json"))
    if not hits:
        sys.exit(f"No restaurant file called {rid}.json")
    return hits[0]


def option(name, default=None):
    if name in sys.argv:
        i = sys.argv.index(name)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return default


def save(f, data):
    f.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")


def main():
    args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and not sys.argv[i - 1].startswith("--")]
    if len(args) < 2 or args[0] not in ("verify", "set", "show"):
        sys.exit(__doc__)
    cmd, rid = args[0], args[1]
    f = find(rid)
    data = json.loads(f.read_text("utf-8"))
    day = option("--on", date.today().isoformat())
    if day > date.today().isoformat():
        sys.exit("A check can't be dated in the future.")
    if cmd == "show":
        for meal, pre, src in (("dinner", "price", ""), ("lunch", "lunch", "lunch")):
            if data.get(meal) is None:
                continue
            wine = data.get("wine" if meal == "dinner" else "lunchWine")
            print(f"{meal}: {data[meal]}" + (f" + wine {wine}" if wine is not None else "") + f"  source {data.get((src + 'Source') if src else 'source')}"
                  f" ({data.get((src + 'SourceType') if src else 'sourceType')})  checked {data.get(pre + 'VerifiedAt') or '–'}"
                  f"  changed {data.get(pre + 'ChangedAt') or '–'}" + (f"  derived: {data.get(pre + 'Derived')}" if data.get(pre + "Derived") else ""))
        return
    if cmd == "verify":
        which = args[2] if len(args) > 2 else "both"
        meals = ["dinner", "lunch"] if which == "both" else [which]
        for meal in meals:
            if meal not in PRE:
                sys.exit("verify takes dinner, lunch or both")
            if data.get(meal) is None:
                if which != "both":
                    sys.exit(f"{rid} has no {meal} price to verify")
                continue
            data[PRE[meal] + "VerifiedAt"] = day
            print(f"{rid}: {meal} price {data[meal]} checked {day}")
        save(f, data)
        return
    if len(args) < 4 or args[2] not in MEAL_OF:
        sys.exit("set takes a field (dinner, wine, lunch or lunchWine) and an amount")
    field, amount = args[2], float(args[3])
    amount = int(amount) if amount == int(amount) else amount
    meal, pre = MEAL_OF[field], PRE[MEAL_OF[field]]
    old = data.get(field)
    if field == "dinner" and old is not None and old != amount and data.get("dinnerType", "menu") == "menu":
        seen = data.get("priceVerifiedAt") or data.get("priceChangedAt") or day
        point = {"date": seen[:7], "price": old}
        if data.get("wine") is not None:
            point["wine"] = data["wine"]
        if data.get("source"):
            point["source"] = data["source"]
        history = [h for h in data.get("priceHistory", []) if h.get("date") != point["date"]]
        data["priceHistory"] = sorted(history + [point], key=lambda h: h["date"])
    data[field] = amount
    if old != amount:
        data[pre + "ChangedAt"] = day
    data[pre + "VerifiedAt"] = day
    src = "" if meal == "dinner" else "lunch"
    key = (lambda k: src + k if src else k[0].lower() + k[1:])
    if option("--source"):
        data[key("Source")] = option("--source")
    if option("--type"):
        data[key("SourceType")] = option("--type")
    if option("--kind"):
        data[key("SourceKind")] = option("--kind")
    if option("--derived"):
        data[pre + "Derived"] = option("--derived")
    save(f, data)
    print(f"{rid}: {field} {old} → {amount}, checked {day}")


if __name__ == "__main__":
    main()
