import type { SavedStellarMotionSource } from '../shared/stellar-motion-source';
import {
  BSC5P_MOTION_SUBSET_ID,
  BSC5P_MOTION_SUBSET_VERSION,
  buildVerifiedBrightStarMotionSubset,
  type VerifiedBrightStarMotionSubset
} from './bsc5p-motion-subset';
import {
  BSC5P_FIXED_WIDTH_FORMAT_ID,
  BSC5P_FIXED_WIDTH_FORMAT_VERSION,
  BSC5P_FIXED_WIDTH_SOURCE,
  BSC5P_SOURCE_EPOCH_JULIAN_YEAR
} from './bsc5p-fixed-width';

export class StellarMotionSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarMotionSourceError';
  }
}

function sameNumber(left: number | null, right: number | null, tolerance = 1e-12): boolean {
  if (left === null || right === null) return left === right;
  return Math.abs(left - right) <= tolerance;
}

/**
 * Revalidates the exact persisted BSC5P source rows and compares the canonical
 * subset against every persisted numeric field. This prevents edited portable
 * records from silently changing proper-motion values without changing source
 * provenance.
 */
export function verifiedMotionSubsetFromSavedSource(
  source: SavedStellarMotionSource
): VerifiedBrightStarMotionSubset {
  if (source.subsetId !== BSC5P_MOTION_SUBSET_ID ||
    source.subsetVersion !== BSC5P_MOTION_SUBSET_VERSION ||
    source.sourceCatalog !== BSC5P_FIXED_WIDTH_SOURCE ||
    source.sourceFormatId !== BSC5P_FIXED_WIDTH_FORMAT_ID ||
    source.sourceFormatVersion !== BSC5P_FIXED_WIDTH_FORMAT_VERSION ||
    source.sourceEpochJulianYear !== BSC5P_SOURCE_EPOCH_JULIAN_YEAR ||
    source.sourceFrame !== 'fk5-j2000' || source.entryCount !== 19 ||
    source.entries.length !== source.entryCount) {
    throw new StellarMotionSourceError('Proper-motion kaynak üstverisi desteklenen BSC5P sözleşmesiyle uyuşmuyor.');
  }

  const canonical = buildVerifiedBrightStarMotionSubset(
    `${source.entries.map((entry) => entry.sourceRecord).join('\n')}\n`
  );
  if (canonical.entries.length !== source.entries.length) {
    throw new StellarMotionSourceError('Proper-motion kaynak satırları beklenen 19-yıldız altkümesini yeniden üretmedi.');
  }

  for (let index = 0; index < canonical.entries.length; index += 1) {
    const expected = canonical.entries[index];
    const persisted = source.entries[index];
    if (!expected || !persisted || expected.starId !== persisted.starId ||
      expected.commonName !== persisted.commonName || expected.hrNumber !== persisted.hrNumber ||
      !sameNumber(expected.sourceRightAscensionJ2000Deg, persisted.sourceRightAscensionJ2000Deg) ||
      !sameNumber(expected.sourceDeclinationJ2000Deg, persisted.sourceDeclinationJ2000Deg) ||
      !sameNumber(expected.visualMagnitude, persisted.visualMagnitude) ||
      !sameNumber(expected.properMotionRaStarArcsecPerYear, persisted.properMotionRaStarArcsecPerYear) ||
      !sameNumber(expected.properMotionDecArcsecPerYear, persisted.properMotionDecArcsecPerYear) ||
      !sameNumber(expected.parallaxArcsec, persisted.parallaxArcsec) ||
      !sameNumber(expected.radialVelocityKmPerSec, persisted.radialVelocityKmPerSec) ||
      expected.sourceRecord !== persisted.sourceRecord) {
      throw new StellarMotionSourceError(
        `Proper-motion kaynak kaydı doğrulanmış BSC5P satırıyla uyuşmuyor: sıra ${index + 1}.`
      );
    }
  }
  return canonical;
}

export function savedStellarMotionSourceFromVerifiedSubset(input: {
  subset: VerifiedBrightStarMotionSubset;
  fileName: string;
  importedAtIso: string;
  fileSizeBytes: number;
  sha256: string;
}): SavedStellarMotionSource {
  if (!Number.isInteger(input.fileSizeBytes) || input.fileSizeBytes <= 0 ||
    !/^[a-f0-9]{64}$/.test(input.sha256)) {
    throw new StellarMotionSourceError('Proper-motion kaynak dosyası bütünlük üstverisi geçersiz.');
  }
  return {
    fileName: input.fileName,
    importedAtIso: input.importedAtIso,
    fileSizeBytes: input.fileSizeBytes,
    sha256: input.sha256,
    subsetId: input.subset.id,
    subsetVersion: input.subset.version,
    sourceCatalog: input.subset.sourceCatalog,
    sourceFormatId: input.subset.sourceFormatId,
    sourceFormatVersion: input.subset.sourceFormatVersion,
    sourceEpochJulianYear: input.subset.sourceEpochJulianYear,
    sourceFrame: input.subset.sourceFrame,
    entryCount: input.subset.entries.length,
    entries: input.subset.entries.map((entry) => ({ ...entry })),
    modifiedAfterImport: false
  };
}
