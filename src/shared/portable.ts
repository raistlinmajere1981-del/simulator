import type {
  SavedExperiment,
  TerrainProfileSource
} from './simulator';
import { normalizeSimulationScenarioId } from './scenario';
import { parseAtmosphereExperimentState } from '../simulation/atmosphere-persistence';
import {
  cloneTrace,
  deriveLegacyManualPoints,
  isFiniteNumber,
  isIsoDate,
  isModelPrediction,
  isNonEmptyString,
  isRecord,
  isSavedGeodesic,
  normalizeGeodesic,
  parseManualTerrainPoints,
  parseSimulatorInputs,
  parseTerrainProfileSource
} from './portable-core';
export { isModelPrediction, isSimulatorInputs } from './portable-core';
import {
  parseModelInputUncertainty,
  parsePhotoCalibration,
  parseStellarLocalHorizonSource,
  parseStellarMotionSource,
  parseTextSetupHistory
} from './portable-sources';

export const PORTABLE_EXPERIMENT_SCHEMA = 'geometric-observation-laboratory/portable-experiment';
export const PORTABLE_EXPERIMENT_SCHEMA_VERSION = 11;
export const LOCAL_EXPERIMENT_STORE_SCHEMA = 'geometric-observation-laboratory/local-experiment-store';
export const LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION = 11;

export interface PortableApplicationInfo {
  name: 'Geometrik Gözlem Laboratuvarı';
  version: string;
}

export interface PortableExperimentFileV11 {
  schema: typeof PORTABLE_EXPERIMENT_SCHEMA;
  schemaVersion: typeof PORTABLE_EXPERIMENT_SCHEMA_VERSION;
  exportedAtIso: string;
  application: PortableApplicationInfo;
  experiment: SavedExperiment;
}

export interface LocalExperimentStoreV11 {
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
  store: LocalExperimentStoreV11;
  migrated: boolean;
  ignoredRecordCount: number;
}

export class PortableFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortableFormatError';
  }
}

function parseSavedExperiment(value: unknown, allowLegacyInputs: boolean): SavedExperiment | null {
  if (!isRecord(value)) return null;
  let observationUtcOffsetMinutes: number | undefined;
  if (value.observationUtcOffsetMinutes !== undefined) {
    if (!isFiniteNumber(value.observationUtcOffsetMinutes) ||
      !Number.isInteger(value.observationUtcOffsetMinutes) ||
      value.observationUtcOffsetMinutes < -720 ||
      value.observationUtcOffsetMinutes > 840) return null;
    observationUtcOffsetMinutes = value.observationUtcOffsetMinutes;
  }
  const inputs = parseSimulatorInputs(value.inputs, allowLegacyInputs);
  if (!inputs || !isNonEmptyString(value.id) || !isNonEmptyString(value.name) ||
    !isIsoDate(value.createdAtIso) || !isIsoDate(value.updatedAtIso) ||
    (value.observedAtIso !== undefined && !isIsoDate(value.observedAtIso)) ||
    !isRecord(value.modelVersions) ||
    !Object.values(value.modelVersions).every((version) => typeof version === 'string') ||
    !Array.isArray(value.predictions) || !value.predictions.every(isModelPrediction) ||
    (value.geodesic !== undefined && !isSavedGeodesic(value.geodesic))) {
    return null;
  }

  const manualTerrainPoints = value.manualTerrainPoints === undefined
    ? deriveLegacyManualPoints(inputs)
    : parseManualTerrainPoints(value.manualTerrainPoints);
  if (!manualTerrainPoints) return null;

  let terrainProfileSource: TerrainProfileSource | undefined;
  if (value.terrainProfileSource !== undefined) {
    const parsedSource = parseTerrainProfileSource(value.terrainProfileSource);
    if (!parsedSource) return null;
    terrainProfileSource = parsedSource;
  }

  const atmosphere = value.atmosphere === undefined
    ? undefined
    : parseAtmosphereExperimentState(value.atmosphere);
  if (atmosphere === null) return null;

  const photoCalibration = value.photoCalibration === undefined
    ? undefined
    : parsePhotoCalibration(value.photoCalibration);
  if (photoCalibration === null) return null;
  const photoModelUncertainty = value.photoModelUncertainty === undefined
    ? undefined
    : parseModelInputUncertainty(value.photoModelUncertainty);
  if (photoModelUncertainty === null) return null;
  const textSetupHistory = value.textSetupHistory === undefined
    ? undefined
    : parseTextSetupHistory(value.textSetupHistory);
  if (textSetupHistory === null) return null;
  const stellarLocalHorizonSource = value.stellarLocalHorizonSource === undefined
    ? undefined
    : parseStellarLocalHorizonSource(value.stellarLocalHorizonSource);
  if (stellarLocalHorizonSource === null) return null;
  const stellarMotionSource = value.stellarMotionSource === undefined
    ? undefined
    : parseStellarMotionSource(value.stellarMotionSource);
  if (stellarMotionSource === null) return null;

  return {
    id: value.id,
    name: value.name.trim(),
    createdAtIso: value.createdAtIso,
    updatedAtIso: value.updatedAtIso,
    ...(value.observedAtIso === undefined ? {} : { observedAtIso: value.observedAtIso }),
    ...(observationUtcOffsetMinutes === undefined
      ? {}
      : { observationUtcOffsetMinutes }),
    ...(value.scenarioId === undefined
      ? {}
      : { scenarioId: normalizeSimulationScenarioId(value.scenarioId) }),
    ...(atmosphere === undefined ? {} : { atmosphere }),
    ...(photoCalibration === undefined ? {} : { photoCalibration }),
    ...(photoModelUncertainty === undefined ? {} : { photoModelUncertainty }),
    ...(textSetupHistory === undefined ? {} : { textSetupHistory }),
    ...(stellarLocalHorizonSource === undefined ? {} : { stellarLocalHorizonSource }),
    ...(stellarMotionSource === undefined ? {} : { stellarMotionSource }),
    inputs,
    manualTerrainPoints,
    terrainProfileSource,
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
): PortableExperimentFileV11 {
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
  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 &&
    version !== 5 && version !== 6 && version !== 7 && version !== 8 && version !== 9 &&
    version !== 10 && version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION) {
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
): LocalExperimentStoreV11 {
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
  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 &&
    version !== 5 && version !== 6 && version !== 7 && version !== 8 && version !== 9 &&
    version !== 10 && version !== LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION) {
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
