import { defineConfig } from '@playwright/test';
import base from '../../../playwright.config';
export default defineConfig({ ...base, testDir: '../../../tests/e2e', projects: [{ name: 'chromium-full', use: { browserName: 'chromium', channel: 'chromium', viewport: { width: 1280, height: 900 } } }] });
