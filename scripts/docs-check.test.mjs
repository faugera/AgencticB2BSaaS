import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, copyFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { changedFilesSince, checkDocumentationSync, checkDocuments } from './docs-check.mjs';

const workflowSteps = [
  ['specify', 'command: speckit.specify'],
  ['review-spec', 'type: gate'],
  ['clarify', 'command: speckit.clarify'],
  ['review-clarifications', 'type: gate'],
  ['plan', 'command: speckit.plan'],
  ['review-plan', 'type: gate'],
  ['tasks', 'command: speckit.tasks'],
  ['review-tasks', 'type: gate'],
  ['analyze', 'command: speckit.analyze'],
  ['approve-implementation', 'type: gate'],
  ['implement', 'command: speckit.implement'],
  ['converge', 'command: speckit.converge'],
  ['verify-change', 'type: gate'],
  ['review-convergence', 'type: gate'],
];

function workflowText(steps = workflowSteps) {
  return `schema_version: "1.0"
workflow:
  id: speckit
  version: "1.1.0"
requires:
  integrations:
    any:
      - codex
      - claude
      - copilot
steps:
${steps.map(([id, action]) => `  - id: ${id}\n    ${action}${id === 'verify-change' ? '\n    message: "Run verify-change and pnpm docs:check against the PR base before final review."' : ''}${id === 'review-convergence' ? '\n    message: "Review verify-change results, remaining tasks and verification limits before closing."' : ''}${action.startsWith('command:') ? '\n    integration: "{{ inputs.integration }}"' : ''}${action === 'type: gate' ? '\n    options: [approve, reject]\n    on_reject: abort' : ''}`).join('\n')}
`;
}

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
  await put('.specify/workflows/speckit/workflow.yml', workflowText());
  await put('.specify/workflows/workflow-registry.json', JSON.stringify({
    workflows: {
      speckit: { name: 'Full Spec Kit Cycle', version: '1.1.0', source: 'bundled' },
    },
  }));
  await put('.agents/skills/tenant-boundary/SKILL.md', '# Tenant boundary\n');
  await put('.agents/skills/verify-change/SKILL.md', '# Verify change\n');
  await put('.claude/skills/tenant-boundary/SKILL.md', '# Tenant boundary\n');
  await put('.claude/skills/verify-change/SKILL.md', '# Verify change\n');
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

test('accepts French plan headings used by project features', async (t) => {
  const { root, put } = await fixture(t);
  await put('specs/001-demo/plan.md', '# Plan\n## Résumé\n## Vérification de la constitution\n');
  assert.deepEqual(await checkDocuments(root), []);
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
  assert((await checkDocuments(root)).some((e) => e.includes('format path/sources/targets')));
});

test('verifies managed files and detects content changes and version drift', async (t) => {
  const { root, put } = await fixture(t);
  await put('.specify/integration.json', JSON.stringify({ version: '1.2.3', default_integration: 'codex', installed_integrations: ['codex', 'claude', 'copilot'] }));
  const file = '.agents/skills/speckit-demo/SKILL.md';
  await put(file, '# Official\n');
  const hash = createHash('sha256').update('# Official\n').digest('hex');
  for (const integration of ['codex', 'claude', 'copilot', 'speckit']) {
    await put(`.specify/integrations/${integration}.manifest.json`, JSON.stringify({ version: '1.2.3', files: { [file]: hash } }));
  }
  assert.deepEqual(await checkDocuments(root), []);
  await put(file, '# Modified\n');
  await put('.specify/integration.json', JSON.stringify({ version: '1.2.4', default_integration: 'codex', installed_integrations: ['codex'] }));
  const errors = await checkDocuments(root);
  assert(errors.some((e) => e.includes('officiel modifié')));
  assert(errors.some((e) => e.includes('version attendue')));
  assert(errors.some((e) => e.includes('intégration absente claude')));
  assert(errors.some((e) => e.includes('intégration absente copilot')));
});

test('accepts the complete Spec Kit workflow and matching project skills', async (t) => {
  const { root } = await fixture(t);
  assert.deepEqual(await checkDocuments(root), []);
});

