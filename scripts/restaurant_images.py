# Draws each restaurant page's link-preview picture (src/og/restaurants/<id>.png, 1200 × 630): the restaurant's name and
# stars on the site's green, beside its till receipt (dinner, lunch, wine pairing, dinner + wine), as the page shows it.
# Run on the Mac after adding restaurant pages or changing their prices: python3 scripts/restaurant_images.py
# (name ids to draw only those, e.g. python3 scripts/restaurant_images.py le-bernardin). build.py uses the picture
# when it's there, else the town's.
import json, re, subprocess, sys, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
build = (ROOT / "build.py").read_text("utf-8")
ids = re.findall(r'"([a-z0-9-]+)"', re.search(r"^RESTAURANT_PAGES = \(([^)]*)\)", build, re.M).group(1))
if sys.argv[1:]:
    ids = [i for i in ids if i in sys.argv[1:]]
files = {p.stem: p for p in (ROOT / "content/restaurants").rglob("*.json")}
places = {json.loads(p.read_text())["id"]: json.loads(p.read_text()) for p in (ROOT / "content/places").glob("*.json")}
currencies = {c["code"]: c for c in json.loads((ROOT / "content/currencies.json").read_text())["currencies"]}
month = json.loads((ROOT / "content/site.json").read_text()).get("updated", "")
months = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
checked = f"Checked {months[int(month[5:7]) - 1]} {month[:4]}" if re.fullmatch(r"\d{4}-\d{2}", month) else ""
# The receipt's footer line for each country, from SERVICE in common.js (as build.py's read_service()).
js = (ROOT / "src/assets/common.js").read_text("utf-8")
block = js[js.index("const SERVICE = {"):]
service = {m.group(1): m.group(2) for m in re.finditer(r'"?([\w-]+)"?: \["(\w+)", [\d.]+\]', block[:block.index("};")])}
m = re.search(r'\[([^\]]+)\]\.forEach\(\(c\) => \{ SERVICE\[c\] = \["(\w+)"', block)
service.update({c: m.group(2) for c in re.findall(r'"([\w-]+)"', m.group(1))})
FOOT = {"before": "Per person, before service", "included": "Per person, service included", "plusplus": "Per person, ++ (service and tax added)",
        "taxtip": "Per person, before tax and tip", "tip": "Per person, before tip", "tax": "Per person, tax included"}


def chain(pid):
    out = []
    while pid in places and pid not in out:
        out.append(pid)
        pid = places[pid].get("parent")
    return out


items = []
for rid in ids:
    r = json.loads(files[rid].read_text())
    c = chain(r["city"])
    country = c[-1]
    cur = places[country].get("currency", "USD")
    sym = "$" if cur == "USD" else currencies[cur]["symbol"] + (" " if currencies[cur]["symbol"][-1].isalpha() else "")
    money = lambda n: sym + (f"{n:,.0f}" if float(n).is_integer() else f"{n:,.2f}")
    lines = []
    if r.get("dinner") is not None:
        lines.append(["Dinner", money(r["dinner"])])
    if r.get("noLunch"):
        lines.append(["Lunch", "Dinner only"])
    elif r.get("lunch") is not None:
        lines.append(["Lunch", money(r["lunch"])])
    if r.get("wine"):
        lines.append(["Wine pairing", money(r["wine"])])
    total = money(r["dinner"] + r["wine"]) if r.get("wine") and r.get("dinner") is not None and r.get("dinnerType", "menu") == "menu" else ""
    where = ", ".join(dict.fromkeys(x for x in [(r.get("area") or "").split(",")[0]] + [places[p]["name"] for p in c if places[p]["type"] in ("district", "city")] if x))
    items.append({"id": rid, "name": r["name"], "stars": r.get("stars", 0), "where": where or places[c[0]]["name"],
                  "lines": lines, "total": total, "foot": FOOT[service.get(country, "before")], "checked": checked})
out = ROOT / "src/og/restaurants"
out.mkdir(parents=True, exist_ok=True)
with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
    json.dump(items, f)
print(subprocess.run(["osascript", "-l", "JavaScript", str(ROOT / "scripts/restaurant_images.js"), f.name, str(out), str(ROOT / "brand/png/lockup-horizontal-on-dark-2400.png")], capture_output=True, text=True, check=True).stdout.strip())
