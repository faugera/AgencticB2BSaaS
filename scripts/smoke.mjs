import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

// Exercise the built server over real HTTP; no manually started API is needed.
const port = process.env.SMOKE_PORT ?? '3099';
const child = spawn(process.execPath, [fileURLToPath(new URL('../apps/api/dist/server.js', import.meta.url))], {
  env: { ...process.env, PORT: port, HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', (chunk) => { logs += chunk.toString(); });
child.stderr.on('data', (chunk) => { logs += chunk.toString(); });
const exited = new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code) => resolve(code));
});

try {
  let healthy = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) throw new Error('API exited before becoming healthy');
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1000) });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: 'ok' });
      healthy = true;
      break;
    } catch { await setTimeout(100); }
  }
  assert.ok(healthy, 'API did not become healthy');
  child.kill('SIGTERM');
  const code = await Promise.race([exited, setTimeout(5000, 'timeout', { ref: false })]);
  assert.equal(code, 0, 'API must shut down gracefully');
  console.log('PASS: built API /health and graceful shutdown');
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  if (child.exitCode === null) child.kill('SIGKILL');
}
