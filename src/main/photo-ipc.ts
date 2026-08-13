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
import { ipcText, resolveIpcLocale } from './ipc-i18n';

export function registerPhotoIpcHandlers(): void {
  ipcMain.handle(
    'photo:import',
    async (event, requestedLocale?: unknown): Promise<ImportObservationPhotoResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      const selection = await showOpenDialog(event, {
        title: ipcText(locale, 'Gözlem Fotoğrafını Aç', 'Open Observation Photo'),
        properties: ['openFile'],
        filters: [
          { name: ipcText(locale, 'Gözlem Fotoğrafı', 'Observation Photo'), extensions: ['jpg', 'jpeg', 'png'] }
        ]
      });
      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: ipcText(locale, 'Fotoğraf seçimi iptal edildi.', 'Photo selection was cancelled.') };
      }

      const extension = extname(selectedPath).toLowerCase();
      const mimeType = extension === '.png'
        ? 'image/png' as const
        : extension === '.jpg' || extension === '.jpeg'
          ? 'image/jpeg' as const
          : null;
      if (!mimeType) throw new Error(ipcText(locale, 'Yalnız PNG ve JPEG gözlem fotoğrafları desteklenir.', 'Only PNG and JPEG observation photos are supported.'));

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error(ipcText(locale, 'Seçilen yol normal bir dosya değil.', 'The selected path is not a regular file.'));
      if (statistics.size <= 0 || statistics.size > MAX_PORTABLE_OBSERVATION_PHOTO_BYTES) {
        throw new Error(ipcText(locale, 'Gözlem fotoğrafı boş olamaz ve 25 MB sınırını aşamaz.', 'The observation photo cannot be empty or exceed the 25 MB limit.'));
      }

      const bytes = await fs.readFile(selectedPath);
      const image = nativeImage.createFromBuffer(bytes);
      if (image.isEmpty()) throw new Error(ipcText(locale, 'Seçilen dosya geçerli bir görüntü olarak çözümlenemedi.', 'The selected file could not be decoded as a valid image.'));
      const size = image.getSize();
      if (!Number.isInteger(size.width) || !Number.isInteger(size.height) ||
        size.width < 1 || size.height < 1 || size.width > 100_000 || size.height > 100_000) {
        throw new Error(ipcText(locale, 'Görüntü piksel boyutları desteklenen aralığın dışında.', 'The image pixel dimensions are outside the supported range.'));
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
        message: locale === 'en'
          ? `“${basename(selectedPath)}” was opened for photo calibration and stored in the local asset store.`
          : `“${basename(selectedPath)}” fotoğraf kalibrasyonu için açıldı ve yerel varlık deposuna alındı.`,
        photo: {
          ...source,
          dataUrl: `data:${mimeType};base64,${bytes.toString('base64')}`
        }
      };
    }
  );

  ipcMain.handle(
    'photo:load-saved',
    async (
      _event,
      rawSource: unknown,
      requestedLocale?: unknown
    ): Promise<LoadObservationPhotoResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      const source = parsePhotoSourceMetadata(rawSource);
      if (!source) {
        throw new TypeError(ipcText(
          locale,
          'Kayıtlı gözlem fotoğrafı provenansı geçersiz.',
          'The saved observation-photo provenance is invalid.'
        ));
      }
      const photo = await loadObservationPhotoAsset(source);
      return photo
        ? {
            status: 'success',
            message: locale === 'en'
              ? `“${source.fileName}” was loaded from the local asset store after SHA-256 verification.`
              : `“${source.fileName}” SHA-256 doğrulanarak yerel varlık deposundan yüklendi.`,
            photo
          }
        : {
            status: 'missing',
            message: ipcText(locale, 'Kayıtlı fotoğraf provenansı ve işaretler mevcut, ancak kaynak görüntü varlığı bu makinede bulunamadı.', 'Saved photo provenance and marks are available, but the source image asset was not found on this machine.')
          };
    }
  );
}
