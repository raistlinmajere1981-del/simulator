import { describe, expect, it } from 'vitest';
import type { LayeredAtmosphereProfile } from '../src/shared/atmosphere';
import { traceLayeredAtmosphereRay } from '../src/simulation/layered-ray-tracing';
import {
  buildOpticalAtmosphereProfile,
  ciddorPhaseRefractiveIndex,
  opticalIndexAtAltitude
} from '../src/simulation/optical-refraction';

const opticalSettings = {
  wavelengthNm: 550,
  carbonDioxidePpm: 450
};

const typicalProfile: LayeredAtmosphereProfile = {
  kind: 'layered-meteorological',
  sourceLabel: 'Yakın yüzey profil testi',
  samples: [
    {
      id: '0m',
      altitudeM: 0,
      temperatureC: 20,
      pressureHpa: 1013.25,
      relativeHumidityPercent: 60
    },
    {
      id: '100m',
      altitudeM: 100,
      temperatureC: 19.35,
      pressureHpa: 1001.3,
      relativeHumidityPercent: 55
    }
  ]
};

describe('Ciddor optical refraction', () => {
  it('matches NIST Ciddor table values at 633 nm', () => {
    expect(ciddorPhaseRefractiveIndex({
      wavelengthNm: 633,
      temperatureC: 20,
      pressureHpa: 1013.25,
      relativeHumidityPercent: 0,
      carbonDioxidePpm: 450
    })).toBeCloseTo(1.000271800, 9);

    expect(ciddorPhaseRefractiveIndex({
      wavelengthNm: 633,
      temperatureC: 20,
      pressureHpa: 1000,
      relativeHumidityPercent: 100,
      carbonDioxidePpm: 450
    })).toBeCloseTo(1.000267394, 9);
  });

  it('preserves visible-light dispersion and rejects undocumented extrapolation', () => {
    const blue = ciddorPhaseRefractiveIndex({
      wavelengthNm: 450,
      temperatureC: 20,
      pressureHpa: 1013.25,
      relativeHumidityPercent: 50,
      carbonDioxidePpm: 450
    });
    const red = ciddorPhaseRefractiveIndex({
      wavelengthNm: 650,
      temperatureC: 20,
      pressureHpa: 1013.25,
      relativeHumidityPercent: 50,
      carbonDioxidePpm: 450
    });

    expect(blue).toBeGreaterThan(red);
    expect(() => ciddorPhaseRefractiveIndex({
      wavelengthNm: 550,
      temperatureC: 20,
      pressureHpa: 700,
      relativeHumidityPercent: 50,
      carbonDioxidePpm: 450
    })).toThrow(/800–1200 hPa/);
  });

  it('derives refractivity gradients and a local effective-k diagnostic', () => {
    const optical = buildOpticalAtmosphereProfile(typicalProfile, opticalSettings);
    expect(optical.samples).toHaveLength(2);
    expect(optical.layers).toHaveLength(1);
    const layer = optical.layers[0]!;
    expect(layer.refractiveIndexGradientPerM).toBeLessThan(0);
    expect(layer.refractivityGradientNPerKm).toBeCloseTo(-25.61, 1);
    expect(layer.effectiveK).toBeCloseTo(0.163, 2);

    const middle = opticalIndexAtAltitude(optical, 50);
    expect(middle.refractiveIndex).toBeCloseTo(
      (optical.samples[0]!.refractiveIndex + optical.samples[1]!.refractiveIndex) / 2,
      12
    );
  });
});

describe('layered spherical optical ray tracing', () => {
  it('keeps a zero-gradient tangent ray straight in inertial space', () => {
    const constantProfile: LayeredAtmosphereProfile = {
      kind: 'layered-meteorological',
      sourceLabel: 'Sabit indis testi',
      samples: [
        {
          id: '0m',
          altitudeM: 0,
          temperatureC: 20,
          pressureHpa: 1013.25,
          relativeHumidityPercent: 50
        },
        {
          id: '100m',
          altitudeM: 100,
          temperatureC: 20,
          pressureHpa: 1013.25,
          relativeHumidityPercent: 50
        }
      ]
    };

    const result = traceLayeredAtmosphereRay(constantProfile, {
      settings: opticalSettings,
      observerAltitudeM: 10,
      initialElevationDeg: 0,
      maxPathLengthM: 10_000,
      stepM: 10
    });

    expect(result.terminationReason).toBe('max-path');
    const final = result.samples[result.samples.length - 1]!;
    expect(final.surfaceDistanceM).toBeCloseTo(10_000, -1);
    expect(final.altitudeM).toBeCloseTo(17.85, 1);
  });

  it('bends a tangent ray downward when refractive index decreases with height', () => {
    const bent = traceLayeredAtmosphereRay(typicalProfile, {
      settings: opticalSettings,
      observerAltitudeM: 10,
      initialElevationDeg: 0,
      maxPathLengthM: 10_000,
      stepM: 10
    });

    const constantProfile: LayeredAtmosphereProfile = {
      kind: 'layered-meteorological',
      sourceLabel: 'Sabit indis karşılaştırması',
      samples: [typicalProfile.samples[0]!, {
        ...typicalProfile.samples[0]!,
        id: '100m',
        altitudeM: 100
      }]
    };
    const straight = traceLayeredAtmosphereRay(constantProfile, {
      settings: opticalSettings,
      observerAltitudeM: 10,
      initialElevationDeg: 0,
      maxPathLengthM: 10_000,
      stepM: 10
    });

    const bentFinal = bent.samples[bent.samples.length - 1]!;
    const straightFinal = straight.samples[straight.samples.length - 1]!;
    expect(bent.terminationReason).toBe('max-path');
    expect(bentFinal.altitudeM).toBeLessThan(straightFinal.altitudeM);
    expect(straightFinal.altitudeM - bentFinal.altitudeM).toBeGreaterThan(1);
  });
});
