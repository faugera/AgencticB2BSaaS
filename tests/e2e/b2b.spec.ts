import { expect, test } from '@playwright/test';
for (const locale of ['fr', 'en'] as const) {
  test(`B2B profile and roles (${locale})`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('locale', value), locale);
    await page.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/me') return route.fulfill({ json: { user: { id: 'actor', name: '', email: 'test@example.test' }, access: { actorId: 'actor', platformRole: 'super_admin', tenantId: null, tenantRole: null, handle: null, level: 100, permissions: ['roles.assign'] } } });
      if (path === '/api/profile') return route.fulfill({ json: { first_name: 'Test', last_name: 'Person', avatar_url: null, phone_number: null, job_title: null, department: null, email: 'test@example.test', is_email_verified: true, created_at: '2026-10-24T08:00:00Z', updated_at: '2026-10-24T08:00:00Z' } });
      if (path === '/api/role-assignments') return route.fulfill({ json: [{ id: 'other', name: 'Org admin', email: 'other@example.test', status: 'active', roles: [{ id: 'org-admin', code: 'organization_admin', name: 'Organization admin', scope: 'organization', level: 3, delegable: false, permissions: [], organizationId: 'org', tenantId: null, workspaceId: null }, { id: 'baseline', code: 'member', name: 'Member', scope: 'tenant', level: 0, delegable: true, permissions: [], organizationId: 'org', tenantId: 'tenant', workspaceId: null }] }] });
      if (path === '/api/roles') return route.fulfill({ json: [{ id: 'org-admin', code: 'organization_admin', name: 'Organization admin', scope: 'organization', level: 3, permissions: [], delegable: false, builtin: true, archivedAt: null, updatedAt: '2026-10-24T08:00:00Z', impactCount: 1 }, { id: 'role', code: 'custom', name: 'Support', scope: 'tenant', level: 20, permissions: ['members.read'], delegable: true, builtin: false, archivedAt: null, updatedAt: '2026-10-24T08:00:00Z', impactCount: 2 }] });
      if (path === '/api/preferences') return route.fulfill({ json: { locale, theme: 'light', timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' } });
      return route.fulfill({ json: [] });
    });
    await page.goto('/admin/profile');
    await expect(page.locator('.ui-account summary')).toHaveText('test@example.test');
    await expect(page.locator('.ui-account summary')).toHaveAttribute('title', 'test@example.test');
    await expect(page.getByLabel(locale === 'fr' ? 'Prénom' : 'First name', { exact: true })).toHaveValue('Test');
    await page.getByLabel(locale === 'fr' ? 'Prénom' : 'First name', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(locale === 'fr' ? 'Nom de famille' : 'Last name', { exact: true })).toBeFocused();
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: 'specs/002-b2b-organizations-rbac/evidence/ui/profile-' + locale + '-' + width + '.png', fullPage: true });
    }
    await page.getByLabel(locale === 'fr' ? 'Prénom' : 'First name', { exact: true }).fill('Changed');
    await page.route('**/api/profile', (route) => route.request().method() === 'PUT' ? route.fulfill({ status: 503, json: { code: 'UNAVAILABLE' } }) : route.fallback());
    await page.getByRole('button', { name: locale === 'fr' ? 'Enregistrer' : 'Save', exact: true }).first().click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel(locale === 'fr' ? 'Prénom' : 'First name', { exact: true })).toHaveValue('Changed');
    await page.goto('/admin/roles?tenantId=tenant');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(locale === 'fr' ? 'Rôles et permissions' : 'Roles and permissions');
    await expect(page.locator('strong').filter({ hasText: /^Support$/ })).toBeVisible();
    await expect(page.getByLabel(locale === 'fr' ? 'Sélectionner un rôle' : 'Select a role').locator('option[value=org-admin]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: locale === 'fr' ? 'Retirer le rôle' : 'Revoke role', exact: true })).toHaveCount(1);
    await page.getByText(locale === 'fr' ? 'Modifier' : 'Edit', { exact: true }).click();
    const save = page.getByRole('button', { name: locale === 'fr' ? 'Enregistrer' : 'Save', exact: true });
    await save.click();
    await expect(page.getByRole('dialog')).toContainText('2');
    await page.keyboard.press('Escape');
    await expect(save).toBeFocused();
    await page.route('**/api/roles/role', (route) => route.fulfill({ status: 409, json: { code: 'CONFLICT' } }));
    await save.click();
    await page.getByRole('dialog').getByRole('button', { name: locale === 'fr' ? 'Confirmer' : 'Confirm', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: 'specs/002-b2b-organizations-rbac/evidence/ui/roles-' + locale + '-' + width + '.png', fullPage: true });
    }
  });
}


