import { app, BrowserWindow } from 'electron';
import { setupStoreHandlers, getStoreValue, onStoreChange } from './store';
import { FixtureEngine } from './FixtureEngine';
import { setupControlHandlers, makeOnCrosshair } from './control';

let engine: FixtureEngine | null = null;

export function registerApi(win: BrowserWindow): void {
  console.log('Initializing API Registry...');

  setupStoreHandlers();

  const patch = getStoreValue('patch') ?? {};
  const onCrosshair = makeOnCrosshair(win);
  engine = new FixtureEngine(patch, onCrosshair);

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
