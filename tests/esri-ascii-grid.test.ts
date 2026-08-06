import { describe, expect, it } from 'vitest';
import {
  parseEsriAsciiGrid,
  sampleEsriAsciiGrid
} from '../src/simulation/esri-ascii-grid';

const basicGrid = `ncols 3
nrows 2
xllcorner 10
yllcorner 20
cellsize 1
NODATA_value -9999
4 5 6
1 2 3
`;

describe('ESRI ASCII DEM core', () => {
  it('parses north-to-south rows and derives WGS84 boundaries', () => {
    const grid = parseEsriAsciiGrid(basicGrid, '/tmp/sample.asc');

    expect(grid.fileName).toBe('sample.asc');
    expect(grid.columnCount).toBe(3);
    expect(grid.rowCount).toBe(2);
    expect(grid.originMode).toBe('corner');
    expect(grid.westBoundaryDeg).toBe(10);
    expect(grid.eastBoundaryDeg).toBe(13);
    expect(grid.southBoundaryDeg).toBe(20);
    expect(grid.northBoundaryDeg).toBe(22);
    expect(sampleEsriAsciiGrid(grid, 10.5, 20.5, 'nearest')).toBe(1);
    expect(sampleEsriAsciiGrid(grid, 11.5, 21.5, 'nearest')).toBe(5);
  });

  it('bilinearly interpolates between four cell centres', () => {
    const grid = parseEsriAsciiGrid(basicGrid, 'sample.asc');
    expect(sampleEsriAsciiGrid(grid, 11, 21, 'bilinear')).toBeCloseTo(3, 10);
  });

  it('supports lower-left cell-centre headers', () => {
    const grid = parseEsriAsciiGrid(`ncols 2
nrows 2
xllcenter 30
yllcenter 40
cellsize 0.5
1 2
3 4
`, 'center.asc');

    expect(grid.originMode).toBe('center');
    expect(grid.westCellCenterDeg).toBe(30);
    expect(grid.southCellCenterDeg).toBe(40);
    expect(grid.warnings).toHaveLength(1);
  });

  it('returns null outside coverage or when interpolation touches NODATA', () => {
    const grid = parseEsriAsciiGrid(`ncols 2
nrows 2
xllcorner 0
yllcorner 0
cellsize 1
NODATA_value -9999
1 2
3 -9999
`, 'nodata.asc');

    expect(sampleEsriAsciiGrid(grid, -1, 0.5)).toBeNull();
    expect(sampleEsriAsciiGrid(grid, 1, 1, 'bilinear')).toBeNull();
  });

  it('rejects malformed dimensions, row widths and non-WGS84 extents', () => {
    expect(() => parseEsriAsciiGrid(`ncols 2
nrows 2
xllcorner 0
yllcorner 0
cellsize 1
1 2
3
`, 'short.asc')).toThrow('hücre yerine');
    expect(() => parseEsriAsciiGrid(`ncols 2
nrows 1
xllcorner 179.5
yllcorner 0
cellsize 1
1 2
`, 'outside.asc')).toThrow('WGS84');
  });
});
