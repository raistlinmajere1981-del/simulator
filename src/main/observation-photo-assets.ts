import { app, nativeImage } from 'electron';
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { ImportedObservationPhoto, PhotoSourceMetadata } from '../shared/photo-calibration';
import type { PortableObservationPhotoAsset } from '../shared/portable-photo-asset';
import {
  MAX_PORTABLE_OBSERVATION_PHOTO_BYTES,
  samePhotoSourceMetadata
} from '../shared/portable-photo-asset';

const PHOTO_ASSET_DIRECTORY = 'observation-photo-assets';

function assetDirectoryPath(): string {
  return join(app.getPath('userData'), PHOTO_ASSET_DIRECTORY);
}

function assetFilePath(source: PhotoSourceMetadata): string {
  return join(assetDirectoryPath(), `${source.sha256}.bin`);
}

function hasExpectedSignature(bytes: Buffer, mimeType: PhotoSourceMetadata['mimeType']): boolean {
  if (mimeType === 'image/png') {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function validateObservationPhotoBytes(
  bytes: Buffer,
  source: PhotoSourceMetadata
): void {
  if (bytes.byteLength <= 0 || bytes.byteLength > MAX_PORTABLE_OBSERVATION_PHOTO_BYTES ||
    bytes.byteLength !== source.fileSizeBytes) {
    throw new Error('Gözlem fotoğrafı boyutu kayıtlı provenans ile eşleşmiyor.');
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== source.sha256) {
    throw new Error('Gözlem fotoğrafı SHA-256 değeri kayıtlı provenans ile eşleşmiyor.');
  }
  if (!hasExpectedSignature(bytes, source.mimeType)) {
    throw new Error('Gözlem fotoğrafı MIME türü dosya içeriğiyle eşleşmiyor.');
  }
  const image = nativeImage.createFromBuffer(bytes);
  if (image.isEmpty()) throw new Error('Gözlem fotoğrafı görüntü olarak çözümlenemedi.');
  const size = image.getSize();
  if (size.width !== source.imageWidthPx || size.height !== source.imageHeightPx) {
    throw new Error('Gözlem fotoğrafı piksel boyutları kayıtlı provenans ile eşleşmiyor.');
  }
}

export async function persistObservationPhotoBytes(
  bytes: Buffer,
  source: PhotoSourceMetadata
): Promise<void> {
  validateObservationPhotoBytes(bytes, source);
  const directory = assetDirectoryPath();
  await fs.mkdir(directory, { recursive: true });
  const destination = assetFilePath(source);
  const temporary = join(directory, `${source.sha256}.${randomUUID()}.tmp`);
  await fs.writeFile(temporary, bytes);
  try {
    await fs.rename(temporary, destination);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EEXIST' && code !== 'EPERM') throw error;
    await fs.rm(destination, { force: true });
    await fs.rename(temporary, destination);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

export async function loadObservationPhotoAsset(
  source: PhotoSourceMetadata
): Promise<ImportedObservationPhoto | undefined> {
  try {
    const bytes = await fs.readFile(assetFilePath(source));
    validateObservationPhotoBytes(bytes, source);
    return {
      ...source,
      dataUrl: `data:${source.mimeType};base64,${bytes.toString('base64')}`
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return undefined;
    await fs.rm(assetFilePath(source), { force: true }).catch(() => undefined);
    return undefined;
  }
}

export async function createPortableObservationPhotoAsset(
  source: PhotoSourceMetadata
): Promise<PortableObservationPhotoAsset | undefined> {
  const photo = await loadObservationPhotoAsset(source);
  if (!photo) return undefined;
  const marker = ';base64,';
  const markerIndex = photo.dataUrl.indexOf(marker);
  if (markerIndex < 0) return undefined;
  return {
    source: { ...source },
    dataBase64: photo.dataUrl.slice(markerIndex + marker.length)
  };
}

export async function persistPortableObservationPhotoAsset(
  asset: PortableObservationPhotoAsset,
  expectedSource: PhotoSourceMetadata | undefined
): Promise<void> {
  if (!expectedSource || !samePhotoSourceMetadata(asset.source, expectedSource)) {
    throw new Error('Taşınabilir fotoğraf varlığı deneydeki fotoğraf provenansı ile eşleşmiyor.');
  }
  const bytes = Buffer.from(asset.dataBase64, 'base64');
  await persistObservationPhotoBytes(bytes, expectedSource);
}
