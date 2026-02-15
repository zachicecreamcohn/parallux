// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts


import { ProjectData } from '@shared/interfaces';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  demo: {
    echo: (message: string) => ipcRenderer.invoke('demo:echo', message),
    getSystemInfo: () => ipcRenderer.invoke('demo:getSystemInfo'),
  },
  store: {
    get: (key: keyof ProjectData) => ipcRenderer.invoke('store:get', key),
    set: (key: keyof ProjectData) => ipcRenderer.invoke('store:set', key),
    getAll: () => ipcRenderer.invoke('store:getAll')
  }
});
