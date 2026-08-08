import { describe, expect, it } from 'vitest';
import { calculateSolarPosition } from '../src/simulation/solar-position';
import { calculateLunarPosition, LunarPositionError } from '../src/simulation/lunar-position';

function lunar(observedAtIso: string, latitudeDeg = 41.0082, longitudeDeg = 28.9784) {
  const solarPosition = calculateSolarPosition({ observedAtIso, latitudeDeg, longitudeDeg });
  return calculateLunarPosition({ observedAtIso, latitudeDeg, longitudeDeg, solarPosition });
}

describe('lunar position reference', () => {
  it('produces finite topocentric position, distance and phase metrics', () => {
    const result = lunar('2026-08-08T20:06:28Z');
    expect(result.elevationDeg).toBeGreaterThanOrEqual(-90);
    expect(result.elevationDeg).toBeLessThanOrEqual(90);
    expect(result.azimuthDeg).toBeGreaterThanOrEqual(0);
    expect(result.azimuthDeg).toBeLessThan(360);
    expect(result.distanceKm).toBeGreaterThan(330_000);
    expect(result.distanceKm).toBeLessThan(430_000);
    expect(result.horizontalParallaxDeg).toBeGreaterThan(0.8);
    expect(result.horizontalParallaxDeg).toBeLessThan(1.2);
    expect(result.illuminatedFraction).toBeGreaterThanOrEqual(0);
    expect(result.illuminatedFraction).toBeLessThanOrEqual(1);
  });

  it('recognizes a known new-moon epoch as dark and a full-moon epoch as bright', () => {
    const newMoon = lunar('2024-04-08T18:21:00Z', 0, 0);
    const fullMoon = lunar('2024-03-25T07:00:00Z', 0, 0);
    expect(newMoon.illuminatedFraction).toBeLessThan(0.03);
    expect(newMoon.phaseName).toBe('Yeni Ay');
    expect(fullMoon.illuminatedFraction).toBeGreaterThan(0.97);
    expect(fullMoon.phaseName).toBe('Dolunay');
  });

  it('changes local horizontal coordinates with observer longitude while preserving phase', () => {
    const istanbul = lunar('2026-08-08T20:06:28Z', 41, 29);
    const atlantic = lunar('2026-08-08T20:06:28Z', 41, -29);
    expect(Math.abs(istanbul.elevationDeg - atlantic.elevationDeg)).toBeGreaterThan(5);
    expect(istanbul.illuminatedFraction).toBeCloseTo(atlantic.illuminatedFraction, 12);
  });

  it('rejects ambiguous times and invalid observer coordinates', () => {
    const solarPosition = calculateSolarPosition({ observedAtIso: '2026-08-08T20:00:00Z', latitudeDeg: 0, longitudeDeg: 0 });
    expect(() => calculateLunarPosition({ observedAtIso: '2026-08-08T20:00:00', latitudeDeg: 0, longitudeDeg: 0, solarPosition }))
      .toThrow(LunarPositionError);
    expect(() => calculateLunarPosition({ observedAtIso: '2026-08-08T20:00:00Z', latitudeDeg: 91, longitudeDeg: 0, solarPosition }))
      .toThrow(LunarPositionError);
  });
});
