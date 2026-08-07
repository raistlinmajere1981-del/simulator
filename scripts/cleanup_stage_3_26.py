from pathlib import Path

path = Path('src/renderer/src/AppNext.tsx')
text = path.read_text()
block = """function terrainVisualizationSourceLabel(source: TerrainProfileSource | undefined): string {
  if (!source) return 'Manuel profil';
  if (source.kind === 'dem') return `DEM · ${source.fileName}`;
  if (source.kind === 'geojson') return `GeoJSON · ${source.fileName}`;
  return `CSV · ${source.fileName}`;
}
"""
count = text.count(block)
if count < 1:
    raise SystemExit('terrain source label helper not found')
if count > 1:
    first = text.index(block)
    before = text[:first + len(block)]
    after = text[first + len(block):].replace('\n' + block, '')
    text = before + after
path.write_text(text)