test('client role assignment keeps tenant scope and excludes self and peers', async ({ page }) => {
 const writes: unknown[] = [];
 const role = { id: 'lower-role', code: 'support', name: 'Support', scope: 'tenant', level: 1, permissions: ['members.read'], delegable: true, builtin: false, archivedAt: null, updatedAt: '2026-10-24T08:00:00Z', impactCount: 0 };
 await page.route('**/api/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'admin', name: 'Admin', email: 'admin@example.test' }, access: { actorId: 'admin', platformRole: null, tenantRole: 'tenant_admin', organizationId: 'org', tenantId: 'tenant', level: 2, permissions: ['roles.assign'], tenants: [{ id: 'tenant', name: 'Tenant A', organization_id: 'org' }] } } });
  if (path === '/api/roles') return route.fulfill({ json: [role, { ...role, id: 'peer-role', name: 'Peer role', level: 2 }] });
  if (path === '/api/tenants') return route.fulfill({ json: [{ id: 'tenant', name: 'Tenant A', organization_id: 'org' }] });
  if (path === '/api/organizations') return route.fulfill({ json: [{ id: 'org', name: 'Client A' }] });
  if (path === '/api/role-assignments' && route.request().method() === 'POST') { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { saved: true } }); }
  if (path === '/api/role-assignments') return route.fulfill({ json: [{ id: 'admin', name: 'Self', email: 'admin@example.test', status: 'active', roles: [{ ...role, level: 2, organizationId: 'org', tenantId: 'tenant', workspaceId: null }] }, { id: 'peer', name: 'Peer', email: 'peer@example.test', status: 'active', roles: [{ ...role, level: 2, organizationId: 'org', tenantId: 'tenant', workspaceId: null }] }, { id: 'member', name: 'Member', email: 'member@example.test', status: 'active', roles: [] }] });
  if (path === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/app/roles?tenantId=tenant');
 await expect(page.getByLabel('Sélectionner un membre').locator('option')).toHaveCount(2);
 await expect(page.getByLabel('Sélectionner un rôle').locator('option')).toHaveCount(2);
 await page.getByLabel('Sélectionner un membre').selectOption('member');
 await page.getByLabel('Sélectionner un rôle').selectOption('lower-role');
 await page.getByLabel('Sélectionner une portée').selectOption('tenant');
 await page.getByRole('button', { name: 'Attribuer', exact: true }).click();
 await expect.poll(() => writes.length).toBe(1);
 expect(writes[0]).toEqual({ actorId: 'member', roleId: 'lower-role', organizationId: 'org', tenantId: 'tenant', operation: 'grant' });
 await expect(page.getByText('Créer le rôle', { exact: true })).toHaveCount(0);
});

