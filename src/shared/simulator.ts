import type { ModelPrediction } from './domain';

export interface SimulatorInputs {
  observerHeightM: number;
  targetHeightM: number;
  surfaceDistanceKm: number;
  observedVisiblePercent: number;
  observationUncertaintyPercent: number;
  useStandardRefraction: boolean;
  refractionCoefficient: number;
}

export const DEFAULT_SIMULATOR_INPUTS: SimulatorInputs = {
  observerHeightM: 10,
  targetHeightM: 15,
  surfaceDistanceKm: 22.38,
  observedVisiblePercent: 52,
  observationUncertaintyPercent: 8,
  useStandardRefraction: true,
  refractionCoefficient: 0.13
};

export interface SavedExperiment {
  id: string;
  name: string;
  createdAtIso: string;
  updatedAtIso: string;
  inputs: SimulatorInputs;
  modelVersions: Record<string, string>;
  predictions: ModelPrediction[];
}

export interface SimulatorDesktopApi {
  version: string;
  platform: string;
  listExperiments(): Promise<SavedExperiment[]>;
  saveExperiment(experiment: SavedExperiment): Promise<SavedExperiment>;
  deleteExperiment(id: string): Promise<boolean>;
}
