from pathlib import Path

module_path = Path('src/simulation/esri-ascii-grid.ts')
module = module_path.read_text(encoding='utf-8')
old = """  const hasCornerOrigin = finite(header.xllcorner) && finite(header.yllcorner);
  const hasCenterOrigin = finite(header.xllcenter) && finite(header.yllcenter);
  if (hasCornerOrigin === hasCenterOrigin) {
    throw new Error('Tam olarak bir xllcorner/yllcorner veya xllcenter/yllcenter çifti gerekli.');
  }
"""
new = """  const hasAnyCornerOrigin = finite(header.xllcorner) || finite(header.yllcorner);
  const hasAnyCenterOrigin = finite(header.xllcenter) || finite(header.yllcenter);
  const hasCornerOrigin = finite(header.xllcorner) && finite(header.yllcorner);
  const hasCenterOrigin = finite(header.xllcenter) && finite(header.yllcenter);
  if ((hasAnyCornerOrigin && !hasCornerOrigin) ||
    (hasAnyCenterOrigin && !hasCenterOrigin) ||
    hasCornerOrigin === hasCenterOrigin) {
    throw new Error(
      'Tam olarak bir eksiksiz xllcorner/yllcorner veya xllcenter/yllcenter çifti gerekli.'
    );
  }
"""
if module.count(old) != 1:
    raise RuntimeError(f'Expected one origin validation block, found {module.count(old)}')
module_path.write_text(module.replace(old, new, 1), encoding='utf-8')

test_path = Path('tests/esri-ascii-grid.test.ts')
test = test_path.read_text(encoding='utf-8')
marker = """  it('returns null outside coverage or when interpolation touches NODATA', () => {
"""
addition = """  it('rejects partial and mixed lower-left origin headers', () => {
    expect(() => parseEsriAsciiGrid(`ncols 1
nrows 1
xllcorner 0
yllcenter 0
cellsize 1
1
`, 'mixed.asc')).toThrow('eksiksiz');

    expect(() => parseEsriAsciiGrid(`ncols 1
nrows 1
xllcorner 0
yllcorner 0
xllcenter 0.5
cellsize 1
1
`, 'partial-extra.asc')).toThrow('eksiksiz');
  });

"""
if test.count(marker) != 1:
    raise RuntimeError(f'Expected one NODATA test marker, found {test.count(marker)}')
test_path.write_text(test.replace(marker, addition + marker, 1), encoding='utf-8')
