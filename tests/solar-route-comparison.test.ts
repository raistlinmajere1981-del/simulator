import { describe, expect, it } from 'vitest';
import {
  calculateSolarRouteComparison,
  createSolarRouteComparisonPrediction,
  SOLAR_ROUTE_COMPARISON_MODEL_ID
} from '../src/simulation/solar-route-comparison';

const EQUATOR_ROUTE = {
  experimentId: 'solar-route-test',
  observedAtIso: '2024-03-20T12:00:00.000Z',
  utcOffsetMinutes: 0,
  startLatitudeDeg: 0,
  startLongitudeDeg: 0,
  endLatitudeDeg: 0,
  endLongitudeDeg: 30,
  sampleCount: 5
};

describe('solar route comparison', () => {
  it('samples an equatorial WGS84 route at equal distance fractions', () => {
    const result = calculateSolarRouteComparison(EQUATOR_ROUTE);

    expect(result.routeMethod).toBe('vincenty');
    expect(result.routeDistanceM / 1_000).toBeCloseTo(3339.585, 1);
    expect(result.initialBearingDeg).toBeCloseTo(90, 6);
    expect(result.samples).toHaveLength(5);
    expect(result.samples.map((sample) => sample.fraction)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(result.samples[0]!.latitudeDeg).toBeCloseTo(0, 8);
    expect(result.samples[0]!.longitudeDeg).toBeCloseTo(0, 8);
    expect(result.samples.at(-1)!.latitudeDeg).toBeCloseTo(0, 8);
    expect(result.samples.at(-1)!.longitudeDeg).toBeCloseTo(30, 8);
    expect(result.samples[2]!.longitudeDeg).toBeCloseTo(15, 4);
  });

  it('shows the expected two-hour apparent solar clock shift across 30 degrees longitude', () => {
    const result = calculateSolarRouteComparison(EQUATOR_ROUTE);

    expect(result.apparentSolarClockDifferenceMinutes).toBeCloseTo(120, 6);
    expect(result.endMinusStartElevationDeg).toBeLessThan(-25);
    expect(result.startSolarElevationDeg).toBeGreaterThan(85);
    expect(result.endSolarElevationDeg).toBeGreaterThan(55);
  });

  it('keeps every route sample on the same physical UTC instant while solar geometry changes spatially', () => {
    const result = calculateSolarRouteComparison({
      ...EQUATOR_ROUTE,
      startLatitudeDeg: 41.0082,
      startLongitudeDeg: 28.9784,
      endLatitudeDeg: 41.0082,
      endLongitudeDeg: 58.9784,
      observedAtIso: '2024-08-11T10:00:00.000Z',
      utcOffsetMinutes: 180
    });

    expect(result.samples).toHaveLength(5);
    expect(result.apparentSolarClockDifferenceMinutes).toBeCloseTo(120, 6);
    expect(result.routeDistanceM).toBeGreaterThan(2_000_000);
    expect(result.routeDistanceM).toBeLessThan(3_000_000);
    expect(result.maximumSolarElevationDeg).toBeGreaterThanOrEqual(result.minimumSolarElevationDeg);
  });

  it('produces a traceable model prediction', () => {
    const result = calculateSolarRouteComparison(EQUATOR_ROUTE);
    const prediction = createSolarRouteComparisonPrediction(result);

    expect(prediction.modelId).toBe(SOLAR_ROUTE_COMPARISON_MODEL_ID);
    expect(prediction.metrics).toHaveLength(9);
    expect(prediction.trace.steps).toHaveLength(4);
    expect(prediction.warnings.some((warning) => warning.includes('aynı fiziksel UTC'))).toBe(true);
  });

  it('rejects coincident endpoints and unsafe sample counts', () => {
    expect(() => calculateSolarRouteComparison({
      ...EQUATOR_ROUTE,
      endLongitudeDeg: 0
    })).toThrow(/farklı başlangıç ve bitiş/i);

    expect(() => calculateSolarRouteComparison({
      ...EQUATOR_ROUTE,
      sampleCount: 2
    })).toThrow(/3–33/);
  });
});
