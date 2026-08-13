import { app, ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { createExperimentHtmlReport } from '../report/html-report';
import {
  createPortableExperimentFile,
  isSavedExperiment,
  parsePortableExperimentFile
} from '../shared/portable';
import type {
  FileOperationResult,
  ImportExperimentResult,
  SavedExperiment
} from '../shared/simulator';
import { ipcText, resolveIpcLocale } from './ipc-i18n';
import {
  createPortableObservationPhotoAsset,
  persistPortableObservationPhotoAsset
} from './observation-photo-assets';
import {
  getExperimentOrThrow,
  readExperiments,
  writeExperiments
} from './experiment-store';
import { safeFileStem, showOpenDialog, showSaveDialog } from './ipc-dialogs';

export function registerExperimentIpcHandlers(): void {
  ipcMain.handle('experiments:list', async () => readExperiments());

  ipcMain.handle(
    'experiments:save',
    async (
      _event,
      experiment: SavedExperiment,
      requestedLocale?: unknown
    ): Promise<SavedExperiment> => {
      const locale = resolveIpcLocale(requestedLocale);
      if (!isSavedExperiment(experiment) || experiment.name.trim().length === 0) {
        throw new TypeError(ipcText(
          locale,
          'Geçerli bir deney kaydı gönderilmedi.',
          'A valid experiment record was not provided.'
        ));
      }

      const experiments = await readExperiments();
      const existingIndex = experiments.findIndex((item) => item.id === experiment.id);
      const existing = existingIndex >= 0 ? experiments[existingIndex] : undefined;
      const normalized: SavedExperiment = {
        ...experiment,
        name: experiment.name.trim(),
        createdAtIso: existing?.createdAtIso ?? experiment.createdAtIso,
        updatedAtIso: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        experiments[existingIndex] = normalized;
      } else {
        experiments.unshift(normalized);
      }

      await writeExperiments(experiments);
      return normalized;
    }
  );

  ipcMain.handle('experiments:delete', async (_event, id: string): Promise<boolean> => {
    if (typeof id !== 'string' || id.length === 0) return false;

    const experiments = await readExperiments();
    const remaining = experiments.filter((item) => item.id !== id);
    if (remaining.length === experiments.length) return false;

    await writeExperiments(remaining);
    return true;
  });

  ipcMain.handle(
    'experiments:export',
    async (
      event,
      id: string,
      requestedLocale?: unknown
    ): Promise<FileOperationResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      const experiment = await getExperimentOrThrow(id);
      const fileName = `${safeFileStem(experiment.name)}.ggl.json`;
      const selection = await showSaveDialog(event, {
        title: ipcText(locale, 'Deneyi Dışa Aktar', 'Export Experiment'),
        defaultPath: join(app.getPath('documents'), fileName),
        filters: [
          { name: ipcText(locale, 'Geometrik Gözlem Deneyi', 'Geometric Observation Experiment'), extensions: ['ggl.json'] },
          { name: 'JSON', extensions: ['json'] }
        ]
      });

      if (selection.canceled || !selection.filePath) {
        return { status: 'cancelled', message: ipcText(locale, 'Dışa aktarma iptal edildi.', 'Export was cancelled.') };
      }

      const observationPhoto = experiment.photoCalibration
        ? await createPortableObservationPhotoAsset(experiment.photoCalibration.source)
        : undefined;
      const portable = createPortableExperimentFile(
        experiment,
        app.getVersion(),
        undefined,
        observationPhoto ? { observationPhoto } : undefined
      );
      await fs.writeFile(
        selection.filePath,
        JSON.stringify(portable, null, 2),
        'utf-8'
      );

      const missingPhotoAsset = Boolean(experiment.photoCalibration && !observationPhoto);
      return {
        status: 'success',
        message: missingPhotoAsset
          ? (locale === 'en'
              ? `“${experiment.name}” was exported; the saved source photo was not found on this machine, so the file contains only photo provenance and marks.`
              : `“${experiment.name}” dışa aktarıldı; kayıtlı kaynak fotoğraf bu makinede bulunamadığı için dosyada yalnız fotoğraf provenansı ve işaretler var.`)
          : (locale === 'en'
              ? `“${experiment.name}” was saved as a portable experiment file.`
              : `“${experiment.name}” taşınabilir deney dosyası olarak kaydedildi.`),
        filePath: selection.filePath
      };
    }
  );

  ipcMain.handle(
    'experiments:import',
    async (event, requestedLocale?: unknown): Promise<ImportExperimentResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      const selection = await showOpenDialog(event, {
        title: ipcText(locale, 'Deney Dosyasını İçe Aktar', 'Import Experiment File'),
        properties: ['openFile'],
        filters: [
          { name: ipcText(locale, 'Geometrik Gözlem Deneyi', 'Geometric Observation Experiment'), extensions: ['json'] }
        ]
      });

      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: ipcText(locale, 'İçe aktarma iptal edildi.', 'Import was cancelled.') };
      }

      const content = await fs.readFile(selectedPath, 'utf-8');
      let json: unknown;
      try {
        json = JSON.parse(content);
      } catch {
        throw new Error(ipcText(locale, 'Seçilen dosya geçerli JSON içermiyor.', 'The selected file does not contain valid JSON.'));
      }

      const parsed = parsePortableExperimentFile(json);
      if (parsed.assets?.observationPhoto) {
        await persistPortableObservationPhotoAsset(
          parsed.assets.observationPhoto,
          parsed.experiment.photoCalibration?.source
        );
      }
      const experiments = await readExperiments();
      const hasIdCollision = experiments.some(
        (item) => item.id === parsed.experiment.id
      );
      const now = new Date().toISOString();
      const imported: SavedExperiment = {
        ...parsed.experiment,
        id: hasIdCollision ? randomUUID() : parsed.experiment.id,
        name: hasIdCollision
          ? `${parsed.experiment.name} (İçe aktarıldı)`
          : parsed.experiment.name,
        updatedAtIso: now
      };

      experiments.unshift(imported);
      await writeExperiments(experiments);

      return {
        status: 'success',
        message: parsed.migrated
          ? (locale === 'en'
              ? `“${imported.name}” was migrated from an older file format and imported.`
              : `“${imported.name}” eski dosya biçiminden taşınarak içe aktarıldı.`)
          : (locale === 'en'
              ? `“${imported.name}” was imported.`
              : `“${imported.name}” içe aktarıldı.`),
        filePath: selectedPath,
        experiment: imported,
        migrated: parsed.migrated,
        sourceVersion: parsed.sourceVersion
      };
    }
  );

  ipcMain.handle(
    'experiments:report',
    async (event, id: string, requestedLocale?: unknown): Promise<FileOperationResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      const experiment = await getExperimentOrThrow(id);
      const fileName = `${safeFileStem(experiment.name)}-${locale === 'en' ? 'report' : 'rapor'}.html`;
      const selection = await showSaveDialog(event, {
        title: locale === 'en' ? 'Save Experiment Report' : 'Deney Raporunu Kaydet',
        defaultPath: join(app.getPath('documents'), fileName),
        filters: [{
          name: locale === 'en' ? 'Offline HTML Report' : 'Çevrimdışı HTML Raporu',
          extensions: ['html']
        }]
      });

      if (selection.canceled || !selection.filePath) {
        return {
          status: 'cancelled',
          message: locale === 'en'
            ? 'Report generation was cancelled.'
            : 'Rapor oluşturma iptal edildi.'
        };
      }

      await fs.writeFile(
        selection.filePath,
        createExperimentHtmlReport(experiment, new Date().toISOString(), locale),
        'utf-8'
      );

      return {
        status: 'success',
        message: locale === 'en'
          ? `Offline HTML report created for “${experiment.name}”.`
          : `“${experiment.name}” için çevrimdışı HTML raporu oluşturuldu.`,
        filePath: selection.filePath
      };
    }
  );
}
