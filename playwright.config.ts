import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore:
    process.env.AUTH_LIVE_TEST === 'true' ? [] : ['**/*-live.spec.ts'],
  fullyParallel: process.env.AUTH_LIVE_TEST !== 'true',
  ...(process.env.AUTH_LIVE_TEST === 'true' ? { workers: 1 } : {}),
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @enterprise/web preview',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
    },
    ...(process.env.AUTH_LIVE_TEST === 'true'
      ? [
          {
            command: 'pnpm --filter @enterprise/api start',
            url: 'http://127.0.0.1:3000/health',
            reuseExistingServer: false,
          },
        ]
      : []),
  ],
});
