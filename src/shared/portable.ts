import type {
  CalculationTrace,
  CalculationTraceStep,
  ModelPrediction,
  PredictionMetric,
  ResultStatus
} from './domain';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type CsvTerrainDelimiter,
  type CsvTerrainDistanceUnit,
  type SavedExperiment,
  type SavedGeodesicCalculation,
  type SimulatorInputs,
  type TerrainProfileSource
} from './simulator';
import type { ManualTerrainPoint, VerticalDatumKind } from './terrain';
import { normalizeSimulationScenarioId } from './scenario';
import { parseAtmosphereExperimentState } from '../simulation/atmosphere-persistence';
import {
  migrateLegacyManualTerrainPoint,
  sortManualTerrainPoints,
  validateManualTerrainPoints
} from '../simulation/manual-terrain-profile';

export const PORTABLE_EXPERIMENT_SCHEMA = 'geometric-observation-laboratory/portable-experiment';
export const PORTABLE_EXPERIMENT_SCHEMA_VERSION = 7;
export const LOCAL_EXPERIMENT_STORE_SCHEMA = 'geometric-observation-laboratory/local-experiment-store';
export const LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION = 7;

export interface PortableApplicationInfo {
  name: 'Geometrik Gözlem Laboratuvarı';
  version: string;
}

export interface PortableExperimentFileV7 {
  schema: typeof PORTABLE_EXPERIMENT_SCHEMA;
  schemaVersion: typeof PORTABLE_EXPERIMENT_SCHEMA_VERSION;
  exportedAtIso: string;
  application: PortableApplicationInfo;
  experiment: SavedExperiment;
}

export interface LocalExperimentStoreV7 {
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
  store: LocalExperimentStoreV7;
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

function isCsvTerrainDelimiter(value: unknown): value is CsvTerrainDelimiter {
  return value === 'comma' || value === 'semicolon' || value === 'tab';
}

function isCsvTerrainDistanceUnit(value: unknown): value is CsvTerrainDistanceUnit {
  return value === 'percent' || value === 'm' || value === 'km';
}

function parseManualTerrainPoints(value: unknown): ManualTerrainPoint[] | null {
  if (!Array.isArray(value)) return null;

  const points: ManualTerrainPoint[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isNonEmptyString(item.id) ||
      !isFiniteNumber(item.distancePercent) || !isFiniteNumber(item.elevationM)) {
      return null;
    }
    points.push({
      id: item.id.trim(),
      distancePercent: item.distancePercent,
      elevationM: item.elevationM
    });
  }

  if (validateManualTerrainPoints(points).length > 0) return null;
  return sortManualTerrainPoints(points);
}

