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
    async (event): Promise<ImportStellarPanoramaSkylineResult> => {
      const owner = parentWindow(event);
      const options: OpenDialogOptions = {
        title: '360° Skyline için Panorama Seç',
        properties: ['openFile'],
        filters: [
          { name: 'Panorama Görüntüsü', extensions: ['jpg', 'jpeg', 'png'] }
        ]
      };
      const selection = owner
        ? await dialog.showOpenDialog(owner, options)
        : await dialog.showOpenDialog(options);
      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: 'Panorama seçimi iptal edildi.' };
      }

      const extension = extname(selectedPath).toLowerCase();
      const mimeType = extension === '.png'
        ? 'image/png' as const
        : extension === '.jpg' || extension === '.jpeg'
          ? 'image/jpeg' as const
          : null;
      if (!mimeType) throw new Error('Yalnız PNG ve JPEG panorama görüntüleri desteklenir.');

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error('Seçilen panorama yolu normal bir dosya değil.');
      if (statistics.size <= 0 || statistics.size > MAX_PANORAMA_BYTES) {
        throw new Error('Panorama görüntüsü boş olamaz ve 25 MB sınırını aşamaz.');
      }

      const bytes = await fs.readFile(selectedPath);
      const image = nativeImage.createFromBuffer(bytes);
      if (image.isEmpty()) throw new Error('Seçilen dosya geçerli bir panorama görüntüsü olarak çözümlenemedi.');
      const size = image.getSize();
      if (
        !Number.isInteger(size.width) || !Number.isInteger(size.height) ||
        size.width < 1 || size.height < 1 ||
        size.width > MAX_IMAGE_DIMENSION_PX || size.height > MAX_IMAGE_DIMENSION_PX
      ) {
        throw new Error('Panorama piksel boyutları desteklenen aralığın dışında.');
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
          ? 'GPano XMP bulundu ve gerçek bitmap boyutuna ölçeklenerek doğrulandı.'
          : 'GPano XMP bulundu ve panorama geometrisi doğrulandı.'
        : 'Otomatik GPano geometrisi yok; panorama manuel geometriyle işaretlenebilir.';

      return {
        status: 'success',
        message: `“${fileName}” panorama editörü için açıldı. ${metadataMessage}`,
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
