// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts


import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  demo: {
    echo: (message: string) => ipcRenderer.invoke('demo:echo', message),
    getSystemInfo: () => ipcRenderer.invoke('demo:getSystemInfo'),
  }
});
