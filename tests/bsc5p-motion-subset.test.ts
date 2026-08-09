import { describe, expect, it } from 'vitest';
import { BRIGHT_STAR_CATALOG } from '../src/simulation/bright-star-catalog';
import type { Bsc5pCatalogRecord } from '../src/simulation/bsc5p-fixed-width';
import {
  BSC5P_MOTION_SUBSET_ID,
  Bsc5pMotionSubsetError,
  buildVerifiedBrightStarMotionSubsetFromRecords,
  serializeVerifiedBrightStarMotionSubset
} from '../src/simulation/bsc5p-motion-subset';
import { Bsc5pReferenceMismatchError } from '../src/simulation/bsc5p-reference-validation';

function syntheticRecord(index: number): Bsc5pCatalogRecord {
  const star = BRIGHT_STAR_CATALOG[index];
  if (!star) throw new Error(`Fixture yıldızı yok: ${index}`);
  return {
    rawLine: `HR${star.hrNumber}`.padEnd(197, ' '),
    hrNumber: star.hrNumber,
    catalogName: star.bayerDesignation,
    hdNumber: null,
    saoNumber: null,
    fk5Number: null,
    rightAscensionJ2000Deg: star.rightAscensionJ2000Deg,
    declinationJ2000Deg: star.declinationJ2000Deg,
    visualMagnitude: star.visualMagnitude,
    properMotionRaStarArcsecPerYear: (index + 1) * 0.001,
    properMotionDecArcsecPerYear: -(index + 1) * 0.0015,
    parallaxArcsec: null,
    radialVelocityKmPerSec: null,
    hasNote: false,
    sourceEpochJulianYear: 2000,
    sourceFrame: 'fk5-j2000'
  };
}

function completeSyntheticRecords(): Bsc5pCatalogRecord[] {
  return BRIGHT_STAR_CATALOG.map((_, index) => syntheticRecord(index));
}

describe('BSC5P proper-motion subset builder', () => {
  it('builds all curated stars in deterministic catalog order', () => {
    const subset = buildVerifiedBrightStarMotionSubsetFromRecords(
      completeSyntheticRecords().reverse()
    );

    expect(subset.id).toBe(BSC5P_MOTION_SUBSET_ID);
    expect(subset.entries).toHaveLength(BRIGHT_STAR_CATALOG.length);
    expect(subset.entries.map((entry) => entry.starId)).toEqual(
      BRIGHT_STAR_CATALOG.map((star) => star.id)
    );
    expect(subset.entries[0]?.properMotionRaStarArcsecPerYear).toBe(0.001);
    expect(subset.entries.at(-1)?.properMotionDecArcsecPerYear).toBeCloseTo(-0.0285, 12);
    expect(subset.sourceFrame).toBe('fk5-j2000');
    expect(subset.sourceEpochJulianYear).toBe(2000);
  });

  it('preserves zero as a legitimate measured proper-motion component', () => {
    const records = completeSyntheticRecords();
    const first = records[0];
    if (!first) throw new Error('Fixture kaydı yok.');
    records[0] = { ...first, properMotionRaStarArcsecPerYear: 0 };
    const subset = buildVerifiedBrightStarMotionSubsetFromRecords(records);
    expect(subset.entries[0]?.properMotionRaStarArcsecPerYear).toBe(0);
  });

  it('rejects the entire subset when one required HR row is missing', () => {
    const records = completeSyntheticRecords().slice(1);
    expect(() => buildVerifiedBrightStarMotionSubsetFromRecords(records)).toThrow(Bsc5pMotionSubsetError);
    expect(() => buildVerifiedBrightStarMotionSubsetFromRecords(records)).toThrow('bulunamadı');
  });

  it('rejects duplicate HR rows before selecting the curated subset', () => {
    const records = completeSyntheticRecords();
    const duplicate = records[0];
    if (!duplicate) throw new Error('Fixture kaydı yok.');
    records.push({ ...duplicate });
    expect(() => buildVerifiedBrightStarMotionSubsetFromRecords(records)).toThrow('yinelenen HR');
  });

  it('rejects a matching star when either PM component is blank', () => {
    const records = completeSyntheticRecords();
    const first = records[0];
    if (!first) throw new Error('Fixture kaydı yok.');
    records[0] = { ...first, properMotionDecArcsecPerYear: null };
    expect(() => buildVerifiedBrightStarMotionSubsetFromRecords(records)).toThrow(Bsc5pReferenceMismatchError);
  });

  it('rejects a wrong source row even when its HR is rewritten to the expected number', () => {
    const records = completeSyntheticRecords();
    const first = records[0];
    const second = records[1];
    if (!first || !second) throw new Error('Fixture kayıtları yok.');
    records[0] = {
      ...second,
      hrNumber: first.hrNumber,
      rawLine: 'WRONG ROW'.padEnd(197, ' ')
    };
    // Remove the real second row so duplicate-HR protection does not mask the
    // reference-position mismatch we want to exercise.
    records.splice(1, 1);
    expect(() => buildVerifiedBrightStarMotionSubsetFromRecords(records)).toThrow(Bsc5pReferenceMismatchError);
  });

  it('serializes the verified subset deterministically with a trailing newline', () => {
    const subset = buildVerifiedBrightStarMotionSubsetFromRecords(completeSyntheticRecords());
    const first = serializeVerifiedBrightStarMotionSubset(subset);
    const second = serializeVerifiedBrightStarMotionSubset(subset);
    expect(first).toBe(second);
    expect(first.endsWith('\n')).toBe(true);
    expect(JSON.parse(first).entries).toHaveLength(19);
  });
});
