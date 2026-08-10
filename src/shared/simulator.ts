import type { AtmosphereExperimentState } from './atmosphere';
import type { ImportedObservationPhoto, SavedPhotoCalibration } from './photo-calibration';
import type { CalculationTrace, ModelPrediction } from './domain';
import type { SimulationScenarioId } from './scenario';
import type { ManualTerrainPoint, VerticalDatumKind } from './terrain';
import type { ModelInputUncertaintySettings } from './uncertainty';
import type { TextExperimentSetupProvenance } from './text-experiment-setup';
import type {
  GenerateStellarDemSkylineResult,
  ImportedStellarLocalHorizonProfile,
  ImportStellarDemSkylineResult,
  ImportStellarPanoramaSkylineResult,
  SavedStellarLocalHorizonSource,
  StellarDemSkylineGenerationSettings
} from './stellar-local-horizon-import';
import type { ImportStellarMotionResult, SavedStellarMotionSource } from './stellar-motion-source';

export type DistanceSource = 'manual' | 'coordinates';
export type TerrainMode = 'off' | 'manual-three-point' | 'manual-points';
export type CsvTerrainDistanceUnit = 'percent' | 'm' | 'km';
export type CsvTerrainDelimiter = 'comma' | 'semicolon' | 'tab';
export type DemTerrainSamplingMethod = 'nearest' | 'bilinear';
export type DemTerrainSampleCountMode = 'automatic' | 'manual';
export type DemTerrainDiagnosticStatus = 'good' | 'caution' | 'limited';

export interface SimulatorInputs {
  observerHeightM: number;
  targetHeightM: number;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  verticalDatumKind: VerticalDatumKind;
  verticalDatumOffsetM: number;
  terrainMode: TerrainMode;
  /** Legacy single-point fields retained for portable schema migration. */
  terrainIntermediateDistancePercent: number;
  terrainIntermediateElevationM: number;
  distanceSource: DistanceSource;
  surfaceDistanceKm: number;
  observerLatitudeDeg: number;
  observerLongitudeDeg: number;
  targetLatitudeDeg: number;
  targetLongitudeDeg: number;
  observedVisiblePercent: number;
  observationUncertaintyPercent: number;
  useStandardRefraction: boolean;
  refractionCoefficient: number;
}

export const DEFAULT_SIMULATOR_INPUTS: SimulatorInputs = {
  observerHeightM: 10,
  targetHeightM: 15,
  observerGroundElevationM: 0,
  targetGroundElevationM: 0,
  verticalDatumKind: 'orthometric-msl',
  verticalDatumOffsetM: 0,
  terrainMode: 'off',
  terrainIntermediateDistancePercent: 50,
  terrainIntermediateElevationM: 0,
  distanceSource: 'manual',
  surfaceDistanceKm: 22.38,
  observerLatitudeDeg: 41.0082,
  observerLongitudeDeg: 28.9784,
  targetLatitudeDeg: 41.18,
  targetLongitudeDeg: 29.12,
  observedVisiblePercent: 52,
  observationUncertaintyPercent: 8,
  useStandardRefraction: true,
  refractionCoefficient: 0.13
};

export type SavedGeodesicMethod = 'vincenty' | 'spherical-fallback';

export interface SavedGeodesicCalculation {
  method: SavedGeodesicMethod;
  converged: boolean;
  iterations: number;
  distanceM: number;
  initialBearingDeg: number;
  finalBearingDeg: number;
  warnings: string[];
  traceId: string;
  trace: CalculationTrace;
}

export interface TerrainProfileColumnMapping {
  distanceColumnIndex: number;
  elevationColumnIndex: number;
  distanceUnit: CsvTerrainDistanceUnit;
}

export interface TerrainSourceIntegrity {
  fileSizeBytes: number;
  sha256: string;
}

export interface TerrainProfileMappingRequest {
  requestId: string;
  fileName: string;
  delimiter: CsvTerrainDelimiter;
  headers: string[];
  previewRows: string[][];
  reason: string;
}

interface BaseTerrainProfileSource {
  fileName: string;
  importedAtIso: string;
  sourceDistanceM: number | null;
  observerEndpointElevationM: number;
  targetEndpointElevationM: number;
  appliedObserverEndpoint: boolean;
  appliedTargetEndpoint: boolean;
  appliedRouteDistance?: boolean;
  appliedRouteCoordinates?: boolean;
  fileSizeBytes?: number;
  sha256?: string;
  modifiedAfterImport: boolean;
}

