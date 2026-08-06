from pathlib import Path

path = Path('scripts/apply-dem-sampling-controls.py')
text = path.read_text(encoding='utf-8')
start_marker = "replace_once(\n    'src/shared/simulator.ts',\n    \"\"\"  sampleCount: number;"
end_marker = "# There are two sampleCount blocks; add required mode to imported profile separately."
start = text.index(start_marker)
end = text.index(end_marker, start)
replacement = '''simulator = read('src/shared/simulator.ts')
source_marker = """export interface DemTerrainProfileSource extends BaseTerrainProfileSource {
  kind: 'dem';
  format: 'esri-ascii';
  samplingMethod: DemTerrainSamplingMethod;
  geodesicMethod: SavedGeodesicMethod;
  columnCount: number;
  rowCount: number;
  sampleCount: number;
  sampleSpacingM: number;
"""
source_replacement = """export interface DemTerrainProfileSource extends BaseTerrainProfileSource {
  kind: 'dem';
  format: 'esri-ascii';
  samplingMethod: DemTerrainSamplingMethod;
  geodesicMethod: SavedGeodesicMethod;
  columnCount: number;
  rowCount: number;
  sampleCount: number;
  sampleCountMode?: DemTerrainSampleCountMode;
  sampleSpacingM: number;
"""
if simulator.count(source_marker) != 1:
    raise RuntimeError(f'DEM source sample mode: expected one match, found {simulator.count(source_marker)}')
write('src/shared/simulator.ts', simulator.replace(source_marker, source_replacement, 1))

# Add required mode to imported profile separately.
'''
text = text[:start] + replacement + text[end + len(end_marker):]
path.write_text(text, encoding='utf-8')
