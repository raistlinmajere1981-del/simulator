import { describe, expect, it } from 'vitest';
import { calculateGreenwichMeanSiderealTimeDeg } from '../src/simulation/stellar-position';
import { calculateStellarTrail, StellarTrailError } from '../src/simulation/stellar-trail';

const J2000_NOON = '2000-01-01T12:00:00Z';

describe('stellar trail geometry', () => {
  it('samples both endpoints and refines the equatorial setting crossing', () => {
    const rightAscensionDeg = calculateGreenwichMeanSiderealTimeDeg(J2000_NOON);
    const result = calculateStellarTrail({
      startAtIso: J2000_NOON,
      durationMinutes: 12 * 60,
      sampleIntervalMinutes: 30,
      latitudeDeg: 0,
      longitudeDeg: 0,
      rightAscensionDeg,
      declinationDeg: 0
    });

    expect(result.samples).toHaveLength(25);
    expect(result.samples[0]?.elevationDeg).toBeCloseTo(90, 9);
    expect(result.samples.at(-1)?.elapsedMinutes).toBe(720);
    expect(result.horizonCrossings).toHaveLength(1);
    expect(result.horizonCrossings[0]?.kind).toBe('set');
    expect(result.horizonCrossings[0]?.elapsedMinutes).toBeCloseTo(359.02, 1);
    expect(result.visibleDurationMinutes).toBeCloseTo(359.02, 1);
  });

  it('keeps a circumpolar star above the horizon for a full day', () => {
    const result = calculateStellarTrail({
      startAtIso: '2026-08-09T00:00:00Z',
      durationMinutes: 24 * 60,
      sampleIntervalMinutes: 20,
      latitudeDeg: 60,
      longitudeDeg: 30,
      rightAscensionDeg: 120,
      declinationDeg: 70
    });

    expect(result.horizonClass).toBe('circumpolar-above');
    expect(result.horizonCrossings).toHaveLength(0);
    expect(result.visibleDurationMinutes).toBeCloseTo(24 * 60, 8);
    expect(result.sampledMinimumElevationDeg).toBeGreaterThan(0);
  });

  it('keeps a never-rising star below the horizon for the full window', () => {
    const result = calculateStellarTrail({
      startAtIso: '2026-08-09T00:00:00Z',
      durationMinutes: 12 * 60,
      sampleIntervalMinutes: 30,
      latitudeDeg: 60,
      longitudeDeg: 30,
      rightAscensionDeg: 120,
      declinationDeg: -70
    });

    expect(result.horizonClass).toBe('never-rises');
    expect(result.horizonCrossings).toHaveLength(0);
    expect(result.visibleDurationMinutes).toBe(0);
    expect(result.sampledMaximumElevationDeg).toBeLessThan(0);
  });

  it('rejects unbounded or excessively dense trail requests', () => {
    expect(() => calculateStellarTrail({
      startAtIso: J2000_NOON,
      durationMinutes: 49 * 60,
      sampleIntervalMinutes: 1,
      latitudeDeg: 0,
      longitudeDeg: 0,
      rightAscensionDeg: 0,
      declinationDeg: 0
    })).toThrow(StellarTrailError);

    expect(() => calculateStellarTrail({
      startAtIso: J2000_NOON,
      durationMinutes: 24 * 60,
      sampleIntervalMinutes: 0.1,
      latitudeDeg: 0,
      longitudeDeg: 0,
      rightAscensionDeg: 0,
      declinationDeg: 0
    })).toThrow('örnek sınırını');
  });
});