export interface CsvTerrainProfileSource extends BaseTerrainProfileSource {
  kind: 'csv';
  delimiter: CsvTerrainDelimiter;
  distanceUnit: CsvTerrainDistanceUnit;
  rowCount: number;
  distanceColumnHeader: string;
  elevationColumnHeader: string;
}

export interface GeoJsonTerrainProfileSource extends BaseTerrainProfileSource {
  kind: 'geojson';
  geometryType: 'LineString';
  coordinateCount: number;
  startLongitudeDeg: number;
  startLatitudeDeg: number;
  endLongitudeDeg: number;
  endLatitudeDeg: number;
  elevationSource: 'coordinate-z';
}

export interface DemTerrainProfileSource extends BaseTerrainProfileSource {
  kind: 'dem';
  format: 'esri-ascii';
  samplingMethod: DemTerrainSamplingMethod;
  geodesicMethod: SavedGeodesicMethod;
  columnCount: number;
  rowCount: number;
  sampleCount: number;
  sampleCountMode?: DemTerrainSampleCountMode;
  sampleSpacingM: number;
  cellSizeDeg: number;
  noDataValue: number | null;
  westBoundaryDeg: number;
  eastBoundaryDeg: number;
  southBoundaryDeg: number;
  northBoundaryDeg: number;
  diagnosticStatus?: DemTerrainDiagnosticStatus;
  effectiveCellSpanM?: number;
  sampleSpacingToCellRatio?: number;
  minimumCoverageMarginM?: number;
  coverageMarginCellRatio?: number;
  minimumElevationM?: number;
  maximumElevationM?: number;
  elevationRangeM?: number;
}

export type TerrainProfileSource =
  | CsvTerrainProfileSource
  | GeoJsonTerrainProfileSource
  | DemTerrainProfileSource;

export interface SavedExperiment {
  id: string;
  name: string;
  createdAtIso: string;
  updatedAtIso: string;
  /** Physical observation instant. Kept separate from record creation/update time. */
  observedAtIso?: string;
  /** Display/provenance offset used when editing the observation local clock. */
  observationUtcOffsetMinutes?: number;
  /** Scenario identity; older records default to target visibility. */
  scenarioId?: SimulationScenarioId;
  /** Persisted advanced-atmosphere editor state; older records derive mode from the legacy standard-refraction flag. */
  atmosphere?: AtmosphereExperimentState;
  /** Camera/photo calibration metadata and marks; source image bytes are never embedded here. */
  photoCalibration?: SavedPhotoCalibration;
  /** Optional explicit model-input uncertainties used by photo/model angular comparison. */
  photoModelUncertainty?: ModelInputUncertaintySettings;
  /** Provenance history for user-approved values extracted from free-form experiment text. */
  textSetupHistory?: TextExperimentSetupProvenance[];
  /** Optional high-resolution geometric skyline source used by the stellar observation scenario. */
  stellarLocalHorizonSource?: SavedStellarLocalHorizonSource;
  /** Optional verified BSC5P proper-motion source used by the stellar observation scenario. */
  stellarMotionSource?: SavedStellarMotionSource;
  inputs: SimulatorInputs;
  /**
   * Ordered interior terrain points. Endpoints are derived from the observer
   * and target ground elevations.
   */
  manualTerrainPoints?: ManualTerrainPoint[];
  /** Optional origin metadata for imported terrain data. */
  terrainProfileSource?: TerrainProfileSource;
  geodesic?: SavedGeodesicCalculation;
  modelVersions: Record<string, string>;
  predictions: ModelPrediction[];
}

export interface FileOperationResult {
  status: 'success' | 'cancelled';
  message: string;
  filePath?: string;
}

export interface ImportExperimentResult extends FileOperationResult {
  experiment?: SavedExperiment;
  migrated?: boolean;
  sourceVersion?: number;
}

export interface ImportObservationPhotoResult extends FileOperationResult {
  photo?: ImportedObservationPhoto;
}

export interface ImportStellarLocalHorizonResult extends FileOperationResult {
  profile?: ImportedStellarLocalHorizonProfile;
}

export interface TerrainProfileImportContext {
  routeDistanceM: number;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
}

