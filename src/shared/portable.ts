import type {
  SavedExperiment,
  TerrainProfileSource
} from './simulator';
import type { SavedStellarDemSkylineDerivation, SavedStellarLocalHorizonSource } from './stellar-local-horizon-import';
import type { SavedStellarMotionSource } from './stellar-motion-source';
import { verifiedMotionSubsetFromSavedSource } from '../simulation/stellar-motion-source';
import type { ModelInputUncertaintySettings, UncertaintyCombination } from './uncertainty';
import type { CameraCalibrationUncertainty, PhotoCalibrationMarks, PhotoSourceMetadata, SavedPhotoCalibration } from './photo-calibration';
import { normalizeSimulationScenarioId } from './scenario';
import type { TextExperimentSetupProvenance } from './text-experiment-setup';
import { parseAtmosphereExperimentState } from '../simulation/atmosphere-persistence';
import { normalizeStellarLocalHorizonMask } from '../simulation/stellar-local-horizon';
import { parseSavedStellarPanoramaLocalHorizonSource } from '../simulation/stellar-panorama-skyline-persistence';
import {
  cloneTrace,
  deriveLegacyManualPoints,
  inRange,
  isFiniteNumber,
  isIsoDate,
  isModelPrediction,
  isNonEmptyString,
  isRecord,
  isSavedGeodesic,
  isSimulatorInputs,
  isStringArray,
  normalizeGeodesic,
  parseManualTerrainPoints,
  parseSimulatorInputs,
  parseTerrainProfileSource
} from './portable-core';
export { isModelPrediction, isSimulatorInputs } from './portable-core';

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

function parsePhotoSourceMetadata(value: unknown): PhotoSourceMetadata | null {
  if (!isRecord(value) || !isNonEmptyString(value.fileName) ||
    !Number.isInteger(value.fileSizeBytes) || !inRange(value.fileSizeBytes, 1, 25 * 1024 * 1024) ||
    typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256) ||
    (value.mimeType !== 'image/jpeg' && value.mimeType !== 'image/png') ||
    !Number.isInteger(value.imageWidthPx) || !inRange(value.imageWidthPx, 1, 100_000) ||
    !Number.isInteger(value.imageHeightPx) || !inRange(value.imageHeightPx, 1, 100_000) ||
    !isIsoDate(value.importedAtIso)) {
    return null;
  }
  return {
    fileName: value.fileName.trim(),
    fileSizeBytes: value.fileSizeBytes as number,
    sha256: value.sha256,
    mimeType: value.mimeType,
    imageWidthPx: value.imageWidthPx as number,
    imageHeightPx: value.imageHeightPx as number,
    importedAtIso: value.importedAtIso
  };
}

function parsePhotoMark(
  value: unknown,
  imageWidthPx: number,
  imageHeightPx: number
): PhotoCalibrationMarks['horizonStart'] | null {
  if (!isRecord(value) || !inRange(value.xPx, 0, imageWidthPx - 1) ||
    !inRange(value.yPx, 0, imageHeightPx - 1) ||
    (value.uncertaintyPx !== undefined && !inRange(value.uncertaintyPx, 0, 100))) {
    return null;
  }
  return {
    xPx: value.xPx,
    yPx: value.yPx,
    ...(value.uncertaintyPx === undefined ? {} : { uncertaintyPx: value.uncertaintyPx })
  };
}


function parseUncertaintyCombination(value: unknown): UncertaintyCombination | null {
  return value === 'linear-conservative' || value === 'rss-independent' ? value : null;
}

function optionalNonNegative(value: unknown, maximum: number): number | undefined | null {
  if (value === undefined) return undefined;
  return inRange(value, 0, maximum) ? value : null;
}

