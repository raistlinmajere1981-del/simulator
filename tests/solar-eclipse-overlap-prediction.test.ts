import { describe, expect, it } from 'vitest';
import { calculateLunarPosition } from '../src/simulation/lunar-position';
import { calculateSolarEclipseOverlap } from '../src/simulation/solar-eclipse-overlap';
import {
  createSolarEclipseOverlapPrediction,
  solarEclipseOverlapMetadata
} from '../src/simulation/solar-eclipse-overlap-prediction';
import { calculateSolarPosition } from '../src/simulation/solar-position';

function snapshot(observedAtIso: string, latitudeDeg: number, longitudeDeg: number) {
  const solarPosition = calculateSolarPosition({ observedAtIso, latitudeDeg, longitudeDeg });
  const lunarPosition = calculateLunarPosition({
    observedAtIso,
    latitudeDeg,
    longitudeDeg,
    solarPosition
  });
  return calculateSolarEclipseOverlap({ solarPosition, lunarPosition });
}

describe('solar eclipse overlap prediction', () => {
  it('maps the typed overlap result into a persistence-friendly diagnostic prediction', () => {
    const result = snapshot('2026-08-10T12:00:00Z', 41.0082, 28.9784);
    const prediction = createSolarEclipseOverlapPrediction('eclipse-diagnostic', result);

    expect(prediction.modelId).toBe(solarEclipseOverlapMetadata.id);
    expect(prediction.experimentId).toBe('eclipse-diagnostic');
    expect(prediction.status).toBe('compatible');
    expect(prediction.metrics.find((metric) => metric.key === 'eclipseCenterSeparationDeg')?.value)
      .toBeCloseTo(result.centerSeparationDeg, 12);
    expect(prediction.metrics.find((metric) => metric.key === 'solarDiskCoveredFraction')?.value)
      .toBeCloseTo(result.solarDiskCoveredFraction, 12);
    expect(prediction.warnings.some((warning) => warning.includes('resmi tutulma'))).toBe(true);
  });

  it('detects an overlap near the 2024-04-08 Dallas eclipse benchmark for manual UI review', () => {
    const result = snapshot('2024-04-08T18:42:00Z', 32.7767, -96.7970);

    expect(result.centerSeparationDeg).toBeLessThan(
      result.solarAngularRadiusDeg + result.lunarAngularRadiusDeg
    );
    expect(result.solarDiskCoveredFraction).toBeGreaterThan(0.1);
    expect(result.geometryClass).not.toBe('no-overlap');
  });
});
