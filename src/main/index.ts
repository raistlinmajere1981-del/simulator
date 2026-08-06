import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  type IpcMainInvokeEvent,
  type OpenDialogOptions,
  type SaveDialogOptions
} from 'electron';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { createExperimentHtmlReport } from '../report/html-report';
import {
  createLocalExperimentStore,
  createPortableExperimentFile,
  isSavedExperiment,
  parseLocalExperimentStore,
  parsePortableExperimentFile
} from '../shared/portable';
import type {
  DemTerrainProfileImportContext,
  FileOperationResult,
  ImportExperimentResult,
  ImportTerrainProfileResult,
  SavedExperiment,
  TerrainProfileColumnMapping,
  TerrainProfileImportContext
} from '../shared/simulator';
import {
  parseTerrainProfileCsv,
  TerrainProfileColumnMappingRequiredError
} from '../simulation/csv-terrain-profile';
import { parseTerrainProfileGeoJson } from '../simulation/geojson-terrain-profile';
import { buildTerrainProfileFromDem } from '../simulation/dem-route-profile';
import { parseEsriAsciiGrid } from '../simulation/esri-ascii-grid';

const EXPERIMENTS_FILE_NAME = 'experiments.json';
const MAX_TERRAIN_PROFILE_BYTES = 5 * 1024 * 1024;
const MAX_DEM_BYTES = 64 * 1024 * 1024;
const TERRAIN_MAPPING_TTL_MS = 10 * 60 * 1_000;

interface PendingTerrainImport {
  content: string;
  fileName: string;
  createdAtMs: number;
}

const pendingTerrainImports = new Map<string, PendingTerrainImport>();

function experimentsFilePath(): string {
  return join(app.getPath('userData'), EXPERIMENTS_FILE_NAME);
}

function safeFileStem(value: string): string {
  const stem = value
    .normalize('NFKD')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 90);

  return stem || 'hedef-gorunurlugu-deneyi';
}

function parentWindow(event: IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

async function showSaveDialog(
  event: IpcMainInvokeEvent,
  options: SaveDialogOptions
) {
  const owner = parentWindow(event);
  return owner
    ? dialog.showSaveDialog(owner, options)
    : dialog.showSaveDialog(options);
}

async function showOpenDialog(
  event: IpcMainInvokeEvent,
  options: OpenDialogOptions
) {
  const owner = parentWindow(event);
  return owner
    ? dialog.showOpenDialog(owner, options)
    : dialog.showOpenDialog(options);
}

async function replaceFileAtomically(
  filePath: string,
  content: string
): Promise<void> {
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, content, 'utf-8');

  try {
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EEXIST' && code !== 'EPERM') throw error;

    await fs.rm(filePath, { force: true });
    await fs.rename(temporaryPath, filePath);
  }
}

async function readExperiments(): Promise<SavedExperiment[]> {
  try {
    const content = await fs.readFile(experimentsFilePath(), 'utf-8');
    const parsed: unknown = JSON.parse(content);
    const result = parseLocalExperimentStore(parsed);

    if (result.migrated || result.ignoredRecordCount > 0) {
      await writeExperiments(result.store.experiments);
    }

    return result.store.experiments;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return [];
    throw error;
  }
}

async function writeExperiments(experiments: SavedExperiment[]): Promise<void> {
  const filePath = experimentsFilePath();
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await replaceFileAtomically(
    filePath,
    JSON.stringify(createLocalExperimentStore(experiments), null, 2)
  );
}

async function getExperimentOrThrow(id: string): Promise<SavedExperiment> {
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('Geçerli bir deney kimliği gönderilmedi.');
  }

  const experiments = await readExperiments();
  const experiment = experiments.find((item) => item.id === id);
  if (!experiment) throw new Error('Deney kaydı bulunamadı.');
  return experiment;
}

function validateTerrainImportContext(value: unknown): TerrainProfileImportContext {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arazi profili için geçerli deney bilgisi gönderilmedi.');
  }

  const candidate = value as Record<string, unknown>;
  if (!Number.isFinite(candidate.routeDistanceM) ||
    (candidate.routeDistanceM as number) <= 0 ||
    !Number.isFinite(candidate.observerGroundElevationM) ||
    !Number.isFinite(candidate.targetGroundElevationM)) {
    throw new TypeError('Arazi profili için mesafe ve uç yükseklikleri geçerli olmalı.');
  }

  return {
    routeDistanceM: candidate.routeDistanceM as number,
    observerGroundElevationM: candidate.observerGroundElevationM as number,
    targetGroundElevationM: candidate.targetGroundElevationM as number
  };
}

