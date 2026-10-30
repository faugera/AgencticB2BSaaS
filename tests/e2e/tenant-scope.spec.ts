import { expect, test } from '@playwright/test';
import { openSidebar, closeSidebar } from './support/sidebar';

for (const locale of ['fr', 'en'] as const) {
  test(`organization scope follows browser history and writes (${locale})`, async ({ page }) => {
    const tenantA = '10000000-0000-4000-8000-000000000001';
    const tenantB = '10000000-0000-4000-8000-000000000002';
    const label = locale === 'fr' ? 'Tenant actif' : 'Active tenant';
    const requests: string[] = [];
    await page.addInitScript((value) => localStorage.setItem('locale', value), locale);
    await page.route('**/api/**', (route) => {
      const url = new URL(route.request().url());
      requests.push(url.pathname + url.search);
      const json = url.pathname === '/api/me'
        ? {
            user: { id: 'operator', name: 'Operator', email: 'operator@example.test' },
            access: { actorId: 'operator', platformRole: 'super_admin', tenantId: null, tenantRole: null, handle: null },
          }
        : url.pathname === '/api/tenants'
          ? [{ id: tenantA, name: 'Organization A' }, { id: tenantB, name: 'Organization B' }]
          : route.request().method() === 'POST' ? { id: 'created' } : [];
      return route.fulfill({ json });
    });
    await page.goto('/admin?tenantId=' + tenantA);
    await openSidebar(page);
    const select = page.getByLabel(label);
    await expect(select).toHaveValue(tenantA);
    await select.selectOption(tenantB);
    await expect(page).toHaveURL('/admin?tenantId=' + tenantB);
    await expect(select).toHaveValue(tenantB);
    requests.length = 0;
    await page.goBack();
    await expect(page).toHaveURL('/admin?tenantId=' + tenantA);
    await expect(select).toHaveValue(tenantA);
    await expect.poll(() => requests.includes('/api/workspaces?tenantId=' + tenantA)).toBe(true);
    await closeSidebar(page);
    await page.getByLabel(locale === 'fr' ? 'Nouvel espace privé' : 'New private workspace').fill('History workspace');
    const created = page.waitForRequest((request) =>
      request.method() === 'POST' && new URL(request.url()).pathname === '/api/workspaces',
    );
    await page.getByRole('button', { name: locale === 'fr' ? 'Créer l’espace' : 'Create workspace', exact: true }).click();
    expect(new URL((await created).url()).searchParams.get('tenantId')).toBe(tenantA);
    await page.goForward();
    await expect(page).toHaveURL('/admin?tenantId=' + tenantB);
    await expect(select).toHaveValue(tenantB);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