function parseCameraCalibrationUncertainty(value: unknown): CameraCalibrationUncertainty | null {
  if (!isRecord(value)) return null;
  const combination = parseUncertaintyCombination(value.combination);
  if (!combination) return null;
  const horizontalFovDeg = optionalNonNegative(value.horizontalFovDeg, 179);
  const verticalFovDeg = optionalNonNegative(value.verticalFovDeg, 179);
  const focalLengthMm = optionalNonNegative(value.focalLengthMm, 10_000);
  const sensorWidthMm = optionalNonNegative(value.sensorWidthMm, 1_000);
  const sensorHeightMm = optionalNonNegative(value.sensorHeightMm, 1_000);
  const principalPointXPx = optionalNonNegative(value.principalPointXPx, 200_000);
  const principalPointYPx = optionalNonNegative(value.principalPointYPx, 200_000);
  if ([horizontalFovDeg, verticalFovDeg, focalLengthMm, sensorWidthMm, sensorHeightMm, principalPointXPx, principalPointYPx].some((item) => item === null)) return null;
  return {
    combination,
    ...(typeof horizontalFovDeg === 'number' ? { horizontalFovDeg } : {}),
    ...(typeof verticalFovDeg === 'number' ? { verticalFovDeg } : {}),
    ...(typeof focalLengthMm === 'number' ? { focalLengthMm } : {}),
    ...(typeof sensorWidthMm === 'number' ? { sensorWidthMm } : {}),
    ...(typeof sensorHeightMm === 'number' ? { sensorHeightMm } : {}),
    ...(typeof principalPointXPx === 'number' ? { principalPointXPx } : {}),
    ...(typeof principalPointYPx === 'number' ? { principalPointYPx } : {})
  };
}

function parseModelInputUncertainty(value: unknown): ModelInputUncertaintySettings | null {
  if (!isRecord(value)) return null;
  const combination = parseUncertaintyCombination(value.combination);
  if (!combination) return null;
  const surfaceDistanceM = optionalNonNegative(value.surfaceDistanceM, 20_000_000);
  const observerEyeHeightM = optionalNonNegative(value.observerEyeHeightM, 100_000);
  const observerGroundElevationM = optionalNonNegative(value.observerGroundElevationM, 100_000);
  const targetHeightM = optionalNonNegative(value.targetHeightM, 100_000);
  const targetGroundElevationM = optionalNonNegative(value.targetGroundElevationM, 100_000);
  const refractionCoefficient = optionalNonNegative(value.refractionCoefficient, 2);
  if ([surfaceDistanceM, observerEyeHeightM, observerGroundElevationM, targetHeightM, targetGroundElevationM, refractionCoefficient].some((item) => item === null)) return null;
  return {
    combination,
    ...(typeof surfaceDistanceM === 'number' ? { surfaceDistanceM } : {}),
    ...(typeof observerEyeHeightM === 'number' ? { observerEyeHeightM } : {}),
    ...(typeof observerGroundElevationM === 'number' ? { observerGroundElevationM } : {}),
    ...(typeof targetHeightM === 'number' ? { targetHeightM } : {}),
    ...(typeof targetGroundElevationM === 'number' ? { targetGroundElevationM } : {}),
    ...(typeof refractionCoefficient === 'number' ? { refractionCoefficient } : {})
  };
}

