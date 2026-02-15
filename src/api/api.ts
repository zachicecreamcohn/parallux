// just to demonstrate how to do a backend connection
import { setupDemoHandlers } from './demo';

/**
 * Registers all API handlers for the application.
 * Call this function once in your main.ts before creating windows.
 */
export function registerApi() {
  console.log('Initializing API Registry...');

  setupDemoHandlers();

  console.log('✅ API Registry initialized.');
}
