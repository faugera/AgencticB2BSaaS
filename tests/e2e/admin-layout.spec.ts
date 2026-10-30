import { expect, test } from '@playwright/test';
import { openSidebar, closeSidebar } from './support/sidebar';

for (const locale of ['fr', 'en'] as const) {
  test(`admin sidebar selects features and preserves organization scope (${locale})`, async ({ page }) => {
    const tenant = '10000000-0000-4000-8000-000000000001';
    const tenantName = 'Une organisation avec un nom suffisamment long pour dépasser la largeur du menu';
    const space = { id: '10000000-0000-4000-8000-000000000002', tenant_id: tenant, name: 'Private workspace', visibility: 'private' };
    await page.addInitScript((value) => localStorage.setItem('locale', value), locale);
    await page.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({ json: path === '/api/me'
        ? { user: { id: 'op', name: 'Operator', email: 'operator@example.test' }, access: { platformRole: 'super_admin', tenantRole: null } }
        : path === '/api/tenants' ? [{ id: tenant, name: tenantName }, { id: '10000000-0000-4000-8000-000000000003', name: tenantName }]
          : path === '/api/workspaces' ? [space] : path === '/api/auth/get-session' ? null : [] });
    });
    await page.goto('/admin');
    await openSidebar(page);
    const navigation = page.getByRole('navigation', { name: locale === 'fr' ? 'Navigation principale' : 'Main navigation' });
    const organizations = navigation.getByRole('link', { name: locale === 'fr' ? 'Organisations' : 'Organizations', exact: true });
    await expect(organizations).toBeVisible();
    await page.getByLabel(locale === 'fr' ? 'Tenant actif' : 'Active tenant').selectOption(tenant);
    await expect(page.locator('#admin-scope-help')).toContainText(tenantName + ' (' + tenant + ')');
    await expect(page.locator('#admin-scope-help')).toBeVisible();
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await openSidebar(page);
      expect(await page.locator('#admin-scope-help').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      expect(await page.locator('.ui-sidebar').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `specs/002-b2b-organizations-rbac/evidence/ui/current/tenant-selected-${locale}-${width}.png` });
      const language = page.getByLabel(locale === 'fr' ? 'Langue' : 'Language');
      await language.scrollIntoViewIfNeeded();
      const languageBox = await language.boundingBox();
      const sidebarBox = await page.locator('.ui-sidebar').boundingBox();
      expect((languageBox?.y ?? 0) + (languageBox?.height ?? 0)).toBeLessThanOrEqual((sidebarBox?.y ?? 0) + (sidebarBox?.height ?? 0));
    }
    await organizations.click();
    await expect(page).toHaveURL('/admin/organizations?tenantId=' + tenant);
    await openSidebar(page);
    await expect(organizations).toHaveAttribute('aria-current', 'page');
    await closeSidebar(page);
    await expect(page.getByRole('heading', { name: locale === 'fr' ? 'Créer l’organisation cliente' : 'Create client organization', exact: true })).toBeVisible();
    await openSidebar(page);
    await navigation.getByRole('link', { name: locale === 'fr' ? 'Espaces de travail' : 'Workspaces', exact: true }).click();
    await expect(page).toHaveURL('/admin/workspaces?tenantId=' + tenant);
    await expect(page.getByRole('link', { name: /Private workspace/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: locale === 'fr' ? 'Créer l’organisation cliente' : 'Create client organization', exact: true })).toHaveCount(0);
    await openSidebar(page);
    await navigation.getByRole('link', { name: locale === 'fr' ? 'Invitations et membres' : 'Invitations and members', exact: true }).click();
    await expect(page).toHaveURL('/admin/members?tenantId=' + tenant);
    await closeSidebar(page);
    await expect(page.getByRole('button', { name: locale === 'fr' ? 'Inviter' : 'Invite', exact: true })).toBeVisible();
    await openSidebar(page);
    await navigation.getByRole('link', { name: locale === 'fr' ? 'Sécurité du compte' : 'Account security', exact: true }).click();
    await expect(page).toHaveURL('/admin/security?tenantId=' + tenant);
    await expect(page.getByLabel(locale === 'fr' ? 'Mot de passe actuel' : 'Current password')).toBeVisible();
    if ((page.viewportSize()?.width ?? 1280) >= 768) {
      const sidebar = await page.locator('.admin-sidebar').boundingBox();
      const main = await page.locator('main').boundingBox();
      if (!sidebar || !main) throw new Error('Admin layout is missing');
      expect(main.x).toBeGreaterThanOrEqual(sidebar.x + sidebar.width);
    } else {
      await expect(page.locator('.ui-bottom-nav')).toBeVisible();
      await expect(page.locator('.ui-sidebar')).toBeHidden();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
