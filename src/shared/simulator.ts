import type { CalculationTrace, ModelPrediction } from './domain';

export type DistanceSource = 'manual' | 'coordinates';

export interface SimulatorInputs {
  observerHeightM: number;
  targetHeightM: number;
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

export interface SavedExperiment {
  id: string;
  name: string;
  createdAtIso: string;
  updatedAtIso: string;
  inputs: SimulatorInputs;
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

export interface SimulatorDesktopApi {
  version: string;
  platform: string;
  listExperiments(): Promise<SavedExperiment[]>;
  saveExperiment(experiment: SavedExperiment): Promise<SavedExperiment>;
  deleteExperiment(id: string): Promise<boolean>;
  exportExperiment(id: string): Promise<FileOperationResult>;
  importExperiment(): Promise<ImportExperimentResult>;
  exportExperimentReport(id: string): Promise<FileOperationResult>;
}
