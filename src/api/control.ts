import { ipcMain } from 'electron';
import { GamepadState, CrosshairPosition } from '../shared/interfaces';
import { FixtureEngine } from './FixtureEngine';

export function setupControlHandlers(engine: FixtureEngine): void {
  ipcMain.on('control:gamepadState', (_event, state: GamepadState) => {
    engine.setGamepadState(state);
  });
}

export function makeOnCrosshair(win: BrowserWindow): (pos: CrosshairPosition) => void {
  return (pos) => {
    if (!win.isDestroyed()) {
      win.webContents.send('control:crosshair', pos);
    }
  };
}