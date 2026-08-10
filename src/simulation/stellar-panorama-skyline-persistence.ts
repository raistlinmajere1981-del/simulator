import type {
  SavedStellarLocalHorizonSource,
  SavedStellarPanoramaSkylineDerivation,
  StellarPanoramaGeometry,
  StellarPanoramaMetadataStatus
} from '../shared/stellar-local-horizon-import';
import {
  EQUIRECTANGULAR_PANORAMA_ALGORITHM_ID,
  EQUIRECTANGULAR_PANORAMA_ALGORITHM_VERSION,
  panoramaPixelToLocalDirection,
  validateEquirectangularPanoramaGeometry
} from './equirectangular-panorama';
import { normalizeStellarLocalHorizonMask } from './stellar-local-horizon';

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const EPSILON = 1e-9;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function inRange(value: unknown, minimum: number, maximum: number): value is number {
  return finite(value) && value >= minimum && value <= maximum;
}

function integerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && inRange(value, minimum, maximum);
}

function nonEmptyString(value: unknown, maximumLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximumLength;
}

function isoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function sha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function metadataStatus(value: unknown): value is StellarPanoramaMetadataStatus {
  return value === 'complete' || value === 'absent' || value === 'incomplete' ||
    value === 'unsupported-projection' || value === 'incompatible-scale';
}

function parseGeometry(value: unknown): StellarPanoramaGeometry | null {
  if (!record(value) ||
    !integerInRange(value.imageWidthPx, 1, 200_000) ||
    !integerInRange(value.imageHeightPx, 1, 200_000) ||
    !integerInRange(value.fullPanoWidthPx, 1, 200_000) ||
    !integerInRange(value.fullPanoHeightPx, 1, 200_000) ||
    !integerInRange(value.croppedAreaLeftPx, 0, 200_000) ||
    !integerInRange(value.croppedAreaTopPx, 0, 200_000) ||
    !inRange(value.poseHeadingDeg, 0, 360) || value.poseHeadingDeg === 360 ||
    !inRange(value.posePitchDeg, -90, 90) ||
    !finite(value.poseRollDeg) || value.poseRollDeg <= -180 || value.poseRollDeg > 180) {
    return null;
  }
  const geometry: StellarPanoramaGeometry = {
    imageWidthPx: value.imageWidthPx,
    imageHeightPx: value.imageHeightPx,
    fullPanoWidthPx: value.fullPanoWidthPx,
    fullPanoHeightPx: value.fullPanoHeightPx,
    croppedAreaLeftPx: value.croppedAreaLeftPx,
    croppedAreaTopPx: value.croppedAreaTopPx,
    poseHeadingDeg: value.poseHeadingDeg,
    posePitchDeg: value.posePitchDeg,
    poseRollDeg: value.poseRollDeg
  };
  try {
    validateEquirectangularPanoramaGeometry(geometry);
  } catch {
    return null;
  }
  return geometry;
}

function circularDifferenceDeg(left: number, right: number): number {
  const difference = Math.abs(left - right) % 360;
  return Math.min(difference, 360 - difference);
}

