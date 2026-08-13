import {
  BrowserWindow,
  dialog,
  ipcMain,
  nativeImage,
  type IpcMainInvokeEvent,
  type OpenDialogOptions
} from 'electron';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename, extname } from 'node:path';
import type {
  ImportStellarPanoramaSkylineResult,
  StellarPanoramaMetadataSummary
} from '../shared/stellar-local-horizon-import';
import { readGpanoMetadataFromJpeg } from '../simulation/gpano-xmp';
import { ipcText, resolveIpcLocale } from './ipc-i18n';

const MAX_PANORAMA_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_DIMENSION_PX = 100_000;

function parentWindow(event: IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

function noAutomaticMetadata(message: string): StellarPanoramaMetadataSummary {
  return {
    status: 'absent',
    metadataScaledToImage: false,
    standardXmpPacketFound: false,
    extendedXmpPacketFound: false,
    warnings: [message]
  };
}

export function registerStellarPanoramaSkylineHandlers(): void {
  ipcMain.handle(
    'stellar-skyline-panorama:import',
    async (event, requestedLocale?: unknown): Promise<ImportStellarPanoramaSkylineResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      const owner = parentWindow(event);
      const options: OpenDialogOptions = {
        title: ipcText(locale, '360° Skyline için Panorama Seç', 'Select Panorama for 360° Skyline'),
        properties: ['openFile'],
        filters: [
          { name: ipcText(locale, 'Panorama Görüntüsü', 'Panorama Image'), extensions: ['jpg', 'jpeg', 'png'] }
        ]
      };
      const selection = owner
        ? await dialog.showOpenDialog(owner, options)
        : await dialog.showOpenDialog(options);
      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: ipcText(locale, 'Panorama seçimi iptal edildi.', 'Panorama selection was cancelled.') };
      }

      const extension = extname(selectedPath).toLowerCase();
      const mimeType = extension === '.png'
        ? 'image/png' as const
        : extension === '.jpg' || extension === '.jpeg'
          ? 'image/jpeg' as const
          : null;
      if (!mimeType) throw new Error(ipcText(locale, 'Yalnız PNG ve JPEG panorama görüntüleri desteklenir.', 'Only PNG and JPEG panorama images are supported.'));

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error(ipcText(locale, 'Seçilen panorama yolu normal bir dosya değil.', 'The selected panorama path is not a regular file.'));
      if (statistics.size <= 0 || statistics.size > MAX_PANORAMA_BYTES) {
        throw new Error(ipcText(locale, 'Panorama görüntüsü boş olamaz ve 25 MB sınırını aşamaz.', 'The panorama image cannot be empty or exceed the 25 MB limit.'));
      }

      const bytes = await fs.readFile(selectedPath);
      const image = nativeImage.createFromBuffer(bytes);
      if (image.isEmpty()) throw new Error(ipcText(locale, 'Seçilen dosya geçerli bir panorama görüntüsü olarak çözümlenemedi.', 'The selected file could not be decoded as a valid panorama image.'));
      const size = image.getSize();
      if (
        !Number.isInteger(size.width) || !Number.isInteger(size.height) ||
        size.width < 1 || size.height < 1 ||
        size.width > MAX_IMAGE_DIMENSION_PX || size.height > MAX_IMAGE_DIMENSION_PX
      ) {
        throw new Error(ipcText(locale, 'Panorama piksel boyutları desteklenen aralığın dışında.', 'The panorama pixel dimensions are outside the supported range.'));
      }

      const metadata = mimeType === 'image/jpeg'
        ? readGpanoMetadataFromJpeg(bytes, size.width, size.height)
        : noAutomaticMetadata(
            'PNG görüntüsünde GPano JPEG XMP otomatik okuması uygulanmadı; yön/crop geometrisi manuel doğrulanmalıdır.'
          );
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const fileName = basename(selectedPath);
      const metadataMessage = metadata.status === 'complete'
        ? metadata.metadataScaledToImage
          ? ipcText(
              locale,
              'GPano XMP bulundu ve gerçek bitmap boyutuna ölçeklenerek doğrulandı.',
              'GPano XMP was found, scaled to the actual bitmap dimensions and verified.'
            )
          : ipcText(
              locale,
              'GPano XMP bulundu ve panorama geometrisi doğrulandı.',
              'GPano XMP was found and the panorama geometry was verified.'
            )
        : ipcText(
            locale,
            'Otomatik GPano geometrisi yok; panorama manuel geometriyle işaretlenebilir.',
            'No automatic GPano geometry is available; the panorama can be marked using manual geometry.'
          );

      return {
        status: 'success',
        message: locale === 'en'
          ? `“${fileName}” was opened in the panorama editor. ${metadataMessage}`
          : `“${fileName}” panorama editörü için açıldı. ${metadataMessage}`,
        filePath: selectedPath,
        draft: {
          fileName,
          importedAtIso: new Date().toISOString(),
          fileSizeBytes: bytes.byteLength,
          sha256,
          mimeType,
          imageWidthPx: size.width,
          imageHeightPx: size.height,
          dataUrl: `data:${mimeType};base64,${bytes.toString('base64')}`,
          metadata
        }
      };
    }
  );
}
