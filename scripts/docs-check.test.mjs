import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkDocuments } from './docs-check.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'agenctic-docs-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const put = async (name, text) => {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), text);
  };
  await put('AGENTS.md', '# Navigation\n[Guide](docs/guide.md)\n');
  await put('docs/guide.md', '# Guide\n[Retour](../AGENTS.md#navigation)\n');
  await put('specs/001-demo/spec.md', '# Feature Specification: Demo\n**Status**: Draft\n## User Scenarios & Testing\n## Requirements\n## Success Criteria\n');
  await put('specs/001-demo/plan.md', '# Plan\n## Summary\n## Constitution Check\n');
  await put('specs/001-demo/tasks.md', '# Tasks\n- [ ] T001 Démontrer le résultat\n');
  return { root, put };
}

test('accepts a valid feature and relative links without network access', async (t) => {
  const { root, put } = await fixture(t);
  await put('docs/remote.md', '[externe](https://invalid.example.test)\n[mail](mailto:a@example.test)\n');
  assert.deepEqual(await checkDocuments(root), []);
});

test('reports broken inline and reference links, including encoded spaces', async (t) => {
  const { root, put } = await fixture(t);
  await put('docs/broken.md', '[a](absent.md)\n[b][ref]\n[ref]: absent%20file.md\n');
  const errors = await checkDocuments(root);
  assert.equal(errors.filter((e) => e.includes('docs/broken.md')).length, 2);
});

test('rejects missing feature artifacts, unknown statuses and absent required headings', async (t) => {
  const { root, put } = await fixture(t);
  await put('specs/001-demo/spec.md', '# Feature\n**Status**: Magic\n');
  await rm(path.join(root, 'specs/001-demo/plan.md'));
  const errors = await checkDocuments(root);
  assert(errors.some((e) => e.includes('statut')));
  assert(errors.some((e) => e.includes('plan.md')));
  assert(errors.some((e) => e.includes('Requirements')));
});

test('checks declared routing paths and rejects paths outside the repository', async (t) => {
  const { root, put } = await fixture(t);
  await put('.specs/standards/index.yml', 'standards:\n  - id: absent\n    path: docs/missing.md\n');
  await put('.specs/standards/doc-sync-map.yml', 'rules:\n  - id: docs\n    targets: [AGENTS.md, docs/missing.md]\n');
  await put('docs/outside.md', '[outside](../../outside.md)\n');
  const errors = await checkDocuments(root);
  assert(errors.some((e) => e.includes('index.yml')));
  assert(errors.some((e) => e.includes('doc-sync-map.yml')));
  assert(errors.some((e) => e.includes('hors dépôt')));
});

test('does not reinterpret historical records or fenced code as current requirements', async (t) => {
  const { root, put } = await fixture(t);
  await put('.specs/changes/old/spec.md', 'status: obsolete\n[old](missing.md)\n');
  await put('docs/sdd/legacy-skills/old/SKILL.md', '[old](missing.md)\n');
  await put('docs/architecture/pilot-verification.md', '[old](missing.md)\n');
  await put('docs/example.md', '```md\n[example](missing.md)\n```\n');
  assert.deepEqual(await checkDocuments(root), []);
});

test('accepts angle-wrapped local paths and flags missing task structure', async (t) => {
  const { root, put } = await fixture(t);
  await put('docs/a b.md', '# Page\n');
  await put('docs/link.md', '[page](<a b.md>)\n');
  await put('specs/001-demo/tasks.md', '# Tasks\nNo tasks\n');
  const errors = await checkDocuments(root);
  assert.equal(errors.length, 1);
  assert(errors[0].includes('T001'));
});

test('reports invalid URI encoding and unresolved reference links', async (t) => {
  const { root, put } = await fixture(t);
  await put('docs/invalid.md', '[bad](%ZZ.md)\n[missing][undefined]\n');
  const errors = await checkDocuments(root);
  assert(errors.some((e) => e.includes('encodée invalide')));
  assert(errors.some((e) => e.includes('référence absente')));
});

test('fails explicitly when routing syntax is unsupported rather than ignoring it', async (t) => {
  const { root, put } = await fixture(t);
  await put('.specs/standards/doc-sync-map.yml', 'rules:\n  - id: docs\n    targets:\n      - docs/missing.md\n');
  assert((await checkDocuments(root)).some((e) => e.includes('format path/targets')));
});

test('verifies managed files and detects content changes and version drift', async (t) => {
  const { root, put } = await fixture(t);
  await put('.specify/integration.json', JSON.stringify({ version: '1.2.3', installed_integrations: ['codex', 'claude'] }));
  const file = '.agents/skills/speckit-demo/SKILL.md';
  await put(file, '# Official\n');
  const hash = createHash('sha256').update('# Official\n').digest('hex');
  for (const integration of ['codex', 'claude', 'speckit']) {
    await put(`.specify/integrations/${integration}.manifest.json`, JSON.stringify({ version: '1.2.3', files: { [file]: hash } }));
  }
  assert.deepEqual(await checkDocuments(root), []);
  await put(file, '# Modified\n');
  await put('.specify/integration.json', JSON.stringify({ version: '1.2.4', installed_integrations: ['codex'] }));
  const errors = await checkDocuments(root);
  assert(errors.some((e) => e.includes('officiel modifié')));
  assert(errors.some((e) => e.includes('version attendue')));
  assert(errors.some((e) => e.includes('intégration absente claude')));
});
