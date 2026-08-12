import type { PhotoSourceMetadata } from './photo-calibration';
import { inRange, isIsoDate, isNonEmptyString, isRecord } from './portable-core';

export const MAX_PORTABLE_OBSERVATION_PHOTO_BYTES = 25 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_PORTABLE_OBSERVATION_PHOTO_BYTES / 3) * 4;

export interface PortableObservationPhotoAsset {
  source: PhotoSourceMetadata;
  dataBase64: string;
}

export interface PortableExperimentAssets {
  observationPhoto?: PortableObservationPhotoAsset;
}

export function parsePhotoSourceMetadata(value: unknown): PhotoSourceMetadata | null {
  if (!isRecord(value) || !isNonEmptyString(value.fileName) || value.fileName.length > 240 ||
    !Number.isInteger(value.fileSizeBytes) ||
    !inRange(value.fileSizeBytes, 1, MAX_PORTABLE_OBSERVATION_PHOTO_BYTES) ||
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

function decodedBase64Length(value: string): number | null {
  if (value.length === 0 || value.length > MAX_BASE64_CHARS || value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    return null;
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

function parseObservationPhotoAsset(value: unknown): PortableObservationPhotoAsset | null {
  if (!isRecord(value)) return null;
  const source = parsePhotoSourceMetadata(value.source);
  if (!source || typeof value.dataBase64 !== 'string') return null;
  const decodedLength = decodedBase64Length(value.dataBase64);
  if (decodedLength === null || decodedLength !== source.fileSizeBytes) return null;
  return { source, dataBase64: value.dataBase64 };
}

export function parsePortableExperimentAssets(value: unknown): PortableExperimentAssets | null {
  if (!isRecord(value)) return null;
  if (value.observationPhoto === undefined) return {};
  const observationPhoto = parseObservationPhotoAsset(value.observationPhoto);
  return observationPhoto ? { observationPhoto } : null;
}

export function samePhotoSourceMetadata(
  left: PhotoSourceMetadata,
  right: PhotoSourceMetadata
): boolean {
  return left.fileName === right.fileName &&
    left.fileSizeBytes === right.fileSizeBytes &&
    left.sha256 === right.sha256 &&
    left.mimeType === right.mimeType &&
    left.imageWidthPx === right.imageWidthPx &&
    left.imageHeightPx === right.imageHeightPx &&
    left.importedAtIso === right.importedAtIso;
}
