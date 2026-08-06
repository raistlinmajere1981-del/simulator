from pathlib import Path

path = Path('src/shared/simulator.ts')
text = path.read_text(encoding='utf-8')
old = """  importTerrainProfileWithMapping(
    requestId: string,
    mapping: TerrainProfileColumnMapping,
    context: TerrainProfileImportContext
  ): Promise<ImportTerrainProfileResult>;
}
"""
new = """  importTerrainProfileWithMapping(
    requestId: string,
    mapping: TerrainProfileColumnMapping,
    context: TerrainProfileImportContext
  ): Promise<ImportTerrainProfileResult>;
  importGeoJsonTerrainProfile(
    context: TerrainProfileImportContext
  ): Promise<ImportTerrainProfileResult>;
}
"""
count = text.count(old)
if count != 1:
    raise RuntimeError(f'Expected one desktop API marker, found {count}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