export function parseSavedStellarPanoramaLocalHorizonSource(
  value: unknown
): SavedStellarLocalHorizonSource | null {
  if (!record(value) || value.format !== 'panorama' || value.dataUrl !== undefined ||
    !nonEmptyString(value.fileName, 240) || !isoDate(value.importedAtIso) ||
    !integerInRange(value.pointCount, 8, 1_440) ||
    !inRange(value.maximumAzimuthGapDeg, 0, 90 + EPSILON) ||
    !Array.isArray(value.points) || value.points.length !== value.pointCount ||
    !Array.isArray(value.warnings) || value.warnings.length > 100 ||
    !value.warnings.every((warning) => typeof warning === 'string' && warning.length <= 2_000) ||
    !integerInRange(value.fileSizeBytes, 1, MAX_SOURCE_BYTES) || !sha256(value.sha256) ||
    typeof value.modifiedAfterImport !== 'boolean' || value.demDerivation !== undefined ||
    !record(value.panoramaDerivation)) {
    return null;
  }

  const derivationValue = value.panoramaDerivation;
  if (derivationValue.algorithmId !== EQUIRECTANGULAR_PANORAMA_ALGORITHM_ID ||
    derivationValue.algorithmVersion !== EQUIRECTANGULAR_PANORAMA_ALGORITHM_VERSION ||
    (derivationValue.geometrySource !== 'gpano-xmp' && derivationValue.geometrySource !== 'manual') ||
    !metadataStatus(derivationValue.metadataStatusAtImport) ||
    (derivationValue.projectionTypeAtImport !== undefined &&
      !nonEmptyString(derivationValue.projectionTypeAtImport, 100)) ||
    typeof derivationValue.metadataScaledToImage !== 'boolean' ||
    typeof derivationValue.standardXmpPacketFound !== 'boolean' ||
    typeof derivationValue.extendedXmpPacketFound !== 'boolean' ||
    typeof derivationValue.fullSphereCoverage !== 'boolean' ||
    !inRange(derivationValue.horizontalCoverageDeg, 0, 360) ||
    !inRange(derivationValue.verticalCoverageDeg, 0, 180) ||
    !Array.isArray(derivationValue.marks) || derivationValue.marks.length !== value.pointCount) {
    return null;
  }

  const geometry = parseGeometry(derivationValue.geometry);
  if (!geometry) return null;
  const validatedGeometry = validateEquirectangularPanoramaGeometry(geometry);
  if (validatedGeometry.horizontalCoverageDeg < 360 - EPSILON ||
    Math.abs(validatedGeometry.horizontalCoverageDeg - derivationValue.horizontalCoverageDeg) > EPSILON ||
    Math.abs(validatedGeometry.verticalCoverageDeg - derivationValue.verticalCoverageDeg) > EPSILON ||
    validatedGeometry.fullSphereCoverage !== derivationValue.fullSphereCoverage) {
    return null;
  }

  if (derivationValue.geometrySource === 'gpano-xmp' &&
    (derivationValue.metadataStatusAtImport !== 'complete' ||
      derivationValue.standardXmpPacketFound !== true ||
      typeof derivationValue.projectionTypeAtImport !== 'string' ||
      derivationValue.projectionTypeAtImport.toLowerCase() !== 'equirectangular')) {
    return null;
  }

  const marks: SavedStellarPanoramaSkylineDerivation['marks'] = [];
  const recomputedPoints: SavedStellarLocalHorizonSource['points'] = [];
  for (const item of derivationValue.marks) {
    if (!record(item) || !inRange(item.xPx, 0, geometry.imageWidthPx - 1) ||
      !inRange(item.yPx, 0, geometry.imageHeightPx - 1) ||
      !inRange(item.azimuthDeg, 0, 360) || item.azimuthDeg === 360 ||
      !inRange(item.altitudeDeg, -90, 90)) {
      return null;
    }
    let direction;
    try {
      direction = panoramaPixelToLocalDirection(geometry, { xPx: item.xPx, yPx: item.yPx });
    } catch {
      return null;
    }
    if (circularDifferenceDeg(direction.azimuthDeg, item.azimuthDeg) > EPSILON ||
      Math.abs(direction.altitudeDeg - item.altitudeDeg) > EPSILON) {
      return null;
    }
    marks.push({
      xPx: item.xPx,
      yPx: item.yPx,
      azimuthDeg: item.azimuthDeg,
      altitudeDeg: item.altitudeDeg
    });
    recomputedPoints.push({
      azimuthDeg: direction.azimuthDeg,
      altitudeDeg: direction.altitudeDeg
    });
  }

  let normalized;
  try {
    normalized = normalizeStellarLocalHorizonMask({
      sourceKind: 'derived',
      sourceLabel: value.fileName,
      points: recomputedPoints
    });
  } catch {
    return null;
  }
  if (normalized.points.length !== value.pointCount ||
    Math.abs(normalized.maximumAzimuthGapDeg - value.maximumAzimuthGapDeg) > EPSILON ||
    normalized.maximumAzimuthGapDeg > 90 + EPSILON) {
    return null;
  }

  const storedPoints: SavedStellarLocalHorizonSource['points'] = [];
  for (const item of value.points) {
    if (!record(item) || !inRange(item.azimuthDeg, 0, 360) || item.azimuthDeg === 360 ||
      !inRange(item.altitudeDeg, -90, 90)) return null;
    storedPoints.push({ azimuthDeg: item.azimuthDeg, altitudeDeg: item.altitudeDeg });
  }
  if (storedPoints.length !== normalized.points.length) return null;
  for (let index = 0; index < storedPoints.length; index += 1) {
    const stored = storedPoints[index]!;
    const recomputed = normalized.points[index]!;
    if (circularDifferenceDeg(stored.azimuthDeg, recomputed.azimuthDeg) > EPSILON ||
      Math.abs(stored.altitudeDeg - recomputed.altitudeDeg) > EPSILON) {
      return null;
    }
  }

  const panoramaDerivation: SavedStellarPanoramaSkylineDerivation = {
    algorithmId: EQUIRECTANGULAR_PANORAMA_ALGORITHM_ID,
    algorithmVersion: EQUIRECTANGULAR_PANORAMA_ALGORITHM_VERSION,
    geometrySource: derivationValue.geometrySource,
    geometry: { ...geometry },
    horizontalCoverageDeg: derivationValue.horizontalCoverageDeg,
    verticalCoverageDeg: derivationValue.verticalCoverageDeg,
    fullSphereCoverage: derivationValue.fullSphereCoverage,
    metadataStatusAtImport: derivationValue.metadataStatusAtImport,
    ...(typeof derivationValue.projectionTypeAtImport === 'string'
      ? { projectionTypeAtImport: derivationValue.projectionTypeAtImport.trim() }
      : {}),
    metadataScaledToImage: derivationValue.metadataScaledToImage,
    standardXmpPacketFound: derivationValue.standardXmpPacketFound,
    extendedXmpPacketFound: derivationValue.extendedXmpPacketFound,
    marks
  };

  return {
    fileName: value.fileName.trim(),
    importedAtIso: value.importedAtIso,
    format: 'panorama',
    pointCount: value.pointCount,
    maximumAzimuthGapDeg: value.maximumAzimuthGapDeg,
    points: normalized.points.map((point) => ({ ...point })),
    warnings: [...value.warnings],
    fileSizeBytes: value.fileSizeBytes,
    sha256: value.sha256,
    panoramaDerivation,
    modifiedAfterImport: value.modifiedAfterImport
  };
}