function parsePhotoCalibration(value: unknown): SavedPhotoCalibration | null {
  if (!isRecord(value)) return null;
  const source = parsePhotoSourceMetadata(value.source);
  const cameraUncertainty = value.cameraUncertainty === undefined
    ? undefined
    : parseCameraCalibrationUncertainty(value.cameraUncertainty);
  if (cameraUncertainty === null) return null;
  if (!source || !isRecord(value.calibration) || !isRecord(value.marks) ||
    !inRange(value.defaultMarkUncertaintyPx, 0, 100) ||
    typeof value.distortionCorrected !== 'boolean' || !isIsoDate(value.recordedAtIso) ||
    (value.referenceKind !== undefined && value.referenceKind !== 'visual-reference' && value.referenceKind !== 'local-horizontal') ||
    (value.notes !== undefined && (typeof value.notes !== 'string' || value.notes.length > 2_000))) {
    return null;
  }

  let calibration: SavedPhotoCalibration['calibration'];
  if (value.calibration.sourceKind === 'field-of-view') {
    if (!inRange(value.calibration.horizontalFovDeg, 0.01, 179) ||
      !inRange(value.calibration.verticalFovDeg, 0.01, 179)) return null;
    calibration = {
      sourceKind: 'field-of-view',
      horizontalFovDeg: value.calibration.horizontalFovDeg,
      verticalFovDeg: value.calibration.verticalFovDeg
    };
  } else if (value.calibration.sourceKind === 'sensor-focal') {
    if (!isFiniteNumber(value.calibration.focalLengthMm) || value.calibration.focalLengthMm <= 0 ||
      value.calibration.focalLengthMm > 10_000 ||
      !isFiniteNumber(value.calibration.sensorWidthMm) || value.calibration.sensorWidthMm <= 0 ||
      value.calibration.sensorWidthMm > 1_000 ||
      !isFiniteNumber(value.calibration.sensorHeightMm) || value.calibration.sensorHeightMm <= 0 ||
      value.calibration.sensorHeightMm > 1_000) return null;
    calibration = {
      sourceKind: 'sensor-focal',
      focalLengthMm: value.calibration.focalLengthMm,
      sensorWidthMm: value.calibration.sensorWidthMm,
      sensorHeightMm: value.calibration.sensorHeightMm
    };
  } else {
    return null;
  }

  if ((value.principalPointXPx !== undefined && !inRange(value.principalPointXPx, 0, source.imageWidthPx - 1)) ||
    (value.principalPointYPx !== undefined && !inRange(value.principalPointYPx, 0, source.imageHeightPx - 1))) {
    return null;
  }

  const horizonStart = parsePhotoMark(value.marks.horizonStart, source.imageWidthPx, source.imageHeightPx);
  const horizonEnd = parsePhotoMark(value.marks.horizonEnd, source.imageWidthPx, source.imageHeightPx);
  const targetBase = parsePhotoMark(value.marks.targetBase, source.imageWidthPx, source.imageHeightPx);
  const targetTop = parsePhotoMark(value.marks.targetTop, source.imageWidthPx, source.imageHeightPx);
  if (!horizonStart || !horizonEnd || !targetBase || !targetTop ||
    Math.abs(horizonEnd.xPx - horizonStart.xPx) < 1) return null;

  return {
    source,
    calibration,
    ...(value.principalPointXPx === undefined ? {} : { principalPointXPx: value.principalPointXPx }),
    ...(value.principalPointYPx === undefined ? {} : { principalPointYPx: value.principalPointYPx }),
    defaultMarkUncertaintyPx: value.defaultMarkUncertaintyPx,
    ...(cameraUncertainty === undefined ? {} : { cameraUncertainty }),
    distortionCorrected: value.distortionCorrected,
    marks: { horizonStart, horizonEnd, targetBase, targetTop },
    recordedAtIso: value.recordedAtIso,
    ...(value.referenceKind === undefined ? {} : { referenceKind: value.referenceKind }),
    ...(value.notes === undefined || value.notes.trim() === '' ? {} : { notes: value.notes.trim() })
  };
}

function parseStellarDemSkylineDerivation(
  value: unknown,
  pointCount: number,
  maximumAzimuthGapDeg: number
): SavedStellarDemSkylineDerivation | null {
  if (!isRecord(value) || !isNonEmptyString(value.algorithmId) ||
    !isNonEmptyString(value.algorithmVersion) ||
    !inRange(value.observerLatitudeDeg, -90, 90) ||
    !inRange(value.observerLongitudeDeg, -180, 180) ||
    !inRange(value.observerHeightM, 0, 20_000) ||
    !inRange(value.heightDatumToEllipsoidOffsetM, -20_000, 20_000) ||
    !isFiniteNumber(value.azimuthStepDeg) || value.azimuthStepDeg <= 0 || value.azimuthStepDeg > 90 ||
    !isFiniteNumber(value.distanceStepM) || value.distanceStepM <= 0 ||
    !isFiniteNumber(value.maximumDistanceM) || value.maximumDistanceM < value.distanceStepM ||
    value.maximumDistanceM > 500_000 ||
    (value.samplingMethod !== 'nearest' && value.samplingMethod !== 'bilinear') ||
    value.completeCoverage !== true ||
    !Number.isInteger(value.completeRayCount) || value.completeRayCount !== pointCount ||
    value.coverageLimitedRayCount !== 0 || value.noDataAffectedRayCount !== 0 ||
    value.noCoverageRayCount !== 0 ||
    !Number.isInteger(value.geodesicFallbackSampleCount) ||
    !inRange(value.geodesicFallbackSampleCount, 0, 2_000_000)) {
    return null;
  }
  const expectedPointCount = 360 / value.azimuthStepDeg;
  const roundedPointCount = Math.round(expectedPointCount);
  if (Math.abs(expectedPointCount - roundedPointCount) > 1e-9 ||
    roundedPointCount !== pointCount || roundedPointCount < 4 || roundedPointCount > 1_440 ||
    Math.abs(maximumAzimuthGapDeg - value.azimuthStepDeg) > 1e-9 ||
    Math.ceil(value.maximumDistanceM / value.distanceStepM) * pointCount > 2_000_000) {
    return null;
  }
  return {
    algorithmId: value.algorithmId.trim(),
    algorithmVersion: value.algorithmVersion.trim(),
    observerLatitudeDeg: value.observerLatitudeDeg,
    observerLongitudeDeg: value.observerLongitudeDeg,
    observerHeightM: value.observerHeightM,
    heightDatumToEllipsoidOffsetM: value.heightDatumToEllipsoidOffsetM,
    azimuthStepDeg: value.azimuthStepDeg,
    distanceStepM: value.distanceStepM,
    maximumDistanceM: value.maximumDistanceM,
    samplingMethod: value.samplingMethod,
    completeCoverage: true,
    completeRayCount: value.completeRayCount,
    coverageLimitedRayCount: 0,
    noDataAffectedRayCount: 0,
    noCoverageRayCount: 0,
    geodesicFallbackSampleCount: value.geodesicFallbackSampleCount
  };
}

