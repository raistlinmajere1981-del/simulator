import { contextBridge, ipcRenderer } from 'electron';
import type {
  DemTerrainProfileImportContext,
  FileOperationResult,
  ImportExperimentResult,
  ImportObservationPhotoResult,
  ImportStellarLocalHorizonResult,
  ImportTerrainProfileResult,
  SavedExperiment,
  SimulatorDesktopApi,
  TerrainProfileColumnMapping,
  TerrainProfileImportContext
} from '../shared/simulator';
import type {
  GenerateStellarDemSkylineResult,
  ImportStellarDemSkylineResult,
  StellarDemSkylineGenerationSettings
} from '../shared/stellar-local-horizon-import';
import type { ImportStellarMotionResult } from '../shared/stellar-motion-source';

const api: SimulatorDesktopApi = {
  version: '1.19.1',
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
  importObservationPhoto: () =>
    ipcRenderer.invoke('photo:import') as Promise<ImportObservationPhotoResult>,
  importStellarLocalHorizon: () =>
    ipcRenderer.invoke('stellar-horizon:import') as Promise<ImportStellarLocalHorizonResult>,
  importStellarMotionSource: () =>
    ipcRenderer.invoke('stellar-motion:import') as Promise<ImportStellarMotionResult>,
  importStellarDemSkyline: () =>
    ipcRenderer.invoke('stellar-skyline-dem:import') as Promise<ImportStellarDemSkylineResult>,
  generateStellarDemSkyline: (
    requestId: string,
    settings: StellarDemSkylineGenerationSettings
  ) => ipcRenderer.invoke(
    'stellar-skyline-dem:generate',
    requestId,
    settings
  ) as Promise<GenerateStellarDemSkylineResult>,
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
  ) as Promise<ImportTerrainProfileResult>,
  importGeoJsonTerrainProfile: (context: TerrainProfileImportContext) =>
    ipcRenderer.invoke(
      'terrain:import-geojson',
      context
    ) as Promise<ImportTerrainProfileResult>,
  importDemTerrainProfile: (context: DemTerrainProfileImportContext) =>
    ipcRenderer.invoke(
      'terrain:import-dem',
      context
    ) as Promise<ImportTerrainProfileResult>
};

contextBridge.exposeInMainWorld('simulatorDesktop', api);
