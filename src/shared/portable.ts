import type {
  CalculationTrace,
  CalculationTraceStep,
  ModelPrediction,
  PredictionMetric,
  ResultStatus
} from './domain';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type SavedExperiment,
  type SavedGeodesicCalculation,
  type SimulatorInputs
} from './simulator';
import type { VerticalDatumKind } from './terrain';

export const PORTABLE_EXPERIMENT_SCHEMA = 'geometric-observation-laboratory/portable-experiment';
export const PORTABLE_EXPERIMENT_SCHEMA_VERSION = 3;
export const LOCAL_EXPERIMENT_STORE_SCHEMA = 'geometric-observation-laboratory/local-experiment-store';
export const LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION = 3;

export interface PortableApplicationInfo {
  name: 'Geometrik Gözlem Laboratuvarı';
  version: string;
}

export interface PortableExperimentFileV3 {
  schema: typeof PORTABLE_EXPERIMENT_SCHEMA;
  schemaVersion: typeof PORTABLE_EXPERIMENT_SCHEMA_VERSION;
  exportedAtIso: string;
  application: PortableApplicationInfo;
  experiment: SavedExperiment;
}

export interface LocalExperimentStoreV3 {
  schema: typeof LOCAL_EXPERIMENT_STORE_SCHEMA;
  schemaVersion: typeof LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION;
  updatedAtIso: string;
  experiments: SavedExperiment[];
}

export interface ParsedPortableExperiment {
  experiment: SavedExperiment;
  sourceVersion: number;
  migrated: boolean;
}

export interface ParsedLocalExperimentStore {
  store: LocalExperimentStoreV3;
  migrated: boolean;
  ignoredRecordCount: number;
}

export class PortableFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortableFormatError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function inRange(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && value >= min && value <= max;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isResultStatus(value: unknown): value is ResultStatus {
  return value === 'compatible' || value === 'incompatible' ||
    value === 'indeterminate' || value === 'unsupported';
}

function isVerticalDatumKind(value: unknown): value is VerticalDatumKind {
  return value === 'orthometric-msl' || value === 'ellipsoidal-wgs84' || value === 'local';
}

function parseSimulatorInputs(value: unknown, allowLegacyFields: boolean): SimulatorInputs | null {
  if (!isRecord(value)) return null;

  const commonValid =
    isFiniteNumber(value.observerHeightM) && value.observerHeightM >= 0 &&
    isFiniteNumber(value.targetHeightM) && value.targetHeightM > 0 &&
    isFiniteNumber(value.surfaceDistanceKm) && value.surfaceDistanceKm >= 0 &&
    inRange(value.observedVisiblePercent, 0, 100) &&
    inRange(value.observationUncertaintyPercent, 0, 100) &&
    typeof value.useStandardRefraction === 'boolean' &&
    isFiniteNumber(value.refractionCoefficient) && value.refractionCoefficient < 1;
  if (!commonValid) return null;

  const hasCoordinateFields =
    (value.distanceSource === 'manual' || value.distanceSource === 'coordinates') &&
    inRange(value.observerLatitudeDeg, -90, 90) &&
    inRange(value.observerLongitudeDeg, -180, 180) &&
    inRange(value.targetLatitudeDeg, -90, 90) &&
    inRange(value.targetLongitudeDeg, -180, 180);
  if (!hasCoordinateFields && !allowLegacyFields) return null;

  const hasTerrainFields =
    isFiniteNumber(value.observerGroundElevationM) &&
    isFiniteNumber(value.targetGroundElevationM) &&
    isVerticalDatumKind(value.verticalDatumKind) &&
    isFiniteNumber(value.verticalDatumOffsetM) &&
    (value.terrainMode === 'off' || value.terrainMode === 'manual-three-point') &&
    inRange(value.terrainIntermediateDistancePercent, 0.001, 99.999) &&
    isFiniteNumber(value.terrainIntermediateElevationM);
  if (!hasTerrainFields && !allowLegacyFields) return null;

  return {
    observerHeightM: value.observerHeightM as number,
    targetHeightM: value.targetHeightM as number,
    observerGroundElevationM: hasTerrainFields
      ? value.observerGroundElevationM as number
      : DEFAULT_SIMULATOR_INPUTS.observerGroundElevationM,
    targetGroundElevationM: hasTerrainFields
      ? value.targetGroundElevationM as number
      : DEFAULT_SIMULATOR_INPUTS.targetGroundElevationM,
    verticalDatumKind: hasTerrainFields
      ? value.verticalDatumKind as SimulatorInputs['verticalDatumKind']
      : DEFAULT_SIMULATOR_INPUTS.verticalDatumKind,
    verticalDatumOffsetM: hasTerrainFields
      ? value.verticalDatumOffsetM as number
      : DEFAULT_SIMULATOR_INPUTS.verticalDatumOffsetM,
    terrainMode: hasTerrainFields
      ? value.terrainMode as SimulatorInputs['terrainMode']
      : DEFAULT_SIMULATOR_INPUTS.terrainMode,
    terrainIntermediateDistancePercent: hasTerrainFields
      ? value.terrainIntermediateDistancePercent as number
      : DEFAULT_SIMULATOR_INPUTS.terrainIntermediateDistancePercent,
    terrainIntermediateElevationM: hasTerrainFields
      ? value.terrainIntermediateElevationM as number
      : DEFAULT_SIMULATOR_INPUTS.terrainIntermediateElevationM,
    distanceSource: hasCoordinateFields
      ? value.distanceSource as SimulatorInputs['distanceSource']
      : DEFAULT_SIMULATOR_INPUTS.distanceSource,
    surfaceDistanceKm: value.surfaceDistanceKm as number,
    observerLatitudeDeg: hasCoordinateFields
      ? value.observerLatitudeDeg as number
      : DEFAULT_SIMULATOR_INPUTS.observerLatitudeDeg,
    observerLongitudeDeg: hasCoordinateFields
      ? value.observerLongitudeDeg as number
      : DEFAULT_SIMULATOR_INPUTS.observerLongitudeDeg,
    targetLatitudeDeg: hasCoordinateFields
      ? value.targetLatitudeDeg as number
      : DEFAULT_SIMULATOR_INPUTS.targetLatitudeDeg,
    targetLongitudeDeg: hasCoordinateFields
      ? value.targetLongitudeDeg as number
      : DEFAULT_SIMULATOR_INPUTS.targetLongitudeDeg,
    observedVisiblePercent: value.observedVisiblePercent as number,
    observationUncertaintyPercent: value.observationUncertaintyPercent as number,
    useStandardRefraction: value.useStandardRefraction as boolean,
    refractionCoefficient: value.refractionCoefficient as number
  };
}

export function isSimulatorInputs(value: unknown): value is SimulatorInputs {
  return parseSimulatorInputs(value, false) !== null;
}

function isPredictionMetric(value: unknown): value is PredictionMetric {
  return isRecord(value) && isNonEmptyString(value.key) && isNonEmptyString(value.label) &&
    (value.value === null || isFiniteNumber(value.value)) && isNonEmptyString(value.unit) &&
    (value.uncertainty === undefined || isFiniteNumber(value.uncertainty));
}

function isCalculationTraceStep(value: unknown): value is CalculationTraceStep {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.title) &&
    typeof value.formula === 'string' && typeof value.substitution === 'string' &&
    typeof value.result === 'string' &&
    (value.note === undefined || typeof value.note === 'string');
}

