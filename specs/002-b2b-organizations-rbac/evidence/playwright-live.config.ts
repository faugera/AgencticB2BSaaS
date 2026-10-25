import { defineConfig, devices } from '@playwright/test';
import base from '../../../playwright.config';
export default defineConfig({ ...base, testDir: '../../../tests/e2e', projects: [
{ name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chromium' } },
{ name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: 'chromium' } },
] });
