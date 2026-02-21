import { ProjectData, StoreUpdateEvent, GamepadState, CrosshairPosition, FixtureLibrary } from "./shared/interfaces";

export interface IApi {
  store: {
    get: <K extends keyof ProjectData>(key: K) => Promise<ProjectData[K]>;
    set: <K extends keyof ProjectData>(key: K, val: ProjectData[K]) => Promise<void>;
    delete: (key: keyof ProjectData) => Promise<void>;
    getAll: () => Promise<ProjectData>;
    onUpdate: (callback: (update: StoreUpdateEvent) => void) => () => void;
  };
  fixtures: {
    getLibrary: () => Promise<FixtureLibrary>;
  };  control: {
    sendGamepadState: (state: GamepadState) => void;
    onCrosshair: (cb: (pos: CrosshairPosition) => void) => () => void;
  };
}

declare global {
  interface Window {
    api: IApi;
  }
}
