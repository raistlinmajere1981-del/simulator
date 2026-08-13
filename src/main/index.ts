import { app, BrowserWindow } from 'electron';
import { registerExperimentIpcHandlers } from './experiment-ipc';
import { registerPhotoIpcHandlers } from './photo-ipc';
import { registerStellarSourceIpcHandlers } from './stellar-source-ipc';
import { registerTerrainImportIpcHandlers } from './terrain-import-ipc';
import { registerStellarDemSkylineHandlers } from './stellar-dem-skyline-ipc';
import { registerStellarPanoramaSkylineHandlers } from './stellar-panorama-skyline-ipc';
import { createMainWindow } from './main-window';

function registerIpcHandlers(): void {
  registerExperimentIpcHandlers();
  registerPhotoIpcHandlers();
  registerStellarSourceIpcHandlers();
  registerTerrainImportIpcHandlers();
  registerStellarDemSkylineHandlers();
  registerStellarPanoramaSkylineHandlers();
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
