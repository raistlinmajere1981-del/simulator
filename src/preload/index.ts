import { contextBridge, ipcRenderer } from 'electron';
import type {
  DemTerrainProfileImportContext,
  FileOperationResult,
  ImportExperimentResult,
  ImportObservationPhotoResult,
  LoadObservationPhotoResult,
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
  ImportStellarPanoramaSkylineResult,
  StellarDemSkylineGenerationSettings
} from '../shared/stellar-local-horizon-import';
import type { ImportStellarMotionResult } from '../shared/stellar-motion-source';

const api: SimulatorDesktopApi = {
  version: '1.34.1',
  platform: process.platform,
  listExperiments: () =>
    ipcRenderer.invoke('experiments:list') as Promise<SavedExperiment[]>,
  saveExperiment: (experiment, locale) =>
    ipcRenderer.invoke('experiments:save', experiment, locale) as Promise<SavedExperiment>,
  deleteExperiment: (id) =>
    ipcRenderer.invoke('experiments:delete', id) as Promise<boolean>,
  exportExperiment: (id, locale) =>
    ipcRenderer.invoke('experiments:export', id, locale) as Promise<FileOperationResult>,
  importExperiment: (locale) =>
    ipcRenderer.invoke('experiments:import', locale) as Promise<ImportExperimentResult>,
  exportExperimentReport: (id, locale) =>
    ipcRenderer.invoke('experiments:report', id, locale) as Promise<FileOperationResult>,
  importObservationPhoto: (locale) =>
    ipcRenderer.invoke('photo:import', locale) as Promise<ImportObservationPhotoResult>,
  loadObservationPhoto: (source, locale) =>
    ipcRenderer.invoke('photo:load-saved', source, locale) as Promise<LoadObservationPhotoResult>,
  importStellarLocalHorizon: (locale) =>
    ipcRenderer.invoke('stellar-horizon:import', locale) as Promise<ImportStellarLocalHorizonResult>,
  importStellarMotionSource: (locale) =>
    ipcRenderer.invoke('stellar-motion:import', locale) as Promise<ImportStellarMotionResult>,
  importStellarDemSkyline: (locale) =>
    ipcRenderer.invoke('stellar-skyline-dem:import', locale) as Promise<ImportStellarDemSkylineResult>,
  importStellarPanoramaSkyline: (locale) =>
    ipcRenderer.invoke('stellar-skyline-panorama:import', locale) as Promise<ImportStellarPanoramaSkylineResult>,
  generateStellarDemSkyline: (
    requestId: string,
    settings: StellarDemSkylineGenerationSettings,
    locale
  ) => ipcRenderer.invoke(
    'stellar-skyline-dem:generate',
    requestId,
    settings,
    locale
  ) as Promise<GenerateStellarDemSkylineResult>,
  importTerrainProfile: (context: TerrainProfileImportContext, locale) =>
    ipcRenderer.invoke('terrain:import-csv', context, locale) as Promise<ImportTerrainProfileResult>,
  importTerrainProfileWithMapping: (
    requestId: string,
    mapping: TerrainProfileColumnMapping,
    context: TerrainProfileImportContext,
    locale
  ) => ipcRenderer.invoke(
    'terrain:import-csv-mapped',
    requestId,
    mapping,
    context,
    locale
  ) as Promise<ImportTerrainProfileResult>,
  importGeoJsonTerrainProfile: (context: TerrainProfileImportContext, locale) =>
    ipcRenderer.invoke(
      'terrain:import-geojson',
      context,
      locale
    ) as Promise<ImportTerrainProfileResult>,
  importDemTerrainProfile: (context: DemTerrainProfileImportContext, locale) =>
    ipcRenderer.invoke(
      'terrain:import-dem',
      context,
      locale
    ) as Promise<ImportTerrainProfileResult>
};

contextBridge.exposeInMainWorld('simulatorDesktop', api);