function isCalculationTrace(value: unknown): value is CalculationTrace {
  return isRecord(value) && typeof value.summary === 'string' &&
    isStringArray(value.assumptions) && Array.isArray(value.steps) &&
    value.steps.every(isCalculationTraceStep);
}

export function isModelPrediction(value: unknown): value is ModelPrediction {
  return isRecord(value) && isNonEmptyString(value.modelId) &&
    isNonEmptyString(value.experimentId) && isResultStatus(value.status) &&
    Array.isArray(value.metrics) && value.metrics.every(isPredictionMetric) &&
    isStringArray(value.warnings) && isNonEmptyString(value.traceId) &&
    isCalculationTrace(value.trace);
}

function isSavedGeodesic(value: unknown): value is SavedGeodesicCalculation {
  return isRecord(value) &&
    (value.method === 'vincenty' || value.method === 'spherical-fallback') &&
    typeof value.converged === 'boolean' && Number.isInteger(value.iterations) &&
    (value.iterations as number) >= 0 && isFiniteNumber(value.distanceM) &&
    value.distanceM >= 0 && inRange(value.initialBearingDeg, 0, 360) &&
    inRange(value.finalBearingDeg, 0, 360) && isStringArray(value.warnings) &&
    isNonEmptyString(value.traceId) && isCalculationTrace(value.trace);
}

function cloneTrace(trace: CalculationTrace): CalculationTrace {
  return {
    ...trace,
    assumptions: [...trace.assumptions],
    steps: trace.steps.map((step) => ({ ...step }))
  };
}

function normalizeGeodesic(value: SavedGeodesicCalculation): SavedGeodesicCalculation {
  return { ...value, warnings: [...value.warnings], trace: cloneTrace(value.trace) };
}

function parseSavedExperiment(value: unknown, allowLegacyInputs: boolean): SavedExperiment | null {
  if (!isRecord(value)) return null;
  const inputs = parseSimulatorInputs(value.inputs, allowLegacyInputs);
  if (!inputs || !isNonEmptyString(value.id) || !isNonEmptyString(value.name) ||
    !isIsoDate(value.createdAtIso) || !isIsoDate(value.updatedAtIso) ||
    !isRecord(value.modelVersions) ||
    !Object.values(value.modelVersions).every((version) => typeof version === 'string') ||
    !Array.isArray(value.predictions) || !value.predictions.every(isModelPrediction) ||
    (value.geodesic !== undefined && !isSavedGeodesic(value.geodesic))) {
    return null;
  }

  return {
    id: value.id,
    name: value.name.trim(),
    createdAtIso: value.createdAtIso,
    updatedAtIso: value.updatedAtIso,
    inputs,
    geodesic: value.geodesic === undefined ? undefined : normalizeGeodesic(value.geodesic),
    modelVersions: { ...value.modelVersions } as Record<string, string>,
    predictions: value.predictions.map((prediction) => ({
      ...prediction,
      metrics: prediction.metrics.map((metric) => ({ ...metric })),
      warnings: [...prediction.warnings],
      trace: cloneTrace(prediction.trace)
    }))
  };
}

