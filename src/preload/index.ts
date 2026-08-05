import { contextBridge, ipcRenderer } from 'electron';
import type {
  SavedExperiment,
  SimulatorDesktopApi
} from '../shared/simulator';

const api: SimulatorDesktopApi = {
  version: '0.2.0',
  platform: process.platform,
  listExperiments: () => ipcRenderer.invoke('experiments:list') as Promise<SavedExperiment[]>,
  saveExperiment: (experiment) =>
    ipcRenderer.invoke('experiments:save', experiment) as Promise<SavedExperiment>,
  deleteExperiment: (id) =>
    ipcRenderer.invoke('experiments:delete', id) as Promise<boolean>
};

contextBridge.exposeInMainWorld('simulatorDesktop', api);