test('rejects missing and out-of-order Spec Kit stages', async (t) => {
  const { root, put } = await fixture(t);
  const withoutAnalyze = workflowSteps.filter(([id]) => id !== 'analyze');
  await put('.specify/workflows/speckit/workflow.yml', workflowText(withoutAnalyze));
  assert((await checkDocuments(root)).some((error) => error.includes('analyze')));

  const reordered = [...workflowSteps];
  const analyzeIndex = reordered.findIndex(([id]) => id === 'analyze');
  const implementIndex = reordered.findIndex(([id]) => id === 'implement');
  [reordered[analyzeIndex], reordered[implementIndex]] = [reordered[implementIndex], reordered[analyzeIndex]];
  await put('.specify/workflows/speckit/workflow.yml', workflowText(reordered));
  assert((await checkDocuments(root)).some((error) => error.includes('ordre')));
});

test('requires aborting gates before implementation and convergence', async (t) => {
  const { root, put } = await fixture(t);
  const missingReject = workflowText().replaceAll('    on_reject: abort\n', '');
  await put('.specify/workflows/speckit/workflow.yml', missingReject);
  const errors = await checkDocuments(root);
  assert(errors.some((error) => error.includes('approve-implementation') && error.includes('abort')));
});

test('routes Spec Kit steps through the selected integration', async (t) => {
  const { root, put } = await fixture(t);
  await put('.specify/workflows/speckit/workflow.yml',
    workflowText().replace('    integration: "{{ inputs.integration }}"', '    integration: copilot'));
  assert((await checkDocuments(root)).some((error) =>
    error.includes('étape specify') && error.includes("intégration sélectionnée")));
});

test('rejects automatic merge or deployment steps', async (t) => {
  const { root, put } = await fixture(t);
  await put('.specify/workflows/speckit/workflow.yml', `${workflowText()}\n  - id: publish\n    command: github.merge\n`);
  const errors = await checkDocuments(root);
  assert(errors.some((error) => error.includes('merge') || error.includes('déploiement')));
});

test('requires both supported integrations and the configured workflow file', async (t) => {
  const { root, put } = await fixture(t);
  const missingCopilot = workflowText().replace('      - copilot\n', '');
  await put('.specify/workflows/speckit/workflow.yml', missingCopilot);
  assert((await checkDocuments(root)).some((error) => error.includes('copilot')));

  await rm(path.join(root, '.specify/workflows/speckit/workflow.yml'));
  assert((await checkDocuments(root)).some((error) => error.includes('workflow.yml')));
});

test('requires a Copilot manifest alongside the installed integration', async (t) => {
  const { root, put } = await fixture(t);
  await put('.specify/integration.json', JSON.stringify({
    version: '1.2.3',
    default_integration: 'codex',
    installed_integrations: ['codex', 'claude', 'copilot'],
  }));
  for (const integration of ['codex', 'claude', 'copilot', 'speckit']) {
    await put(`.specify/integrations/${integration}.manifest.json`, JSON.stringify({
      version: '1.2.3',
      files: {},
    }));
  }
  const manifest = path.join(root, '.specify/integrations/copilot.manifest.json');
  await rm(manifest);
  assert((await checkDocuments(root)).some((error) => error.includes('copilot.manifest.json') && error.includes('absent')));
});

test('requires Codex to remain the default integration', async (t) => {
  const { root, put } = await fixture(t);
  await put('.specify/integration.json', JSON.stringify({
    version: '1.2.3',
    default_integration: 'copilot',
    installed_integrations: ['codex', 'claude', 'copilot'],
  }));
  for (const integration of ['codex', 'claude', 'copilot', 'speckit']) {
    await put(`.specify/integrations/${integration}.manifest.json`, JSON.stringify({
      version: '1.2.3',
      files: {},
    }));
  }
  assert((await checkDocuments(root)).some((error) => error.includes('défaut Codex')));
});

test('requires the workflow registry version to match its definition', async (t) => {
  const { root, put } = await fixture(t);
  await put('.specify/workflows/workflow-registry.json', JSON.stringify({
    workflows: { speckit: { version: '1.0.1' } },
  }));
  assert((await checkDocuments(root)).some((error) => error.includes('workflow-registry.json') && error.includes('version')));
});

