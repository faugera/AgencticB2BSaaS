import { buildApp } from './app.js';
import { readConfig } from './config.js';
import { readAuthConfig } from './auth/config.js';
import { trustedProxies } from './proxy.js';

async function start() {
  const authConfig = readAuthConfig();
  const config = readConfig();
  const app = buildApp({
    logger: true,
    ...(authConfig ? { authConfig } : {}),
    trustedProxies: trustedProxies(process.env.TRUSTED_PROXIES),
  });
  const shutdown = () => {
    void app.close().catch(() => {
      app.log.error('Shutdown failed');
      process.exitCode = 1;
    });
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, shutdown);
  }
  if (process.connected) process.once('disconnect', shutdown);
  try {
    await app.listen(config);
  } catch {
    await app.close();
    throw new Error('Server startup failed');
  }
}
try {
  await start();
} catch {
  // Invalid URL exceptions can contain credentials; never print raw startup errors.
  console.error(
    'Server startup failed. Check private configuration and runtime privileges.',
  );
  process.exitCode = 1;
}
