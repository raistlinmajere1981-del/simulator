import type { CalculationTrace, ModelPrediction } from './domain';
import type { ManualTerrainPoint, VerticalDatumKind } from './terrain';

export type DistanceSource = 'manual' | 'coordinates';
export type TerrainMode = 'off' | 'manual-three-point' | 'manual-points';
export type CsvTerrainDistanceUnit = 'percent' | 'm' | 'km';
export type CsvTerrainDelimiter = 'comma' | 'semicolon' | 'tab';

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

export type TerrainProfileSource =
  | CsvTerrainProfileSource
  | GeoJsonTerrainProfileSource;

export interface SavedExperiment {
  id: string;
  name: string;
  createdAtIso: string;
  updatedAtIso: string;
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

export interface TerrainProfileImportContext {
  routeDistanceM: number;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
}

export interface ImportedTerrainProfile {
  fileName: string;
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

export interface ImportedGeoJsonTerrainProfile {
  kind: 'geojson';
  fileName: string;
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

export type TerrainProfileImport =
  | ImportedTerrainProfile
  | ImportedGeoJsonTerrainProfile;

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
}
