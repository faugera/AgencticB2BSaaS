import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['apps/**/*.test.ts'], exclude: ['**/*.integration.test.ts'], environment: 'node' },
});
