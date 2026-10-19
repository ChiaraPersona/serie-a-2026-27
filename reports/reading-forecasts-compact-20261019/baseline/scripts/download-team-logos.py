"""Download official Lega Serie A club logos and store optimized local PNG files."""
from io import BytesIO
from pathlib import Path
import json
import urllib.request
from PIL import Image

root = Path(__file__).resolve().parents[1]
sources = json.loads((root / "data/raw/teams/logo-sources.json").read_text(encoding="utf-8"))
output = root / "assets/images/teams"
output.mkdir(parents=True, exist_ok=True)

for item in sources:
    request = urllib.request.Request(item["sourceUrl"], headers={"User-Agent": "serie-a-2026-27-static-site/1.0"})
    with urllib.request.urlopen(request) as response:
        image = Image.open(BytesIO(response.read())).convert("RGBA")
    target = output / f'{item["id"]}.png'
    image.save(target, format="PNG", optimize=True)
    print(f'{item["id"]}: {image.width}x{image.height} -> {target.name}')
