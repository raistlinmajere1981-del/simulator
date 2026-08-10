export interface SavedStellarMotionEntry {
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

/**
 * Persisted provenance for a verified 19-star subset extracted from the official
 * BSC5P V/50 fixed-width catalog. The whole source catalog is not embedded;
 * only the exact 19 source rows plus the SHA-256 of the selected source file are
 * retained so the subset can be revalidated on reopen/import.
 */
export interface SavedStellarMotionSource {
  fileName: string;
  importedAtIso: string;
  fileSizeBytes: number;
  sha256: string;
  subsetId: string;
  subsetVersion: string;
  sourceCatalog: string;
  sourceFormatId: string;
  sourceFormatVersion: string;
  sourceEpochJulianYear: number;
  sourceFrame: 'fk5-j2000';
  entryCount: number;
  entries: SavedStellarMotionEntry[];
  modifiedAfterImport: boolean;
}

export interface ImportStellarMotionResult {
  status: 'success' | 'cancelled';
  message: string;
  filePath?: string;
  source?: SavedStellarMotionSource;
}
