import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
  },
  // Start the Express server (which serves the built frontend)
  webServer: {
    command: 'cd server && npm start',
    port: 3001,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
