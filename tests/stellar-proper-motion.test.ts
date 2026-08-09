import { describe, expect, it } from 'vitest';
import {
  propagateStellarProperMotion,
  StellarProperMotionError
} from '../src/simulation/stellar-proper-motion';

function signedAngleDifferenceDeg(leftDeg: number, rightDeg: number): number {
  return ((leftDeg - rightDeg + 540) % 360) - 180;
}

describe('stellar proper motion', () => {
  it('keeps a zero-motion catalogue direction unchanged', () => {
    const result = propagateStellarProperMotion({
      observedAtIso: '2026-08-09T12:00:00Z',
      sourceEpochJulianYear: 2000,
      rightAscensionDeg: 101.28715533,
      declinationDeg: -16.71611586,
      properMotionRaStarArcsecPerYear: 0,
      properMotionDecArcsecPerYear: 0,
      label: 'synthetic zero-motion star'
    });

    expect(result.propagatedRightAscensionDeg).toBeCloseTo(101.28715533, 12);
    expect(result.propagatedDeclinationDeg).toBeCloseTo(-16.71611586, 12);
    expect(result.angularShiftArcsec).toBeCloseTo(0, 12);
    expect(result.totalProperMotionArcsecPerYear).toBe(0);
  });

  it('propagates projected RA proper motion without dividing by cos(dec)', () => {
    const result = propagateStellarProperMotion({
      observedAtIso: '2010-01-01T12:00:00Z',
      sourceEpochJulianYear: 2000,
      rightAscensionDeg: 0,
      declinationDeg: 0,
      properMotionRaStarArcsecPerYear: 1,
      properMotionDecArcsecPerYear: 0
    });

    const shiftRaArcsec = signedAngleDifferenceDeg(result.propagatedRightAscensionDeg, 0) * 3600;
    expect(result.propagatedDeclinationDeg).toBeCloseTo(0, 12);
    expect(shiftRaArcsec).toBeCloseTo(result.elapsedJulianYears, 8);
    expect(result.angularShiftArcsec).toBeCloseTo(Math.abs(result.elapsedJulianYears), 8);
  });

  it('propagates pure declination proper motion on the tangent sphere', () => {
    const result = propagateStellarProperMotion({
      observedAtIso: '2010-01-01T12:00:00Z',
      sourceEpochJulianYear: 2000,
      rightAscensionDeg: 40,
      declinationDeg: 10,
      properMotionRaStarArcsecPerYear: 0,
      properMotionDecArcsecPerYear: 1
    });

    const shiftDecArcsec = (result.propagatedDeclinationDeg - 10) * 3600;
    expect(signedAngleDifferenceDeg(result.propagatedRightAscensionDeg, 40)).toBeCloseTo(0, 10);
    expect(shiftDecArcsec).toBeCloseTo(result.elapsedJulianYears, 8);
    expect(result.angularShiftArcsec).toBeCloseTo(Math.abs(result.elapsedJulianYears), 8);
  });

  it('remains finite very near the celestial pole', () => {
    const result = propagateStellarProperMotion({
      observedAtIso: '2026-08-09T12:00:00Z',
      sourceEpochJulianYear: 2000,
      rightAscensionDeg: 120,
      declinationDeg: 89.9999,
      properMotionRaStarArcsecPerYear: 4,
      properMotionDecArcsecPerYear: 1
    });

    expect(Number.isFinite(result.propagatedRightAscensionDeg)).toBe(true);
    expect(Number.isFinite(result.propagatedDeclinationDeg)).toBe(true);
    expect(result.propagatedRightAscensionDeg).toBeGreaterThanOrEqual(0);
    expect(result.propagatedRightAscensionDeg).toBeLessThan(360);
    expect(result.propagatedDeclinationDeg).toBeGreaterThanOrEqual(-90);
    expect(result.propagatedDeclinationDeg).toBeLessThanOrEqual(90);
    expect(result.angularShiftArcsec).toBeGreaterThan(0);
  });

  it('supports reverse-time propagation with the expected angular magnitude', () => {
    const result = propagateStellarProperMotion({
      observedAtIso: '2010-01-01T12:00:00Z',
      sourceEpochJulianYear: 2020,
      rightAscensionDeg: 40,
      declinationDeg: 10,
      properMotionRaStarArcsecPerYear: 0,
      properMotionDecArcsecPerYear: 1
    });

    expect(result.elapsedJulianYears).toBeLessThan(0);
    expect(result.propagatedDeclinationDeg).toBeLessThan(10);
    expect(result.angularShiftArcsec).toBeCloseTo(Math.abs(result.elapsedJulianYears), 8);
  });

  it('rejects ambiguous time zones and implausible component magnitudes', () => {
    expect(() => propagateStellarProperMotion({
      observedAtIso: '2026-08-09T12:00:00',
      sourceEpochJulianYear: 2000,
      rightAscensionDeg: 0,
      declinationDeg: 0,
      properMotionRaStarArcsecPerYear: 0,
      properMotionDecArcsecPerYear: 0
    })).toThrow(StellarProperMotionError);

    expect(() => propagateStellarProperMotion({
      observedAtIso: '2026-08-09T12:00:00Z',
      sourceEpochJulianYear: 2000,
      rightAscensionDeg: 0,
      declinationDeg: 0,
      properMotionRaStarArcsecPerYear: 101,
      properMotionDecArcsecPerYear: 0
    })).toThrow('100″/yıl');
  });
});
