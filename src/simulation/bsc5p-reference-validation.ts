import type { BrightStarCatalogEntry } from './bright-star-catalog';
import type { Bsc5pCatalogRecord } from './bsc5p-fixed-width';

export const BSC5P_REFERENCE_MAX_POSITION_SEPARATION_ARCSEC = 3;
export const BSC5P_REFERENCE_MAX_VMAG_DIFFERENCE = 0.011;

export type Bsc5pReferenceIssueCode =
  | 'hr-mismatch'
  | 'missing-j2000-position'
  | 'position-mismatch'
  | 'missing-vmag'
  | 'vmag-mismatch'
  | 'missing-proper-motion';

export interface Bsc5pReferenceIssue {
  code: Bsc5pReferenceIssueCode;
  message: string;
}

export interface Bsc5pReferenceValidation {
  valid: boolean;
  angularSeparationArcsec: number | null;
  visualMagnitudeDifference: number | null;
  issues: Bsc5pReferenceIssue[];
}

export interface Bsc5pReferenceValidationOptions {
  requireProperMotion?: boolean;
}

export class Bsc5pReferenceMismatchError extends Error {
  readonly issues: readonly Bsc5pReferenceIssue[];

  constructor(message: string, issues: readonly Bsc5pReferenceIssue[]) {
    super(message);
    this.name = 'Bsc5pReferenceMismatchError';
    this.issues = issues;
  }
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_ARCSEC = (180 / Math.PI) * 3600;

function directionVector(rightAscensionDeg: number, declinationDeg: number): readonly [number, number, number] {
  const rightAscensionRad = rightAscensionDeg * DEG_TO_RAD;
  const declinationRad = declinationDeg * DEG_TO_RAD;
  const cosDeclination = Math.cos(declinationRad);
  return [
    cosDeclination * Math.cos(rightAscensionRad),
    cosDeclination * Math.sin(rightAscensionRad),
    Math.sin(declinationRad)
  ];
}

function angularSeparationArcsec(
  firstRightAscensionDeg: number,
  firstDeclinationDeg: number,
  secondRightAscensionDeg: number,
  secondDeclinationDeg: number
): number {
  const first = directionVector(firstRightAscensionDeg, firstDeclinationDeg);
  const second = directionVector(secondRightAscensionDeg, secondDeclinationDeg);
  const dot = first[0] * second[0] + first[1] * second[1] + first[2] * second[2];
  const crossX = first[1] * second[2] - first[2] * second[1];
  const crossY = first[2] * second[0] - first[0] * second[2];
  const crossZ = first[0] * second[1] - first[1] * second[0];
  return Math.atan2(Math.hypot(crossX, crossY, crossZ), Math.max(-1, Math.min(1, dot))) * RAD_TO_ARCSEC;
}

/**
 * Ensures a parsed fixed-width BSC5P row really corresponds to the curated
 * bright-star reference before any astrometric fields are imported from it.
 *
 * The three-arcsecond positional tolerance deliberately covers the published
 * BSC5P J2000 quantisation (RA to 0.1s of time and Dec to 1 arcsec) while still
 * making a wrong HR/row mapping fail loudly.
 */
export function validateBsc5pRecordAgainstBrightStar(
  record: Bsc5pCatalogRecord,
  star: BrightStarCatalogEntry,
  options: Bsc5pReferenceValidationOptions = {}
): Bsc5pReferenceValidation {
  const issues: Bsc5pReferenceIssue[] = [];
  let separationArcsec: number | null = null;
  let visualMagnitudeDifference: number | null = null;

  if (record.hrNumber !== star.hrNumber) {
    issues.push({
      code: 'hr-mismatch',
      message: `HR uyuşmuyor: kaynak=${record.hrNumber}, referans=${star.hrNumber}.`
    });
  }

  if (record.rightAscensionJ2000Deg === null || record.declinationJ2000Deg === null) {
    issues.push({
      code: 'missing-j2000-position',
      message: `HR ${record.hrNumber} kaynak satırında tam J2000 konumu bulunmuyor.`
    });
  } else {
    separationArcsec = angularSeparationArcsec(
      record.rightAscensionJ2000Deg,
      record.declinationJ2000Deg,
      star.rightAscensionJ2000Deg,
      star.declinationJ2000Deg
    );
    if (separationArcsec > BSC5P_REFERENCE_MAX_POSITION_SEPARATION_ARCSEC) {
      issues.push({
        code: 'position-mismatch',
        message: `J2000 konum farkı ${separationArcsec.toFixed(3)}″; izin verilen ${BSC5P_REFERENCE_MAX_POSITION_SEPARATION_ARCSEC}″ sınırını aşıyor.`
      });
    }
  }

  if (record.visualMagnitude === null) {
    issues.push({
      code: 'missing-vmag',
      message: `HR ${record.hrNumber} kaynak satırında V kadri bulunmuyor.`
    });
  } else {
    visualMagnitudeDifference = Math.abs(record.visualMagnitude - star.visualMagnitude);
    if (visualMagnitudeDifference > BSC5P_REFERENCE_MAX_VMAG_DIFFERENCE) {
      issues.push({
        code: 'vmag-mismatch',
        message: `V kadri uyuşmuyor: kaynak=${record.visualMagnitude}, referans=${star.visualMagnitude}.`
      });
    }
  }

  if (options.requireProperMotion === true &&
    (record.properMotionRaStarArcsecPerYear === null || record.properMotionDecArcsecPerYear === null)) {
    issues.push({
      code: 'missing-proper-motion',
      message: `HR ${record.hrNumber} için pmRA/pmDE bileşenlerinden en az biri boş; proper motion sıfır varsayılmayacak.`
    });
  }

  return {
    valid: issues.length === 0,
    angularSeparationArcsec: separationArcsec,
    visualMagnitudeDifference,
    issues
  };
}

export function assertBsc5pRecordMatchesBrightStar(
  record: Bsc5pCatalogRecord,
  star: BrightStarCatalogEntry,
  options: Bsc5pReferenceValidationOptions = {}
): Bsc5pReferenceValidation {
  const validation = validateBsc5pRecordAgainstBrightStar(record, star, options);
  if (!validation.valid) {
    throw new Bsc5pReferenceMismatchError(
      `BSC5P HR ${record.hrNumber} satırı ${star.commonName} referansıyla doğrulanamadı: ${validation.issues.map((issue) => issue.message).join(' ')}`,
      validation.issues
    );
  }
  return validation;
}
