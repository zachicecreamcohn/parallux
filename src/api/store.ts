import { ipcMain } from "electron"
const Store = require('electron-store');
import { ProjectData } from "../shared/interfaces";

// export const setupStoreHandlers = () => {
//   ipcMain.handle('fileSystem:')
// }


const store = new Store({
  defaults: {
    projectName: 'Parallux Show'
  }
})

export const setupStoreHandlers = () => {
  ipcMain.handle('store:get', (event, key: keyof ProjectData) => {
    return store.get(key);
  });

  ipcMain.handle('store:set', (event, key: keyof ProjectData, value: any) => {
    store.set(key, value);
    return true;
  });

  ipcMain.handle('store:getAll', () => {
    return store.store;
  });
};
