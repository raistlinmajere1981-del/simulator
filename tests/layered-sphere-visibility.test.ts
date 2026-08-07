import { describe, expect, it } from 'vitest';
import type { LayeredAtmosphereProfile } from '../src/shared/atmosphere';
import type { TerrainProfile } from '../src/shared/terrain';
import { surfaceHorizonDistanceM, MEAN_EARTH_RADIUS_M } from '../src/simulation/geometry';
import {
  analyzeLayeredSphereHorizon,
  analyzeLayeredSphereVisibility
} from '../src/simulation/layered-sphere-visibility';

const settings = { wavelengthNm: 550, carbonDioxidePpm: 450 };

const standardLikeProfile: LayeredAtmosphereProfile = {
  kind: 'layered-meteorological',
  sourceLabel: 'Standart benzeri yakın yüzey profili',
  samples: [
    { id: '0', altitudeM: 0, temperatureC: 15, pressureHpa: 1013.25, relativeHumidityPercent: 50 },
    { id: '100', altitudeM: 100, temperatureC: 14.35, pressureHpa: 1001.29, relativeHumidityPercent: 50 },
    { id: '200', altitudeM: 200, temperatureC: 13.7, pressureHpa: 989.29, relativeHumidityPercent: 50 }
  ]
};

const constantIndexProfile: LayeredAtmosphereProfile = {
  kind: 'layered-meteorological',
  sourceLabel: 'Sıfır indis gradyanı',
  samples: [
    { id: '0', altitudeM: 0, temperatureC: 15, pressureHpa: 1013.25, relativeHumidityPercent: 50 },
    { id: '100', altitudeM: 100, temperatureC: 15, pressureHpa: 1013.25, relativeHumidityPercent: 50 },
    { id: '200', altitudeM: 200, temperatureC: 15, pressureHpa: 1013.25, relativeHumidityPercent: 50 }
  ]
};

describe('layered sphere horizon coupling', () => {
  it('stays close to the geometric spherical horizon for zero refractive-index gradient', () => {
    const observerAltitudeM = 10;
    const result = analyzeLayeredSphereHorizon({
      profile: constantIndexProfile,
      settings,
      observerAltitudeM,
      stepM: 10
    });
    const geometric = surfaceHorizonDistanceM(observerAltitudeM, MEAN_EARTH_RADIUS_M);

    expect(result.horizonSurfaceDistanceM).not.toBeNull();
    expect(Math.abs((result.horizonSurfaceDistanceM ?? 0) - geometric)).toBeLessThan(80);
    expect(result.grazingInitialElevationDeg).not.toBeNull();
  });

  it('extends the optical horizon for a normal negative refractivity gradient', () => {
    const observerAltitudeM = 10;
    const straight = analyzeLayeredSphereHorizon({
      profile: constantIndexProfile,
      settings,
      observerAltitudeM,
      stepM: 10
    });
    const refracted = analyzeLayeredSphereHorizon({
      profile: standardLikeProfile,
      settings,
      observerAltitudeM,
      stepM: 10
    });

    expect(refracted.horizonSurfaceDistanceM).not.toBeNull();
    expect(straight.horizonSurfaceDistanceM).not.toBeNull();
    expect(refracted.horizonSurfaceDistanceM!).toBeGreaterThan(straight.horizonSurfaceDistanceM!);
  });
});

describe('layered sphere target visibility coupling', () => {
  it('finds a nearly fully visible target inside the optical horizon', () => {
    const result = analyzeLayeredSphereVisibility({
      profile: standardLikeProfile,
      settings,
      observerAltitudeM: 10,
      targetSurfaceDistanceM: 8_000,
      targetBaseAltitudeM: 0,
      targetHeightM: 20,
      stepM: 10
    });

    expect(result.visibleFraction).toBeGreaterThan(0.99);
    expect(result.minimumVisibleAltitudeM).toBeLessThan(0.2);
    expect(result.targetTopElevationDeg).not.toBeNull();
  });

  it('raises the minimum visible altitude when an interior terrain obstacle is added', () => {
    const terrain: TerrainProfile = {
      id: 'ridge',
      label: 'Ara sırt',
      source: 'manual',
      datum: { kind: 'orthometric-msl', label: 'MSL', offsetM: 0 },
      totalDistanceM: 20_000,
      samples: [
        { distanceM: 0, elevationM: 0 },
        { distanceM: 10_000, elevationM: 35 },
        { distanceM: 20_000, elevationM: 0 }
      ]
    };

    const clear = analyzeLayeredSphereVisibility({
      profile: standardLikeProfile,
      settings,
      observerAltitudeM: 10,
      targetSurfaceDistanceM: 20_000,
      targetBaseAltitudeM: 0,
      targetHeightM: 80,
      stepM: 20
    });
    const obstructed = analyzeLayeredSphereVisibility({
      profile: standardLikeProfile,
      settings,
      observerAltitudeM: 10,
      targetSurfaceDistanceM: 20_000,
      targetBaseAltitudeM: 0,
      targetHeightM: 80,
      terrainProfile: terrain,
      stepM: 20
    });

    expect(obstructed.minimumVisibleAltitudeM).toBeGreaterThan(clear.minimumVisibleAltitudeM);
    expect(obstructed.visibleFraction).toBeLessThan(clear.visibleFraction);
    expect(obstructed.grazingTerrainCriticalDistanceM).toBeCloseTo(10_000, 0);
  });

  it('rejects a target whose vertical extent leaves the measured atmosphere profile', () => {
    expect(() => analyzeLayeredSphereVisibility({
      profile: standardLikeProfile,
      settings,
      observerAltitudeM: 10,
      targetSurfaceDistanceM: 10_000,
      targetBaseAltitudeM: 0,
      targetHeightM: 250,
      stepM: 10
    })).toThrow(/ölçüm kapsamı/);
  });
});
