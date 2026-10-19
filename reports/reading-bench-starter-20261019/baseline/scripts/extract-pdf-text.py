"""Extract text from a text-based official PDF into a stable raw snapshot."""
from pathlib import Path
import sys
from pypdf import PdfReader

if len(sys.argv) != 3:
    raise SystemExit("usage: extract-pdf-text.py INPUT.pdf OUTPUT.txt")

source, target = map(Path, sys.argv[1:])
reader = PdfReader(source)
text = "\n\n".join(f"--- PAGE {i + 1} ---\n{page.extract_text() or ''}" for i, page in enumerate(reader.pages))
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(text, encoding="utf-8")
print(f"Extracted {len(reader.pages)} pages to {target}")
