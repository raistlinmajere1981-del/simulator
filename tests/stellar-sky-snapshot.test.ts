import { describe, expect, it } from 'vitest';
import { BRIGHT_STAR_CATALOG, resolveBrightStarForObservation } from '../src/simulation/bright-star-catalog';
import { calculateStellarPosition } from '../src/simulation/stellar-position';
import { calculateStellarSkySnapshot } from '../src/simulation/stellar-sky-snapshot';

const FLAT_ZERO_SKYLINE = {
  sourceKind: 'manual' as const,
  sourceLabel: 'Düz 0° test skyline',
  points: [
    { azimuthDeg: 0, altitudeDeg: 0 },
    { azimuthDeg: 90, altitudeDeg: 0 },
    { azimuthDeg: 180, altitudeDeg: 0 },
    { azimuthDeg: 270, altitudeDeg: 0 }
  ]
};

const ZENITH_SKYLINE = {
  sourceKind: 'manual' as const,
  sourceLabel: '90° test skyline',
  points: [
    { azimuthDeg: 0, altitudeDeg: 90 },
    { azimuthDeg: 90, altitudeDeg: 90 },
    { azimuthDeg: 180, altitudeDeg: 90 },
    { azimuthDeg: 270, altitudeDeg: 90 }
  ]
};

describe('stellar sky snapshot', () => {
  it('resolves the complete curated catalog in deterministic catalog order', () => {
    const result = calculateStellarSkySnapshot({
      observedAtIso: '2026-08-10T00:00:00.000Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784
    });

    expect(result.starCount).toBe(BRIGHT_STAR_CATALOG.length);
    expect(result.stars).toHaveLength(BRIGHT_STAR_CATALOG.length);
    expect(result.stars.map((star) => star.starId)).toEqual(BRIGHT_STAR_CATALOG.map((star) => star.id));
    expect(result.aboveGeometricHorizonCount + result.belowGeometricHorizonCount).toBe(result.starCount);
    expect(result.localHorizonApplied).toBe(false);
    expect(result.localHorizonCounts).toBeNull();
    expect(result.warnings.some((warning) => warning.includes('optik görünür yıldız listesi değildir'))).toBe(true);
  });

  it('matches the existing single-star precession and horizontal-position chain', () => {
    const observedAtIso = '2026-08-10T00:00:00.000Z';
    const latitudeDeg = 41.0082;
    const longitudeDeg = 28.9784;
    const snapshot = calculateStellarSkySnapshot({ observedAtIso, latitudeDeg, longitudeDeg });
    const vega = snapshot.stars.find((star) => star.starId === 'hr-7001');
    const resolved = resolveBrightStarForObservation('hr-7001', observedAtIso);
    const position = calculateStellarPosition({
      observedAtIso,
      latitudeDeg,
      longitudeDeg,
      rightAscensionDeg: resolved.precession.meanOfDateRightAscensionDeg,
      declinationDeg: resolved.precession.meanOfDateDeclinationDeg,
      label: 'Vega'
    });

    expect(vega).toBeDefined();
    expect(vega?.meanOfDateRightAscensionDeg).toBeCloseTo(resolved.precession.meanOfDateRightAscensionDeg, 12);
    expect(vega?.meanOfDateDeclinationDeg).toBeCloseTo(resolved.precession.meanOfDateDeclinationDeg, 12);
    expect(vega?.elevationDeg).toBeCloseTo(position.elevationDeg, 12);
    expect(vega?.azimuthDeg).toBeCloseTo(position.azimuthDeg!, 12);
    expect(vega?.aboveGeometricHorizon).toBe(position.aboveGeometricHorizon);
  });

  it('makes a flat 0° local skyline reproduce the geometric horizon classification', () => {
    const result = calculateStellarSkySnapshot({
      observedAtIso: '2026-08-10T00:00:00.000Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      horizonMask: FLAT_ZERO_SKYLINE
    });

    expect(result.localHorizonApplied).toBe(true);
    expect(result.localHorizonMaximumAzimuthGapDeg).toBe(90);
    expect(result.localHorizonCounts).not.toBeNull();
    for (const star of result.stars) {
      if (star.azimuthDeg === null) {
        expect(star.localHorizonStatus).toBe('undefined-azimuth');
        continue;
      }
      expect(star.localHorizonAltitudeDeg).toBeCloseTo(0, 12);
      expect(star.localHorizonClearanceDeg).toBeCloseTo(star.elevationDeg, 12);
      if (Math.abs(star.elevationDeg) > 1e-9) {
        expect(star.localHorizonStatus).toBe(star.aboveGeometricHorizon ? 'above' : 'below');
      }
    }
  });

  it('does not classify any catalog star above a 90° local skyline', () => {
    const result = calculateStellarSkySnapshot({
      observedAtIso: '2026-08-10T00:00:00.000Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      horizonMask: ZENITH_SKYLINE
    });

    expect(result.localHorizonCounts?.above).toBe(0);
    expect(result.stars.every((star) => star.localHorizonClearanceDeg === null || star.localHorizonClearanceDeg <= 1e-9)).toBe(true);
  });

  it('preserves source provenance and a compact aggregate trace', () => {
    const result = calculateStellarSkySnapshot({
      observedAtIso: '2026-08-10T00:00:00.000Z',
      latitudeDeg: -33.8688,
      longitudeDeg: 151.2093,
      horizonMask: FLAT_ZERO_SKYLINE
    });

    expect(result.catalogSource).toContain('NASA HEASARC BSC5P');
    expect(result.localHorizonSourceLabel).toBe('Düz 0° test skyline');
    expect(result.trace.steps.map((step) => step.id)).toEqual([
      'catalog-resolve',
      'horizontal-transform',
      'local-horizon-classification'
    ]);
    expect(result.trace.steps[1]?.result).toContain('geometrik 0° üstü');
    expect(result.trace.steps[2]?.result).toContain('üstünde=');
  });
});
