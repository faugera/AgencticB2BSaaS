import { spawnSync } from 'node:child_process';

const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error('Run this gate with pnpm test:auth:e2e');

// Each viewport gets a fresh API process and independent in-memory rate limits.
for (const project of ['desktop', 'mobile']) {
  const result = spawnSync(process.execPath, [
    pnpm, 'exec', 'playwright', 'test', 'tests/e2e/auth-live.spec.ts',
    'tests/e2e/business-live.spec.ts', '--project', project, ...process.argv.slice(2),
  ], {
    env: { ...process.env, AUTH_LIVE_TEST: 'true' },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
