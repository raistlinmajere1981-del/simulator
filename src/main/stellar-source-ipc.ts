import { ipcMain } from 'electron';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename } from 'node:path';
import { buildVerifiedBrightStarMotionSubset } from '../simulation/bsc5p-motion-subset';
import { parseStellarLocalHorizonFile } from '../simulation/stellar-local-horizon-import';
import { savedStellarMotionSourceFromVerifiedSubset } from '../simulation/stellar-motion-source';
import type { ImportStellarMotionResult } from '../shared/stellar-motion-source';
import type { ImportStellarLocalHorizonResult } from '../shared/simulator';
import { calculateTerrainSourceIntegrity } from './terrain-source-integrity';
import { showOpenDialog } from './ipc-dialogs';

const MAX_STELLAR_HORIZON_BYTES = 2 * 1024 * 1024;
const MAX_STELLAR_MOTION_BYTES = 4 * 1024 * 1024;

export function registerStellarSourceIpcHandlers(): void {
  ipcMain.handle(
    'stellar-horizon:import',
    async (event): Promise<ImportStellarLocalHorizonResult> => {
      const selection = await showOpenDialog(event, {
        title: 'Yerel Skyline Profilini İçe Aktar',
        properties: ['openFile'],
        filters: [
          { name: 'Skyline Profili', extensions: ['csv', 'tsv', 'txt', 'json'] },
          { name: 'Tüm Dosyalar', extensions: ['*'] }
        ]
      });
      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: 'Skyline profil içe aktarma iptal edildi.' };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error('Seçilen skyline yolu normal bir dosya değil.');
      if (statistics.size <= 0 || statistics.size > MAX_STELLAR_HORIZON_BYTES) {
        throw new Error('Skyline profili boş olamaz ve 2 MB sınırını aşamaz.');
      }

      const bytes = await fs.readFile(selectedPath);
      const parsed = parseStellarLocalHorizonFile(bytes.toString('utf-8'), selectedPath);
      const integrity = calculateTerrainSourceIntegrity(bytes);
      const profile = {
        ...parsed,
        importedAtIso: new Date().toISOString(),
        ...integrity
      };
      return {
        status: 'success',
        message: '“' + profile.fileName + '” skyline profili okundu: ' + profile.pointCount + ' nokta doğrulandı.',
        filePath: selectedPath,
        profile
      };
    }
  );

  ipcMain.handle(
    'stellar-motion:import',
    async (event): Promise<ImportStellarMotionResult> => {
      const selection = await showOpenDialog(event, {
        title: 'BSC5P Proper Motion Kataloğunu İçe Aktar',
        properties: ['openFile'],
        filters: [{ name: 'BSC5P catalog / tüm dosyalar', extensions: ['*'] }]
      });
      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: 'Proper-motion kaynak seçimi iptal edildi.' };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error('Seçilen BSC5P yolu normal bir dosya değil.');
      if (statistics.size <= 0 || statistics.size > MAX_STELLAR_MOTION_BYTES) {
        throw new Error('BSC5P kaynak dosyası boş olamaz ve 4 MB sınırını aşamaz.');
      }

      const bytes = await fs.readFile(selectedPath);
      const subset = buildVerifiedBrightStarMotionSubset(bytes.toString('utf-8'));
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const source = savedStellarMotionSourceFromVerifiedSubset({
        subset,
        fileName: basename(selectedPath),
        importedAtIso: new Date().toISOString(),
        fileSizeBytes: bytes.byteLength,
        sha256
      });
      return {
        status: 'success',
        message: '“' + source.fileName + '” doğrulandı: ' + source.entryCount + '/19 proper-motion kaydı hazır.',
        filePath: selectedPath,
        source
      };
    }
  );
}
