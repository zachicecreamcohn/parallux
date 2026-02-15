import { ipcMain } from "electron";
import Store, { Schema } from 'electron-store';
import { ProjectData, ProjectDataKeys } from "../shared/interfaces";
import { BrowserWindow } from "electron";

const storeSchema: Schema<ProjectData> = {
  projectName: {
    type: 'string',
    default: 'Parallux Show'
  }
}

const store = new Store<ProjectData>({ schema: storeSchema});


export const setupStoreHandlers = () => {
  ipcMain.handle('store:get', (_event, key: keyof ProjectData) => {
    if (!ProjectDataKeys.includes(key)) {
      throw new Error(`Invalid key: ${key}`);
    }
    return store.get(key);
  });

  ipcMain.handle('store:set', (_event, key: keyof ProjectData, value: any) => {
    if (!ProjectDataKeys.includes(key)) {
      throw new Error(`Invalid key: ${key}`);
    }

    if (!value) throw new Error(`Value cannot be empty`);

    store.set(key, value);
  });


  ipcMain.handle('store:delete', (_event, key: keyof ProjectData) => {
    if (!ProjectDataKeys.includes(key)) {
      throw new Error(`Invalid key: ${key}`);
    }

    store.delete(key);
  });


  ipcMain.handle('store:getAll', () => {
    return store.store;
  });





  // send an update to the frontend whenever a value changes
  ProjectDataKeys.forEach(key => {
    store.onDidChange(key, (newValue) => {
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('store:update', key, newValue);
      });
    });
  });
};
