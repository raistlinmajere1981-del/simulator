import { describe, expect, it } from 'vitest';
import { inverseWgs84Geodesic } from '../src/simulation/geodesy';

describe('WGS84 inverse geodesic', () => {
  it('matches the published Flinders Peak to Buninyong Vincenty example', () => {
    const result = inverseWgs84Geodesic(
      { latitudeDeg: -37.95103, longitudeDeg: 144.42487 },
      { latitudeDeg: -37.6528, longitudeDeg: 143.9265 }
    );

    expect(result.method).toBe('vincenty');
    expect(result.converged).toBe(true);
    expect(result.distanceM).toBeCloseTo(54_972.271, 2);
    expect(result.initialBearingDeg).toBeCloseTo(306.86816, 4);
    expect(result.finalBearingDeg).toBeCloseTo(307.1736, 4);
    expect(result.trace.steps.some((step) => step.id === 'ellipsoidal-distance')).toBe(true);
  });

  it('returns zero distance for coincident coordinates', () => {
    const result = inverseWgs84Geodesic(
      { latitudeDeg: 41.0082, longitudeDeg: 28.9784 },
      { latitudeDeg: 41.0082, longitudeDeg: 28.9784 }
    );

    expect(result.distanceM).toBe(0);
    expect(result.iterations).toBe(0);
    expect(result.warnings).toHaveLength(1);
  });

  it('uses an explicitly marked fallback when Vincenty cannot converge', () => {
    const result = inverseWgs84Geodesic(
      { latitudeDeg: 0, longitudeDeg: 0 },
      { latitudeDeg: 0.5, longitudeDeg: 179.7 },
      2
    );

    expect(result.method).toBe('spherical-fallback');
    expect(result.converged).toBe(false);
    expect(result.distanceM).toBeGreaterThan(19_000_000);
    expect(result.warnings[0]).toContain('yakınsamadı');
  });

  it('rejects coordinates outside geographic ranges', () => {
    expect(() => inverseWgs84Geodesic(
      { latitudeDeg: 91, longitudeDeg: 0 },
      { latitudeDeg: 0, longitudeDeg: 0 }
    )).toThrow(RangeError);
  });
});
