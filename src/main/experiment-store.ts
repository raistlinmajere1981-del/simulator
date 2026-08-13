import { app } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {
  createLocalExperimentStore,
  parseLocalExperimentStore
} from '../shared/portable';
import type { SavedExperiment } from '../shared/simulator';

const EXPERIMENTS_FILE_NAME = 'experiments.json';

function experimentsFilePath(): string {
  return join(app.getPath('userData'), EXPERIMENTS_FILE_NAME);
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

export async function readExperiments(): Promise<SavedExperiment[]> {
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

export async function writeExperiments(experiments: SavedExperiment[]): Promise<void> {
  const filePath = experimentsFilePath();
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await replaceFileAtomically(
    filePath,
    JSON.stringify(createLocalExperimentStore(experiments), null, 2)
  );
}

export async function getExperimentOrThrow(id: string): Promise<SavedExperiment> {
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('Geçerli bir deney kimliği gönderilmedi.');
  }

  const experiments = await readExperiments();
  const experiment = experiments.find((item) => item.id === id);
  if (!experiment) throw new Error('Deney kaydı bulunamadı.');
  return experiment;
}
