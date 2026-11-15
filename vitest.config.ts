import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/*/src/**/*.test.{ts,tsx}'],
    exclude: ['**/*.integration.test.ts'],
    environment: 'node',
  },
});
