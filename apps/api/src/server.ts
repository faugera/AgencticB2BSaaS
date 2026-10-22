import { buildApp } from './app.js';
import { readConfig } from './config.js';
import { readAuthConfig } from './auth/config.js';

const authConfig = readAuthConfig();
const app = buildApp({ logger: true, ...(authConfig ? { authConfig } : {}) });
const config = readConfig();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().catch((error: unknown) => {
      app.log.error(error);
      process.exitCode = 1;
    });
  });
}

try {
  await app.listen(config);
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
  await app.close();
}
