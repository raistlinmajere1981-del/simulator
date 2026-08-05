import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { SavedExperiment } from '../shared/simulator';

const EXPERIMENTS_FILE_NAME = 'experiments.json';

function experimentsFilePath(): string {
  return join(app.getPath('userData'), EXPERIMENTS_FILE_NAME);
}

function isSavedExperiment(value: unknown): value is SavedExperiment {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SavedExperiment>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.createdAtIso === 'string' &&
    typeof candidate.updatedAtIso === 'string' &&
    typeof candidate.inputs === 'object' &&
    Array.isArray(candidate.predictions)
  );
}

async function readExperiments(): Promise<SavedExperiment[]> {
  try {
    const content = await fs.readFile(experimentsFilePath(), 'utf-8');
    const parsed: unknown = JSON.parse(content);

    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedExperiment);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return [];
    throw error;
  }
}

async function writeExperiments(experiments: SavedExperiment[]): Promise<void> {
  const filePath = experimentsFilePath();
  const temporaryPath = `${filePath}.tmp`;
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(temporaryPath, JSON.stringify(experiments, null, 2), 'utf-8');
  await fs.rename(temporaryPath, filePath);
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
      const normalized: SavedExperiment = {
        ...experiment,
        name: experiment.name.trim(),
        updatedAtIso: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        normalized.createdAtIso = experiments[existingIndex].createdAtIso;
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