export interface ImportedTerrainProfile {
  fileName: string;
  fileSizeBytes?: number;
  sha256?: string;
  delimiter: CsvTerrainDelimiter;
  distanceUnit: CsvTerrainDistanceUnit;
  distanceColumnHeader: string;
  elevationColumnHeader: string;
  rowCount: number;
  sourceDistanceM: number | null;
  observerEndpointElevationM: number;
  targetEndpointElevationM: number;
  points: ManualTerrainPoint[];
  warnings: string[];
}

export interface DemTerrainProfileImportContext {
  observerLatitudeDeg: number;
  observerLongitudeDeg: number;
  targetLatitudeDeg: number;
  targetLongitudeDeg: number;
  samplingMethod: DemTerrainSamplingMethod;
  sampleCount?: number;
}

export interface ImportedGeoJsonTerrainProfile {
  kind: 'geojson';
  fileName: string;
  fileSizeBytes?: number;
  sha256?: string;
  geometryType: 'LineString';
  coordinateCount: number;
  sourceDistanceM: number;
  startLongitudeDeg: number;
  startLatitudeDeg: number;
  endLongitudeDeg: number;
  endLatitudeDeg: number;
  elevationSource: 'coordinate-z';
  observerEndpointElevationM: number;
  targetEndpointElevationM: number;
  points: ManualTerrainPoint[];
  warnings: string[];
}

export interface ImportedDemTerrainProfile {
  kind: 'dem';
  fileName: string;
  fileSizeBytes?: number;
  sha256?: string;
  format: 'esri-ascii';
  samplingMethod: DemTerrainSamplingMethod;
  geodesicMethod: SavedGeodesicMethod;
  columnCount: number;
  rowCount: number;
  sampleCount: number;
  sampleCountMode: DemTerrainSampleCountMode;
  sampleSpacingM: number;
  cellSizeDeg: number;
  noDataValue: number | null;
  westBoundaryDeg: number;
  eastBoundaryDeg: number;
  southBoundaryDeg: number;
  northBoundaryDeg: number;
  diagnosticStatus: DemTerrainDiagnosticStatus;
  effectiveCellSpanM: number;
  sampleSpacingToCellRatio: number;
  minimumCoverageMarginM: number;
  coverageMarginCellRatio: number;
  minimumElevationM: number;
  maximumElevationM: number;
  elevationRangeM: number;
  sourceDistanceM: number;
  observerEndpointElevationM: number;
  targetEndpointElevationM: number;
  points: ManualTerrainPoint[];
  warnings: string[];
}

export type TerrainProfileImport =
  | ImportedTerrainProfile
  | ImportedGeoJsonTerrainProfile
  | ImportedDemTerrainProfile;

export interface ImportTerrainProfileResult extends FileOperationResult {
  profile?: TerrainProfileImport;
  mappingRequest?: TerrainProfileMappingRequest;
}

export interface SimulatorDesktopApi {
  version: string;
  platform: string;
  listExperiments(): Promise<SavedExperiment[]>;
  saveExperiment(experiment: SavedExperiment): Promise<SavedExperiment>;
  deleteExperiment(id: string): Promise<boolean>;
  exportExperiment(id: string): Promise<FileOperationResult>;
  importExperiment(): Promise<ImportExperimentResult>;
  exportExperimentReport(id: string): Promise<FileOperationResult>;
  importObservationPhoto(): Promise<ImportObservationPhotoResult>;
  importStellarLocalHorizon(): Promise<ImportStellarLocalHorizonResult>;
  importStellarMotionSource(): Promise<ImportStellarMotionResult>;
  importStellarDemSkyline(): Promise<ImportStellarDemSkylineResult>;
  importStellarPanoramaSkyline(): Promise<ImportStellarPanoramaSkylineResult>;
  generateStellarDemSkyline(
    requestId: string,
    settings: StellarDemSkylineGenerationSettings
  ): Promise<GenerateStellarDemSkylineResult>;
  importTerrainProfile(
    context: TerrainProfileImportContext
  ): Promise<ImportTerrainProfileResult>;
  importTerrainProfileWithMapping(
    requestId: string,
    mapping: TerrainProfileColumnMapping,
    context: TerrainProfileImportContext
  ): Promise<ImportTerrainProfileResult>;
  importGeoJsonTerrainProfile(
    context: TerrainProfileImportContext
  ): Promise<ImportTerrainProfileResult>;
  importDemTerrainProfile(
    context: DemTerrainProfileImportContext
  ): Promise<ImportTerrainProfileResult>;
}
