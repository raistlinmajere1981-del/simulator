import { describe, expect, it } from 'vitest';
import {
  effectiveRadiusM,
  horizonDistanceM,
  MEAN_EARTH_RADIUS_M,
  minimumVisiblePointHeightM,
  planarElevationAngleDeg,
  sphericalElevationAngleDeg,
  surfaceDropFromTangentM,
  surfaceHorizonDistanceM
} from '../src/simulation/geometry';

describe('geometry helpers', () => {
  it('calculates the geometric horizon for a two metre observer', () => {
    expect(horizonDistanceM(2) / 1_000).toBeCloseTo(5.05, 2);
    expect(surfaceHorizonDistanceM(2) / 1_000).toBeCloseTo(5.05, 2);
  });

  it('returns zero drop at zero distance', () => {
    expect(surfaceDropFromTangentM(0)).toBe(0);
  });

  it('increases the effective radius with positive refraction', () => {
    expect(effectiveRadiusM(MEAN_EARTH_RADIUS_M, 0.13)).toBeGreaterThan(
      MEAN_EARTH_RADIUS_M
    );
  });

  it('requires a higher target point beyond the observer horizon', () => {
    const requiredHeightM = minimumVisiblePointHeightM(22_380, 10);
    expect(requiredHeightM).toBeCloseTo(9.66, 1);
  });

  it('calculates signed spherical and planar elevation angles', () => {
    expect(sphericalElevationAngleDeg(22_380, 10, 15)).toBeLessThan(0);
    expect(planarElevationAngleDeg(22_380, 10, 15)).toBeGreaterThan(0);
  });

  it('rejects negative observer heights', () => {
    expect(() => horizonDistanceM(-1)).toThrow(RangeError);
  });
});
