import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const tenant = '10000000-0000-4000-8000-000000000001';
const target = '20000000-0000-4000-8000-000000000001';
async function fixture(page: Page, role: 'super_admin' | 'tenant_admin' | 'member' | 'anonymous' = 'super_admin') {
  const queries: string[] = [];
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/me') return route.fulfill({ status: role === 'anonymous' ? 401 : 200, json: {
      user: { id: 'fixture', name: 'Audit admin', email: 'fixture@example.test' },
      access: { actorId: target, platformRole: role === 'super_admin' ? role : null, tenantRole: role === 'super_admin' ? null : role, tenantId: role === 'super_admin' ? null : tenant, handle: null },
    } });
    if (url.pathname === '/api/platform/tenants') return route.fulfill({ json: [{ id: tenant, name: 'Organization A' }] });
    if (url.pathname === '/api/preferences') return route.fulfill({ json: null });
    if (url.pathname === '/api/platform/audit') {
      queries.push(url.search);
      return route.fulfill({ json: { events: [{ id: url.searchParams.has('before') ? '10' : '20', occurred_at: '2026-10-24T10:15:00Z',
        actor_id: target, tenant_id: tenant, action: url.searchParams.has('before') ? 'change.updated' : 'change.created',
        resource_id: target, resource_type: 'workspace', changed_fields: ['name'] }], nextCursor: url.searchParams.has('before') ? null : '20' } });
    }
    return route.fulfill({ json: [] });
  });
  return queries;
}

for (const locale of ['fr', 'en'] as const) {
    test(`audit consultation, paging and tenant scope (${locale})`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('locale', value), locale);
      const queries = await fixture(page);
      let releaseAudit = () => {};
      const initialLoad = new Promise<void>((resolve) => { releaseAudit = resolve; });
      await page.route('**/api/platform/audit**', async (route) => { await initialLoad; await route.fallback(); });
      await page.goto('/admin/audit');
      await expect(page.getByRole('heading', { name: locale === 'fr' ? 'Journal d’audit' : 'Audit log' })).toBeVisible();
      await expect(page.getByRole('status')).toContainText(locale === 'fr' ? 'Chargement' : 'Loading');
      releaseAudit();
      await expect(page.getByRole('cell', { name: locale === 'fr' ? 'Création Mutation enregistrée' : 'Created Recorded mutation', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('button', { name: locale === 'fr' ? 'Événements plus anciens' : 'Older events' }).click();
      await expect(page.getByRole('cell', { name: locale === 'fr' ? 'Modification Mutation enregistrée' : 'Updated Recorded mutation', exact: true })).toBeVisible();
      expect(queries.some((query) => query.includes('before=20'))).toBe(true);
      await expect(page.getByRole('button', { name: locale === 'fr' ? 'Événements plus anciens' : 'Older events' })).toBeDisabled();
      await page.goto('/admin/audit?tenantId=' + tenant);
      await expect(page.getByText(locale === 'fr' ? 'Événements de l’organisation sélectionnée.' : 'Events for the selected organization.', { exact: true })).toBeVisible();
      await expect.poll(() => queries.some((query) => query.includes('tenantId=' + tenant) && !query.includes('before='))).toBe(true);
      await page.route('**/api/platform/audit?*', (route) => route.fulfill({ json: { events: [], nextCursor: null } }));
      await page.getByRole('button', { name: locale === 'fr' ? 'Revenir aux plus récents' : 'Back to latest events' }).click();
      await expect(page.getByText(locale === 'fr' ? 'Aucun événement à afficher.' : 'No events to display.', { exact: true })).toBeVisible();
      await page.route('**/api/platform/audit?*', (route) => route.fulfill({ status: 503, json: { code: 'INTERNAL_ERROR' } }));
      await page.getByRole('button', { name: locale === 'fr' ? 'Revenir aux plus récents' : 'Back to latest events' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
    });
}

for (const role of ['tenant_admin', 'member', 'anonymous'] as const) {
  test(`audit page rejects ${role}`, async ({ page }) => {
    const queries = await fixture(page, role);
    await page.goto('/admin/audit');
    await expect(page).toHaveURL(role === 'anonymous' ? /\/admin\/login/ : /\/403$/);
    expect(queries).toHaveLength(0);
  });
}
