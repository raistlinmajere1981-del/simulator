import type {
  CalculationTrace,
  CalculationTraceStep,
  ModelPrediction,
  PredictionMetric,
  ResultStatus
} from './domain';
import type { SavedExperiment, SimulatorInputs } from './simulator';

export const PORTABLE_EXPERIMENT_SCHEMA =
  'geometric-observation-laboratory/portable-experiment';
export const PORTABLE_EXPERIMENT_SCHEMA_VERSION = 1;
export const LOCAL_EXPERIMENT_STORE_SCHEMA =
  'geometric-observation-laboratory/local-experiment-store';
export const LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION = 1;

export interface PortableApplicationInfo {
  name: 'Geometrik Gözlem Laboratuvarı';
  version: string;
}

export interface PortableExperimentFileV1 {
  schema: typeof PORTABLE_EXPERIMENT_SCHEMA;
  schemaVersion: typeof PORTABLE_EXPERIMENT_SCHEMA_VERSION;
  exportedAtIso: string;
  application: PortableApplicationInfo;
  experiment: SavedExperiment;
}

export interface LocalExperimentStoreV1 {
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
  store: LocalExperimentStoreV1;
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
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isResultStatus(value: unknown): value is ResultStatus {
  return (
    value === 'compatible' ||
    value === 'incompatible' ||
    value === 'indeterminate' ||
    value === 'unsupported'
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isSimulatorInputs(value: unknown): value is SimulatorInputs {
  if (!isRecord(value)) return false;

  return (
    isFiniteNumber(value.observerHeightM) &&
    value.observerHeightM >= 0 &&
    isFiniteNumber(value.targetHeightM) &&
    value.targetHeightM > 0 &&
    isFiniteNumber(value.surfaceDistanceKm) &&
    value.surfaceDistanceKm >= 0 &&
    isFiniteNumber(value.observedVisiblePercent) &&
    value.observedVisiblePercent >= 0 &&
    value.observedVisiblePercent <= 100 &&
    isFiniteNumber(value.observationUncertaintyPercent) &&
    value.observationUncertaintyPercent >= 0 &&
    value.observationUncertaintyPercent <= 100 &&
    typeof value.useStandardRefraction === 'boolean' &&
    isFiniteNumber(value.refractionCoefficient) &&
    value.refractionCoefficient < 1
  );
}

function isPredictionMetric(value: unknown): value is PredictionMetric {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.key) &&
    isNonEmptyString(value.label) &&
    (value.value === null || isFiniteNumber(value.value)) &&
    isNonEmptyString(value.unit) &&
    (value.uncertainty === undefined || isFiniteNumber(value.uncertainty))
  );
}

function isCalculationTraceStep(value: unknown): value is CalculationTraceStep {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    typeof value.formula === 'string' &&
    typeof value.substitution === 'string' &&
    typeof value.result === 'string' &&
    (value.note === undefined || typeof value.note === 'string')
  );
}

function isCalculationTrace(value: unknown): value is CalculationTrace {
  if (!isRecord(value)) return false;

  return (
    typeof value.summary === 'string' &&
    isStringArray(value.assumptions) &&
    Array.isArray(value.steps) &&
    value.steps.every(isCalculationTraceStep)
  );
}

export function isModelPrediction(value: unknown): value is ModelPrediction {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.modelId) &&
    isNonEmptyString(value.experimentId) &&
    isResultStatus(value.status) &&
    Array.isArray(value.metrics) &&
    value.metrics.every(isPredictionMetric) &&
    isStringArray(value.warnings) &&
    isNonEmptyString(value.traceId) &&
    isCalculationTrace(value.trace)
  );
}

export function isSavedExperiment(value: unknown): value is SavedExperiment {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isIsoDate(value.createdAtIso) &&
    isIsoDate(value.updatedAtIso) &&
    isSimulatorInputs(value.inputs) &&
    isRecord(value.modelVersions) &&
    Object.values(value.modelVersions).every(
      (version) => typeof version === 'string'
    ) &&
    Array.isArray(value.predictions) &&
    value.predictions.every(isModelPrediction)
  );
}

