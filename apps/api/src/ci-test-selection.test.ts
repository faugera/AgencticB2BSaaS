import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type PackageManifest = { scripts: Record<string, string> };

const manifest = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
) as PackageManifest;
const workflow = readFileSync(
  new URL('../../../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);

describe('CI integration test selection', () => {
  it('runs tenant isolation once and preserves the full local integration suite', () => {
    expect(manifest.scripts['test:auth:core']).toBe(
      'vitest run --config vitest.auth.config.ts --exclude apps/api/src/business/isolation.integration.test.ts',
    );
    expect(manifest.scripts['verify:security']).toContain(
      'pnpm test:auth:core',
    );
    expect(manifest.scripts['test:auth']).toBe(
      'vitest run --config vitest.auth.config.ts',
    );
    expect(manifest.scripts['verify:tenant-isolation']).toBe(
      'vitest run --config vitest.auth.config.ts apps/api/src/business/isolation.integration.test.ts',
    );
    expect(
      workflow.match(/^\s+run: pnpm verify:security\s*$/gm),
    ).toHaveLength(1);
    expect(
      workflow.match(/^\s+run: pnpm verify:tenant-isolation\s*$/gm),
    ).toHaveLength(1);
  });
});

describe('CI sans tests navigateur', () => {
  it('ne prévoit plus de commande Playwright et conserve les gates SQL', () => {
    expect(manifest.scripts['test:e2e']).toBeUndefined();
    expect(manifest.scripts['test:auth:e2e']).toBeUndefined();
    expect(workflow).not.toMatch(/playwright|test:e2e|test:auth:e2e/i);
    expect(workflow).toContain('pnpm verify:security');
    expect(workflow).toContain('pnpm verify:tenant-isolation');
    expect(workflow).toContain('migration-preservation.integration.test.ts');
  });
});
