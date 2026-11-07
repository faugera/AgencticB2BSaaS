import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
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
  ['verify-change', null],
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

function inlineList(value) {
  const match = value.match(/^\[([^\]]*)\]$/);
  if (!match) return null;
  return match[1].split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

function parseDocSyncRules(text) {
  const rules = [];
  let current;
  let currentFields;
  const lines = text.split(/\r?\n/);
  const header = lines.findIndex((line) => line.trim() && !line.trimStart().startsWith('#'));
  if (header < 0 || lines[header].trim() !== 'rules:') {
    throw new Error('section racine `rules:` absente ou invalide');
  }
  for (const [index, line] of lines.entries()) {
    if (index <= header || !line.trim() || line.trimStart().startsWith('#')) continue;
    const start = line.match(/^ {2}- id:\s*([a-z0-9-]+)\s*$/);
    if (start) {
      current = { id: start[1], policy: undefined, sources: undefined, targets: undefined };
      currentFields = new Set();
      rules.push(current);
      continue;
    }
    if (/^ {2}-/.test(line)) {
      throw new Error(`syntaxe de règle invalide ligne ${index + 1}`);
    }
    const field = line.match(/^ {4}([a-z][a-z0-9_-]*):\s*(.*?)\s*$/);
    if (!current || !field || !['change_type', 'policy', 'reason', 'sources', 'targets'].includes(field[1])) {
      throw new Error(`structure non prise en charge ligne ${index + 1}`);
    }
    const [, name, value] = field;
    if (currentFields.has(name)) throw new Error(`champ dupliqué ligne ${index + 1} : ${name}`);
    currentFields.add(name);
    if (name === 'sources' || name === 'targets') {
      current[name] = inlineList(value);
      if (current[name] === null) throw new Error(`liste ${name} invalide ligne ${index + 1}`);
    } else {
      if (!value) throw new Error(`champ vide ligne ${index + 1} : ${name}`);
      if (name === 'policy') current.policy = value;
    }
  }
  if (!rules.length) throw new Error('aucune règle reconnue');
  for (const rule of rules) {
    if (!rule.policy) throw new Error(`politique absente pour ${rule.id}`);
  }
  return rules;
}

function validRepoPattern(value) {
  return typeof value === 'string'
    && value.length > 0
    && !value.startsWith('/')
    && !/^[a-z]:/i.test(value)
    && !value.includes('\\')
    && !value.includes('?')
    && !value.split('/').includes('..')
    && !value.includes('[')
    && !value.includes(']');
}

function globRegex(pattern) {
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '*' && pattern[index + 1] === '*') {
      if (pattern[index + 2] === '/') {
        source += '(?:[^/]+/)*';
        index += 2;
      } else {
        source += '.*';
        index += 1;
      }
    } else if (char === '*') source += '[^/]*';
    else source += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  }
  return new RegExp(`${source}$`);
}

function parseDocumentationDecisions(text, errors, file) {
  const decisions = [];
  let hasHeader = false;
  for (const line of text.split(/\r?\n/)) {
    const cells = line.match(/^\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*$/);
    if (!cells) continue;
    const values = cells.slice(1).map((value) => value.trim());
    if (values[0].toLowerCase() === 'règle' && values[1].toLowerCase() === 'cible') {
      hasHeader = true;
      continue;
    }
    if (values.every((value) => /^:?-{3,}:?$/.test(value))) continue;
    decisions.push({ rule: values[0], target: values[1], status: values[2], reason: values[3] });
  }
  if (!hasHeader) errors.push(`${file}: table attendue (Règle | Cible | Statut | Motif) absente`);
  return decisions;
}

