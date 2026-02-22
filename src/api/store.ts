import { ipcMain, BrowserWindow } from "electron";
import Store, { Schema } from 'electron-store';
import { ProjectData, ProjectDataKeys } from "../shared/interfaces";

const storeSchema: Schema<ProjectData> = {
  projectName: {
    type: 'string',
    default: 'Parallux Show'
  },
  patch: {
    type: 'object',
    default: {}
  },
  stageSize: {
    type: 'object',
    default: {}
  },
  gridOverlay: {
    type: 'object',
    default: {}
  },  calibrationData: {
    type: 'object',
    default: {}
  },


}

const store = new Store<ProjectData>({ schema: storeSchema });

// Migrate stale patch entries that predate the fixture profile schema
const rawPatch = store.get('patch') as Record<string, unknown>;
const migratedPatch: Record<string, unknown> = {};
for (const [id, fixture] of Object.entries(rawPatch)) {
  const f = fixture as Record<string, unknown>;
  if (f.fixtureTypeId !== undefined && f.modeId !== undefined) {
    migratedPatch[id] = fixture;
  }
}
if (Object.keys(migratedPatch).length !== Object.keys(rawPatch).length) {
  store.set('patch', migratedPatch);
}


export function getStoreValue<K extends keyof ProjectData>(key: K): ProjectData[K] {
  return store.get(key);
}

export function onStoreChange<K extends keyof ProjectData>(key: K, cb: (val: ProjectData[K]) => void): void {
  store.onDidChange(key, (newValue) => cb(newValue as ProjectData[K]));
}
export const setupStoreHandlers = () => {
  ipcMain.handle('store:get', (_event, key: keyof ProjectData) => {
    if (!ProjectDataKeys.includes(key)) {
      throw new Error(`Invalid key: ${key}`);
    }
    return store.get(key);
  });

  ipcMain.handle('store:set', (_event, key: keyof ProjectData, value: unknown) => {
    if (!ProjectDataKeys.includes(key)) {
      throw new Error(`Invalid key: ${key}`);
    }

    if (value === undefined || value === null) throw new Error(`Value cannot be empty`);

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
