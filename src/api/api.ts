import { app, BrowserWindow, ipcMain } from 'electron';
import { setupStoreHandlers, getStoreValue, onStoreChange } from './store';
import { FixtureEngine } from './FixtureEngine';
import { setupControlHandlers, makeOnCrosshair } from './control';
import { FixtureLibrary } from '../shared/interfaces';
import fixtureLibrary from '../../src/fixtures.json';

let engine: FixtureEngine | null = null;

export function registerApi(win: BrowserWindow): void {
  console.log('Initializing API Registry...');

  setupStoreHandlers();

  const patch = getStoreValue('patch') ?? {};
  const onCrosshair = makeOnCrosshair(win);
  engine = new FixtureEngine(patch, fixtureLibrary as FixtureLibrary, onCrosshair);
  ipcMain.handle('fixtures:getLibrary', () => fixtureLibrary);

  onStoreChange('patch', (newPatch) => {
    engine?.updatePatch(newPatch ?? {});
  });

  setupControlHandlers(engine);
  engine.start();


  app.on('before-quit', () => {
    engine?.stop();
    engine = null;
  });

  console.log('✅ API Registry initialized.');
}
