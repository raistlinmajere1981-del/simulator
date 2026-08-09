import { describe, expect, it } from 'vitest';
import { getBrightStarById } from '../src/simulation/bright-star-catalog';
import type { Bsc5pCatalogRecord } from '../src/simulation/bsc5p-fixed-width';
import {
  assertBsc5pRecordMatchesBrightStar,
  Bsc5pReferenceMismatchError,
  validateBsc5pRecordAgainstBrightStar
} from '../src/simulation/bsc5p-reference-validation';

function siriusReference() {
  const star = getBrightStarById('hr-2491');
  if (!star) throw new Error('Sirius fixture referansı bulunamadı.');
  return star;
}

function matchingRecord(overrides: Partial<Bsc5pCatalogRecord> = {}): Bsc5pCatalogRecord {
  return {
    rawLine: ''.padEnd(197, ' '),
    hrNumber: 2491,
    catalogName: '9Alp CMa',
    hdNumber: 48915,
    saoNumber: 151881,
    fk5Number: 257,
    // BSC fixed-width source precision: RA 0.1s time, Dec 1 arcsec.
    rightAscensionJ2000Deg: (6 + 45 / 60 + 8.9 / 3600) * 15,
    declinationJ2000Deg: -(16 + 42 / 60 + 58 / 3600),
    visualMagnitude: -1.46,
    properMotionRaStarArcsecPerYear: -0.5,
    properMotionDecArcsecPerYear: -1.2,
    parallaxArcsec: 0.25,
    radialVelocityKmPerSec: -12,
    hasNote: true,
    sourceEpochJulianYear: 2000,
    sourceFrame: 'fk5-j2000',
    ...overrides
  };
}

describe('BSC5P bright-star reference validation', () => {
  it('accepts a source-precision row for the matching curated star', () => {
    const validation = validateBsc5pRecordAgainstBrightStar(
      matchingRecord(),
      siriusReference(),
      { requireProperMotion: true }
    );

    expect(validation.valid).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(validation.angularSeparationArcsec).not.toBeNull();
    expect(validation.angularSeparationArcsec!).toBeLessThan(3);
    expect(validation.visualMagnitudeDifference).toBeCloseTo(0, 12);
  });

  it('rejects the wrong HR even when other fields look plausible', () => {
    const validation = validateBsc5pRecordAgainstBrightStar(
      matchingRecord({ hrNumber: 7001 }),
      siriusReference()
    );
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain('hr-mismatch');
  });

  it('rejects a source row whose J2000 direction is too far away', () => {
    const validation = validateBsc5pRecordAgainstBrightStar(
      matchingRecord({ rightAscensionJ2000Deg: 102 }),
      siriusReference()
    );
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain('position-mismatch');
  });

  it('rejects a magnitude mismatch', () => {
    const validation = validateBsc5pRecordAgainstBrightStar(
      matchingRecord({ visualMagnitude: -1.2 }),
      siriusReference()
    );
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain('vmag-mismatch');
  });

  it('does not interpret blank proper-motion fields as zero when motion is required', () => {
    const validation = validateBsc5pRecordAgainstBrightStar(
      matchingRecord({ properMotionRaStarArcsecPerYear: null }),
      siriusReference(),
      { requireProperMotion: true }
    );
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain('missing-proper-motion');
  });

  it('throws a typed error when a row cannot be safely attached to a star', () => {
    expect(() => assertBsc5pRecordMatchesBrightStar(
      matchingRecord({ declinationJ2000Deg: null }),
      siriusReference(),
      { requireProperMotion: true }
    )).toThrow(Bsc5pReferenceMismatchError);
  });
});
