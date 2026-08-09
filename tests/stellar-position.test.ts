import { describe, expect, it } from 'vitest';
import {
  calculateGreenwichMeanSiderealTimeDeg,
  calculateStellarPosition,
  StellarPositionError
} from '../src/simulation/stellar-position';

const J2000_NOON = '2000-01-01T12:00:00Z';

describe('stellar position', () => {
  it('matches the J2000 GMST reference epoch used by the polynomial', () => {
    expect(calculateGreenwichMeanSiderealTimeDeg(J2000_NOON)).toBeCloseTo(280.46061837, 8);
  });

  it('places an equatorial star on the zenith when RA equals LMST', () => {
    const rightAscensionDeg = calculateGreenwichMeanSiderealTimeDeg(J2000_NOON);
    const result = calculateStellarPosition({
      observedAtIso: J2000_NOON,
      latitudeDeg: 0,
      longitudeDeg: 0,
      rightAscensionDeg,
      declinationDeg: 0
    });

    expect(result.hourAngleDeg).toBeCloseTo(0, 9);
    expect(result.elevationDeg).toBeCloseTo(90, 9);
    expect(result.azimuthDeg).toBeNull();
    expect(result.aboveGeometricHorizon).toBe(true);
  });

  it('classifies circumpolar, rising-setting and never-rising declinations', () => {
    const common = {
      observedAtIso: '2026-08-09T12:00:00Z',
      latitudeDeg: 41,
      longitudeDeg: 29,
      rightAscensionDeg: 120
    };

    expect(calculateStellarPosition({ ...common, declinationDeg: 80 }).horizonClass)
      .toBe('circumpolar-above');
    expect(calculateStellarPosition({ ...common, declinationDeg: 0 }).horizonClass)
      .toBe('rises-and-sets');
    expect(calculateStellarPosition({ ...common, declinationDeg: -80 }).horizonClass)
      .toBe('never-rises');
  });

  it('keeps polar-observer altitude independent of hour angle', () => {
    const first = calculateStellarPosition({
      observedAtIso: '2026-01-01T00:00:00Z',
      latitudeDeg: 90,
      longitudeDeg: 0,
      rightAscensionDeg: 40,
      declinationDeg: 35
    });
    const second = calculateStellarPosition({
      observedAtIso: '2026-01-01T12:00:00Z',
      latitudeDeg: 90,
      longitudeDeg: 0,
      rightAscensionDeg: 40,
      declinationDeg: 35
    });

    expect(first.elevationDeg).toBeCloseTo(35, 9);
    expect(second.elevationDeg).toBeCloseTo(35, 9);
  });

  it('rejects timezone-less timestamps and 360 degree RA overflow', () => {
    expect(() => calculateStellarPosition({
      observedAtIso: '2026-08-09T12:00:00',
      latitudeDeg: 0,
      longitudeDeg: 0,
      rightAscensionDeg: 0,
      declinationDeg: 0
    })).toThrow(StellarPositionError);

    expect(() => calculateStellarPosition({
      observedAtIso: '2026-08-09T12:00:00Z',
      latitudeDeg: 0,
      longitudeDeg: 0,
      rightAscensionDeg: 360,
      declinationDeg: 0
    })).toThrow('Sağ açıklık');
  });
});
