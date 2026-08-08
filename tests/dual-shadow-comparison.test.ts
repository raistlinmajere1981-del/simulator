import { describe, expect, it } from 'vitest';
import {
  calculateDualShadowComparison,
  createDualShadowComparisonPrediction,
  readDualShadowComparisonSettings
} from '../src/simulation/dual-shadow-comparison';

const observedAtIso = '2026-06-21T09:00:00Z';

function baseInput() {
  return {
    experimentId: 'dual-shadow-test',
    observedAtIso,
    stationA: {
      latitudeDeg: 39.9334,
      longitudeDeg: 32.8597,
      gnomonHeightM: 1
    },
    stationB: {
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      gnomonHeightM: 2
    }
  };
}

describe('dual shadow comparison', () => {
  it('solves two locations at the same UTC instant and normalizes gnomon height', () => {
    const result = calculateDualShadowComparison(baseInput());
    expect(result.observedAtIso).toBe(observedAtIso);
    expect(result.separationDistanceM).toBeGreaterThan(300_000);
    expect(result.separationDistanceM).toBeLessThan(500_000);
    expect(Number.isFinite(result.predictedSolarElevationDifferenceDeg)).toBe(true);
    expect(result.normalizedShadowLengthA).not.toBeNull();
    expect(result.normalizedShadowLengthB).not.toBeNull();
    expect(result.stationA.gnomonHeightM).toBe(1);
    expect(result.stationB.gnomonHeightM).toBe(2);
  });

  it('returns zero differential geometry for coincident stations', () => {
    const input = baseInput();
    input.stationB.latitudeDeg = input.stationA.latitudeDeg;
    input.stationB.longitudeDeg = input.stationA.longitudeDeg;
    const result = calculateDualShadowComparison(input);
    expect(result.separationDistanceM).toBe(0);
    expect(result.predictedSolarElevationDifferenceDeg).toBeCloseTo(0, 12);
    expect(result.predictedShadowAzimuthDifferenceDeg).toBeCloseTo(0, 12);
    expect(result.warnings.some((warning) => warning.includes('1 metreden daha yakın'))).toBe(true);
  });

  it('marks matching field shadow lengths compatible when both uncertainties are supplied', () => {
    const nominal = calculateDualShadowComparison(baseInput());
    expect(nominal.stationA.predictedShadowLengthM).not.toBeNull();
    expect(nominal.stationB.predictedShadowLengthM).not.toBeNull();
    const input = baseInput();
    input.stationA.observedShadowLengthM = nominal.stationA.predictedShadowLengthM!;
    input.stationA.observedShadowLengthUncertaintyM = 0.01;
    input.stationB.observedShadowLengthM = nominal.stationB.predictedShadowLengthM!;
    input.stationB.observedShadowLengthUncertaintyM = 0.01;
    const result = calculateDualShadowComparison(input);
    expect(result.observedSolarElevationDifferenceDeg).not.toBeNull();
    expect(result.observedSolarElevationDifferenceUncertaintyDeg).not.toBeNull();
    expect(result.solarElevationDifferenceResidualDeg).toBeCloseTo(0, 9);
    expect(result.status).toBe('compatible');
  });

  it('marks a large differential field mismatch incompatible', () => {
    const nominal = calculateDualShadowComparison(baseInput());
    const input = baseInput();
    input.stationA.observedShadowLengthM = nominal.stationA.predictedShadowLengthM!;
    input.stationA.observedShadowLengthUncertaintyM = 0.01;
    input.stationB.observedShadowLengthM = nominal.stationB.predictedShadowLengthM! * 1.5;
    input.stationB.observedShadowLengthUncertaintyM = 0.01;
    const result = calculateDualShadowComparison(input);
    expect(result.solarElevationDifferenceResidualDeg).toBeGreaterThan(result.observedSolarElevationDifferenceUncertaintyDeg!);
    expect(result.status).toBe('incompatible');
  });

  it('does not issue a decision when either station lacks direct geometric sunlight', () => {
    const input = baseInput();
    input.observedAtIso = '2026-06-21T00:00:00Z';
    const result = calculateDualShadowComparison(input);
    expect(result.status).toBe('indeterminate');
    expect(result.warnings.some((warning) => warning.includes('En az bir noktada Güneş geometrik ufkun altında'))).toBe(true);
  });

  it('round-trips station B settings through the prediction snapshot', () => {
    const nominal = calculateDualShadowComparison(baseInput());
    const prediction = createDualShadowComparisonPrediction(nominal);
    expect(readDualShadowComparisonSettings(prediction)).toEqual({
      stationB: {
        latitudeDeg: 41.0082,
        longitudeDeg: 28.9784,
        gnomonHeightM: 2
      }
    });
  });
});
