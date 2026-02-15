import { setupStoreHandlers } from './store';

/**
 * Registers all API handlers for the application.
 * Call this function once in your main.ts before creating windows.
 */
export function registerApi() {
  console.log('Initializing API Registry...');

  setupStoreHandlers();


  console.log('✅ API Registry initialized.');
}
