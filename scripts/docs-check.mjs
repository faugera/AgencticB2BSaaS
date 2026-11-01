import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const historical = /^(?:docs\/sdd\/legacy-skills\/|docs\/architecture\/[^/]*verification\.md$|docs\/design\/css-normalization\.md$)/;
const statuses = new Set(['Draft', 'In Progress', 'Complete']);
const requiredWorkflowSteps = [
  ['specify', 'speckit.specify'],
  ['review-spec', null],
  ['clarify', 'speckit.clarify'],
  ['review-clarifications', null],
  ['plan', 'speckit.plan'],
  ['review-plan', null],
  ['tasks', 'speckit.tasks'],
  ['review-tasks', null],
  ['analyze', 'speckit.analyze'],
  ['approve-implementation', null],
  ['implement', 'speckit.implement'],
  ['converge', 'speckit.converge'],
  ['review-convergence', null],
];
const projectSkills = ['tenant-boundary', 'verify-change'];

async function exists(file) {
  try { await stat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function markdownFiles(root, directory) {
  if (!await exists(path.join(root, directory))) return [];
  const files = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const name = path.posix.join(directory, entry.name);
    if (historical.test(name)) continue;
    if (entry.isDirectory()) files.push(...await markdownFiles(root, name));
    else if (entry.isFile() && name.endsWith('.md')) files.push(name);
  }
  return files;
}

function workflowStepBlocks(text) {
  const section = text.match(/^steps:\s*\r?\n([\s\S]*)$/m)?.[1];
  if (!section) return null;
  const steps = [];
  for (const line of section.split(/\r?\n/)) {
    const start = line.match(/^ {2}- id:\s*([a-z0-9-]+)\s*$/);
    if (start) steps.push({ id: start[1], lines: [] });
    else if (steps.length) steps.at(-1).lines.push(line);
  }
  return steps;
}

function stepField(step, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return step.lines.join('\n').match(new RegExp(`^    ${escaped}:\\s*(.*?)\\s*$`, 'm'))?.[1];
}

async function checkWorkflow(root, errors) {
  const file = '.specify/workflows/speckit/workflow.yml';
  const text = await readFile(path.join(root, file), 'utf8');
  const steps = workflowStepBlocks(text);
  if (!steps) {
    errors.push(`${file}: section steps absente ou invalide`);
    return;
  }

  const lines = text.split(/\r?\n/);
  const anyIndex = lines.findIndex((line) => /^ {4}any:\s*$/.test(line));
  const integrations = new Set();
  if (anyIndex >= 0) {
    for (const line of lines.slice(anyIndex + 1)) {
      const match = line.match(/^ {6}-\s*["']?([a-z0-9-]+)["']?\s*$/);
      if (!match) break;
      integrations.add(match[1]);
    }
  }
  for (const integration of ['codex', 'claude', 'copilot']) {
    if (!integrations.has(integration)) errors.push(`${file}: intégration requise absente : ${integration}`);
  }

  const actualIds = steps.map((step) => step.id);
  const expectedIds = requiredWorkflowSteps.map(([id]) => id);
  for (const [id] of requiredWorkflowSteps) {
    if (!actualIds.includes(id)) errors.push(`${file}: étape obligatoire absente : ${id}`);
  }
  for (const id of actualIds) {
    if (!expectedIds.includes(id)) errors.push(`${file}: étape non prévue : ${id}`);
  }
  if (actualIds.length === expectedIds.length && actualIds.some((id, index) => id !== expectedIds[index])) {
    errors.push(`${file}: ordre des étapes Spec Kit invalide`);
  }

  for (const step of steps) {
    const command = stepField(step, 'command');
    if (command && /\b(?:merge|deploy|deployment)\b/i.test(command)) {
      errors.push(`${file}: commande de merge/déploiement interdite : ${command}`);
    }
    const selectedIntegration = stepField(step, 'integration')?.replace(/^["']|["']$/g, '');
    if (command?.startsWith('speckit.') && selectedIntegration !== '{{ inputs.integration }}') {
      errors.push(`${file}: l'étape ${step.id} ne transmet pas l'intégration sélectionnée`);
    }
  }

  for (const [id, command] of requiredWorkflowSteps) {
    const step = steps.find((candidate) => candidate.id === id);
    if (!step) continue;
    if (command) {
      if (stepField(step, 'command') !== command) errors.push(`${file}: commande attendue ${command} dans l'étape ${id}`);
    } else {
      if (stepField(step, 'type') !== 'gate') errors.push(`${file}: l'étape ${id} doit être une porte de revue`);
      const options = stepField(step, 'options')?.match(/\[([^\]]*)\]/)?.[1]
        .split(',').map((option) => option.trim().replace(/^["']|["']$/g, '')) ?? [];
      if (!options.includes('approve') || !options.includes('reject')) {
        errors.push(`${file}: la porte ${id} doit proposer approve et reject`);
      }
      if (stepField(step, 'on_reject') !== 'abort') errors.push(`${file}: la porte ${id} doit interrompre le cycle avec on_reject: abort`);
    }
  }

  const workflowVersion = text.match(/^ {2}version:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1];
  if (!workflowVersion) errors.push(`${file}: version du workflow absente`);
  const registryFile = '.specify/workflows/workflow-registry.json';
  let registry;
  try { registry = JSON.parse(await readFile(path.join(root, registryFile), 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') errors.push(`${registryFile}: registre de workflow absent`);
    else if (error instanceof SyntaxError) errors.push(`${registryFile}: JSON invalide : ${error.message}`);
    else throw error;
  }
  if (registry && registry.workflows?.speckit?.version !== workflowVersion) {
    errors.push(`${registryFile}: version Spec Kit différente de workflow.yml`);
  }
}

async function checkProjectSkills(root, errors) {
  for (const skill of projectSkills) {
    const source = `.agents/skills/${skill}/SKILL.md`;
    const mirror = `.claude/skills/${skill}/SKILL.md`;
    let sourceBytes;
    let mirrorBytes;
    try { sourceBytes = await readFile(path.join(root, source)); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      errors.push(`${source}: skill projet absent`);
    }
    try { mirrorBytes = await readFile(path.join(root, mirror)); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      errors.push(`${mirror}: skill projet absent`);
    }
    if (sourceBytes && mirrorBytes && !sourceBytes.equals(mirrorBytes)) {
      errors.push(`${skill}: contenu différent entre .agents/skills et .claude/skills`);
    }
  }
}

export async function checkDocuments(root) {
  root = path.resolve(root);
  const errors = [];
  const checkPath = async (source, target, fromRoot = false) => {
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(target)) return;
    const local = decodeURIComponent(target.split(/[?#]/)[0]);
    if (!local) return;
    const resolved = path.resolve(fromRoot ? root : path.dirname(path.join(root, source)), local);
    const relative = path.relative(root, resolved);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
      errors.push(`${source}: chemin hors dépôt : ${target}`);
    } else if (!await exists(resolved)) errors.push(`${source}: chemin absent : ${target}`);
  };

  const files = ['AGENTS.md', 'CLAUDE.md', 'README.md', 'DESIGN.md', 'DESIGN_UI.md',
    '.specify/memory/constitution.md', '.agents/skills/tenant-boundary/SKILL.md',
    '.agents/skills/verify-change/SKILL.md', '.claude/skills/tenant-boundary/SKILL.md',
    '.claude/skills/verify-change/SKILL.md'];
  for (const directory of ['docs', 'specs', '.specs/standards', '.specs/domains']) {
    files.push(...await markdownFiles(root, directory));
  }
  for (const file of files) {
    if (!await exists(path.join(root, file))) continue;
    // shortcut: CommonMark inline/reference destinations only, adopt a parser if docs need nested links.
    const text = (await readFile(path.join(root, file), 'utf8'))
      .replace(/^(?:```|~~~)[\s\S]*?^(?:```|~~~).*$/gm, '');
    const label = (value) => value.trim().replace(/\s+/g, ' ').toLowerCase();
    const definitions = new Set([...text.matchAll(/^\s*\[([^\]\n]+)\]:/gm)].map((m) => label(m[1])));
    for (const match of text.matchAll(/\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) {
      const reference = match[2] || match[1];
      if (!definitions.has(label(reference))) errors.push(`${file}: référence absente : ${reference}`);
    }
    const links = /!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\s*\)|^\s*\[[^\]\n]+\]:\s*(?:<([^>]+)>|(\S+))/gm;
    for (const match of text.matchAll(links)) {
      try { await checkPath(file, match[1] ?? match[2] ?? match[3] ?? match[4]); }
      catch (error) {
        if (!(error instanceof URIError)) throw error;
        errors.push(`${file}: destination encodée invalide`);
      }
    }
  }

  for (const file of ['.specs/standards/index.yml', '.specs/standards/doc-sync-map.yml']) {
    if (!await exists(path.join(root, file))) continue;
    const text = await readFile(path.join(root, file), 'utf8');
    for (const line of text.split(/\r?\n/).filter((line) => /^\s*(path|targets):/.test(line))) {
      if (!/^\s*(?:path:\s*\S+|targets:\s*\[[^\]]*\])\s*$/.test(line)) {
        errors.push(`${file}: format path/targets non pris en charge : ${line.trim()}`);
      }
    }
    for (const match of text.matchAll(/^\s*(?:path:\s*(\S+)|targets:\s*\[([^\]]*)\])\s*$/gm)) {
      for (const target of (match[1] ? [match[1]] : match[2].split(',')).filter((s) => s.trim())) {
        await checkPath(file, target.trim().replace(/^['"]|['"]$/g, ''), true);
      }
    }
  }

  if (await exists(path.join(root, 'specs'))) {
    for (const entry of await readdir(path.join(root, 'specs'), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const directory = `specs/${entry.name}`;
      for (const [name, headings] of [
        ['spec.md', [['User Scenarios & Testing'], ['Requirements'], ['Success Criteria']]],
        ['plan.md', [['Summary', 'Résumé'], ['Constitution Check', 'Vérification de la constitution']]], ['tasks.md', []],
      ]) {
        const file = `${directory}/${name}`;
        if (!await exists(path.join(root, file))) { errors.push(`${file}: fichier obligatoire absent`); continue; }
        const text = await readFile(path.join(root, file), 'utf8');
        for (const alternatives of headings) {
          if (!text.split('\n').some((line) => alternatives.some((heading) => line.startsWith(`## ${heading}`)))) {
            errors.push(`${file}: section obligatoire ${alternatives[0]}`);
          }
        }
        if (name === 'spec.md' && !statuses.has(text.match(/^\*\*Status\*\*:\s*(.*?)\s*$/m)?.[1])) {
          errors.push(`${file}: statut absent ou inconnu (Draft, In Progress, Complete)`);
        }
        if (name === 'tasks.md' && !/^- \[[ xX]\] T\d{3}\b/m.test(text)) {
          errors.push(`${file}: tâche structurée requise, exemple T001`);
        }
      }
    }
  }

  const workflowFile = path.join(root, '.specify/workflows/speckit/workflow.yml');
  if (await exists(workflowFile)) await checkWorkflow(root, errors);
  else errors.push('.specify/workflows/speckit/workflow.yml: fichier de workflow absent');
  await checkProjectSkills(root, errors);

  const stateFile = path.join(root, '.specify/integration.json');
  if (await exists(stateFile)) {
    const state = JSON.parse(await readFile(stateFile, 'utf8'));
    if (state.version !== '1.2.3') errors.push('.specify/integration.json: version attendue 1.2.3');
    if (state.default_integration !== 'codex') {
      errors.push('.specify/integration.json: intégration par défaut Codex attendue');
    }
    for (const integration of ['codex', 'claude', 'copilot', 'speckit']) {
      if (integration !== 'speckit' && !state.installed_integrations.includes(integration)) {
        errors.push(`.specify/integration.json: intégration absente ${integration}`);
      }
      const manifest = `.specify/integrations/${integration}.manifest.json`;
      if (!await exists(path.join(root, manifest))) { errors.push(`${manifest}: absent`); continue; }
      const managed = JSON.parse(await readFile(path.join(root, manifest), 'utf8'));
      if (managed.version !== '1.2.3') errors.push(`${manifest}: version attendue 1.2.3`);
      for (const [file, hash] of Object.entries(managed.files)) {
        await checkPath(manifest, file, true);
        if (!file.startsWith('.') || file.includes('..') || !await exists(path.join(root, file))) continue;
        const actual = createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
        if (actual !== hash) errors.push(`${file}: fichier officiel modifié (${integration})`);
      }
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = await checkDocuments(path.resolve(fileURLToPath(new URL('..', import.meta.url))));
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Documentation : liens, chemins, structures, statuts et manifestes valides.');
}
