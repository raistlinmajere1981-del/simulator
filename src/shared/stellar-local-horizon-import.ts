export type StellarLocalHorizonImportFormat = 'csv' | 'json' | 'dem' | 'panorama';
export type StellarDemSkylineSamplingMethod = 'nearest' | 'bilinear';
export type StellarPanoramaGeometrySource = 'gpano-xmp' | 'manual';
export type StellarPanoramaMarkingMethod =
  | 'manual'
  | 'assisted-gradient-v1'
  | 'assisted-gradient-v1-edited';
export type StellarPanoramaMetadataStatus =
  | 'complete'
  | 'absent'
  | 'incomplete'
  | 'unsupported-projection'
  | 'incompatible-scale';

export interface StellarLocalHorizonImportPoint {
  azimuthDeg: number;
  altitudeDeg: number;
}

export interface StellarPanoramaGeometry {
  imageWidthPx: number;
  imageHeightPx: number;
  fullPanoWidthPx: number;
  fullPanoHeightPx: number;
  croppedAreaLeftPx: number;
  croppedAreaTopPx: number;
  poseHeadingDeg: number;
  posePitchDeg: number;
  poseRollDeg: number;
}

export interface StellarPanoramaSkylineMark {
  xPx: number;
  yPx: number;
  azimuthDeg: number;
  altitudeDeg: number;
}

export interface StellarPanoramaMetadataSummary {
  status: StellarPanoramaMetadataStatus;
  geometry?: StellarPanoramaGeometry;
  projectionType?: string;
  metadataScaledToImage: boolean;
  standardXmpPacketFound: boolean;
  extendedXmpPacketFound: boolean;
  warnings: string[];
}

/** Session-only panorama import draft. dataUrl is never persisted in SavedExperiment. */
export interface StellarPanoramaSkylineDraft {
  fileName: string;
  importedAtIso: string;
  fileSizeBytes: number;
  sha256: string;
  mimeType: 'image/jpeg' | 'image/png';
  imageWidthPx: number;
  imageHeightPx: number;
  dataUrl: string;
  metadata: StellarPanoramaMetadataSummary;
}

export interface SavedStellarPanoramaSkylineDerivation {
  algorithmId: string;
  algorithmVersion: string;
  geometrySource: StellarPanoramaGeometrySource;
  /** Optional for v11 compatibility; missing means fully manual marking. */
  markingMethod?: StellarPanoramaMarkingMethod;
  geometry: StellarPanoramaGeometry;
  horizontalCoverageDeg: number;
  verticalCoverageDeg: number;
  fullSphereCoverage: boolean;
  metadataStatusAtImport: StellarPanoramaMetadataStatus;
  projectionTypeAtImport?: string;
  metadataScaledToImage: boolean;
  standardXmpPacketFound: boolean;
  extendedXmpPacketFound: boolean;
  marks: StellarPanoramaSkylineMark[];
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
  panoramaDerivation?: SavedStellarPanoramaSkylineDerivation;
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

export interface ImportStellarPanoramaSkylineResult {
  status: 'success' | 'cancelled';
  message: string;
  filePath?: string;
  draft?: StellarPanoramaSkylineDraft;
}
