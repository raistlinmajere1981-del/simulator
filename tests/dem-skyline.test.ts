import { describe, expect, it } from 'vitest';
import { generateDemSkyline } from '../src/simulation/dem-skyline';
import { parseEsriAsciiGrid } from '../src/simulation/esri-ascii-grid';

function gridFromRows(rows: readonly string[], fileName = 'skyline.asc') {
  return parseEsriAsciiGrid(`ncols 5
nrows 5
xllcenter -0.02
yllcenter -0.02
cellsize 0.01
NODATA_value -9999
${rows.join('\n')}
`, fileName);
}

const flatRows = [
  '0 0 0 0 0',
  '0 0 0 0 0',
  '0 0 0 0 0',
  '0 0 0 0 0',
  '0 0 0 0 0'
] as const;

const baseInput = {
  observer: { latitudeDeg: 0, longitudeDeg: 0 },
  observerHeightM: 2,
  heightDatumToEllipsoidOffsetM: 0,
  azimuthStepDeg: 90,
  distanceStepM: 500,
  maximumDistanceM: 2_000,
  samplingMethod: 'nearest' as const
};

describe('DEM skyline core', () => {
  it('produces a complete four-direction geometric skyline on a flat covered grid', () => {
    const result = generateDemSkyline({
      ...baseInput,
      grid: gridFromRows(flatRows)
    });

    expect(result.pointCount).toBe(4);
    expect(result.knownPointCount).toBe(4);
    expect(result.completeRayCount).toBe(4);
    expect(result.completeCoverage).toBe(true);
    expect(result.geodesicFallbackSampleCount).toBe(0);
    expect(result.observerGroundElevationM).toBe(0);
    expect(result.observerEyeEllipsoidalHeightM).toBe(2);
    expect(result.points.map((point) => point.azimuthDeg)).toEqual([0, 90, 180, 270]);
    result.points.forEach((point) => {
      expect(point.status).toBe('complete');
      expect(point.elevationDeg).not.toBeNull();
      expect(point.elevationDeg as number).toBeLessThan(0);
      expect(point.validSampleCount).toBe(4);
      expect(point.coverageDistanceM).toBe(2_000);
    });
  });

  it('selects a high eastern DEM cell as the skyline-critical sample', () => {
    const hillRows = [
      '0 0 0 0 0',
      '0 0 0 0 0',
      '0 0 0 120 0',
      '0 0 0 0 0',
      '0 0 0 0 0'
    ];
    const result = generateDemSkyline({
      ...baseInput,
      grid: gridFromRows(hillRows, 'east-hill.asc'),
      distanceStepM: 1_113,
      maximumDistanceM: 1_113
    });
    const east = result.points.find((point) => point.azimuthDeg === 90);
    const west = result.points.find((point) => point.azimuthDeg === 270);

    expect(east?.status).toBe('complete');
    expect(east?.criticalTerrainElevationM).toBe(120);
    expect(east?.criticalDistanceM).toBe(1_113);
    expect(east?.elevationDeg as number).toBeGreaterThan(5.5);
    expect(east?.criticalTopocentricAzimuthDeg as number).toBeCloseTo(90, 4);
    expect(west?.elevationDeg as number).toBeLessThan(0);
  });

  it('marks a NODATA-only direction incomplete instead of inventing a horizon', () => {
    const noDataNorthRows = [
      '0 0 0 0 0',
      '0 0 -9999 0 0',
      '0 0 0 0 0',
      '0 0 0 0 0',
      '0 0 0 0 0'
    ];
    const result = generateDemSkyline({
      ...baseInput,
      grid: gridFromRows(noDataNorthRows, 'north-nodata.asc'),
      distanceStepM: 1_113,
      maximumDistanceM: 1_113
    });
    const north = result.points[0];

    expect(north?.status).toBe('no-data');
    expect(north?.elevationDeg).toBeNull();
    expect(north?.noDataSampleCount).toBe(1);
    expect(result.noDataAffectedRayCount).toBe(1);
    expect(result.completeCoverage).toBe(false);
    expect(result.warnings.some((warning) => warning.includes('tam 360°'))).toBe(true);
  });

  it('reports grid-edge limitation when the requested range extends beyond coverage', () => {
    const result = generateDemSkyline({
      ...baseInput,
      grid: gridFromRows(flatRows, 'short-coverage.asc'),
      distanceStepM: 1_000,
      maximumDistanceM: 4_000
    });

    expect(result.completeCoverage).toBe(false);
    expect(result.coverageLimitedRayCount).toBe(4);
    expect(result.noCoverageRayCount).toBe(0);
    result.points.forEach((point) => {
      expect(point.status).toBe('coverage-limited');
      expect(point.coverageDistanceM).toBe(2_000);
      expect(point.elevationDeg).not.toBeNull();
    });
  });

  it('rejects invalid azimuth divisions, observer coverage and excessive sample budgets', () => {
    const grid = gridFromRows(flatRows);
    expect(() => generateDemSkyline({
      ...baseInput,
      grid,
      azimuthStepDeg: 7
    })).toThrow('tam bölmeli');
    expect(() => generateDemSkyline({
      ...baseInput,
      grid,
      observer: { latitudeDeg: 1, longitudeDeg: 1 }
    })).toThrow('grid kapsamının dışında');
    expect(() => generateDemSkyline({
      ...baseInput,
      grid,
      azimuthStepDeg: 0.25,
      distanceStepM: 100,
      maximumDistanceM: 200_000
    })).toThrow('örnek bütçesi');
  });
});
