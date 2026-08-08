import { describe, expect, it } from 'vitest';
import { calculateSolarPosition } from '../src/simulation/solar-position';
import {
  SHADOW_OBSERVATION_MODEL_ID,
  calculateShadowObservation,
  createShadowObservationPrediction,
  readShadowObservationSettings
} from '../src/simulation/shadow-observation';

function calculate(observedAtIso: string, settings = { gnomonHeightM: 2 }) {
  const latitudeDeg = 41.0082;
  const longitudeDeg = 28.9784;
  const solarPosition = calculateSolarPosition({ observedAtIso, latitudeDeg, longitudeDeg });
  return calculateShadowObservation({
    experimentId: 'shadow-test',
    observedAtIso,
    latitudeDeg,
    longitudeDeg,
    solarPosition,
    settings
  });
}

describe('shadow observation geometry', () => {
  it('derives shadow length and opposite azimuth from geometric solar position', () => {
    const result = calculate('2026-06-21T09:00:00Z');
    expect(result.solarElevationDeg).toBeGreaterThan(0);
    expect(result.predictedShadowLengthM).not.toBeNull();
    expect(result.predictedShadowLengthM!).toBeCloseTo(
      result.gnomonHeightM / Math.tan(result.solarElevationDeg * Math.PI / 180),
      12
    );
    expect(result.predictedShadowAzimuthDeg).toBeCloseTo((result.solarAzimuthDeg + 180) % 360, 12);
  });

  it('does not invent a direct-sun shadow below the geometric horizon', () => {
    const result = calculate('2026-06-21T00:00:00Z');
    expect(result.solarElevationDeg).toBeLessThan(0);
    expect(result.predictedShadowLengthM).toBeNull();
    expect(result.predictedShadowAzimuthDeg).toBeNull();
    expect(result.status).toBe('indeterminate');
  });

  it('compares measured length and azimuth only through explicitly supplied uncertainties', () => {
    const baseline = calculate('2026-06-21T09:00:00Z');
    const compatible = calculate('2026-06-21T09:00:00Z', {
      gnomonHeightM: 2,
      observedShadowLengthM: baseline.predictedShadowLengthM! + 0.01,
      observedShadowLengthUncertaintyM: 0.02,
      observedShadowAzimuthDeg: baseline.predictedShadowAzimuthDeg! + 0.5,
      observedShadowAzimuthUncertaintyDeg: 1
    });
    expect(compatible.status).toBe('compatible');

    const incompatible = calculate('2026-06-21T09:00:00Z', {
      gnomonHeightM: 2,
      observedShadowLengthM: baseline.predictedShadowLengthM! + 1,
      observedShadowLengthUncertaintyM: 0.02
    });
    expect(incompatible.status).toBe('incompatible');

    const noUncertainty = calculate('2026-06-21T09:00:00Z', {
      gnomonHeightM: 2,
      observedShadowLengthM: baseline.predictedShadowLengthM!
    });
    expect(noUncertainty.status).toBe('indeterminate');
  });

  it('round-trips editable observation settings through its prediction snapshot', () => {
    const result = calculate('2026-06-21T09:00:00Z', {
      gnomonHeightM: 1.5,
      observedShadowLengthM: 0.8,
      observedShadowLengthUncertaintyM: 0.03,
      observedShadowAzimuthDeg: 212,
      observedShadowAzimuthUncertaintyDeg: 2
    });
    const prediction = createShadowObservationPrediction(result);
    expect(prediction.modelId).toBe(SHADOW_OBSERVATION_MODEL_ID);
    expect(readShadowObservationSettings(prediction)).toEqual({
      gnomonHeightM: 1.5,
      observedShadowLengthM: 0.8,
      observedShadowLengthUncertaintyM: 0.03,
      observedShadowAzimuthDeg: 212,
      observedShadowAzimuthUncertaintyDeg: 2
    });
  });
});
