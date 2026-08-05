import { describe, expect, it } from 'vitest';
import type { TerrainProfile } from '../src/shared/terrain';
import {
  analyzePlanarTerrainClearance,
  analyzeSphericalTerrainClearance,
  validateTerrainProfile
} from '../src/simulation/terrain';
import { MEAN_EARTH_RADIUS_M } from '../src/simulation/geometry';

function profile(
  totalDistanceM: number,
  middleElevationM: number,
  offsetM = 0
): TerrainProfile {
  return {
    id: 'test-profile',
    label: 'Test profili',
    source: 'manual',
    datum: {
      kind: 'orthometric-msl',
      label: 'Ortalama deniz seviyesi',
      offsetM
    },
    totalDistanceM,
    samples: [
      { distanceM: 0, elevationM: 0 },
      { distanceM: totalDistanceM / 2, elevationM: middleElevationM },
      { distanceM: totalDistanceM, elevationM: 0 }
    ]
  };
}

describe('terrain profile validation', () => {
  it('accepts an ordered profile with route endpoints', () => {
    expect(validateTerrainProfile(profile(1_000, 0))).toEqual([]);
  });

  it('rejects duplicate and missing endpoint distances', () => {
    const invalid = profile(1_000, 0);
    invalid.samples = [
      { distanceM: 10, elevationM: 0 },
      { distanceM: 500, elevationM: 0 },
      { distanceM: 500, elevationM: 0 }
    ];

    const errors = validateTerrainProfile(invalid).join(' ');
    expect(errors).toContain('artan mesafe');
    expect(errors).toContain('ilk örneği 0 m');
    expect(errors).toContain('son örneği toplam mesafede');
  });
});

describe('planar terrain clearance', () => {
  it('keeps a flat two metre line of sight clear', () => {
    const result = analyzePlanarTerrainClearance(profile(1_000, 0), {
      observerEyeElevationM: 2,
      targetTopElevationM: 2,
      surfaceDistanceM: 1_000
    });

    expect(result.blocked).toBe(false);
    expect(result.minimumClearanceM).toBeCloseTo(2, 8);
    expect(result.criticalSample?.distanceM).toBe(500);
  });

  it('detects an intermediate obstacle and applies datum offset', () => {
    const result = analyzePlanarTerrainClearance(profile(1_000, 2.5, 0.5), {
      observerEyeElevationM: 2,
      targetTopElevationM: 2,
      surfaceDistanceM: 1_000
    });

    expect(result.blocked).toBe(true);
    expect(result.minimumClearanceM).toBeCloseTo(-1, 8);
    expect(result.criticalSample?.elevationM).toBe(3);
  });
});

describe('spherical terrain clearance', () => {
  it('shows curvature blocking an equal-height long line of sight', () => {
    const result = analyzeSphericalTerrainClearance(profile(100_000, 0), {
      observerEyeElevationM: 2,
      targetTopElevationM: 2,
      surfaceDistanceM: 100_000,
      radiusM: MEAN_EARTH_RADIUS_M
    });

    expect(result.blocked).toBe(true);
    expect(result.minimumClearanceM).toBeCloseTo(-194.2, 1);
  });

  it('increases midpoint clearance when an effective larger radius is used', () => {
    const base = analyzeSphericalTerrainClearance(profile(100_000, 0), {
      observerEyeElevationM: 50,
      targetTopElevationM: 50,
      surfaceDistanceM: 100_000,
      radiusM: MEAN_EARTH_RADIUS_M
    });
    const refracted = analyzeSphericalTerrainClearance(profile(100_000, 0), {
      observerEyeElevationM: 50,
      targetTopElevationM: 50,
      surfaceDistanceM: 100_000,
      radiusM: MEAN_EARTH_RADIUS_M / (1 - 0.13)
    });

    expect(refracted.minimumClearanceM).toBeGreaterThan(base.minimumClearanceM ?? -Infinity);
  });

  it('rejects a profile whose route length differs from the experiment', () => {
    expect(() => analyzeSphericalTerrainClearance(profile(1_000, 0), {
      observerEyeElevationM: 2,
      targetTopElevationM: 2,
      surfaceDistanceM: 900,
      radiusM: MEAN_EARTH_RADIUS_M
    })).toThrow('aynı olmalıdır');
  });
});
