import { describe, expect, it } from 'vitest';
import { reviewDemLineOfSight } from '../src/simulation/dem-line-of-sight-review';
import type { ImportedDemTerrainProfile } from '../src/shared/simulator';

function demProfile(midpointElevationM: number): ImportedDemTerrainProfile {
  return {
    kind: 'dem',
    fileName: 'review.asc',
    format: 'esri-ascii',
    samplingMethod: 'bilinear',
    geodesicMethod: 'vincenty',
    columnCount: 10,
    rowCount: 10,
    sampleCount: 3,
    sampleCountMode: 'manual',
    sampleSpacingM: 5_000,
    cellSizeDeg: 0.01,
    noDataValue: -9999,
    westBoundaryDeg: 28,
    eastBoundaryDeg: 30,
    southBoundaryDeg: 40,
    northBoundaryDeg: 42,
    diagnosticStatus: 'good',
    effectiveCellSpanM: 840,
    sampleSpacingToCellRatio: 5.95,
    minimumCoverageMarginM: 10_000,
    coverageMarginCellRatio: 11.9,
    minimumElevationM: 0,
    maximumElevationM: midpointElevationM,
    elevationRangeM: midpointElevationM,
    sourceDistanceM: 10_000,
    observerEndpointElevationM: 0,
    targetEndpointElevationM: 0,
    points: [{
      id: 'dem-sample-1',
      distancePercent: 50,
      elevationM: midpointElevationM
    }],
    warnings: []
  };
}

const baseInput = {
  observerGroundElevationM: 0,
  targetGroundElevationM: 0,
  observerHeightM: 10,
  targetHeightM: 10,
  verticalDatumOffsetM: 0,
  useStandardRefraction: false,
  refractionCoefficient: 0.13
};

describe('DEM line-of-sight review', () => {
  it('reports an open line of sight for a low midpoint', () => {
    const result = reviewDemLineOfSight(demProfile(0), baseInput);

    expect(result.blocked).toBe(false);
    expect(result.minimumClearanceM).toBeGreaterThan(0);
    expect(result.criticalDistancePercent).toBe(50);
    expect(result.blockingSampleCount).toBe(0);
    expect(result.atmosphereMode).toBe('off');
  });

  it('reports the blocking DEM sample and critical elevations', () => {
    const result = reviewDemLineOfSight(demProfile(30), baseInput);

    expect(result.blocked).toBe(true);
    expect(result.minimumClearanceM).toBeLessThan(0);
    expect(result.criticalDistanceM).toBe(5_000);
    expect(result.criticalTerrainElevationM).toBe(30);
    expect(result.criticalLineOfSightElevationM).toBeLessThan(10);
    expect(result.blockingSampleCount).toBe(1);
  });

  it('uses the selected endpoint grounds and datum offset', () => {
    const result = reviewDemLineOfSight(demProfile(20), {
      ...baseInput,
      observerGroundElevationM: 50,
      targetGroundElevationM: 50,
      verticalDatumOffsetM: 3
    });

    expect(result.blocked).toBe(false);
    expect(result.minimumClearanceM).toBeGreaterThan(30);
    expect(result.criticalTerrainElevationM).toBe(23);
  });

  it('uses effective radius when standard refraction is selected', () => {
    const result = reviewDemLineOfSight(demProfile(0), {
      ...baseInput,
      useStandardRefraction: true,
      refractionCoefficient: 0.13
    });

    expect(result.atmosphereMode).toBe('standard');
    expect(result.radiusM).toBeGreaterThan(6_371_008.8);
    expect(result.warnings.some((warning) => warning.includes('k=0.130'))).toBe(true);
  });

  it('rejects invalid thresholds and refraction coefficients', () => {
    expect(() => reviewDemLineOfSight(demProfile(0), {
      ...baseInput,
      nearClearanceThresholdM: -1
    })).toThrow('negatif');
    expect(() => reviewDemLineOfSight(demProfile(0), {
      ...baseInput,
      useStandardRefraction: true,
      refractionCoefficient: 1
    })).toThrow('1 değerinden küçük');
  });
});