export async function checkDocumentationSync(root, changedFiles, baselineRoutingText = '') {
  root = path.resolve(root);
  const errors = [];
  const routingFile = '.specs/standards/doc-sync-map.yml';
  let rules;
  try {
    rules = parseDocSyncRules(await readFile(path.join(root, routingFile), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [`${routingFile}: fichier de routage absent`];
    return [`${routingFile}: routage invalide : ${error.message}`];
  }
  let baselineRules;
  try {
    baselineRules = baselineRoutingText ? parseDocSyncRules(baselineRoutingText) : [];
  } catch (error) {
    return [`${routingFile}: routage de base invalide : ${error.message}`];
  }

  const normalizedFiles = new Set(changedFiles.map((file) => file.replace(/\\/g, '/')));
  const requiredRulesById = new Map();
  const knownTargets = new Map();
  for (const rule of [...baselineRules, ...rules]) {
    if (!knownTargets.has(rule.id)) knownTargets.set(rule.id, new Set());
    for (const target of rule.targets ?? []) knownTargets.get(rule.id).add(target);
    if (rule.policy !== 'required') continue;
    if (!requiredRulesById.has(rule.id)) {
      requiredRulesById.set(rule.id, { id: rule.id, sources: new Set(), targets: new Set() });
    }
    const required = requiredRulesById.get(rule.id);
    for (const source of rule.sources ?? []) required.sources.add(source);
    for (const target of rule.targets ?? []) required.targets.add(target);
  }
  const requiredRules = [...requiredRulesById.values()].map((rule) => ({
    ...rule,
    sources: [...rule.sources],
    targets: [...rule.targets],
  }));
  for (const [index, ruleSet] of [baselineRules, rules].entries()) {
    const ruleIds = new Set();
    for (const rule of ruleSet) {
      if (ruleIds.has(rule.id)) errors.push(`${routingFile}: identifiant de règle dupliqué : ${rule.id}`);
      ruleIds.add(rule.id);
      if (!['required', 'review', 'none'].includes(rule.policy)) {
        errors.push(`${routingFile}: politique absente ou inconnue pour ${rule.id} : ${rule.policy ?? 'absente'}`);
      }
      for (const pattern of rule.sources ?? []) {
        if (!validRepoPattern(pattern)) errors.push(`${routingFile}: motif source invalide : ${pattern}`);
      }
      if (index === 1 && rule.policy === 'required') {
        if (!rule.sources?.length) errors.push(`${routingFile}: règle required sans sources : ${rule.id}`);
        if (!rule.targets?.length) errors.push(`${routingFile}: règle required sans targets : ${rule.id}`);
        if (new Set(rule.targets ?? []).size !== (rule.targets ?? []).length) {
          errors.push(`${routingFile}: cible dupliquée dans la règle ${rule.id}`);
        }
      }
    }
  }
  if (errors.length) return errors;

  const affectedRules = requiredRules.filter((rule) => {
    const patterns = rule.sources.map(globRegex);
    return [...normalizedFiles].some((file) => patterns.some((pattern) => pattern.test(file)));
  });
  if (!affectedRules.length) return [];

  const featureSpecs = [...normalizedFiles].filter((file) => /^specs\/[^/]+\/spec\.md$/.test(file));
  if (featureSpecs.length !== 1) {
    return [`${routingFile}: une spec active unique doit apparaître dans le diff (spec.md actif introuvable ou ambigu)`];
  }
  const featureDirectory = path.posix.dirname(featureSpecs[0]);
  const impactFile = `${featureDirectory}/documentation-impact.md`;
  if (!normalizedFiles.has(impactFile)) {
    errors.push(`${impactFile}: doit être ajouté ou modifié dans le diff`);
  }
  let decisions = [];
  try {
    decisions = parseDocumentationDecisions(await readFile(path.join(root, impactFile), 'utf8'), errors, impactFile);
  } catch (error) {
    if (error.code === 'ENOENT') errors.push(`${impactFile}: fichier de décisions absent`);
    else throw error;
  }

  const decisionMap = new Map();
  for (const decision of decisions) {
    const key = `${decision.rule}\0${decision.target}`;
    if (decisionMap.has(key)) errors.push(`${impactFile}: décision dupliquée pour ${decision.rule} → ${decision.target}`);
    decisionMap.set(key, decision);
    const targets = knownTargets.get(decision.rule);
    if (!targets) errors.push(`${impactFile}: règle inconnue : ${decision.rule}`);
    else if (!targets.has(decision.target)) {
      errors.push(`${impactFile}: cible inconnue pour ${decision.rule} : ${decision.target}`);
    }
  }

  for (const rule of affectedRules) {
    for (const target of rule.targets) {
      if (!await exists(path.join(root, target))) {
        errors.push(`${impactFile}: cible documentaire absente du dépôt : ${target}`);
        continue;
      }
      const decision = decisionMap.get(`${rule.id}\0${target}`);
      if (!decision) {
        errors.push(`${impactFile}: décision absente pour ${rule.id} → ${target}`);
        continue;
      }
      if (!['UPDATED', 'REVIEWED_NO_CHANGE', 'NOT_APPLICABLE'].includes(decision.status)) {
        errors.push(`${impactFile}: statut inconnu pour ${rule.id} → ${target} : ${decision.status}`);
        continue;
      }
      if (!decision.reason || !decision.reason.trim()) {
        errors.push(`${impactFile}: motif vide pour ${rule.id} → ${target}`);
      }
      const targetChanged = normalizedFiles.has(target);
      if (decision.status === 'UPDATED' && !targetChanged) {
        errors.push(`${impactFile}: UPDATED mais cible absente du diff : ${target}`);
      } else if (decision.status !== 'UPDATED' && targetChanged) {
        errors.push(`${impactFile}: ${decision.status} invalide, la cible modifiée doit être UPDATED : ${target}`);
      }
    }
  }
  return errors;
}

function comparisonBase(root, base) {
  if (!base) throw new Error('DOCS_SYNC_BASE absent : fournir une référence Git de base (par ex. origin/main).');
  if (!/^(?:[0-9a-f]{7,40}|origin\/[A-Za-z0-9._/-]+)$/.test(base) || base.includes('..')) {
    throw new Error(`DOCS_SYNC_BASE invalide : ${base}. Utiliser un SHA ou une référence origin/<branche>.`);
  }
  try {
    if (/^0{40}$/.test(base)) {
      return execFileSync('git', ['hash-object', '-t', 'tree', '-w', '--stdin'], {
        cwd: root,
        encoding: 'utf8',
        input: '',
      }).trim();
    }
    execFileSync('git', ['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`], { cwd: root, stdio: 'ignore' });
    return execFileSync('git', ['merge-base', base, 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    throw new Error(`Base Git invalide ou indisponible : ${base}. Récupérer la référence puis définir DOCS_SYNC_BASE.`);
  }
}

export function baselineRoutingText(root, base) {
  const resolvedBase = comparisonBase(root, base);
  if (/^0{40}$/.test(base)) return '';
  const file = '.specs/standards/doc-sync-map.yml';
  const trackedFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', resolvedBase, '--', file], {
    cwd: root,
    encoding: 'utf8',
  }).split(/\r?\n/);
  if (!trackedFiles.includes(file)) return '';
  return execFileSync('git', ['show', `${resolvedBase}:${file}`], {
    cwd: root,
    encoding: 'utf8',
  });
}

export function changedFilesSince(root, base) {
  const diffBase = comparisonBase(root, base);
  try {
    const output = execFileSync('git', [
        'diff', '--name-only', '-z', '--no-renames', '--diff-filter=ACDMRT', diffBase,
    ], {
      cwd: root,
      encoding: 'utf8',
    });
    const untracked = execFileSync('git', ['ls-files', '-z', '--others', '--exclude-standard'], {
      cwd: root,
      encoding: 'utf8',
    });
    return [...new Set(`${output}${untracked}`.split('\0').filter(Boolean))];
  } catch {
    throw new Error(`Base Git invalide ou indisponible : ${base}. Récupérer la référence puis définir DOCS_SYNC_BASE.`);
  }
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
  const convergenceGate = steps.find((step) => step.id === 'review-convergence');
  if (convergenceGate && !/verify-change/i.test(stepField(convergenceGate, 'message') ?? '')) {
    errors.push(`${file}: la porte review-convergence doit exiger verify-change`);
  }
  const verifyChangeGate = steps.find((step) => step.id === 'verify-change');
  if (verifyChangeGate && !/verify-change/i.test(stepField(verifyChangeGate, 'message') ?? '')) {
    errors.push(`${file}: l'étape verify-change doit demander l'exécution de la compétence projet`);
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
    for (const line of text.split(/\r?\n/).filter((line) => /^\s*(path|sources|targets):/.test(line))) {
      if (!/^\s*(?:path:\s*\S+|(?:sources|targets):\s*\[[^\]]*\])\s*$/.test(line)) {
        errors.push(`${file}: format path/sources/targets non pris en charge : ${line.trim()}`);
      }
    }
    for (const match of text.matchAll(/^\s*(?:path:\s*(\S+)|(?:sources|targets):\s*\[([^\]]*)\])\s*$/gm)) {
      for (const target of (match[1] ? [match[1]] : match[2].split(',')).filter((s) => s.trim())) {
        const value = target.trim().replace(/^['"]|['"]$/g, '');
        if (match[0].includes('sources:')) {
          if (!validRepoPattern(value)) errors.push(`${file}: motif source invalide : ${value}`);
        } else await checkPath(file, value, true);
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
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  try {
    const errors = await checkDocuments(root);
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else {
      const base = process.env.DOCS_SYNC_BASE || 'origin/main';
      const changed = changedFilesSince(root, base);
      const baseRouting = baselineRoutingText(root, base);
      const syncErrors = await checkDocumentationSync(root, changed, baseRouting);
      if (syncErrors.length) {
        console.error(syncErrors.join('\n'));
        process.exitCode = 1;
      } else {
        console.log('Documentation : structure, liens, manifestes et décisions du diff valides.');
      }
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