function validateDemImportContext(value: unknown): DemTerrainProfileImportContext {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('DEM profili için geçerli rota koordinatları gönderilmedi.');
  }
  const candidate = value as Record<string, unknown>;
  const coordinates = [
    candidate.observerLatitudeDeg,
    candidate.observerLongitudeDeg,
    candidate.targetLatitudeDeg,
    candidate.targetLongitudeDeg
  ];
  if (!coordinates.every((coordinate) => Number.isFinite(coordinate)) ||
    (candidate.observerLatitudeDeg as number) < -90 ||
    (candidate.observerLatitudeDeg as number) > 90 ||
    (candidate.targetLatitudeDeg as number) < -90 ||
    (candidate.targetLatitudeDeg as number) > 90 ||
    (candidate.observerLongitudeDeg as number) < -180 ||
    (candidate.observerLongitudeDeg as number) > 180 ||
    (candidate.targetLongitudeDeg as number) < -180 ||
    (candidate.targetLongitudeDeg as number) > 180 ||
    (candidate.samplingMethod !== 'nearest' && candidate.samplingMethod !== 'bilinear') ||
    (candidate.sampleCount !== undefined &&
      (!Number.isInteger(candidate.sampleCount) ||
        (candidate.sampleCount as number) < 3 ||
        (candidate.sampleCount as number) > 2_002))) {
    throw new TypeError('DEM rota koordinatları, örnekleme yöntemi veya örnek sayısı geçersiz.');
  }
  return {
    observerLatitudeDeg: candidate.observerLatitudeDeg as number,
    observerLongitudeDeg: candidate.observerLongitudeDeg as number,
    targetLatitudeDeg: candidate.targetLatitudeDeg as number,
    targetLongitudeDeg: candidate.targetLongitudeDeg as number,
    samplingMethod: candidate.samplingMethod,
    ...(candidate.sampleCount === undefined
      ? {}
      : { sampleCount: candidate.sampleCount as number })
  };
}

function validateTerrainColumnMapping(value: unknown): TerrainProfileColumnMapping {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('CSV sütun eşlemesi geçersiz.');
  }
  const candidate = value as Record<string, unknown>;
  if (!Number.isInteger(candidate.distanceColumnIndex) ||
    !Number.isInteger(candidate.elevationColumnIndex) ||
    (candidate.distanceColumnIndex as number) < 0 ||
    (candidate.elevationColumnIndex as number) < 0 ||
    (candidate.distanceUnit !== 'percent' && candidate.distanceUnit !== 'm' &&
      candidate.distanceUnit !== 'km')) {
    throw new TypeError('CSV sütun eşlemesi geçersiz.');
  }
  return {
    distanceColumnIndex: candidate.distanceColumnIndex as number,
    elevationColumnIndex: candidate.elevationColumnIndex as number,
    distanceUnit: candidate.distanceUnit
  };
}

function purgeExpiredTerrainImports(): void {
  const now = Date.now();
  for (const [requestId, pending] of pendingTerrainImports) {
    if (now - pending.createdAtMs > TERRAIN_MAPPING_TTL_MS) {
      pendingTerrainImports.delete(requestId);
    }
  }
}

function terrainMappingResult(
  error: TerrainProfileColumnMappingRequiredError,
  content: string,
  fileName: string,
  filePath?: string
): ImportTerrainProfileResult {
  purgeExpiredTerrainImports();
  const requestId = randomUUID();
  pendingTerrainImports.set(requestId, {
    content,
    fileName,
    createdAtMs: Date.now()
  });
  return {
    status: 'success',
    message: 'CSV sütunları otomatik belirlenemedi; eşleme gerekli.',
    filePath,
    mappingRequest: {
      requestId,
      ...error.inspection
    }
  };
}

