import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkArchitecture, sourceHashes } from './architecture-sync.mjs';

test('detects changed, added and removed sources, and accepts reviewed sources', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'architecture-sync-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const put = async (name, value) => { await mkdir(path.dirname(path.join(root, name)), { recursive: true }); await writeFile(path.join(root, name), value); };
  await put('docs/architecture.md', 'Architecture\n');
  await put('docs/data-model.md', 'Modèle\n');
  await put('apps/api/migrations/0001.sql', 'SELECT 1;\n');
  await put('docs/architecture-sources.json', JSON.stringify(await sourceHashes(root)));
  assert.deepEqual(await checkArchitecture(root), []);
  await put('docs/architecture.md', 'Architecture\r\n');
  assert.deepEqual(await checkArchitecture(root), []);
  await put('docs/data-model.md', 'Modèle modifié\n');
  await put('apps/api/migrations/0002.sql', 'SELECT 2;\n');
  await rm(path.join(root, 'apps/api/migrations/0001.sql'));
  assert.deepEqual((await checkArchitecture(root)).sort(), ['apps/api/migrations/0001.sql', 'apps/api/migrations/0002.sql', 'docs/data-model.md']);
  await put('docs/architecture-sources.json', JSON.stringify(await sourceHashes(root)));
  assert.deepEqual(await checkArchitecture(root), []);
});
