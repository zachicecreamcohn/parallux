import { ipcMain } from 'electron';
import * as os from 'os';

export interface SystemInfo {
  platform: string;
  arch: string;
  cpus: number;
  freeMem: string;
}

export const setupDemoHandlers = () => {
  ipcMain.handle('demo:getSystemInfo', async (): Promise<SystemInfo> => {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      freeMem: (os.freemem() / 1024 / 1024).toFixed(2) + ' MB',
    };
  });

  // 2. Echo a message (Test passing data)
  ipcMain.handle('demo:echo', async (_event, message: string) => {
    console.log('Received in Backend:', message);
    return `Backend says: I heard "${message}"`;
  });
};