function parseTerrainProfileSource(value: unknown): TerrainProfileSource | null {
  if (!isRecord(value) ||
    !isNonEmptyString(value.fileName) || !isIsoDate(value.importedAtIso) ||
    !isFiniteNumber(value.observerEndpointElevationM) ||
    !isFiniteNumber(value.targetEndpointElevationM) ||
    typeof value.appliedObserverEndpoint !== 'boolean' ||
    typeof value.appliedTargetEndpoint !== 'boolean' ||
    typeof value.modifiedAfterImport !== 'boolean') {
    return null;
  }
  const hasIntegrity = value.fileSizeBytes !== undefined || value.sha256 !== undefined;
  const integrityValid = !hasIntegrity || (
    Number.isInteger(value.fileSizeBytes) &&
    inRange(value.fileSizeBytes, 1, 64 * 1024 * 1024) &&
    typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sha256)
  );
  if (!integrityValid) return null;

  if (value.sourceDistanceM !== null &&
    (!isFiniteNumber(value.sourceDistanceM) || value.sourceDistanceM <= 0 ||
      value.sourceDistanceM > 20_000_000)) {
    return null;
  }
  const common = {
    fileName: value.fileName.trim(),
    importedAtIso: value.importedAtIso,
    sourceDistanceM: value.sourceDistanceM as number | null,
    observerEndpointElevationM: value.observerEndpointElevationM,
    targetEndpointElevationM: value.targetEndpointElevationM,
    appliedObserverEndpoint: value.appliedObserverEndpoint,
    appliedTargetEndpoint: value.appliedTargetEndpoint,
    appliedRouteDistance: value.appliedRouteDistance === true,
    ...(typeof value.appliedRouteCoordinates === 'boolean'
      ? { appliedRouteCoordinates: value.appliedRouteCoordinates }
      : {}),
    ...(hasIntegrity ? {
      fileSizeBytes: value.fileSizeBytes as number,
      sha256: value.sha256 as string
    } : {}),
    modifiedAfterImport: value.modifiedAfterImport
  };

  if (value.kind === 'csv' || value.kind === undefined) {
    if (!isCsvTerrainDelimiter(value.delimiter) ||
      !isCsvTerrainDistanceUnit(value.distanceUnit) ||
      !Number.isInteger(value.rowCount) || !inRange(value.rowCount, 2, 2_002) ||
      !isNonEmptyString(value.distanceColumnHeader) ||
      !isNonEmptyString(value.elevationColumnHeader)) {
      return null;
    }
    return {
      ...common,
      kind: 'csv',
      delimiter: value.delimiter,
      distanceUnit: value.distanceUnit,
      rowCount: value.rowCount as number,
      distanceColumnHeader: value.distanceColumnHeader.trim(),
      elevationColumnHeader: value.elevationColumnHeader.trim()
    };
  }

  if (value.kind === 'geojson') {
    if (value.geometryType !== 'LineString' ||
      !Number.isInteger(value.coordinateCount) ||
      !inRange(value.coordinateCount, 2, 2_002) ||
      !isFiniteNumber(value.sourceDistanceM) || value.sourceDistanceM <= 0 ||
      value.elevationSource !== 'coordinate-z' ||
      !inRange(value.startLongitudeDeg, -180, 180) ||
      !inRange(value.startLatitudeDeg, -90, 90) ||
      !inRange(value.endLongitudeDeg, -180, 180) ||
      !inRange(value.endLatitudeDeg, -90, 90)) {
      return null;
    }
    return {
      ...common,
      kind: 'geojson',
      sourceDistanceM: value.sourceDistanceM,
      geometryType: 'LineString',
      coordinateCount: value.coordinateCount as number,
      startLongitudeDeg: value.startLongitudeDeg,
      startLatitudeDeg: value.startLatitudeDeg,
      endLongitudeDeg: value.endLongitudeDeg,
      endLatitudeDeg: value.endLatitudeDeg,
      elevationSource: 'coordinate-z'
    };
  }

  if (value.kind === 'dem') {
    const noDataValid = value.noDataValue === null || isFiniteNumber(value.noDataValue);
    const diagnosticValues = [
      value.diagnosticStatus,
      value.effectiveCellSpanM,
      value.sampleSpacingToCellRatio,
      value.minimumCoverageMarginM,
      value.coverageMarginCellRatio,
      value.minimumElevationM,
      value.maximumElevationM,
      value.elevationRangeM
    ];
    const hasDiagnostics = diagnosticValues.some((item) => item !== undefined);
    const diagnosticsValid = !hasDiagnostics || (
      (value.diagnosticStatus === 'good' || value.diagnosticStatus === 'caution' ||
        value.diagnosticStatus === 'limited') &&
      isFiniteNumber(value.effectiveCellSpanM) && value.effectiveCellSpanM > 0 &&
      isFiniteNumber(value.sampleSpacingToCellRatio) && value.sampleSpacingToCellRatio >= 0 &&
      isFiniteNumber(value.minimumCoverageMarginM) && value.minimumCoverageMarginM >= 0 &&
      isFiniteNumber(value.coverageMarginCellRatio) && value.coverageMarginCellRatio >= 0 &&
      isFiniteNumber(value.minimumElevationM) &&
      isFiniteNumber(value.maximumElevationM) &&
      value.minimumElevationM <= value.maximumElevationM &&
      isFiniteNumber(value.elevationRangeM) && value.elevationRangeM >= 0
    );
    if (value.format !== 'esri-ascii' ||
      (value.samplingMethod !== 'nearest' && value.samplingMethod !== 'bilinear') ||
      (value.geodesicMethod !== 'vincenty' && value.geodesicMethod !== 'spherical-fallback') ||
      !Number.isInteger(value.columnCount) || !inRange(value.columnCount, 1, 10_000) ||
      !Number.isInteger(value.rowCount) || !inRange(value.rowCount, 1, 10_000) ||
      (value.columnCount as number) * (value.rowCount as number) > 4_000_000 ||
      !Number.isInteger(value.sampleCount) || !inRange(value.sampleCount, 3, 2_002) ||
      (value.sampleCountMode !== undefined &&
        value.sampleCountMode !== 'automatic' && value.sampleCountMode !== 'manual') ||
      !isFiniteNumber(value.sampleSpacingM) || value.sampleSpacingM <= 0 ||
      !isFiniteNumber(value.cellSizeDeg) || value.cellSizeDeg <= 0 || value.cellSizeDeg > 180 ||
      !noDataValid ||
      !inRange(value.westBoundaryDeg, -180, 180) ||
      !inRange(value.eastBoundaryDeg, -180, 180) ||
      !inRange(value.southBoundaryDeg, -90, 90) ||
      !inRange(value.northBoundaryDeg, -90, 90) ||
      value.westBoundaryDeg >= value.eastBoundaryDeg ||
      value.southBoundaryDeg >= value.northBoundaryDeg ||
      !diagnosticsValid ||
      !isFiniteNumber(value.sourceDistanceM) || value.sourceDistanceM <= 0) {
      return null;
    }
    return {
      ...common,
      kind: 'dem',
      sourceDistanceM: value.sourceDistanceM,
      format: 'esri-ascii',
      samplingMethod: value.samplingMethod,
      geodesicMethod: value.geodesicMethod,
      columnCount: value.columnCount as number,
      rowCount: value.rowCount as number,
      sampleCount: value.sampleCount as number,
      ...(value.sampleCountMode === 'automatic' || value.sampleCountMode === 'manual'
        ? { sampleCountMode: value.sampleCountMode }
        : {}),
      sampleSpacingM: value.sampleSpacingM,
      cellSizeDeg: value.cellSizeDeg,
      noDataValue: value.noDataValue as number | null,
      westBoundaryDeg: value.westBoundaryDeg,
      eastBoundaryDeg: value.eastBoundaryDeg,
      southBoundaryDeg: value.southBoundaryDeg,
      northBoundaryDeg: value.northBoundaryDeg,
      ...(hasDiagnostics ? {
        diagnosticStatus: value.diagnosticStatus as 'good' | 'caution' | 'limited',
        effectiveCellSpanM: value.effectiveCellSpanM as number,
        sampleSpacingToCellRatio: value.sampleSpacingToCellRatio as number,
        minimumCoverageMarginM: value.minimumCoverageMarginM as number,
        coverageMarginCellRatio: value.coverageMarginCellRatio as number,
        minimumElevationM: value.minimumElevationM as number,
        maximumElevationM: value.maximumElevationM as number,
        elevationRangeM: value.elevationRangeM as number
      } : {})
    };
  }

  return null;
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
    (value.terrainMode === 'off' ||
      value.terrainMode === 'manual-three-point' ||
      value.terrainMode === 'manual-points') &&
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

function deriveLegacyManualPoints(inputs: SimulatorInputs): ManualTerrainPoint[] {
  return migrateLegacyManualTerrainPoint(
    inputs.terrainIntermediateDistancePercent,
    inputs.terrainIntermediateElevationM
  );
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

  return {
    id: value.id,
    name: value.name.trim(),
    createdAtIso: value.createdAtIso,
    updatedAtIso: value.updatedAtIso,
    ...(value.scenarioId === undefined
      ? {}
      : { scenarioId: normalizeSimulationScenarioId(value.scenarioId) }),
    ...(atmosphere === undefined ? {} : { atmosphere }),
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
): PortableExperimentFileV7 {
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
    version !== 5 && version !== 6 && version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION) {
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
): LocalExperimentStoreV7 {
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
    version !== 5 && version !== 6 && version !== LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION) {
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