function parseStellarLocalHorizonSource(value: unknown): SavedStellarLocalHorizonSource | null {
  if (isRecord(value) && value.format === 'panorama') {
    return parseSavedStellarPanoramaLocalHorizonSource(value);
  }
  if (!isRecord(value) || !isNonEmptyString(value.fileName) || value.fileName.length > 240 ||
    !isIsoDate(value.importedAtIso) ||
    (value.format !== 'csv' && value.format !== 'json' && value.format !== 'dem') ||
    !Number.isInteger(value.pointCount) || !inRange(value.pointCount, 3, 1_440) ||
    !inRange(value.maximumAzimuthGapDeg, 0, 360) || !Array.isArray(value.points) ||
    value.points.length !== value.pointCount || !isStringArray(value.warnings) ||
    value.warnings.length > 100 || !Number.isInteger(value.fileSizeBytes) ||
    typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256) ||
    typeof value.modifiedAfterImport !== 'boolean') {
    return null;
  }
  const maximumSourceBytes = value.format === 'dem' ? 64 * 1024 * 1024 : 2 * 1024 * 1024;
  if (!inRange(value.fileSizeBytes, 1, maximumSourceBytes)) return null;

  const points: SavedStellarLocalHorizonSource['points'] = [];
  for (const item of value.points) {
    if (!isRecord(item) || !inRange(item.azimuthDeg, 0, 360) || item.azimuthDeg === 360 ||
      !inRange(item.altitudeDeg, -90, 90)) return null;
    points.push({ azimuthDeg: item.azimuthDeg, altitudeDeg: item.altitudeDeg });
  }
  let normalized;
  try {
    normalized = normalizeStellarLocalHorizonMask({
      sourceKind: value.format === 'dem' ? 'derived' : 'external',
      sourceLabel: value.fileName,
      points
    });
  } catch {
    return null;
  }
  if (normalized.points.length !== value.pointCount ||
    Math.abs(normalized.maximumAzimuthGapDeg - value.maximumAzimuthGapDeg) > 1e-9) {
    return null;
  }

  const demDerivation = value.format === 'dem'
    ? parseStellarDemSkylineDerivation(
        value.demDerivation,
        value.pointCount,
        value.maximumAzimuthGapDeg
      )
    : undefined;
  if ((value.format === 'dem' && demDerivation === null) ||
    (value.format !== 'dem' && value.demDerivation !== undefined)) {
    return null;
  }

  return {
    fileName: value.fileName.trim(),
    importedAtIso: value.importedAtIso,
    format: value.format,
    pointCount: value.pointCount,
    maximumAzimuthGapDeg: value.maximumAzimuthGapDeg,
    points: normalized.points.map((point) => ({ ...point })),
    warnings: [...value.warnings],
    fileSizeBytes: value.fileSizeBytes,
    sha256: value.sha256,
    modifiedAfterImport: value.modifiedAfterImport,
    ...(demDerivation ? { demDerivation } : {})
  };
}