function registerExperimentHandlers(): void {
  ipcMain.handle('experiments:list', async () => readExperiments());

  ipcMain.handle(
    'experiments:save',
    async (_event, experiment: SavedExperiment): Promise<SavedExperiment> => {
      if (!isSavedExperiment(experiment) || experiment.name.trim().length === 0) {
        throw new TypeError('Geçerli bir deney kaydı gönderilmedi.');
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
    async (event, id: string): Promise<FileOperationResult> => {
      const experiment = await getExperimentOrThrow(id);
      const fileName = `${safeFileStem(experiment.name)}.ggl.json`;
      const selection = await showSaveDialog(event, {
        title: 'Deneyi Dışa Aktar',
        defaultPath: join(app.getPath('documents'), fileName),
        filters: [
          { name: 'Geometrik Gözlem Deneyi', extensions: ['ggl.json'] },
          { name: 'JSON', extensions: ['json'] }
        ]
      });

      if (selection.canceled || !selection.filePath) {
        return { status: 'cancelled', message: 'Dışa aktarma iptal edildi.' };
      }

      const portable = createPortableExperimentFile(
        experiment,
        app.getVersion()
      );
      await fs.writeFile(
        selection.filePath,
        JSON.stringify(portable, null, 2),
        'utf-8'
      );

      return {
        status: 'success',
        message: `“${experiment.name}” taşınabilir deney dosyası olarak kaydedildi.`,
        filePath: selection.filePath
      };
    }
  );

  ipcMain.handle(
    'experiments:import',
    async (event): Promise<ImportExperimentResult> => {
      const selection = await showOpenDialog(event, {
        title: 'Deney Dosyasını İçe Aktar',
        properties: ['openFile'],
        filters: [
          { name: 'Geometrik Gözlem Deneyi', extensions: ['json'] }
        ]
      });

      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: 'İçe aktarma iptal edildi.' };
      }

      const content = await fs.readFile(selectedPath, 'utf-8');
      let json: unknown;
      try {
        json = JSON.parse(content);
      } catch {
        throw new Error('Seçilen dosya geçerli JSON içermiyor.');
      }

      const parsed = parsePortableExperimentFile(json);
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
          ? `“${imported.name}” eski dosya biçiminden taşınarak içe aktarıldı.`
          : `“${imported.name}” içe aktarıldı.`,
        filePath: selectedPath,
        experiment: imported,
        migrated: parsed.migrated,
        sourceVersion: parsed.sourceVersion
      };
    }
  );

  ipcMain.handle(
    'terrain:import-csv',
    async (event, rawContext: unknown): Promise<ImportTerrainProfileResult> => {
      const context = validateTerrainImportContext(rawContext);
      const selection = await showOpenDialog(event, {
        title: 'CSV Arazi Profilini İçe Aktar',
        properties: ['openFile'],
        filters: [
          { name: 'Arazi Profili CSV', extensions: ['csv', 'tsv', 'txt'] },
          { name: 'Tüm Dosyalar', extensions: ['*'] }
        ]
      });

      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: 'CSV profil içe aktarma iptal edildi.' };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error('Seçilen yol normal bir dosya değil.');
      if (statistics.size > MAX_TERRAIN_PROFILE_BYTES) {
        throw new Error('CSV arazi profili 5 MB sınırını aşıyor.');
      }

      const content = await fs.readFile(selectedPath, 'utf-8');
      try {
        const profile = parseTerrainProfileCsv(content, selectedPath, context);
        return {
          status: 'success',
          message: `“${profile.fileName}” okundu: ${profile.points.length} ara nokta uygulamaya hazır.`,
          filePath: selectedPath,
          profile
        };
      } catch (error) {
        if (error instanceof TerrainProfileColumnMappingRequiredError) {
          return terrainMappingResult(error, content, selectedPath, selectedPath);
        }
        throw error;
      }
    }
  );

  ipcMain.handle(
    'terrain:import-csv-mapped',
    async (
      _event,
      rawRequestId: unknown,
      rawMapping: unknown,
      rawContext: unknown
    ): Promise<ImportTerrainProfileResult> => {
      purgeExpiredTerrainImports();
      if (typeof rawRequestId !== 'string' || rawRequestId.length === 0) {
        throw new TypeError('CSV eşleme isteği geçersiz.');
      }
      const pending = pendingTerrainImports.get(rawRequestId);
      if (!pending) {
        throw new Error('CSV eşleme isteğinin süresi doldu. Dosyayı yeniden seçin.');
      }
      const mapping = validateTerrainColumnMapping(rawMapping);
      const context = validateTerrainImportContext(rawContext);
      const profile = parseTerrainProfileCsv(
        pending.content,
        pending.fileName,
        context,
        mapping
      );
      pendingTerrainImports.delete(rawRequestId);
      return {
        status: 'success',
        message: `“${profile.fileName}” eşlenen sütunlarla okundu: ${profile.points.length} ara nokta uygulamaya hazır.`,
        profile
      };
    }
  );

  ipcMain.handle(
    'terrain:import-dem',
    async (event, rawContext: unknown): Promise<ImportTerrainProfileResult> => {
      const context = validateDemImportContext(rawContext);
      const selection = await showOpenDialog(event, {
        title: 'ESRI ASCII DEM Dosyasını İçe Aktar',
        properties: ['openFile'],
        filters: [
          { name: 'ESRI ASCII Grid DEM', extensions: ['asc', 'txt'] },
          { name: 'Tüm Dosyalar', extensions: ['*'] }
        ]
      });

      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: 'DEM içe aktarma iptal edildi.' };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error('Seçilen yol normal bir dosya değil.');
      if (statistics.size > MAX_DEM_BYTES) {
        throw new Error('ESRI ASCII DEM dosyası 64 MB sınırını aşıyor.');
      }

      const content = await fs.readFile(selectedPath, 'utf-8');
      const grid = parseEsriAsciiGrid(content, selectedPath);
      const profile = buildTerrainProfileFromDem(grid, context);
      return {
        status: 'success',
        message: `“${profile.fileName}” DEM rotası örneklendi: ${profile.points.length} ara nokta uygulamaya hazır.`,
        filePath: selectedPath,
        profile
      };
    }
  );

  ipcMain.handle(
    'terrain:import-geojson',
    async (event, rawContext: unknown): Promise<ImportTerrainProfileResult> => {
      const context = validateTerrainImportContext(rawContext);
      const selection = await showOpenDialog(event, {
        title: 'GeoJSON Arazi Profilini İçe Aktar',
        properties: ['openFile'],
        filters: [
          { name: 'GeoJSON Arazi Profili', extensions: ['geojson', 'json'] },
          { name: 'Tüm Dosyalar', extensions: ['*'] }
        ]
      });

      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return {
          status: 'cancelled',
          message: 'GeoJSON profil içe aktarma iptal edildi.'
        };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error('Seçilen yol normal bir dosya değil.');
      if (statistics.size > MAX_TERRAIN_PROFILE_BYTES) {
        throw new Error('GeoJSON arazi profili 5 MB sınırını aşıyor.');
      }

      const content = await fs.readFile(selectedPath, 'utf-8');
      const profile = parseTerrainProfileGeoJson(content, selectedPath, context);
      return {
        status: 'success',
        message: `“${profile.fileName}” okundu: ${profile.points.length} ara nokta uygulamaya hazır.`,
        filePath: selectedPath,
        profile
      };
    }
  );

  ipcMain.handle(
    'experiments:report',
    async (event, id: string): Promise<FileOperationResult> => {
      const experiment = await getExperimentOrThrow(id);
      const fileName = `${safeFileStem(experiment.name)}-rapor.html`;
      const selection = await showSaveDialog(event, {
        title: 'Deney Raporunu Kaydet',
        defaultPath: join(app.getPath('documents'), fileName),
        filters: [{ name: 'Çevrimdışı HTML Raporu', extensions: ['html'] }]
      });

      if (selection.canceled || !selection.filePath) {
        return { status: 'cancelled', message: 'Rapor oluşturma iptal edildi.' };
      }

      await fs.writeFile(
        selection.filePath,
        createExperimentHtmlReport(experiment),
        'utf-8'
      );

      return {
        status: 'success',
        message: `“${experiment.name}” için çevrimdışı HTML raporu oluşturuldu.`,
        filePath: selection.filePath
      };
    }
  );
}

function createMainWindow(): void {
  const window = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#071019',
    show: false,
    title: 'Geometrik Gözlem Laboratuvarı',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.once('ready-to-show', () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    void window.loadURL(rendererUrl);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerExperimentHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