test('workspace-only administration uses server capabilities and a scoped roster', async ({ page }) => {
 const queries: string[] = []; const writes: unknown[] = [];
 const role = { id: 'workspace-reader', code: 'reader', name: 'Lecteur espace', scope: 'workspace', level: 0, permissions: ['workspace.read'], delegable: true, builtin: false, archivedAt: null, updatedAt: '2026-10-24T08:00:00Z', impactCount: 0 };
 await page.route('**/api/**', (route) => {
  const url = new URL(route.request().url()); const path = url.pathname;
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'admin', name: 'Admin espace', email: 'admin@example.test' }, access: { actorId: 'admin', platformRole: null, tenantRole: 'member', organizationId: 'org', tenantId: 'tenant', level: 0, permissions: [] } } });
  if (path === '/api/roles') return route.fulfill({ json: [role, { ...role, id: 'tenant-role', scope: 'tenant', name: 'Tenant reader' }] });
  if (path === '/api/tenants') return route.fulfill({ json: [{ id: 'tenant', name: 'Tenant', organization_id: 'org' }] });
  if (path === '/api/organizations') return route.fulfill({ json: [{ id: 'org', name: 'Client' }] });
  if (path === '/api/workspaces') return route.fulfill({ json: [{ id: 'workspace', tenant_id: 'tenant', name: 'Espace géré', visibility: 'private', can_assign_roles: true, role_level: 1 }, { id: 'readonly', tenant_id: 'tenant', name: 'Lecture seule', visibility: 'tenant', can_assign_roles: false, role_level: 0 }] });
  if (path === '/api/role-assignments' && route.request().method() === 'POST') { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { saved: true } }); }
  if (path === '/api/role-assignments') { queries.push(url.search); return route.fulfill({ json: [{ id: 'member', name: 'Member', email: 'member@example.test', status: 'active', roles: [] }] }); }
  if (path === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/app/roles?tenantId=tenant');
 const scope = page.locator('main').getByLabel('Espace actif');
 await expect(scope.locator('option')).toHaveCount(2); expect(queries).toEqual([]);
 await scope.selectOption('workspace');
 await page.getByLabel('Sélectionner un membre').selectOption('member');
 await expect(page.getByLabel('Sélectionner un rôle').locator('option')).toHaveCount(2);
 await page.getByLabel('Sélectionner un rôle').selectOption('workspace-reader');
 await expect(page.getByLabel('Sélectionner une portée')).toHaveValue('workspace');
 await page.getByRole('button', { name: 'Attribuer', exact: true }).click();
 await expect.poll(() => writes.length).toBe(1);
 expect(queries.every((query) => query.includes('workspaceId=workspace'))).toBe(true);
 expect(writes[0]).toEqual({ actorId: 'member', roleId: 'workspace-reader', organizationId: 'org', tenantId: 'tenant', workspaceId: 'workspace', operation: 'grant' });
 await expect(page.getByRole('button', { name: 'Suspendre', exact: true })).toHaveCount(0);
});

test('role navigation follows assignment capability rather than member management', async ({ page }) => {
 let canAssignWorkspace = false;
 await page.route('**/api/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'actor', name: '', email: 'person@example.test' }, access: { actorId: 'actor', platformRole: null, tenantRole: 'tenant_admin', tenantId: 'tenant', permissions: ['members.manage'] }, workspaces: [{ id: 'space', tenant_id: 'tenant', name: 'Space', visibility: 'private', can_assign_roles: canAssignWorkspace, role_level: canAssignWorkspace ? 1 : 0 }] } });
  if (path === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/app');
 await expect(page.getByRole('heading', { level: 1 })).toHaveText('Espaces de travail');
 await expect(page.getByRole('link', { name: 'Rôles et permissions', exact: true })).toHaveCount(0);
 await expect(page.locator('.ui-account summary')).toHaveText('person@example.test');
 canAssignWorkspace = true; await page.reload();
 await expect(page.getByRole('link', { name: 'Rôles et permissions', exact: true })).toHaveCount(1);
});

test('global catalog never loads a roster without a tenant selection', async ({ page }) => {
 const rosterRequests: string[] = [];
 await page.route('**/api/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'super', name: 'Operator', email: 'operator@example.test' }, access: { actorId: 'super', platformRole: 'super_admin', tenantId: null, tenantRole: null, permissions: ['roles.assign'], level: 4 } } });
  if (path === '/api/roles') return route.fulfill({ json: [{ id: 'role', code: 'support', name: 'Support', scope: 'tenant', permissions: [], level: 0, delegable: true, builtin: false, archivedAt: null, updatedAt: '2026-10-25T00:00:00Z', impactCount: 0 }] });
  if (path === '/api/role-assignments') { rosterRequests.push(route.request().url()); return route.fulfill({ status: 403, json: { code: 'FORBIDDEN' } }); }
  if (path === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/admin/roles');
 await expect(page.locator('strong').filter({ hasText: /^Support$/ })).toBeVisible();
 await page.getByText('Modifier', { exact: true }).click();
 await expect(page.locator('details[open]').getByLabel('Nom du rôle')).toHaveValue('Support');
 expect(rosterRequests).toEqual([]);
 await expect(page.getByRole('alert')).toHaveCount(0);
 await expect(page.getByText('Le tenant sélectionné détermine les espaces, membres et événements affichés.', { exact: true }).last()).toBeVisible();
});


