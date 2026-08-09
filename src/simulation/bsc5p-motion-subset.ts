import { BRIGHT_STAR_CATALOG, type BrightStarCatalogEntry } from './bright-star-catalog';
import {
  BSC5P_FIXED_WIDTH_FORMAT_ID,
  BSC5P_FIXED_WIDTH_FORMAT_VERSION,
  BSC5P_FIXED_WIDTH_SOURCE,
  BSC5P_SOURCE_EPOCH_JULIAN_YEAR,
  parseBsc5pFixedWidthCatalog,
  type Bsc5pCatalogRecord
} from './bsc5p-fixed-width';
import { assertBsc5pRecordMatchesBrightStar } from './bsc5p-reference-validation';

export const BSC5P_MOTION_SUBSET_ID = 'bsc5p-bright-star-motion-subset';
export const BSC5P_MOTION_SUBSET_VERSION = '0.1.0';

export interface VerifiedBrightStarMotionEntry {
  starId: string;
  commonName: string;
  hrNumber: number;
  sourceRightAscensionJ2000Deg: number;
  sourceDeclinationJ2000Deg: number;
  visualMagnitude: number;
  properMotionRaStarArcsecPerYear: number;
  properMotionDecArcsecPerYear: number;
  parallaxArcsec: number | null;
  radialVelocityKmPerSec: number | null;
  sourceRecord: string;
}

export interface VerifiedBrightStarMotionSubset {
  id: typeof BSC5P_MOTION_SUBSET_ID;
  version: typeof BSC5P_MOTION_SUBSET_VERSION;
  sourceCatalog: typeof BSC5P_FIXED_WIDTH_SOURCE;
  sourceFormatId: typeof BSC5P_FIXED_WIDTH_FORMAT_ID;
  sourceFormatVersion: typeof BSC5P_FIXED_WIDTH_FORMAT_VERSION;
  sourceEpochJulianYear: typeof BSC5P_SOURCE_EPOCH_JULIAN_YEAR;
  sourceFrame: 'fk5-j2000';
  entries: VerifiedBrightStarMotionEntry[];
}

export class Bsc5pMotionSubsetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Bsc5pMotionSubsetError';
  }
}

function findRequiredRecord(
  recordsByHr: ReadonlyMap<number, Bsc5pCatalogRecord>,
  star: BrightStarCatalogEntry
): Bsc5pCatalogRecord {
  const record = recordsByHr.get(star.hrNumber);
  if (!record) {
    throw new Bsc5pMotionSubsetError(
      `BSC5P kaynak kayıtlarında gerekli HR ${star.hrNumber} (${star.commonName}) bulunamadı.`
    );
  }
  return record;
}

function verifiedEntry(
  record: Bsc5pCatalogRecord,
  star: BrightStarCatalogEntry
): VerifiedBrightStarMotionEntry {
  assertBsc5pRecordMatchesBrightStar(record, star, { requireProperMotion: true });
  if (record.rightAscensionJ2000Deg === null || record.declinationJ2000Deg === null ||
    record.visualMagnitude === null || record.properMotionRaStarArcsecPerYear === null ||
    record.properMotionDecArcsecPerYear === null) {
    // The assertion above should already make these states impossible. Keep the
    // explicit guard so this function remains safe if validation rules evolve.
    throw new Bsc5pMotionSubsetError(
      `HR ${star.hrNumber} (${star.commonName}) doğrulandı ancak zorunlu astrometri alanı eksik kaldı.`
    );
  }
  return {
    starId: star.id,
    commonName: star.commonName,
    hrNumber: star.hrNumber,
    sourceRightAscensionJ2000Deg: record.rightAscensionJ2000Deg,
    sourceDeclinationJ2000Deg: record.declinationJ2000Deg,
    visualMagnitude: record.visualMagnitude,
    properMotionRaStarArcsecPerYear: record.properMotionRaStarArcsecPerYear,
    properMotionDecArcsecPerYear: record.properMotionDecArcsecPerYear,
    parallaxArcsec: record.parallaxArcsec,
    radialVelocityKmPerSec: record.radialVelocityKmPerSec,
    sourceRecord: record.rawLine
  };
}

/**
 * Builds the product's proper-motion subset only when every curated bright star
 * can be matched to one validated BSC5P row with both angular motion components.
 * Output order follows BRIGHT_STAR_CATALOG and is therefore deterministic.
 */
export function buildVerifiedBrightStarMotionSubsetFromRecords(
  records: readonly Bsc5pCatalogRecord[]
): VerifiedBrightStarMotionSubset {
  const recordsByHr = new Map<number, Bsc5pCatalogRecord>();
  for (const record of records) {
    if (recordsByHr.has(record.hrNumber)) {
      throw new Bsc5pMotionSubsetError(`BSC5P kayıt listesinde yinelenen HR numarası: ${record.hrNumber}.`);
    }
    recordsByHr.set(record.hrNumber, record);
  }

  const entries = BRIGHT_STAR_CATALOG.map((star) =>
    verifiedEntry(findRequiredRecord(recordsByHr, star), star)
  );

  return {
    id: BSC5P_MOTION_SUBSET_ID,
    version: BSC5P_MOTION_SUBSET_VERSION,
    sourceCatalog: BSC5P_FIXED_WIDTH_SOURCE,
    sourceFormatId: BSC5P_FIXED_WIDTH_FORMAT_ID,
    sourceFormatVersion: BSC5P_FIXED_WIDTH_FORMAT_VERSION,
    sourceEpochJulianYear: BSC5P_SOURCE_EPOCH_JULIAN_YEAR,
    sourceFrame: 'fk5-j2000',
    entries
  };
}

export function buildVerifiedBrightStarMotionSubset(
  sourceText: string
): VerifiedBrightStarMotionSubset {
  return buildVerifiedBrightStarMotionSubsetFromRecords(parseBsc5pFixedWidthCatalog(sourceText));
}

export function serializeVerifiedBrightStarMotionSubset(
  subset: VerifiedBrightStarMotionSubset
): string {
  return `${JSON.stringify(subset, null, 2)}\n`;
}
