# Makes the link-preview pictures in src/og/: one for the homepage (default.png) and one for every
# country, region, city and district page. Run on the Mac after adding destinations: python3 scripts/og_images.py
# (build.py falls back to the nearest place above, then default.png, for pages without their own picture).
import json, subprocess, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
places = {json.loads(p.read_text())["id"]: json.loads(p.read_text()) for p in (ROOT / "content/places").glob("*.json")}
def in_sentence(p):
    return p.get("inSentence") or p["name"]
items = [{"id": "default", "title": "What a Michelin star costs, city by city", "sub": "Dinner, lunch and wine pairing prices, side by side"}]
for pid, p in sorted(places.items()):
    if p["type"] == "group":
        continue
    items.append({"id": pid, "title": f"What a Michelin star costs in {in_sentence(p)}", "sub": "Dinner, lunch and wine pairing prices, side by side"})
out = ROOT / "src/og"; out.mkdir(exist_ok=True)
with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
    json.dump(items, f)
print(subprocess.run(["osascript", "-l", "JavaScript", str(ROOT / "scripts/og_images.js"), f.name, str(out)], capture_output=True, text=True, check=True).stdout.strip())
