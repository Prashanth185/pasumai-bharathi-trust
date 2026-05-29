#!/usr/bin/env python3
import re
from pathlib import Path

root = Path(__file__).resolve().parent
pattern = re.compile(r"^\s*<a href=\"(?:\.\./){0,4}finance\.html\">Finance</a>\s*$", re.MULTILINE)

updated = []
for p in root.rglob('*.html'):
    try:
        text = p.read_text(encoding='utf8')
    except Exception:
        continue
    new = pattern.sub('', text)
    if new != text:
        p.write_text(new, encoding='utf8')
        updated.append(str(p))

if updated:
    print('Updated files:')
    for u in updated:
        print(u)
else:
    print('No files updated.')
