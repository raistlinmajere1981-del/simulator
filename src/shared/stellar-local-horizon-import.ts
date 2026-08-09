export type StellarLocalHorizonImportFormat = 'csv' | 'json';

export interface StellarLocalHorizonImportPoint {
  azimuthDeg: number;
  altitudeDeg: number;
}

export interface ImportedStellarLocalHorizonProfile {
  fileName: string;
  importedAtIso: string;
  format: StellarLocalHorizonImportFormat;
  pointCount: number;
  maximumAzimuthGapDeg: number;
  points: StellarLocalHorizonImportPoint[];
  warnings: string[];
  fileSizeBytes: number;
  sha256: string;
}

export interface SavedStellarLocalHorizonSource extends ImportedStellarLocalHorizonProfile {
  modifiedAfterImport: boolean;
}
