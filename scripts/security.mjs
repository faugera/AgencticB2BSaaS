import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);
const failures = [];
for (const file of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('.example'))
    failures.push('Tracked private environment file');
  if (/(^|\/)(package-lock\.json|yarn\.lock|bun\.lockb?)$/.test(file))
    failures.push('Competing package lockfile');
  if (
    !/\.(?:[cm]?[jt]sx?|json|md|ya?ml|sql)$/.test(file) ||
    file === 'pnpm-lock.yaml'
  )
    continue;
  const source = readFileSync(file, 'utf8');
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source) ||
    /\b(?:ghp_[a-zA-Z0-9]{36}|sk_(?:live|test)_[A-Za-z0-9]{24,})\b/.test(source)
  )
    failures.push('Possible credential in ' + file);
  if (/(?:from\s*|import\s*\(|require\s*\()\s*['"]@clerk\//.test(source))
    failures.push('Obsolete Clerk import in ' + file);
}
if (failures.length) {
  console.error([...new Set(failures)].join('\n'));
  process.exitCode = 1;
} else
  console.log(
    'PASS: pnpm-only locks, no private env files, no Clerk imports, credential patterns clear. Not a substitute for a secret-scanning service.',
  );
