import { describe, expect, it } from 'vitest';
import {
  BRIGHT_STAR_CATALOG,
  resolveBrightStarForObservation
} from '../src/simulation/bright-star-catalog';
import {
  BSC5P_FIXED_WIDTH_FORMAT_ID,
  BSC5P_FIXED_WIDTH_FORMAT_VERSION,
  BSC5P_FIXED_WIDTH_SOURCE,
  BSC5P_SOURCE_EPOCH_JULIAN_YEAR
} from '../src/simulation/bsc5p-fixed-width';
import {
  BSC5P_MOTION_SUBSET_ID,
  BSC5P_MOTION_SUBSET_VERSION,
  Bsc5pMotionSubsetError,
  resolveVerifiedBrightStarMotionReference,
  type VerifiedBrightStarMotionSubset
} from '../src/simulation/bsc5p-motion-subset';
import {
  DEFAULT_STELLAR_OBSERVATION_SETTINGS,
  calculateStellarObservation,
  createStellarObservationPrediction
} from '../src/simulation/stellar-observation';
import { calculateStellarSkySnapshot } from '../src/simulation/stellar-sky-snapshot';

function syntheticMotionSubset(): VerifiedBrightStarMotionSubset {
  return {
    id: BSC5P_MOTION_SUBSET_ID,
    version: BSC5P_MOTION_SUBSET_VERSION,
    sourceCatalog: BSC5P_FIXED_WIDTH_SOURCE,
    sourceFormatId: BSC5P_FIXED_WIDTH_FORMAT_ID,
    sourceFormatVersion: BSC5P_FIXED_WIDTH_FORMAT_VERSION,
    sourceEpochJulianYear: BSC5P_SOURCE_EPOCH_JULIAN_YEAR,
    sourceFrame: 'fk5-j2000',
    entries: BRIGHT_STAR_CATALOG.map((star) => ({
      starId: star.id,
      commonName: star.commonName,
      hrNumber: star.hrNumber,
      sourceRightAscensionJ2000Deg: star.rightAscensionJ2000Deg,
      sourceDeclinationJ2000Deg: star.declinationJ2000Deg,
      visualMagnitude: star.visualMagnitude,
      properMotionRaStarArcsecPerYear: star.id === 'hr-7001' ? 1 : 0,
      properMotionDecArcsecPerYear: star.id === 'hr-7001' ? 0.5 : 0,
      parallaxArcsec: null,
      radialVelocityKmPerSec: null,
      sourceRecord: `synthetic-${star.id}`
    }))
  };
}

describe('verified proper-motion application', () => {
  it('preserves the existing no-source catalogue → precession behavior', () => {
    const resolved = resolveBrightStarForObservation('hr-7001', '2026-08-10T00:00:00Z');
    expect(resolved.properMotion).toBeNull();
    expect(resolved.precession.sourceRightAscensionDeg).toBeCloseTo(
      BRIGHT_STAR_CATALOG.find((star) => star.id === 'hr-7001')!.rightAscensionJ2000Deg,
      12
    );
  });

  it('applies verified angular motion before precession for the selected star', () => {
    const subset = syntheticMotionSubset();
    const reference = resolveVerifiedBrightStarMotionReference(subset, 'hr-7001');
    const withoutMotion = resolveBrightStarForObservation('hr-7001', '2026-08-10T00:00:00Z');
    const withMotion = resolveBrightStarForObservation('hr-7001', '2026-08-10T00:00:00Z', reference);

    expect(withMotion.properMotion).not.toBeNull();
    expect(withMotion.properMotion!.angularShiftArcsec).toBeGreaterThan(25);
    expect(withMotion.precession.sourceRightAscensionDeg).toBeCloseTo(
      withMotion.properMotion!.propagatedRightAscensionDeg,
      12
    );
    expect(withMotion.precession.sourceDeclinationDeg).toBeCloseTo(
      withMotion.properMotion!.propagatedDeclinationDeg,
      12
    );
    expect(withMotion.precession.meanOfDateRightAscensionDeg).not.toBeCloseTo(
      withoutMotion.precession.meanOfDateRightAscensionDeg,
      6
    );
  });

  it('threads one verified motion subset through selected-star and 19-star snapshot results', () => {
    const subset = syntheticMotionSubset();
    const input = {
      observedAtIso: '2026-08-10T00:00:00Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784
    };
    const observation = calculateStellarObservation({
      experimentId: 'proper-motion-observation',
      ...input,
      settings: { ...DEFAULT_STELLAR_OBSERVATION_SETTINGS, starId: 'hr-7001' },
      motionSubset: subset
    });
    const vega = observation.skySnapshot.stars.find((star) => star.starId === 'hr-7001');

    expect(observation.properMotion).not.toBeNull();
    expect(observation.skySnapshot.properMotionApplied).toBe(true);
    expect(observation.skySnapshot.stars).toHaveLength(19);
    expect(observation.skySnapshot.stars.every((star) => star.properMotionApplied)).toBe(true);
    expect(vega?.properMotionAngularShiftArcsec).toBeCloseTo(observation.properMotion!.angularShiftArcsec, 9);
    expect(vega?.meanOfDateRightAscensionDeg).toBeCloseTo(observation.meanOfDateRightAscensionDeg, 10);
    expect(vega?.meanOfDateDeclinationDeg).toBeCloseTo(observation.meanOfDateDeclinationDeg, 10);
  });

  it('records compact proper-motion metrics without changing stored observation settings', () => {
    const result = calculateStellarObservation({
      experimentId: 'proper-motion-prediction',
      observedAtIso: '2026-08-10T00:00:00Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      settings: { ...DEFAULT_STELLAR_OBSERVATION_SETTINGS, starId: 'hr-7001' },
      motionSubset: syntheticMotionSubset()
    });
    const prediction = createStellarObservationPrediction(result);
    const metric = (key: string) => prediction.metrics.find((candidate) => candidate.key === key)?.value;

    expect(metric('stellarProperMotionApplied')).toBe(1);
    expect(metric('stellarProperMotionShiftArcsec')).toBeCloseTo(result.properMotion!.angularShiftArcsec, 12);
    expect(metric('stellarProperMotionRaStarArcsecPerYear')).toBe(1);
    expect(metric('stellarProperMotionDecArcsecPerYear')).toBe(0.5);
    expect(metric('stellarProperMotionSourceEpochJulianYear')).toBe(2000);
    expect(result.settings).toEqual({ ...DEFAULT_STELLAR_OBSERVATION_SETTINGS, starId: 'hr-7001' });
  });

  it('fails closed for a partial verified subset instead of silently mixing motion/no-motion stars', () => {
    const subset = syntheticMotionSubset();
    const partial: VerifiedBrightStarMotionSubset = {
      ...subset,
      entries: subset.entries.slice(0, -1)
    };

    expect(() => resolveVerifiedBrightStarMotionReference(partial, 'hr-7001')).toThrow(Bsc5pMotionSubsetError);
    expect(() => calculateStellarSkySnapshot({
      observedAtIso: '2026-08-10T00:00:00Z',
      latitudeDeg: 41,
      longitudeDeg: 29,
      motionSubset: partial
    })).toThrow('19 yıldızın tamamını');
  });
});