function parseStellarMotionSource(value: unknown): SavedStellarMotionSource | null {
  if (!isRecord(value) || !isNonEmptyString(value.fileName) || value.fileName.length > 240 ||
    !isIsoDate(value.importedAtIso) || !Number.isInteger(value.fileSizeBytes) ||
    !inRange(value.fileSizeBytes, 1, 4 * 1024 * 1024) ||
    typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256) ||
    !isNonEmptyString(value.subsetId) || !isNonEmptyString(value.subsetVersion) ||
    !isNonEmptyString(value.sourceCatalog) || !isNonEmptyString(value.sourceFormatId) ||
    !isNonEmptyString(value.sourceFormatVersion) || !isFiniteNumber(value.sourceEpochJulianYear) ||
    value.sourceFrame !== 'fk5-j2000' || !Number.isInteger(value.entryCount) || value.entryCount !== 19 ||
    !Array.isArray(value.entries) || value.entries.length !== value.entryCount ||
    typeof value.modifiedAfterImport !== 'boolean') {
    return null;
  }
  const entries: SavedStellarMotionSource['entries'] = [];
  for (const item of value.entries) {
    if (!isRecord(item) || !isNonEmptyString(item.starId) || !isNonEmptyString(item.commonName) ||
      !Number.isInteger(item.hrNumber) || !inRange(item.hrNumber, 1, 9110) ||
      !inRange(item.sourceRightAscensionJ2000Deg, 0, 360) || item.sourceRightAscensionJ2000Deg === 360 ||
      !inRange(item.sourceDeclinationJ2000Deg, -90, 90) || !isFiniteNumber(item.visualMagnitude) ||
      !isFiniteNumber(item.properMotionRaStarArcsecPerYear) ||
      !isFiniteNumber(item.properMotionDecArcsecPerYear) ||
      (item.parallaxArcsec !== null && !isFiniteNumber(item.parallaxArcsec)) ||
      (item.radialVelocityKmPerSec !== null && !isFiniteNumber(item.radialVelocityKmPerSec)) ||
      typeof item.sourceRecord !== 'string' || item.sourceRecord.length !== 197) {
      return null;
    }
    entries.push({
      starId: item.starId.trim(),
      commonName: item.commonName.trim(),
      hrNumber: item.hrNumber,
      sourceRightAscensionJ2000Deg: item.sourceRightAscensionJ2000Deg,
      sourceDeclinationJ2000Deg: item.sourceDeclinationJ2000Deg,
      visualMagnitude: item.visualMagnitude,
      properMotionRaStarArcsecPerYear: item.properMotionRaStarArcsecPerYear,
      properMotionDecArcsecPerYear: item.properMotionDecArcsecPerYear,
      parallaxArcsec: item.parallaxArcsec,
      radialVelocityKmPerSec: item.radialVelocityKmPerSec,
      sourceRecord: item.sourceRecord
    });
  }
  const source: SavedStellarMotionSource = {
    fileName: value.fileName.trim(),
    importedAtIso: value.importedAtIso,
    fileSizeBytes: value.fileSizeBytes,
    sha256: value.sha256,
    subsetId: value.subsetId.trim(),
    subsetVersion: value.subsetVersion.trim(),
    sourceCatalog: value.sourceCatalog.trim(),
    sourceFormatId: value.sourceFormatId.trim(),
    sourceFormatVersion: value.sourceFormatVersion.trim(),
    sourceEpochJulianYear: value.sourceEpochJulianYear,
    sourceFrame: 'fk5-j2000',
    entryCount: value.entryCount,
    entries,
    modifiedAfterImport: value.modifiedAfterImport
  };
  try {
    verifiedMotionSubsetFromSavedSource(source);
  } catch {
    return null;
  }
  return { ...source, entries: source.entries.map((entry) => ({ ...entry })) };
}

function parseTextSetupHistory(value: unknown): TextExperimentSetupProvenance[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const history: TextExperimentSetupProvenance[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isNonEmptyString(item.parserVersion) ||
      typeof item.sourceText !== 'string' || item.sourceText.length > 10_000 ||
      !isIsoDate(item.appliedAtIso) || !Array.isArray(item.appliedFields) ||
      item.appliedFields.length > 64) return null;
    const appliedFields: TextExperimentSetupProvenance['appliedFields'] = [];
    for (const field of item.appliedFields) {
      if (!isRecord(field) || !isNonEmptyString(field.fieldId) || field.fieldId.length > 80 ||
        typeof field.displayValue !== 'string' || field.displayValue.length > 500 ||
        typeof field.sourceExcerpt !== 'string' || field.sourceExcerpt.length > 1_000) return null;
      appliedFields.push({
        fieldId: field.fieldId as TextExperimentSetupProvenance['appliedFields'][number]['fieldId'],
        displayValue: field.displayValue,
        sourceExcerpt: field.sourceExcerpt
      });
    }
    history.push({
      parserVersion: item.parserVersion.trim(),
      sourceText: item.sourceText,
      appliedAtIso: item.appliedAtIso,
      appliedFields
    });
  }
  return history;
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
