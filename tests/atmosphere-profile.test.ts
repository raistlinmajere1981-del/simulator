import { describe, expect, it } from 'vitest';
import type { LayeredAtmosphereProfile } from '../src/shared/atmosphere';
import {
  buildAtmosphereLayers,
  interpolateAtmosphereAt,
  moistAirDensityKgM3,
  saturationVaporPressureHpa,
  validateAtmosphereProfile,
  waterVaporPartialPressureHpa
} from '../src/simulation/atmosphere-profile';

const profile: LayeredAtmosphereProfile = {
  kind: 'layered-meteorological',
  sourceLabel: 'Sahil ölçümü',
  observedAtIso: '2026-08-07T16:00:00+03:00',
  samples: [
    {
      id: 'surface',
      altitudeM: 0,
      temperatureC: 20,
      pressureHpa: 1013.25,
      relativeHumidityPercent: 60
    },
    {
      id: '50m',
      altitudeM: 50,
      temperatureC: 19.5,
      pressureHpa: 1007.3,
      relativeHumidityPercent: 55
    },
    {
      id: '100m',
      altitudeM: 100,
      temperatureC: 19,
      pressureHpa: 1001.4,
      relativeHumidityPercent: 50
    }
  ]
};

describe('layered atmosphere profile', () => {
  it('validates a physically bounded ordered profile', () => {
    expect(validateAtmosphereProfile(profile)).toEqual([]);
  });

  it('rejects duplicate or unordered sample heights and invalid humidity', () => {
    const invalid: LayeredAtmosphereProfile = {
      ...profile,
      observedAtIso: '2026-08-07T16:00:00',
      samples: [
        profile.samples[0],
        { ...profile.samples[1], altitudeM: 0, relativeHumidityPercent: 120 }
      ]
    };

    const errors = validateAtmosphereProfile(invalid);
    expect(errors.some((error) => error.includes('saat dilimi'))).toBe(true);
    expect(errors.some((error) => error.includes('kesin artan'))).toBe(true);
    expect(errors.some((error) => error.includes('bağıl nem'))).toBe(true);
  });

  it('interpolates meteorological state only inside measured layers', () => {
    expect(interpolateAtmosphereAt(profile, 25)).toEqual({
      altitudeM: 25,
      temperatureC: 19.75,
      pressureHpa: 1010.275,
      relativeHumidityPercent: 57.5
    });
    expect(() => interpolateAtmosphereAt(profile, 150)).toThrow(/kapsamı dışında/);
  });

  it('derives layer gradients without changing measured samples', () => {
    const layers = buildAtmosphereLayers(profile);
    expect(layers).toHaveLength(2);
    expect(layers[0].thicknessM).toBe(50);
    expect(layers[0].temperatureGradientKPerKm).toBeCloseTo(-10, 9);
    expect(layers[0].pressureGradientHpaPerKm).toBeCloseTo(-119, 9);
    expect(profile.samples[1].temperatureC).toBe(19.5);
  });

  it('computes vapor pressure and moist-air density as meteorological derived values', () => {
    expect(saturationVaporPressureHpa(20)).toBeCloseTo(23.38, 1);
    expect(waterVaporPartialPressureHpa(20, 50)).toBeCloseTo(11.69, 1);
    expect(moistAirDensityKgM3({
      temperatureC: 20,
      pressureHpa: 1013.25,
      relativeHumidityPercent: 50
    })).toBeCloseTo(1.199, 2);
  });
});
