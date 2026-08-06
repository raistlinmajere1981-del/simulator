from pathlib import Path

path = Path('scripts/apply-esri-ascii-dem-core.py')
text = path.read_text(encoding='utf-8')
old = "write('src/simulation/esri-ascii-grid.ts', \"\"\""
new = "write('src/simulation/esri-ascii-grid.ts', r\"\"\""
count = text.count(old)
if count != 1:
    raise RuntimeError(f'Expected one ESRI TypeScript generator block, found {count}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
