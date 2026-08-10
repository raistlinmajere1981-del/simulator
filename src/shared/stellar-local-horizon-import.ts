export type StellarLocalHorizonImportFormat = 'csv' | 'json' | 'dem';
export type StellarDemSkylineSamplingMethod = 'nearest' | 'bilinear';

export interface StellarLocalHorizonImportPoint {
  azimuthDeg: number;
  altitudeDeg: number;
}

export interface StellarDemSkylineDraft {
  requestId: string;
  fileName: string;
  importedAtIso: string;
  fileSizeBytes: number;
  sha256: string;
  columnCount: number;
  rowCount: number;
  cellSizeDeg: number;
  noDataValue: number | null;
  westBoundaryDeg: number;
  eastBoundaryDeg: number;
  southBoundaryDeg: number;
  northBoundaryDeg: number;
  warnings: string[];
}

export interface StellarDemSkylineGenerationSettings {
  observerLatitudeDeg: number;
  observerLongitudeDeg: number;
  observerHeightM: number;
  heightDatumToEllipsoidOffsetM: number;
  azimuthStepDeg: number;
  distanceStepM: number;
  maximumDistanceM: number;
  samplingMethod: StellarDemSkylineSamplingMethod;
}

export interface SavedStellarDemSkylineDerivation extends StellarDemSkylineGenerationSettings {
  algorithmId: string;
  algorithmVersion: string;
  completeCoverage: boolean;
  completeRayCount: number;
  coverageLimitedRayCount: number;
  noDataAffectedRayCount: number;
  noCoverageRayCount: number;
  geodesicFallbackSampleCount: number;
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
  demDerivation?: SavedStellarDemSkylineDerivation;
}

export interface SavedStellarLocalHorizonSource extends ImportedStellarLocalHorizonProfile {
  modifiedAfterImport: boolean;
}

export interface ImportStellarDemSkylineResult {
  status: 'success' | 'cancelled';
  message: string;
  filePath?: string;
  draft?: StellarDemSkylineDraft;
}

export interface GenerateStellarDemSkylineResult {
  status: 'success';
  message: string;
  completeCoverage: boolean;
  source?: SavedStellarLocalHorizonSource;
  diagnostics: {
    pointCount: number;
    knownPointCount: number;
    completeRayCount: number;
    coverageLimitedRayCount: number;
    noDataAffectedRayCount: number;
    noCoverageRayCount: number;
  };
}
