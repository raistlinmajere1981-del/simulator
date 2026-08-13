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
import { ipcText, resolveIpcLocale } from './ipc-i18n';

const MAX_STELLAR_HORIZON_BYTES = 2 * 1024 * 1024;
const MAX_STELLAR_MOTION_BYTES = 4 * 1024 * 1024;

export function registerStellarSourceIpcHandlers(): void {
  ipcMain.handle(
    'stellar-horizon:import',
    async (event, requestedLocale?: unknown): Promise<ImportStellarLocalHorizonResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      const selection = await showOpenDialog(event, {
        title: ipcText(locale, 'Yerel Skyline Profilini İçe Aktar', 'Import Local Skyline Profile'),
        properties: ['openFile'],
        filters: [
          { name: ipcText(locale, 'Skyline Profili', 'Skyline Profile'), extensions: ['csv', 'tsv', 'txt', 'json'] },
          { name: ipcText(locale, 'Tüm Dosyalar', 'All Files'), extensions: ['*'] }
        ]
      });
      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: ipcText(locale, 'Skyline profil içe aktarma iptal edildi.', 'Skyline profile import was cancelled.') };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error(ipcText(locale, 'Seçilen skyline yolu normal bir dosya değil.', 'The selected skyline path is not a regular file.'));
      if (statistics.size <= 0 || statistics.size > MAX_STELLAR_HORIZON_BYTES) {
        throw new Error(ipcText(locale, 'Skyline profili boş olamaz ve 2 MB sınırını aşamaz.', 'The skyline profile cannot be empty or exceed the 2 MB limit.'));
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
        message: locale === 'en'
          ? '“' + profile.fileName + '” skyline profile loaded: ' + profile.pointCount + ' points verified.'
          : '“' + profile.fileName + '” skyline profili okundu: ' + profile.pointCount + ' nokta doğrulandı.',
        filePath: selectedPath,
        profile
      };
    }
  );

  ipcMain.handle(
    'stellar-motion:import',
    async (event, requestedLocale?: unknown): Promise<ImportStellarMotionResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      const selection = await showOpenDialog(event, {
        title: ipcText(locale, 'BSC5P Proper Motion Kataloğunu İçe Aktar', 'Import BSC5P Proper Motion Catalog'),
        properties: ['openFile'],
        filters: [{ name: ipcText(locale, 'BSC5P catalog / tüm dosyalar', 'BSC5P catalog / all files'), extensions: ['*'] }]
      });
      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: ipcText(locale, 'Proper-motion kaynak seçimi iptal edildi.', 'Proper-motion source selection was cancelled.') };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error(ipcText(locale, 'Seçilen BSC5P yolu normal bir dosya değil.', 'The selected BSC5P path is not a regular file.'));
      if (statistics.size <= 0 || statistics.size > MAX_STELLAR_MOTION_BYTES) {
        throw new Error(ipcText(locale, 'BSC5P kaynak dosyası boş olamaz ve 4 MB sınırını aşamaz.', 'The BSC5P source file cannot be empty or exceed the 4 MB limit.'));
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
        message: locale === 'en'
          ? '“' + source.fileName + '” verified: ' + source.entryCount + '/19 proper-motion records ready.'
          : '“' + source.fileName + '” doğrulandı: ' + source.entryCount + '/19 proper-motion kaydı hazır.',
        filePath: selectedPath,
        source
      };
    }
  );
}
