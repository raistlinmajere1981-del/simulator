import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('simulatorDesktop', {
  version: '0.1.0',
  platform: process.platform
});
