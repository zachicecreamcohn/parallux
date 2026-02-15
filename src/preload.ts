// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts


import { ProjectData, StoreUpdateEvent } from '@shared/interfaces';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  store: {
    get: (key: keyof ProjectData) => ipcRenderer.invoke('store:get', key),
    set: (key: keyof ProjectData, val: any) => ipcRenderer.invoke('store:set', key, val),
    delete: (key: keyof ProjectData) => ipcRenderer.invoke('store:delete', key),
    getAll: () => ipcRenderer.invoke('store:getAll'),

    onUpdate: (callback: (event: StoreUpdateEvent) => void) => {
      const subscription = (_event: any, key: any, value: any) => {
        callback({ key, value });
      };

      ipcRenderer.on('store:update', subscription);
      return () => ipcRenderer.removeListener('store:update', subscription);
    }
  }
});
