import { SystemInfo } from "./api/demo";

export interface IApi {
  demo: {
    getSystemInfo: () => Promise<SystemInfo>
    echo: (message: string) => Promise<string>
  }
}

declare global {
  interface Window {
    api: IApi;
  }
}