function normalizeExperiment(experiment: SavedExperiment): SavedExperiment {
  return {
    ...experiment,
    name: experiment.name.trim(),
    inputs: { ...experiment.inputs },
    modelVersions: { ...experiment.modelVersions },
    predictions: experiment.predictions.map((prediction) => ({
      ...prediction,
      metrics: prediction.metrics.map((metric) => ({ ...metric })),
      warnings: [...prediction.warnings],
      trace: {
        ...prediction.trace,
        assumptions: [...prediction.trace.assumptions],
        steps: prediction.trace.steps.map((step) => ({ ...step }))
      }
    }))
  };
}

export function createPortableExperimentFile(
  experiment: SavedExperiment,
  applicationVersion: string,
  exportedAtIso = new Date().toISOString()
): PortableExperimentFileV1 {
  if (!isSavedExperiment(experiment)) {
    throw new PortableFormatError(
      'Dışa aktarılmak istenen deney kayıt şemasına uymuyor.'
    );
  }

  return {
    schema: PORTABLE_EXPERIMENT_SCHEMA,
    schemaVersion: PORTABLE_EXPERIMENT_SCHEMA_VERSION,
    exportedAtIso,
    application: {
      name: 'Geometrik Gözlem Laboratuvarı',
      version: applicationVersion
    },
    experiment: normalizeExperiment(experiment)
  };
}

export function parsePortableExperimentFile(
  value: unknown
): ParsedPortableExperiment {
  if (isSavedExperiment(value)) {
    return {
      experiment: normalizeExperiment(value),
      sourceVersion: 0,
      migrated: true
    };
  }

  if (!isRecord(value)) {
    throw new PortableFormatError('Dosya geçerli bir JSON nesnesi değil.');
  }

  if (value.schema !== PORTABLE_EXPERIMENT_SCHEMA) {
    throw new PortableFormatError(
      'Dosya Geometrik Gözlem Laboratuvarı deney dosyası değil.'
    );
  }

  if (value.schemaVersion !== PORTABLE_EXPERIMENT_SCHEMA_VERSION) {
    const version =
      typeof value.schemaVersion === 'number'
        ? value.schemaVersion
        : 'bilinmeyen';
    throw new PortableFormatError(
      `Deney dosyası şema sürümü desteklenmiyor: ${version}.`
    );
  }

  if (!isSavedExperiment(value.experiment)) {
    throw new PortableFormatError(
      'Dosyadaki deney verisi eksik, bozuk veya beklenen aralıkların dışında.'
    );
  }

  return {
    experiment: normalizeExperiment(value.experiment),
    sourceVersion: PORTABLE_EXPERIMENT_SCHEMA_VERSION,
    migrated: false
  };
}

export function createLocalExperimentStore(
  experiments: SavedExperiment[],
  updatedAtIso = new Date().toISOString()
): LocalExperimentStoreV1 {
  return {
    schema: LOCAL_EXPERIMENT_STORE_SCHEMA,
    schemaVersion: LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION,
    updatedAtIso,
    experiments: experiments.map(normalizeExperiment)
  };
}

export function parseLocalExperimentStore(
  value: unknown
): ParsedLocalExperimentStore {
  if (Array.isArray(value)) {
    const experiments = value.filter(isSavedExperiment).map(normalizeExperiment);
    return {
      store: createLocalExperimentStore(experiments),
      migrated: true,
      ignoredRecordCount: value.length - experiments.length
    };
  }

  if (!isRecord(value)) {
    throw new PortableFormatError('Yerel deney deposu geçerli bir nesne değil.');
  }

  if (value.schema !== LOCAL_EXPERIMENT_STORE_SCHEMA) {
    throw new PortableFormatError('Yerel deney deposunun şema kimliği tanınmıyor.');
  }

  if (value.schemaVersion !== LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION) {
    const version =
      typeof value.schemaVersion === 'number'
        ? value.schemaVersion
        : 'bilinmeyen';
    throw new PortableFormatError(
      `Yerel deney deposu sürümü desteklenmiyor: ${version}.`
    );
  }

  if (!Array.isArray(value.experiments)) {
    throw new PortableFormatError('Yerel deney deposunda kayıt dizisi bulunamadı.');
  }

  const experiments = value.experiments
    .filter(isSavedExperiment)
    .map(normalizeExperiment);

  return {
    store: {
      schema: LOCAL_EXPERIMENT_STORE_SCHEMA,
      schemaVersion: LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION,
      updatedAtIso: isIsoDate(value.updatedAtIso)
        ? value.updatedAtIso
        : new Date().toISOString(),
      experiments
    },
    migrated: false,
    ignoredRecordCount: value.experiments.length - experiments.length
  };
}
