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

function terrainExperiment(
  distanceM: number,
  observerEyeM: number,
  targetHeightM: number,
  middleElevationM: number
): ExperimentDefinition {
  return {
    ...experiment,
    id: `terrain-${distanceM}`,
    observer: { ...experiment.observer, eyeHeightM: observerEyeM },
    target: { ...experiment.target!, heightM: targetHeightM },
    terrainProfile: {
      id: 'manual-three-point',
      label: 'Manuel test profili',
      source: 'manual',
      datum: {
        kind: 'orthometric-msl',
        label: 'Ortalama deniz seviyesi',
        offsetM: 0
      },
      totalDistanceM: distanceM,
      samples: [
        { distanceM: 0, elevationM: 0 },
        { distanceM: distanceM / 2, elevationM: middleElevationM },
        { distanceM, elevationM: 0 }
      ]
    },
    measurements: {
      ...experiment.measurements,
      surfaceDistanceM: { value: distanceM, uncertainty: 1, unit: 'm' }
    }
  };
}

describe('initial simulation models', () => {
  it('predicts partial visibility on the ideal sphere with a reproducible trace', async () => {
    const result = await new IdealSphereModel().predict(experiment, {
      atmosphereMode: 'standard',
      refractionCoefficient: 0.13
    });

    expect(metricValue(result.metrics, 'visibleFraction')).toBeCloseTo(0.519, 3);
    expect(result.status).toBe('compatible');
    expect(result.trace.steps.map((step) => step.id)).toContain('effective-radius');
    expect(result.trace.steps.map((step) => step.id)).toContain('visible-fraction');
    expect(result.trace.assumptions).not.toHaveLength(0);
  });

  it('predicts full visibility on the unobstructed plane and explains the assumption', async () => {
    const result = await new DefinedPlaneModel().predict(experiment, {
      atmosphereMode: 'off'
    });

    expect(metricValue(result.metrics, 'visibleFraction')).toBe(1);
    expect(result.status).toBe('incompatible');
    expect(result.trace.steps.find((step) => step.id === 'horizon')?.result).toBe('∞');
  });

  it('reduces planar target visibility when a manual terrain point blocks the lower target', async () => {
    const result = await new DefinedPlaneModel().predict(
      terrainExperiment(1_000, 2, 10, 5),
      { atmosphereMode: 'off' }
    );

    expect(metricValue(result.metrics, 'visibleFraction')).toBeCloseTo(0.2, 5);
    expect(metricValue(result.metrics, 'terrainRequiredTargetElevationM')).toBeCloseTo(8, 5);
    expect(result.trace.steps.map((step) => step.id)).toContain('terrain-clearance');
  });

  it('applies the same flat profile differently in spherical and planar geometry', async () => {
    const longExperiment = terrainExperiment(100_000, 2, 500, 0);
    const plane = await new DefinedPlaneModel().predict(longExperiment, {
      atmosphereMode: 'off'
    });
    const sphere = await new IdealSphereModel().predict(longExperiment, {
      atmosphereMode: 'off'
    });

    const planarClearance = metricValue(plane.metrics, 'terrainMinimumClearanceM');
    const sphericalClearance = metricValue(sphere.metrics, 'terrainMinimumClearanceM');

    expect(metricValue(plane.metrics, 'visibleFraction')).toBe(1);
    expect(planarClearance).not.toBeNull();
    expect(sphericalClearance).not.toBeNull();
    expect(planarClearance ?? -Infinity).toBeGreaterThan(sphericalClearance ?? Infinity);
    expect(metricValue(sphere.metrics, 'visibleFraction')).toBeLessThan(1);
  });

  it('does not treat an azimuthal projection as a physical model', async () => {
    const result = await new AzimuthalProjectionReference().predict(experiment, {
      atmosphereMode: 'off'
    });

    expect(result.status).toBe('unsupported');
    expect(result.metrics).toHaveLength(0);
    expect(result.trace.steps).toHaveLength(3);
    expect(result.trace.steps.every((step) => step.result === 'Hesaplanamaz')).toBe(true);
  });
});
