import { describe, expect, it } from 'vitest';
import {
  SolarPositionError,
  calculateSolarPosition
} from '../src/simulation/solar-position';

describe('solar position', () => {
  it('computes a plausible summer-solstice position at Greenwich', () => {
    const result = calculateSolarPosition({
      observedAtIso: '2026-06-21T12:00:00Z',
      latitudeDeg: 51.4769,
      longitudeDeg: 0
    });

    expect(result.declinationDeg).toBeGreaterThan(23.3);
    expect(result.declinationDeg).toBeLessThan(23.5);
    expect(result.elevationDeg).toBeGreaterThan(61.7);
    expect(result.elevationDeg).toBeLessThan(62.1);
    expect(result.azimuthDeg).toBeGreaterThan(175);
    expect(result.azimuthDeg).toBeLessThan(185);
  });

  it('normalizes equivalent timezone-qualified instants to the same result', () => {
    const utc = calculateSolarPosition({
      observedAtIso: '2026-06-21T12:00:00Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784
    });
    const local = calculateSolarPosition({
      observedAtIso: '2026-06-21T15:00:00+03:00',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784
    });

    expect(local.observedAtIso).toBe('2026-06-21T12:00:00.000Z');
    expect(local.elevationDeg).toBeCloseTo(utc.elevationDeg, 10);
    expect(local.azimuthDeg).toBeCloseTo(utc.azimuthDeg, 10);
    expect(local.hourAngleDeg).toBeCloseTo(utc.hourAngleDeg, 10);
  });

  it('returns negative geometric elevation when the Sun is below the local horizon', () => {
    const result = calculateSolarPosition({
      observedAtIso: '2026-06-21T00:00:00Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784
    });

    expect(result.elevationDeg).toBeLessThan(0);
    expect(result.azimuthDeg).toBeGreaterThanOrEqual(0);
    expect(result.azimuthDeg).toBeLessThan(360);
  });

  it('requires an explicit timezone for reproducible astronomy', () => {
    expect(() => calculateSolarPosition({
      observedAtIso: '2026-06-21T12:00:00',
      latitudeDeg: 41,
      longitudeDeg: 29
    })).toThrow(SolarPositionError);
  });

  it('rejects coordinates outside geographic bounds', () => {
    expect(() => calculateSolarPosition({
      observedAtIso: '2026-06-21T12:00:00Z',
      latitudeDeg: 91,
      longitudeDeg: 29
    })).toThrow('Enlem');
    expect(() => calculateSolarPosition({
      observedAtIso: '2026-06-21T12:00:00Z',
      latitudeDeg: 41,
      longitudeDeg: 181
    })).toThrow('Boylam');
  });
});
