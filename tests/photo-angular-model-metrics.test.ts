import { describe, expect, it } from 'vitest';
import { DefinedPlaneModel } from '../src/models/defined-plane';
import { IdealSphereModel } from '../src/models/ideal-sphere';
import type { ExperimentDefinition } from '../src/shared/domain';
import type { LayeredAtmosphereProfile } from '../src/shared/atmosphere';
import { analyzeLayeredSphereVisibility } from '../src/simulation/layered-sphere-visibility';
import { PHOTO_TARGET_BASE_VISIBILITY_TOLERANCE_M } from '../src/simulation/photo-angular-comparison';

function value(result: { metrics: Array<{ key: string; value: number | null }> }, key: string): number | null {
  return result.metrics.find((metric) => metric.key === key)?.value ?? null;
}

const experiment: ExperimentDefinition = {
  id: 'photo-angle-models',
  title: 'Fotoğraf açı model metriği',
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
  observedAtIso: '2026-08-08T02:00:00+03:00',
  measurements: {
    surfaceDistanceM: { value: 8_000, uncertainty: 1, unit: 'm' },
    visibleFraction: { value: 1, uncertainty: 0.01, unit: 'fraction' }
  }
};

const settings = { wavelengthNm: 550, carbonDioxidePpm: 450 };
const profile: LayeredAtmosphereProfile = {
  kind: 'layered-meteorological',
  sourceLabel: 'Fotoğraf açı regresyon profili',
  samples: [
    { id: '0', altitudeM: 0, temperatureC: 15, pressureHpa: 1013.25, relativeHumidityPercent: 50 },
    { id: '100', altitudeM: 100, temperatureC: 14.35, pressureHpa: 1001.29, relativeHumidityPercent: 50 },
    { id: '200', altitudeM: 200, temperatureC: 13.7, pressureHpa: 989.29, relativeHumidityPercent: 50 }
  ]
};

describe('photo comparison angular metrics from physical models', () => {
  it('publishes consistent base/top/angular-height metrics on ideal sphere and plane', async () => {
    const sphere = await new IdealSphereModel().predict(experiment, { atmosphereMode: 'off' });
    const plane = await new DefinedPlaneModel().predict(experiment, { atmosphereMode: 'off' });

    for (const prediction of [sphere, plane]) {
      const base = value(prediction, 'targetBaseElevationDeg');
      const top = value(prediction, 'targetTopElevationDeg');
      const height = value(prediction, 'targetAngularHeightDeg');
      expect(base).not.toBeNull();
      expect(top).not.toBeNull();
      expect(height).not.toBeNull();
      expect(height!).toBeCloseTo(top! - base!, 12);
      expect(height!).toBeGreaterThan(0);
    }
  });

  it('publishes optical base and full angular height when the layered ray reaches the physical base within solver tolerance', () => {
    const result = analyzeLayeredSphereVisibility({
      profile,
      settings,
      observerAltitudeM: 10,
      targetSurfaceDistanceM: 8_000,
      targetBaseAltitudeM: 0,
      targetHeightM: 20,
      stepM: 10
    });

    expect(result.hiddenHeightM).toBeLessThanOrEqual(PHOTO_TARGET_BASE_VISIBILITY_TOLERANCE_M);
    expect(result.targetBaseElevationDeg).not.toBeNull();
    expect(result.targetTopElevationDeg).not.toBeNull();
    expect(result.targetAngularHeightDeg).not.toBeNull();
    expect(result.targetAngularHeightDeg!).toBeCloseTo(
      result.targetTopElevationDeg! - result.targetBaseElevationDeg!,
      8
    );
  });

  it('does not invent a physical base angle when the layered model hides the target base beyond solver tolerance', () => {
    const result = analyzeLayeredSphereVisibility({
      profile,
      settings,
      observerAltitudeM: 10,
      targetSurfaceDistanceM: 20_000,
      targetBaseAltitudeM: 0,
      targetHeightM: 80,
      stepM: 20
    });

    expect(result.hiddenHeightM).toBeGreaterThan(PHOTO_TARGET_BASE_VISIBILITY_TOLERANCE_M);
    expect(result.targetBaseElevationDeg).toBeNull();
    expect(result.targetAngularHeightDeg).toBeNull();
    expect(result.targetTopElevationDeg).not.toBeNull();
  });
});