export function isSavedExperiment(value: unknown): value is SavedExperiment {
  return parseSavedExperiment(value, false) !== null;
}

function normalizeExperiment(experiment: SavedExperiment): SavedExperiment {
  const normalized = parseSavedExperiment(experiment, false);
  if (!normalized) throw new PortableFormatError('Deney kayıt şemasına uymuyor.');
  return normalized;
}

export function createPortableExperimentFile(
  experiment: SavedExperiment,
  applicationVersion: string,
  exportedAtIso = new Date().toISOString()
): PortableExperimentFileV3 {
  return {
    schema: PORTABLE_EXPERIMENT_SCHEMA,
    schemaVersion: PORTABLE_EXPERIMENT_SCHEMA_VERSION,
    exportedAtIso,
    application: { name: 'Geometrik Gözlem Laboratuvarı', version: applicationVersion },
    experiment: normalizeExperiment(experiment)
  };
}

export function parsePortableExperimentFile(value: unknown): ParsedPortableExperiment {
  const rawCurrent = parseSavedExperiment(value, false);
  if (rawCurrent) return { experiment: rawCurrent, sourceVersion: 0, migrated: true };
  const rawLegacy = parseSavedExperiment(value, true);
  if (rawLegacy) return { experiment: rawLegacy, sourceVersion: 0, migrated: true };
  if (!isRecord(value)) throw new PortableFormatError('Dosya geçerli bir JSON nesnesi değil.');
  if (value.schema !== PORTABLE_EXPERIMENT_SCHEMA) {
    throw new PortableFormatError('Dosya Geometrik Gözlem Laboratuvarı deney dosyası değil.');
  }

  const version = value.schemaVersion;
  if (version !== 1 && version !== 2 && version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION) {
    throw new PortableFormatError(
      `Deney dosyası şema sürümü desteklenmiyor: ${typeof version === 'number' ? version : 'bilinmeyen'}.`
    );
  }
  const experiment = parseSavedExperiment(value.experiment, version < 3);
  if (!experiment) {
    throw new PortableFormatError('Dosyadaki deney verisi eksik, bozuk veya beklenen aralıkların dışında.');
  }
  return {
    experiment,
    sourceVersion: version,
    migrated: version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION
  };
}

export function createLocalExperimentStore(
  experiments: SavedExperiment[],
  updatedAtIso = new Date().toISOString()
): LocalExperimentStoreV3 {
  return {
    schema: LOCAL_EXPERIMENT_STORE_SCHEMA,
    schemaVersion: LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION,
    updatedAtIso,
    experiments: experiments.map(normalizeExperiment)
  };
}

export function parseLocalExperimentStore(value: unknown): ParsedLocalExperimentStore {
  if (Array.isArray(value)) {
    const experiments = value
      .map((item) => parseSavedExperiment(item, true))
      .filter((item): item is SavedExperiment => item !== null);
    return {
      store: createLocalExperimentStore(experiments),
      migrated: true,
      ignoredRecordCount: value.length - experiments.length
    };
  }
  if (!isRecord(value)) throw new PortableFormatError('Yerel deney deposu geçerli bir nesne değil.');
  if (value.schema !== LOCAL_EXPERIMENT_STORE_SCHEMA) {
    throw new PortableFormatError('Yerel deney deposunun şema kimliği tanınmıyor.');
  }
  const version = value.schemaVersion;
  if (version !== 1 && version !== 2 && version !== LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION) {
    throw new PortableFormatError(
      `Yerel deney deposu sürümü desteklenmiyor: ${typeof version === 'number' ? version : 'bilinmeyen'}.`
    );
  }
  if (!Array.isArray(value.experiments)) {
    throw new PortableFormatError('Yerel deney deposunda kayıt dizisi bulunamadı.');
  }

  const experiments = value.experiments
    .map((item) => parseSavedExperiment(item, version < 3))
    .filter((item): item is SavedExperiment => item !== null);
  return {
    store: {
      schema: LOCAL_EXPERIMENT_STORE_SCHEMA,
      schemaVersion: LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION,
      updatedAtIso: isIsoDate(value.updatedAtIso) ? value.updatedAtIso : new Date().toISOString(),
      experiments
    },
    migrated: version !== LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION,
    ignoredRecordCount: value.experiments.length - experiments.length
  };
}
