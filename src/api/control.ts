import { ipcMain } from 'electron';
import { GamepadState, CrosshairPosition, FixtureState } from '../shared/interfaces';
import { FixtureEngine } from './FixtureEngine';

export function setupControlHandlers(engine: FixtureEngine): void {
  ipcMain.on('control:gamepadState', (_event, state: GamepadState) => {
    engine.setGamepadState(state);
  });
  ipcMain.on('control:setCalibrationFixture', (_event, id: string | null) => {
    engine.setCalibrationFixture(id);
  });
  ipcMain.on('control:setCalibrationTarget', (_event, target: { u: number; v: number } | null) => {
    engine.setCalibrationTarget(target);
  });

  ipcMain.handle('control:getFixtureState', (_event, id: string): FixtureState | undefined => {
    return engine.getFixtureState(id);
  });
}

export function makeOnCrosshair(win: BrowserWindow): (pos: CrosshairPosition) => void {
  return (pos) => {
    if (!win.isDestroyed()) {
      win.webContents.send('control:crosshair', pos);
    }
  };
}