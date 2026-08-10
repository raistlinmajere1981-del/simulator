import { describe, expect, it } from 'vitest';
import { calculateLunarPosition } from '../src/simulation/lunar-position';
import {
  SolarEclipseOverlapError,
  calculateAngularDiskOverlap,
  calculateSolarEclipseOverlap,
  horizontalAngularSeparationDeg
} from '../src/simulation/solar-eclipse-overlap';
import { calculateSolarPosition } from '../src/simulation/solar-position';

describe('solar eclipse overlap geometry', () => {
  it('keeps separated angular disks at zero overlap', () => {
    const result = calculateAngularDiskOverlap({
      centerSeparationDeg: 0.7,
      firstRadiusDeg: 0.25,
      secondRadiusDeg: 0.25
    });
    expect(result.relation).toBe('separate');
    expect(result.overlapAreaDeg2).toBe(0);
    expect(result.firstCoveredFraction).toBe(0);
    expect(result.outerLimbClearanceDeg).toBeCloseTo(0.2, 12);
  });

  it('solves the symmetric partial circle intersection', () => {
    const result = calculateAngularDiskOverlap({
      centerSeparationDeg: 0.5,
      firstRadiusDeg: 0.5,
      secondRadiusDeg: 0.5
    });
    expect(result.relation).toBe('partial-overlap');
    expect(result.firstCoveredFraction).toBeCloseTo(0.39100221895577075, 12);
    expect(result.secondCoveredFraction).toBeCloseTo(result.firstCoveredFraction, 12);
  });

  it('distinguishes which disk is fully contained', () => {
    const sunContained = calculateAngularDiskOverlap({
      centerSeparationDeg: 0.01,
      firstRadiusDeg: 0.25,
      secondRadiusDeg: 0.3
    });
    expect(sunContained.relation).toBe('first-contained');
    expect(sunContained.firstCoveredFraction).toBeCloseTo(1, 12);

    const moonContained = calculateAngularDiskOverlap({
      centerSeparationDeg: 0.01,
      firstRadiusDeg: 0.3,
      secondRadiusDeg: 0.25
    });
    expect(moonContained.relation).toBe('second-contained');
    expect(moonContained.secondCoveredFraction).toBeCloseTo(1, 12);
  });

  it('handles the north seam in local horizontal angular separation', () => {
    const separation = horizontalAngularSeparationDeg(
      { azimuthDeg: 359.9, elevationDeg: 30 },
      { azimuthDeg: 0.1, elevationDeg: 30 }
    );
    expect(separation).toBeGreaterThan(0);
    expect(separation).toBeLessThan(0.2);
  });

  it('builds a bounded low-precision Sun-Moon snapshot from existing references', () => {
    const solar = calculateSolarPosition({
      observedAtIso: '2026-08-10T12:00:00Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784
    });
    const lunar = calculateLunarPosition({
      observedAtIso: '2026-08-10T12:00:00Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      solarPosition: solar
    });
    const result = calculateSolarEclipseOverlap({ solarPosition: solar, lunarPosition: lunar });

    expect(result.observedAtIso).toBe('2026-08-10T12:00:00.000Z');
    expect(result.centerSeparationDeg).toBeGreaterThanOrEqual(0);
    expect(result.centerSeparationDeg).toBeLessThanOrEqual(180);
    expect(result.solarDistanceAu).toBeGreaterThan(0.98);
    expect(result.solarDistanceAu).toBeLessThan(1.02);
    expect(result.solarAngularRadiusDeg).toBeGreaterThan(0.25);
    expect(result.solarAngularRadiusDeg).toBeLessThan(0.28);
    expect(result.lunarAngularRadiusDeg).toBeGreaterThan(0.23);
    expect(result.lunarAngularRadiusDeg).toBeLessThan(0.30);
    expect(result.solarDiskCoveredFraction).toBeGreaterThanOrEqual(0);
    expect(result.solarDiskCoveredFraction).toBeLessThanOrEqual(1);
    expect(result.trace.assumptions.some((item) => item.includes('Bessel'))).toBe(true);
  });

  it('fails closed when Sun and Moon snapshots are not from the same observer/time', () => {
    const solar = calculateSolarPosition({
      observedAtIso: '2026-08-10T12:00:00Z', latitudeDeg: 41, longitudeDeg: 29
    });
    const otherSolar = calculateSolarPosition({
      observedAtIso: '2026-08-10T12:01:00Z', latitudeDeg: 41, longitudeDeg: 29
    });
    const lunar = calculateLunarPosition({
      observedAtIso: '2026-08-10T12:01:00Z', latitudeDeg: 41, longitudeDeg: 29,
      solarPosition: otherSolar
    });
    expect(() => calculateSolarEclipseOverlap({
      solarPosition: solar,
      lunarPosition: lunar
    })).toThrow(SolarEclipseOverlapError);
  });
});
