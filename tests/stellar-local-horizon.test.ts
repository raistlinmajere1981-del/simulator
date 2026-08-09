import { describe, expect, it } from 'vitest';
import {
  evaluateStellarLocalHorizon,
  interpolateStellarLocalHorizonAltitude,
  normalizeStellarLocalHorizonMask,
  StellarLocalHorizonError,
  type StellarLocalHorizonMask
} from '../src/simulation/stellar-local-horizon';

const wrapMask: StellarLocalHorizonMask = {
  sourceLabel: 'Sentetik skyline',
  sourceKind: 'manual',
  points: [
    { azimuthDeg: 350, altitudeDeg: 2 },
    { azimuthDeg: 10, altitudeDeg: 6 },
    { azimuthDeg: 180, altitudeDeg: 0 }
  ]
};

describe('stellar local horizon mask', () => {
  it('sorts points and reports the largest cyclic azimuth gap', () => {
    const normalized = normalizeStellarLocalHorizonMask(wrapMask);
    expect(normalized.points.map((point) => point.azimuthDeg)).toEqual([10, 180, 350]);
    expect(normalized.maximumAzimuthGapDeg).toBe(170);
    expect(normalized.sourceLabel).toBe('Sentetik skyline');
  });

  it('interpolates continuously across the 360°/0° boundary', () => {
    const atNorth = interpolateStellarLocalHorizonAltitude(wrapMask, 0);
    expect(atNorth.localHorizonAltitudeDeg).toBeCloseTo(4, 12);
    expect(atNorth.lowerPoint.azimuthDeg).toBe(350);
    expect(atNorth.upperPoint.azimuthDeg).toBe(10);
    expect(atNorth.interpolationFraction).toBeCloseTo(0.5, 12);

    const equivalent = interpolateStellarLocalHorizonAltitude(wrapMask, 360);
    expect(equivalent.azimuthDeg).toBe(0);
    expect(equivalent.localHorizonAltitudeDeg).toBeCloseTo(4, 12);
  });

  it('preserves exact mask nodes without interpolation drift', () => {
    const exact = interpolateStellarLocalHorizonAltitude(wrapMask, 180);
    expect(exact.localHorizonAltitudeDeg).toBe(0);
    expect(exact.lowerPoint).toEqual({ azimuthDeg: 180, altitudeDeg: 0 });
    expect(exact.upperPoint).toEqual({ azimuthDeg: 180, altitudeDeg: 0 });
    expect(exact.interpolationFraction).toBe(0);
  });

  it('classifies above, tangent and below by geometric clearance', () => {
    const above = evaluateStellarLocalHorizon({
      geometricAltitudeDeg: 5,
      azimuthDeg: 0,
      mask: wrapMask,
      label: 'Yıldız'
    });
    expect(above.localHorizonAltitudeDeg).toBeCloseTo(4, 12);
    expect(above.geometricClearanceDeg).toBeCloseTo(1, 12);
    expect(above.status).toBe('above');
    expect(above.trace.summary).toContain('Sentetik skyline');

    expect(evaluateStellarLocalHorizon({
      geometricAltitudeDeg: 4,
      azimuthDeg: 0,
      mask: wrapMask
    }).status).toBe('on-horizon');

    expect(evaluateStellarLocalHorizon({
      geometricAltitudeDeg: 3,
      azimuthDeg: 0,
      mask: wrapMask
    }).status).toBe('below');
  });

  it('normalizes arbitrary finite target azimuths while keeping mask azimuths strict', () => {
    const negative = interpolateStellarLocalHorizonAltitude(wrapMask, -10);
    expect(negative.azimuthDeg).toBe(350);
    expect(negative.localHorizonAltitudeDeg).toBe(2);

    const invalidMask: StellarLocalHorizonMask = {
      ...wrapMask,
      points: [
        { azimuthDeg: 0, altitudeDeg: 0 },
        { azimuthDeg: 120, altitudeDeg: 0 },
        { azimuthDeg: 360, altitudeDeg: 0 }
      ]
    };
    expect(() => normalizeStellarLocalHorizonMask(invalidMask)).toThrow('360°');
  });

  it('rejects sparse, duplicate, non-finite and out-of-range masks', () => {
    expect(() => normalizeStellarLocalHorizonMask({
      sourceLabel: 'Az nokta',
      sourceKind: 'manual',
      points: [
        { azimuthDeg: 0, altitudeDeg: 0 },
        { azimuthDeg: 180, altitudeDeg: 0 }
      ]
    })).toThrow(StellarLocalHorizonError);

    expect(() => normalizeStellarLocalHorizonMask({
      sourceLabel: 'Duplicate',
      sourceKind: 'manual',
      points: [
        { azimuthDeg: 10, altitudeDeg: 0 },
        { azimuthDeg: 10 + 5e-11, altitudeDeg: 1 },
        { azimuthDeg: 200, altitudeDeg: 0 }
      ]
    })).toThrow('yinelenen');

    expect(() => normalizeStellarLocalHorizonMask({
      sourceLabel: 'Bad altitude',
      sourceKind: 'external',
      points: [
        { azimuthDeg: 0, altitudeDeg: 0 },
        { azimuthDeg: 120, altitudeDeg: 91 },
        { azimuthDeg: 240, altitudeDeg: 0 }
      ]
    })).toThrow('-90°');

    expect(() => evaluateStellarLocalHorizon({
      geometricAltitudeDeg: Number.NaN,
      azimuthDeg: 0,
      mask: wrapMask
    })).toThrow('sonlu');
  });
});
