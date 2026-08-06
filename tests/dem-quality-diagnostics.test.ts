import { describe, expect, it } from 'vitest';
import { analyzeDemRouteQuality } from '../src/simulation/dem-quality-diagnostics';

const base = {
  cellSizeDeg: 0.01,
  sampleSpacingM: 300,
  samplingMethod: 'bilinear' as const,
  westBoundaryDeg: -2,
  eastBoundaryDeg: 2,
  southBoundaryDeg: -2,
  northBoundaryDeg: 2,
  points: [
    { latitudeDeg: 0, longitudeDeg: -1, elevationM: 10 },
    { latitudeDeg: 0, longitudeDeg: 0, elevationM: 25 },
    { latitudeDeg: 0, longitudeDeg: 1, elevationM: 15 }
  ]
};

describe('DEM route quality diagnostics', () => {
  it('reports dense bilinear sampling with elevation statistics', () => {
    const result = analyzeDemRouteQuality(base);

    expect(result.diagnosticStatus).toBe('good');
    expect(result.effectiveCellSpanM).toBeGreaterThan(1_100);
    expect(result.sampleSpacingToCellRatio).toBeLessThan(0.5);
    expect(result.coverageMarginCellRatio).toBeGreaterThan(1);
    expect(result.minimumElevationM).toBe(10);
    expect(result.maximumElevationM).toBe(25);
    expect(result.elevationRangeM).toBe(15);
    expect(result.warnings).toEqual([]);
  });

  it('marks nearest-cell sampling as cautionary', () => {
    const result = analyzeDemRouteQuality({
      ...base,
      samplingMethod: 'nearest'
    });

    expect(result.diagnosticStatus).toBe('caution');
    expect(result.warnings.some((warning) => warning.includes('En yakın hücre'))).toBe(true);
  });

  it('marks undersampling and edge-adjacent coverage as limited', () => {
    const result = analyzeDemRouteQuality({
      ...base,
      sampleSpacingM: 2_000,
      points: [
        { latitudeDeg: 0, longitudeDeg: -1.999, elevationM: 10 },
        { latitudeDeg: 0, longitudeDeg: 0, elevationM: 20 },
        { latitudeDeg: 0, longitudeDeg: 1, elevationM: 30 }
      ]
    });

    expect(result.diagnosticStatus).toBe('limited');
    expect(result.sampleSpacingToCellRatio).toBeGreaterThan(1);
    expect(result.coverageMarginCellRatio).toBeLessThan(0.5);
    expect(result.warnings).toHaveLength(2);
  });

  it('rejects partial or out-of-coverage diagnostic input', () => {
    expect(() => analyzeDemRouteQuality({
      ...base,
      points: [base.points[0]!]
    })).toThrow('en az iki');
    expect(() => analyzeDemRouteQuality({
      ...base,
      points: [
        ...base.points,
        { latitudeDeg: 0, longitudeDeg: 3, elevationM: 5 }
      ]
    })).toThrow('kapsamının dışında');
  });
});
