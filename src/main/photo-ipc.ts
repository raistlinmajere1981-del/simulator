import { ipcMain, nativeImage } from 'electron';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename, extname } from 'node:path';
import {
  MAX_PORTABLE_OBSERVATION_PHOTO_BYTES,
  parsePhotoSourceMetadata
} from '../shared/portable-photo-asset';
import type {
  ImportObservationPhotoResult,
  LoadObservationPhotoResult
} from '../shared/simulator';
import {
  loadObservationPhotoAsset,
  persistObservationPhotoBytes
} from './observation-photo-assets';
import { showOpenDialog } from './ipc-dialogs';

export function registerPhotoIpcHandlers(): void {
  ipcMain.handle(
    'photo:import',
    async (event): Promise<ImportObservationPhotoResult> => {
      const selection = await showOpenDialog(event, {
        title: 'Gözlem Fotoğrafını Aç',
        properties: ['openFile'],
        filters: [
          { name: 'Gözlem Fotoğrafı', extensions: ['jpg', 'jpeg', 'png'] }
        ]
      });
      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: 'Fotoğraf seçimi iptal edildi.' };
      }

      const extension = extname(selectedPath).toLowerCase();
      const mimeType = extension === '.png'
        ? 'image/png' as const
        : extension === '.jpg' || extension === '.jpeg'
          ? 'image/jpeg' as const
          : null;
      if (!mimeType) throw new Error('Yalnız PNG ve JPEG gözlem fotoğrafları desteklenir.');

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error('Seçilen yol normal bir dosya değil.');
      if (statistics.size <= 0 || statistics.size > MAX_PORTABLE_OBSERVATION_PHOTO_BYTES) {
        throw new Error('Gözlem fotoğrafı boş olamaz ve 25 MB sınırını aşamaz.');
      }

      const bytes = await fs.readFile(selectedPath);
      const image = nativeImage.createFromBuffer(bytes);
      if (image.isEmpty()) throw new Error('Seçilen dosya geçerli bir görüntü olarak çözümlenemedi.');
      const size = image.getSize();
      if (!Number.isInteger(size.width) || !Number.isInteger(size.height) ||
        size.width < 1 || size.height < 1 || size.width > 100_000 || size.height > 100_000) {
        throw new Error('Görüntü piksel boyutları desteklenen aralığın dışında.');
      }

      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const source = {
        fileName: basename(selectedPath),
        fileSizeBytes: bytes.byteLength,
        sha256,
        mimeType,
        imageWidthPx: size.width,
        imageHeightPx: size.height,
        importedAtIso: new Date().toISOString()
      };
      await persistObservationPhotoBytes(bytes, source);
      return {
        status: 'success',
        message: `“${basename(selectedPath)}” fotoğraf kalibrasyonu için açıldı ve yerel varlık deposuna alındı.`,
        photo: {
          ...source,
          dataUrl: `data:${mimeType};base64,${bytes.toString('base64')}`
        }
      };
    }
  );

  ipcMain.handle(
    'photo:load-saved',
    async (_event, rawSource: unknown): Promise<LoadObservationPhotoResult> => {
      const source = parsePhotoSourceMetadata(rawSource);
      if (!source) throw new TypeError('Kayıtlı gözlem fotoğrafı provenansı geçersiz.');
      const photo = await loadObservationPhotoAsset(source);
      return photo
        ? {
            status: 'success',
            message: `“${source.fileName}” SHA-256 doğrulanarak yerel varlık deposundan yüklendi.`,
            photo
          }
        : {
            status: 'missing',
            message: 'Kayıtlı fotoğraf provenansı ve işaretler mevcut, ancak kaynak görüntü varlığı bu makinede bulunamadı.'
          };
    }
  );
}
