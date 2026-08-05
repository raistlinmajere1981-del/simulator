import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  type IpcMainInvokeEvent
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
  FileOperationResult,
  ImportExperimentResult,
  SavedExperiment
} from '../shared/simulator';

const EXPERIMENTS_FILE_NAME = 'experiments.json';

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
      const selection = await dialog.showSaveDialog(parentWindow(event), {
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
      const selection = await dialog.showOpenDialog(parentWindow(event), {
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
    'experiments:report',
    async (event, id: string): Promise<FileOperationResult> => {
      const experiment = await getExperimentOrThrow(id);
      const fileName = `${safeFileStem(experiment.name)}-rapor.html`;
      const selection = await dialog.showSaveDialog(parentWindow(event), {
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
