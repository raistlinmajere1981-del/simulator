import { describe, expect, it } from 'vitest';
import { buildTerrainProfileFromDem } from '../src/simulation/dem-route-profile';
import { parseEsriAsciiGrid } from '../src/simulation/esri-ascii-grid';

const grid = parseEsriAsciiGrid(`ncols 3
nrows 3
xllcenter -1
yllcenter -1
cellsize 1
NODATA_value -9999
7 8 9
1 2 3
4 5 6
`, 'route.asc');

const context = {
  observerLatitudeDeg: 0,
  observerLongitudeDeg: -1,
  targetLatitudeDeg: 0,
  targetLongitudeDeg: 1,
  samplingMethod: 'bilinear' as const,
  sampleCount: 5
};

describe('DEM route terrain profile', () => {
  it('samples a WGS84 route and produces ordered interior terrain points', () => {
    const profile = buildTerrainProfileFromDem(grid, context);

    expect(profile.kind).toBe('dem');
    expect(profile.sampleCount).toBe(5);
    expect(profile.points).toHaveLength(3);
    expect(profile.observerEndpointElevationM).toBeCloseTo(1, 9);
    expect(profile.points[1]?.distancePercent).toBe(50);
    expect(profile.points[1]?.elevationM).toBeCloseTo(2, 7);
    expect(profile.targetEndpointElevationM).toBeCloseTo(3, 9);
    expect(profile.sourceDistanceM).toBeGreaterThan(220_000);
    expect(profile.warnings.some((warning) => warning.includes('düşey datumu'))).toBe(true);
  });

  it('derives a bounded sample count when no count is requested', () => {
    const profile = buildTerrainProfileFromDem(grid, {
      ...context,
      sampleCount: undefined
    });
    expect(profile.sampleCount).toBeGreaterThanOrEqual(3);
    expect(profile.sampleCount).toBeLessThanOrEqual(2_002);
    expect(profile.sampleSpacingM).toBeGreaterThan(0);
  });

  it('rejects routes outside grid coverage or crossing NODATA', () => {
    expect(() => buildTerrainProfileFromDem(grid, {
      ...context,
      observerLongitudeDeg: -2
    })).toThrow('kapsamıyor');

    const noDataGrid = parseEsriAsciiGrid(`ncols 3
nrows 3
xllcenter -1
yllcenter -1
cellsize 1
NODATA_value -9999
7 8 9
1 -9999 3
4 5 6
`, 'nodata.asc');
    expect(() => buildTerrainProfileFromDem(noDataGrid, context)).toThrow('NODATA');
  });

  it('rejects invalid requested sample counts', () => {
    expect(() => buildTerrainProfileFromDem(grid, {
      ...context,
      sampleCount: 2
    })).toThrow('örnek sayısı');
  });
});
