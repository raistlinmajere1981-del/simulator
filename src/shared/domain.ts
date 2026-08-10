import type { TerrainProfile } from './terrain';

export type ModelCapability =
  | 'surface-distance'
  | 'line-of-sight'
  | 'horizon'
  | 'terrain-profile'
  | 'atmospheric-refraction'
  | 'water-surface-observation'
  | 'water-surface-application'
  | 'solar-position'
  | 'lunar-position'
  | 'solar-eclipse-overlap'
  | 'solar-eclipse-event-search'
  | 'shadow-geometry'
  | 'dual-shadow-comparison'
  | 'stellar-position';

export type ResultStatus =
  | 'compatible'
  | 'incompatible'
  | 'indeterminate'
  | 'unsupported';

export interface GeoPoint {
  latitudeDeg: number;
  longitudeDeg: number;
  elevationM: number;
}

export interface Observer extends GeoPoint {
  eyeHeightM: number;
}

export interface Target extends GeoPoint {
  label: string;
  heightM: number;
}

export interface UncertainValue {
  value: number;
  uncertainty: number;
  unit: string;
}

export interface ExperimentDefinition {
  id: string;
  title: string;
  type: 'horizon' | 'target-visibility' | 'shadow' | 'celestial';
  observer: Observer;
  target?: Target;
  terrainProfile?: TerrainProfile;
  observedAtIso: string;
  measurements: Record<string, UncertainValue>;
}

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: ModelCapability[];
  assumptions: string[];
}

export interface PredictionMetric {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  uncertainty?: number;
}

export interface CalculationTraceStep {
  id: string;
  title: string;
  formula: string;
  substitution: string;
  result: string;
  note?: string;
}

export interface CalculationTrace {
  summary: string;
  assumptions: string[];
  steps: CalculationTraceStep[];
}

export interface ModelPrediction {
  modelId: string;
  experimentId: string;
  status: ResultStatus;
  metrics: PredictionMetric[];
  warnings: string[];
  traceId: string;
  trace: CalculationTrace;
}
