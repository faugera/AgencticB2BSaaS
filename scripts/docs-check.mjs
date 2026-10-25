import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const historical = /^(?:docs\/sdd\/legacy-skills\/|docs\/architecture\/[^/]*verification\.md$|docs\/design\/css-normalization\.md$)/;
const statuses = new Set(['Draft', 'In Progress', 'Complete']);

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
    '.agents/skills/verify-change/SKILL.md'];
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
        ['spec.md', ['User Scenarios & Testing', 'Requirements', 'Success Criteria']],
        ['plan.md', ['Summary', 'Constitution Check']], ['tasks.md', []],
      ]) {
        const file = `${directory}/${name}`;
        if (!await exists(path.join(root, file))) { errors.push(`${file}: fichier obligatoire absent`); continue; }
        const text = await readFile(path.join(root, file), 'utf8');
        for (const heading of headings) {
          if (!text.split('\n').some((line) => line.startsWith(`## ${heading}`))) {
            errors.push(`${file}: section obligatoire ${heading}`);
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

  const stateFile = path.join(root, '.specify/integration.json');
  if (await exists(stateFile)) {
    const state = JSON.parse(await readFile(stateFile, 'utf8'));
    if (state.version !== '1.2.3') errors.push('.specify/integration.json: version attendue 1.2.3');
    for (const integration of ['codex', 'claude', 'speckit']) {
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
