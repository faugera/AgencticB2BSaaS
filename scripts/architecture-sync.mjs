import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const manifest = 'docs/architecture-sources.json';

export async function sourceHashes(root) {
  const migrations = (await readdir(path.join(root, 'apps/api/migrations')))
    .filter((name) => name.endsWith('.sql')).sort().map((name) => `apps/api/migrations/${name}`);
  if (!migrations.length) throw new Error('Aucune migration SQL trouvée.');
  const files = ['docs/architecture.md', 'docs/data-model.md', ...migrations];
  const entries = await Promise.all(files.map(async (name) => {
    const content = (await readFile(path.join(root, name), 'utf8')).replace(/\r\n/g, '\n');
    return [name, createHash('sha256').update(content).digest('hex')];
  }));
  return Object.fromEntries(entries);
}

export async function checkArchitecture(root) {
  const current = await sourceHashes(root);
  let reviewed;
  try { reviewed = JSON.parse(await readFile(path.join(root, manifest), 'utf8')); }
  catch { return ['Manifeste de revue absent ou invalide.']; }
  const names = new Set([...Object.keys(current), ...Object.keys(reviewed)]);
  return [...names].filter((name) => current[name] !== reviewed[name]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    if (process.argv.length === 3 && process.argv[2] === '--reviewed') {
      await writeFile(path.join(root, manifest), JSON.stringify(await sourceHashes(root), null, 2) + '\n');
      console.log('Sources enregistrées après revue du schéma.');
    } else if (process.argv.length === 2) {
      const changed = await checkArchitecture(root);
      if (changed.length) {
        console.error('Revoir docs/architecture.html :\n' + changed.join('\n') + '\nAprès revue : node scripts/architecture-sync.mjs --reviewed');
        process.exitCode = 1;
      } else console.log('Sources du schéma inchangées depuis la dernière revue.');
    } else throw new Error('Usage : node scripts/architecture-sync.mjs [--reviewed]');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
