import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'css-normalization.spec.ts',
  outputDir: '.omo/css-normalization-captures',
  projects: [
    { name: 'chromium-css', use: { browserName: 'chromium', headless: false } },
    { name: 'firefox-css', use: { browserName: 'firefox', headless: true } },
    { name: 'webkit-css', use: { browserName: 'webkit', headless: true } },
  ],
});
