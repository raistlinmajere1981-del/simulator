import { contextBridge, ipcRenderer } from 'electron';
import type {
  FileOperationResult,
  ImportExperimentResult,
  ImportTerrainProfileResult,
  SavedExperiment,
  SimulatorDesktopApi,
  TerrainProfileColumnMapping,
  TerrainProfileImportContext
} from '../shared/simulator';

const api: SimulatorDesktopApi = {
  version: '0.8.0',
  platform: process.platform,
  listExperiments: () =>
    ipcRenderer.invoke('experiments:list') as Promise<SavedExperiment[]>,
  saveExperiment: (experiment) =>
    ipcRenderer.invoke('experiments:save', experiment) as Promise<SavedExperiment>,
  deleteExperiment: (id) =>
    ipcRenderer.invoke('experiments:delete', id) as Promise<boolean>,
  exportExperiment: (id) =>
    ipcRenderer.invoke('experiments:export', id) as Promise<FileOperationResult>,
  importExperiment: () =>
    ipcRenderer.invoke('experiments:import') as Promise<ImportExperimentResult>,
  exportExperimentReport: (id) =>
    ipcRenderer.invoke('experiments:report', id) as Promise<FileOperationResult>,
  importTerrainProfile: (context: TerrainProfileImportContext) =>
    ipcRenderer.invoke('terrain:import-csv', context) as Promise<ImportTerrainProfileResult>,
  importTerrainProfileWithMapping: (
    requestId: string,
    mapping: TerrainProfileColumnMapping,
    context: TerrainProfileImportContext
  ) => ipcRenderer.invoke(
    'terrain:import-csv-mapped',
    requestId,
    mapping,
    context
  ) as Promise<ImportTerrainProfileResult>
};

contextBridge.exposeInMainWorld('simulatorDesktop', api);
