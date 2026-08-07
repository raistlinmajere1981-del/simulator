import { describe, expect, it } from 'vitest';
import { IdealSphereLayeredModel } from '../src/models/ideal-sphere-layered';
import type { LayeredAtmosphereProfile } from '../src/shared/atmosphere';
import type { ExperimentDefinition } from '../src/shared/domain';

const profile: LayeredAtmosphereProfile = {
  kind: 'layered-meteorological',
  sourceLabel: 'Entegrasyon profili',
  samples: [
    { id: '0', altitudeM: 0, temperatureC: 15, pressureHpa: 1013.25, relativeHumidityPercent: 50 },
    { id: '100', altitudeM: 100, temperatureC: 14.35, pressureHpa: 1001.29, relativeHumidityPercent: 50 },
    { id: '200', altitudeM: 200, temperatureC: 13.7, pressureHpa: 989.29, relativeHumidityPercent: 50 }
  ]
};

const experiment: ExperimentDefinition = {
  id: 'profile-visibility',
  title: 'Katmanlı atmosfer görünürlük',
  type: 'target-visibility',
  observer: {
    latitudeDeg: 0,
    longitudeDeg: 0,
    elevationM: 0,
    eyeHeightM: 10
  },
  target: {
    label: 'Hedef',
    latitudeDeg: 0,
    longitudeDeg: 0,
    elevationM: 0,
    heightM: 15
  },
  observedAtIso: '2026-08-07T12:00:00.000Z',
  measurements: {
    surfaceDistanceM: { value: 22_380, uncertainty: 20, unit: 'm' },
    visibleFraction: { value: 0.52, uncertainty: 0.08, unit: 'fraction' }
  }
};

function metric(result: Awaited<ReturnType<IdealSphereLayeredModel['predict']>>, key: string): number | null {
  return result.metrics.find((item) => item.key === key)?.value ?? null;
}

function context(refractionCoefficient: number) {
  return {
    atmosphereMode: 'profile' as const,
    refractionCoefficient,
    atmosphereProfile: profile,
    opticalAtmosphereSettings: { wavelengthNm: 550, carbonDioxidePpm: 450 },
    rayTraceStepM: 20
  };
}

describe('IdealSphereLayeredModel', () => {
  it('produces physical target visibility in profile mode instead of unsupported', async () => {
    const result = await new IdealSphereLayeredModel().predict(experiment, context(0.13));

    expect(result.status).not.toBe('unsupported');
    expect(metric(result, 'visibleFraction')).not.toBeNull();
    expect(metric(result, 'profileMinimumVisibleAltitudeM')).not.toBeNull();
    expect(metric(result, 'rayTraceStepM')).toBe(20);
    expect(result.trace.steps.map((step) => step.id)).toContain('grazing-ray');
    expect(result.warnings.some((warning) => warning.includes('tek bir sabit k'))).toBe(true);
  });

  it('does not let the standard-k coefficient alter a profile-mode result', async () => {
    const model = new IdealSphereLayeredModel();
    const lowK = await model.predict(experiment, context(-0.8));
    const highK = await model.predict(experiment, context(0.9));

    expect(metric(lowK, 'visibleFraction')).toBeCloseTo(metric(highK, 'visibleFraction') ?? NaN, 10);
    expect(metric(lowK, 'profileMinimumVisibleAltitudeM')).toBeCloseTo(
      metric(highK, 'profileMinimumVisibleAltitudeM') ?? NaN,
      8
    );
  });

  it('produces an optical horizon for the horizon scenario', async () => {
    const horizonExperiment: ExperimentDefinition = {
      id: 'profile-horizon',
      title: 'Katmanlı optik ufuk',
      type: 'horizon',
      observer: { ...experiment.observer },
      observedAtIso: experiment.observedAtIso,
      measurements: {}
    };
    const result = await new IdealSphereLayeredModel().predict(horizonExperiment, context(0.13));

    expect(result.status).toBe('compatible');
    expect(metric(result, 'horizonSurfaceDistanceM')).toBeGreaterThan(10_000);
    expect(metric(result, 'effectiveRadiusM')).toBeNull();
    expect(result.trace.steps.map((step) => step.id)).toContain('optical-horizon');
  });

  it('preserves the previous standard-k path when profile mode is not selected', async () => {
    const result = await new IdealSphereLayeredModel().predict(experiment, {
      atmosphereMode: 'standard',
      refractionCoefficient: 0.13
    });

    expect(metric(result, 'visibleFraction')).toBeCloseTo(0.519, 3);
    expect(result.trace.steps.map((step) => step.id)).toContain('effective-radius');
  });
});