async function documentationSyncFixture(t, decision) {
  const { root, put } = await fixture(t);
  await put('.specs/standards/doc-sync-map.yml', `rules:
  - id: api
    sources: [apps/api/src/routes/**]
    targets: [docs/architecture.md]
    policy: required
    reason: Décrire les contrats HTTP.
`);
  await put('specs/001-demo/spec.md', '# Demo\n');
  await put('docs/architecture.md', '# Architecture\n');
  await put('specs/001-demo/documentation-impact.md', decision);
  return { root, put };
}

const updatedDecision = `| Règle | Cible | Statut | Motif |
|---|---|---|---|
| api | docs/architecture.md | UPDATED | Contrat HTTP synchronisé. |
`;

test('accepts a routed required target updated in the diff', async (t) => {
  const { root } = await documentationSyncFixture(t, updatedDecision);
  const errors = await checkDocumentationSync(root, [
    'apps/api/src/routes/users.mjs',
    'docs/architecture.md',
    'specs/001-demo/spec.md',
    'specs/001-demo/documentation-impact.md',
  ]);
  assert.deepEqual(errors, []);
});

test('accepts motivated no-change decisions for required targets', async (t) => {
  const decision = `| Règle | Cible | Statut | Motif |
|---|---|---|---|
| api | docs/architecture.md | REVIEWED_NO_CHANGE | Le flux documenté reste identique. |
`;
  const { root } = await documentationSyncFixture(t, decision);
  const changed = [
    'apps/api/src/routes/users.mjs',
    'specs/001-demo/spec.md',
    'specs/001-demo/documentation-impact.md',
  ];
  assert.deepEqual(await checkDocumentationSync(root, changed), []);

  await writeFile(path.join(root, 'specs/001-demo/documentation-impact.md'),
    decision.replace('REVIEWED_NO_CHANGE', 'NOT_APPLICABLE'));
  assert.deepEqual(await checkDocumentationSync(root, changed), []);
});

test('rejects missing documentation decisions, invalid statuses and empty reasons', async (t) => {
  const { root, put } = await documentationSyncFixture(t, '| Règle | Cible | Statut | Motif |\n|---|---|---|---|\n');
  const changed = [
    'apps/api/src/routes/users.mjs',
    'specs/001-demo/spec.md',
    'specs/001-demo/documentation-impact.md',
  ];
  assert((await checkDocumentationSync(root, changed)).some((error) => error.includes('décision absente')));

  await put('specs/001-demo/documentation-impact.md',
    updatedDecision.replace('UPDATED', 'DONE'));
  assert((await checkDocumentationSync(root, [
    ...changed, 'docs/architecture.md',
  ])).some((error) => error.includes('statut inconnu')));

  await put('specs/001-demo/documentation-impact.md',
    updatedDecision.replace('Contrat HTTP synchronisé.', '  '));
  assert((await checkDocumentationSync(root, [
    ...changed, 'docs/architecture.md',
  ])).some((error) => error.includes('motif vide')));
});

test('rejects decisions contradicting whether a target appears in the diff', async (t) => {
  const { root, put } = await documentationSyncFixture(t, updatedDecision);
  const sourceAndSpec = [
    'apps/api/src/routes/users.mjs',
    'specs/001-demo/spec.md',
    'specs/001-demo/documentation-impact.md',
  ];
  assert((await checkDocumentationSync(root, sourceAndSpec)).some((error) =>
    error.includes('UPDATED') && error.includes('absente du diff')));

  const noChange = `| Règle | Cible | Statut | Motif |
|---|---|---|---|
| api | docs/architecture.md | NOT_APPLICABLE | Aucun contrat n'a changé. |
`;
  await put('specs/001-demo/documentation-impact.md', noChange);
  assert((await checkDocumentationSync(root, [
    ...sourceAndSpec, 'docs/architecture.md',
  ])).some((error) => error.includes('doit être UPDATED')));
});

test('rejects missing feature specs and duplicated decisions for affected routes', async (t) => {
  const { root, put } = await documentationSyncFixture(t, updatedDecision);
  const duplicate = `${updatedDecision}| api | docs/architecture.md | UPDATED | Copie. |\n`;
  await put('specs/001-demo/documentation-impact.md', duplicate);
  assert((await checkDocumentationSync(root, [
    'apps/api/src/routes/users.mjs',
    'docs/architecture.md',
    'specs/001-demo/spec.md',
    'specs/001-demo/documentation-impact.md',
  ])).some((error) => error.includes('décision dupliquée')));
  assert((await checkDocumentationSync(root, [
    'apps/api/src/routes/users.mjs', 'docs/architecture.md',
  ])).some((error) => error.includes('spec.md actif')));
});

