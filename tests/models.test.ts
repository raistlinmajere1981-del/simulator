import { describe, expect, it } from 'vitest';
import { AzimuthalProjectionReference } from '../src/models/azimuthal-projection';
import { DefinedPlaneModel } from '../src/models/defined-plane';
import { IdealSphereModel } from '../src/models/ideal-sphere';
import type { ExperimentDefinition } from '../src/shared/domain';

const experiment: ExperimentDefinition = {
  id: 'visibility-test',
  title: 'Model görünürlük testi',
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
  observedAtIso: '2026-08-05T12:30:00.000Z',
  measurements: {
    surfaceDistanceM: {
      value: 22_380,
      uncertainty: 20,
      unit: 'm'
    },
    visibleFraction: {
      value: 0.52,
      uncertainty: 0.08,
      unit: 'fraction'
    }
  }
};

function metricValue(
  metrics: { key: string; value: number | null }[],
  key: string
): number | null {
  return metrics.find((metric) => metric.key === key)?.value ?? null;
}

describe('initial simulation models', () => {
  it('predicts partial visibility on the ideal sphere with standard refraction', async () => {
    const result = await new IdealSphereModel().predict(experiment, {
      atmosphereMode: 'standard',
      refractionCoefficient: 0.13
    });

    expect(metricValue(result.metrics, 'visibleFraction')).toBeCloseTo(0.519, 3);
    expect(result.status).toBe('compatible');
  });

  it('predicts full visibility on the unobstructed plane', async () => {
    const result = await new DefinedPlaneModel().predict(experiment, {
      atmosphereMode: 'off'
    });

    expect(metricValue(result.metrics, 'visibleFraction')).toBe(1);
    expect(result.status).toBe('incompatible');
  });

  it('does not treat an azimuthal projection as a physical model', async () => {
    const result = await new AzimuthalProjectionReference().predict(experiment, {
      atmosphereMode: 'off'
    });

    expect(result.status).toBe('unsupported');
    expect(result.metrics).toHaveLength(0);
  });
});
