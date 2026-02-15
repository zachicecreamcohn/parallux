import { ProjectData, StoreUpdateEvent } from "./shared/interfaces";

export interface IApi {
  store: {
    get: <K extends keyof ProjectData>(key: K) => Promise<ProjectData[K]>;
    set: <K extends keyof ProjectData>(key: K, val: ProjectData[K]) => Promise<void>;
    delete: (key: keyof ProjectData) => Promise<void>;
    getAll: () => Promise<ProjectData>;
    onUpdate: (callback: (update: StoreUpdateEvent) => void) => () => void;
  };
}

declare global {
  interface Window {
    api: IApi;
  }
}