test('requires verify-change in the final Spec Kit review gate', async (t) => {
  const { root, put } = await fixture(t);
  await put('.specify/workflows/speckit/workflow.yml',
    workflowText().replace('Run verify-change and pnpm docs:check against the PR base before final review.', 'Review remaining tasks.'));
  assert((await checkDocuments(root)).some((error) => error.includes('verify-change') && error.includes('compétence projet')));
});

test('does not require documentation decisions when no required source is affected', async (t) => {
  const { root } = await documentationSyncFixture(t, '');
  assert.deepEqual(await checkDocumentationSync(root, [
    'apps/web/src/styles.css',
    'specs/001-demo/spec.md',
  ]), []);
});

test('rejects invalid routing policy and unsafe source patterns', async (t) => {
  const { root, put } = await documentationSyncFixture(t, updatedDecision);
  const route = `rules:
  - id: api
    sources: [C:/outside/**]
    targets: [docs/architecture.md]
    policy: require
`;
  await put('.specs/standards/doc-sync-map.yml', route);
  const errors = await checkDocumentationSync(root, ['apps/api/src/routes/users.mjs']);
  assert(errors.some((error) => error.includes('politique absente ou inconnue')));
  assert(errors.some((error) => error.includes('motif source invalide')));
});

test('includes tracked and untracked workspace changes and rejects invalid Git bases', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'agenctic-git-diff-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'test@example.test'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Docs Test'], { cwd: root });
  await writeFile(path.join(root, 'tracked.md'), 'before\n');
  execFileSync('git', ['add', 'tracked.md'], { cwd: root });
  execFileSync('git', ['commit', '-q', '-m', 'base'], { cwd: root });
  await writeFile(path.join(root, 'tracked.md'), 'after\n');
  await writeFile(path.join(root, 'new.md'), 'new\n');

  const base = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  assert.deepEqual(changedFilesSince(root, base).sort(), ['new.md', 'tracked.md']);
  assert.throws(() => changedFilesSince(root, 'not-a-safe-ref'), /DOCS_SYNC_BASE invalide/);
});

test('detects missing or divergent project skills across integrations', async (t) => {
  const { root, put } = await fixture(t);
  const source = '.agents/skills/tenant-boundary/SKILL.md';
  const mirror = '.claude/skills/tenant-boundary/SKILL.md';
  await rm(path.join(root, mirror));
  let errors = await checkDocuments(root);
  assert(errors.some((error) => error.includes(mirror) && error.includes('absent')));

  await put(mirror, '# Tenant boundary\n');
  await rm(path.join(root, source));
  errors = await checkDocuments(root);
  assert(errors.some((error) => error.includes(source) && error.includes('absent')));

  await put(source, '# Tenant boundary\n');
  await put('.claude/skills/verify-change/SKILL.md', '# Different\n');
  errors = await checkDocuments(root);
  assert(errors.some((error) => error.includes('verify-change') && error.includes('différent')));
});

test('resolves an explicit feature in read-only mode without persisting its pointer', async (t) => {
  const { root } = await fixture(t);
  const scriptDir = path.join(root, '.specify/scripts/bash');
  await mkdir(scriptDir, { recursive: true });
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  for (const name of ['common.sh', 'check-prerequisites.sh']) {
    await copyFile(path.join(repositoryRoot, '.specify/scripts/bash', name), path.join(scriptDir, name));
  }
  const result = execFileSync('bash', [
    path.join(scriptDir, 'check-prerequisites.sh'), '--json', '--paths-only',
  ], {
    cwd: root,
    env: {
      ...process.env,
      SPECIFY_FEATURE_DIRECTORY: 'specs/001-demo',
      SPECIFY_FEATURE_NO_PERSIST: 'true',
    },
    encoding: 'utf8',
  });
  const paths = JSON.parse(result);
  assert(paths.FEATURE_SPEC.endsWith('/specs/001-demo/spec.md'));
  assert(paths.IMPL_PLAN.endsWith('/specs/001-demo/plan.md'));
  assert(paths.TASKS.endsWith('/specs/001-demo/tasks.md'));
  await assert.rejects(access(path.join(root, '.specify/feature.json')));
});
