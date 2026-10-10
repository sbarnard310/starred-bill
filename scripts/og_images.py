# Makes the link-preview pictures in src/og/: one for the homepage (default.png) and one for every
# country, region, city and district page. Run on the Mac after adding destinations: python3 scripts/og_images.py
# (build.py falls back to the nearest place above, then default.png, for pages without their own picture).
# Name pictures to draw only those, e.g. python3 scripts/og_images.py pick
import json, subprocess, sys, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
places = {json.loads(p.read_text())["id"]: json.loads(p.read_text()) for p in (ROOT / "content/places").glob("*.json")}
def in_sentence(p):
    return p.get("inSentence") or p["name"]
items = [{"id": "default", "title": "What a Michelin star costs, city by city", "sub": "Dinner, lunch and wine pairing prices, side by side"},
         {"id": "pick", "title": "Help me pick a Michelin star restaurant", "sub": "Six quick questions, three picks to fit your budget"}]
for pid, p in sorted(places.items()):
    if p["type"] in ("group", "cuisine"):  # cuisine pages use their city's picture
        continue
    items.append({"id": pid, "title": f"What a Michelin star costs in {in_sentence(p)}", "sub": "Dinner, lunch and wine pairing prices, side by side"})
if sys.argv[1:]:
    items = [it for it in items if it["id"] in sys.argv[1:]]
out = ROOT / "src/og"; out.mkdir(exist_ok=True)
with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
    json.dump(items, f)
print(subprocess.run(["osascript", "-l", "JavaScript", str(ROOT / "scripts/og_images.js"), f.name, str(out), str(ROOT / "brand/png/lockup-horizontal-on-dark-2400.png")], capture_output=True, text=True, check=True).stdout.strip())
