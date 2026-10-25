import { defineConfig } from '@playwright/test';
import base from '../../../playwright.config';

export default defineConfig({
  ...base,
  testDir: '../../../tests/e2e',
  outputDir: './browser',
  workers: 2,
  projects: [{ name: 'chromium', use: { viewport: { width: 1280, height: 900 }, channel: 'chromium' } }],
});
