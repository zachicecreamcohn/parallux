import { ProjectData } from "@shared/interfaces";
import { SystemInfo } from "./api/demo";

export interface IApi {
  demo: {
    getSystemInfo: () => Promise<SystemInfo>
    echo: (message: string) => Promise<string>
  },

  store: {
    get: (key: keyof ProjectData)  => Promise<any>
    set: (key: keyof ProjectData)  => Promise<any>
    getAll: () => Promise<any>
  }
}

declare global {
  interface Window {
    api: IApi;
  }
}
