import { expect, test } from '@playwright/test';
import { openSidebar } from './support/sidebar';
const ids = {
 actor: '10000000-0000-4000-8000-000000000001',
 tenant: '10000000-0000-4000-8000-000000000002',
 organization: '10000000-0000-4000-8000-000000000003',
 workspace: '10000000-0000-4000-8000-000000000004',
 workspace2: '10000000-0000-4000-8000-000000000005',
 workspace3: '10000000-0000-4000-8000-000000000006',
 readonly: '10000000-0000-4000-8000-000000000007',
 roleOrganization: '10000000-0000-4000-8000-000000000008',
 roleCustom: '10000000-0000-4000-8000-000000000009',
 rolePeer: '10000000-0000-4000-8000-000000000010',
 roleWorkspace: '10000000-0000-4000-8000-000000000011',
 roleTenant: '10000000-0000-4000-8000-000000000012',
 roleCustom2: '10000000-0000-4000-8000-000000000013',
 personOther: '10000000-0000-4000-8000-000000000014',
 personAdmin: '10000000-0000-4000-8000-000000000015',
 personPeer: '10000000-0000-4000-8000-000000000016',
 personMember: '10000000-0000-4000-8000-000000000017',
};
for (const locale of ['fr', 'en'] as const) {
  test(`B2B profile and roles (${locale})`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('locale', value), locale);
    await page.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/me') return route.fulfill({ json: { user: { id: 'actor', name: '', email: 'test@example.test' }, access: { actorId: ids.actor, platformRole: 'super_admin', tenantId: null, tenantRole: null, handle: null, level: 100, permissions: ['roles.assign'] } } });
      if (path === '/api/profile') return route.fulfill({ json: { first_name: 'Test', last_name: 'Person', avatar_url: null, phone_number: null, job_title: null, department: null, email: 'test@example.test', is_email_verified: true, created_at: '2026-10-24T08:00:00Z', updated_at: '2026-10-24T08:00:00Z' } });
      if (path === '/api/role-assignments') return route.fulfill({ json: [{ id: ids.personOther, name: 'Org admin', email: 'other@example.test', status: 'active', roles: [{ id: ids.roleOrganization, code: 'organization_admin', name: 'Organization admin', scope: 'organization', level: 3, delegable: false, permissions: [], organizationId: ids.organization, tenantId: null, workspaceId: null }, { id: ids.roleCustom, code: 'member', name: 'Member', scope: 'tenant', level: 0, delegable: true, permissions: [], organizationId: ids.organization, tenantId: ids.tenant, workspaceId: null }] }] });
      if (path === '/api/roles') return route.fulfill({ json: [{ id: ids.roleOrganization, code: 'organization_admin', name: 'Organization admin', scope: 'organization', level: 3, permissions: [], delegable: false, builtin: true, archivedAt: null, updatedAt: '2026-10-24T08:00:00Z', impactCount: 1 }, { id: ids.roleCustom, code: 'custom', name: 'Support', scope: 'tenant', level: 20, permissions: ['members.read'], delegable: true, builtin: false, archivedAt: null, updatedAt: '2026-10-24T08:00:00Z', impactCount: 2 }] });
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
    await page.goto('/admin/roles?tenantId=' + ids.tenant);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(locale === 'fr' ? 'Rôles et permissions' : 'Roles and permissions');
    await expect(page.locator('strong').filter({ hasText: /^Support$/ })).toBeVisible();
    await expect(page.getByLabel(locale === 'fr' ? 'Sélectionner un rôle' : 'Select a role').locator(`option[value="${ids.roleOrganization}"]`)).toHaveCount(1);
    await expect(page.getByRole('button', { name: locale === 'fr' ? 'Retirer le rôle' : 'Revoke role', exact: true })).toHaveCount(1);
    await page.getByText(locale === 'fr' ? 'Modifier' : 'Edit', { exact: true }).click();
    const save = page.getByRole('button', { name: locale === 'fr' ? 'Enregistrer' : 'Save', exact: true });
    await save.click();
    await expect(page.getByRole('dialog')).toContainText('2');
    await page.keyboard.press('Escape');
    await expect(save).toBeFocused();
    await page.route('**/api/roles/' + ids.roleCustom, (route) => route.fulfill({ status: 409, json: { code: 'CONFLICT' } }));
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
 const role = { id: ids.roleCustom, code: 'support', name: 'Support', scope: 'tenant', level: 1, permissions: ['members.read'], delegable: true, builtin: false, archivedAt: null, updatedAt: '2026-10-24T08:00:00Z', impactCount: 0 };
 await page.route('**/api/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'admin', name: 'Admin', email: 'admin@example.test' }, access: { actorId: ids.personAdmin, platformRole: null, tenantRole: 'tenant_admin', organizationId: ids.organization, tenantId: ids.tenant, level: 2, permissions: ['roles.assign'], tenants: [{ id: ids.tenant, name: 'Tenant A', organization_id: ids.organization }] } } });
  if (path === '/api/roles') return route.fulfill({ json: [role, { ...role, id: ids.rolePeer, name: 'Peer role', level: 2 }] });
  if (path === '/api/tenants') return route.fulfill({ json: [{ id: ids.tenant, name: 'Tenant A', organization_id: ids.organization }] });
  if (path === '/api/organizations') return route.fulfill({ json: [{ id: ids.organization, name: 'Client A' }] });
  if (path === '/api/role-assignments' && route.request().method() === 'POST') { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { saved: true } }); }
  if (path === '/api/role-assignments') return route.fulfill({ json: [{ id: ids.personAdmin, name: 'Self', email: 'admin@example.test', status: 'active', roles: [{ id: role.id, code: role.code, name: role.name, scope: role.scope, level: 2, permissions: role.permissions, delegable: role.delegable, organizationId: ids.organization, tenantId: ids.tenant, workspaceId: null }] }, { id: ids.personPeer, name: 'Peer', email: 'peer@example.test', status: 'active', roles: [{ id: role.id, code: role.code, name: role.name, scope: role.scope, level: 2, permissions: role.permissions, delegable: role.delegable, organizationId: ids.organization, tenantId: ids.tenant, workspaceId: null }] }, { id: ids.personMember, name: 'Member', email: 'member@example.test', status: 'active', roles: [] }] });
  if (path === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/app/roles?tenantId=' + ids.tenant);
 await expect(page.getByLabel('Sélectionner un membre').locator('option')).toHaveCount(2);
 await expect(page.getByLabel('Sélectionner un rôle').locator('option')).toHaveCount(2);
 await page.getByLabel('Sélectionner un membre').selectOption(ids.personMember);
 await page.getByLabel('Sélectionner un rôle').selectOption(ids.roleCustom);
 await page.getByLabel('Sélectionner une portée').selectOption(ids.tenant);
 await page.getByRole('button', { name: 'Attribuer', exact: true }).click();
 await expect.poll(() => writes.length).toBe(1);
 expect(writes[0]).toEqual({ actorId: ids.personMember, roleId: ids.roleCustom, organizationId: ids.organization, tenantId: ids.tenant, operation: 'grant' });
 await expect(page.getByText('Créer le rôle', { exact: true })).toHaveCount(0);
});

test('workspace-only administration uses server capabilities and a scoped roster', async ({ page }) => {
 const queries: string[] = []; const writes: unknown[] = [];
 const role = { id: ids.roleWorkspace, code: 'reader', name: 'Lecteur espace', scope: 'workspace', level: 0, permissions: ['workspace.read'], delegable: true, builtin: false, archivedAt: null, updatedAt: '2026-10-24T08:00:00Z', impactCount: 0 };
 await page.route('**/api/**', (route) => {
  const url = new URL(route.request().url()); const path = url.pathname;
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'admin', name: 'Admin espace', email: 'admin@example.test' }, access: { actorId: ids.personAdmin, platformRole: null, tenantRole: 'member', organizationId: ids.organization, tenantId: ids.tenant, level: 0, permissions: [] } } });
  if (path === '/api/roles') return route.fulfill({ json: [role, { ...role, id: ids.roleTenant, scope: 'tenant', name: 'Tenant reader' }] });
  if (path === '/api/tenants') return route.fulfill({ json: [{ id: ids.tenant, name: 'Tenant', organization_id: ids.organization }] });
  if (path === '/api/organizations') return route.fulfill({ json: [{ id: ids.organization, name: 'Client' }] });
  if (path === '/api/workspaces') return route.fulfill({ json: { items: [{ id: ids.workspace, tenant_id: ids.tenant, name: 'Espace géré', visibility: 'private', can_assign_roles: true, role_level: 1 }, { id: ids.workspace2, tenant_id: ids.tenant, name: 'Espace géré', visibility: 'private', can_assign_roles: true, role_level: 1 }, { id: ids.readonly, tenant_id: ids.tenant, name: 'Lecture seule', visibility: 'tenant', can_assign_roles: false, role_level: 0 }], nextCursor: null } });
  if (path === '/api/role-assignments' && route.request().method() === 'POST') { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { saved: true } }); }
  if (path === '/api/role-assignments') { queries.push(url.search); return route.fulfill({ json: [{ id: ids.personMember, name: 'Member', email: 'member@example.test', status: 'active', roles: [] }] }); }
  if (path === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/app/roles?tenantId=' + ids.tenant);
 const scope = page.locator('main').getByLabel('Espace actif');
 await expect(scope.locator('option')).toHaveCount(3); expect(queries).toEqual([]);
 await expect(scope.locator(`option[value="${ids.workspace}"]`)).toHaveText(`Espace géré (${ids.workspace})`);
 await expect(scope.locator(`option[value="${ids.workspace2}"]`)).toHaveText(`Espace géré (${ids.workspace2})`);
 await scope.selectOption(ids.workspace);
 await expect(scope).toHaveAccessibleDescription(`Espace géré (${ids.workspace})`);
 for (const width of [375, 768, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await scope.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `specs/002-b2b-organizations-rbac/evidence/ui/current/workspace-role-selected-${width}.png` });
 }
 await page.getByLabel('Sélectionner un membre').selectOption(ids.personMember);
 await expect(page.getByLabel('Sélectionner un rôle').locator('option')).toHaveCount(2);
 await page.getByLabel('Sélectionner un rôle').selectOption(ids.roleWorkspace);
 await expect(page.getByLabel('Sélectionner une portée')).toHaveValue(ids.workspace);
 await page.getByRole('button', { name: 'Attribuer', exact: true }).click();
 await expect.poll(() => writes.length).toBe(1);
 expect(queries.every((query) => query.includes('workspaceId=' + ids.workspace))).toBe(true);
 expect(writes[0]).toEqual({ actorId: ids.personMember, roleId: ids.roleWorkspace, organizationId: ids.organization, tenantId: ids.tenant, workspaceId: ids.workspace, operation: 'grant' });
 await expect(page.getByRole('button', { name: 'Suspendre', exact: true })).toHaveCount(0);
});

test('role removal confirmation names each scope and preserves access on cancel', async ({ page }) => {
 const writes: unknown[] = [];
 const role = { id: ids.roleCustom, code: 'custom', name: 'Support', level: 0, permissions: [], delegable: true, builtin: false, archivedAt: null, updatedAt: '2026-10-24T08:00:00Z', impactCount: 0 };
 const assignment = (scope: 'organization' | 'tenant' | 'workspace', workspaceId: string | null, id = ids.roleCustom) => ({ id, code: role.code, name: role.name, scope, permissions: role.permissions, level: role.level, delegable: role.delegable, organizationId: ids.organization, tenantId: scope === 'organization' ? null : ids.tenant, workspaceId });
 await page.route('**/api/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'super', name: 'Admin', email: 'admin@example.test' }, access: { actorId: ids.actor, platformRole: 'super_admin', tenantId: ids.tenant, tenantRole: null, permissions: ['roles.assign'], level: 4 } } });
  if (path === '/api/roles') return route.fulfill({ json: [{ ...role, scope: 'workspace' }, { ...role, id: ids.roleCustom2, scope: 'workspace' }] });
  if (path === '/api/tenants') return route.fulfill({ json: [{ id: ids.tenant, name: 'Tenant A', organization_id: ids.organization }] });
  if (path === '/api/organizations') return route.fulfill({ json: [{ id: ids.organization, name: 'Client A' }] });
  if (path === '/api/workspaces') return route.fulfill({ json: { items: [{ id: ids.workspace, name: 'Espace A', tenant_id: ids.tenant, visibility: 'private' }, { id: ids.workspace2, name: 'Espace A', tenant_id: ids.tenant, visibility: 'private' }, { id: ids.workspace3, name: 'Espace A (workspace)', tenant_id: ids.tenant, visibility: 'private' }], nextCursor: null } });
  if (path === '/api/role-assignments' && route.request().method() === 'POST') { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { saved: true } }); }
  if (path === '/api/role-assignments') return route.fulfill({ json: [{ id: ids.personMember, name: '', email: 'member@example.test', status: 'active', roles: [
   assignment('organization', null),
   assignment('tenant', null),
   assignment('workspace', ids.workspace),
   assignment('workspace', ids.workspace2),
   assignment('workspace', ids.workspace3),
   assignment('workspace', ids.workspace2, ids.roleCustom2),
  ] }] });
  if (path === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/admin/roles?tenantId=' + ids.tenant);
 const buttons = page.getByRole('button', { name: 'Retirer le rôle', exact: true });
 for (const [index, scope] of [`Organisation cliente · Client A (${ids.organization})`, `Tenant · Tenant A (${ids.tenant})`, `Espace de travail · Espace A (${ids.workspace})`, `Espace de travail · Espace A (${ids.workspace2})`, `Espace de travail · Espace A (workspace) (${ids.workspace3})`].entries()) {
  const trigger = buttons.nth(index); await trigger.click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName(`Retirer le rôle — member@example.test — Support (${ids.roleCustom}) — ${scope}`);
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
 }
 expect(writes).toEqual([]);
 await buttons.nth(3).click();
 await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
 await expect.poll(() => writes.length).toBe(1);
 expect(writes[0]).toEqual({ actorId: ids.personMember, roleId: ids.roleCustom, organizationId: ids.organization, tenantId: ids.tenant, workspaceId: ids.workspace2, operation: 'revoke' });
 await buttons.nth(5).click();
 await expect(page.getByRole('dialog')).toHaveAccessibleName(`Retirer le rôle — member@example.test — Support (${ids.roleCustom2}) — Espace de travail · Espace A (${ids.workspace2})`);
 await page.keyboard.press('Escape');
 await page.getByLabel('Sélectionner un membre').selectOption(ids.personMember);
 await expect(page.getByLabel('Sélectionner un rôle').locator(`option[value="${ids.roleCustom}"]`)).toHaveText(`Support (${ids.roleCustom})`);
 await expect(page.getByLabel('Sélectionner un rôle').locator(`option[value="${ids.roleCustom2}"]`)).toHaveText(`Support (${ids.roleCustom2})`);
 await page.getByLabel('Sélectionner un rôle').selectOption(ids.roleCustom);
 await expect(page.getByLabel('Sélectionner un rôle')).toHaveAccessibleDescription(`Support (${ids.roleCustom})`);
 const target = page.getByLabel('Sélectionner une portée');
 await expect(target.locator(`option[value="${ids.workspace}"]`)).toHaveText(`Espace A (${ids.workspace})`);
 await expect(target.locator(`option[value="${ids.workspace2}"]`)).toHaveText(`Espace A (${ids.workspace2})`);
 await expect(target.locator(`option[value="${ids.workspace3}"]`)).toHaveText(`Espace A (workspace) (${ids.workspace3})`);
 await target.selectOption(ids.workspace2);
 await expect(target).toHaveAccessibleDescription(`Espace A (${ids.workspace2})`);
 await page.getByRole('button', { name: 'Attribuer', exact: true }).click();
 await expect.poll(() => writes.length).toBe(2);
 expect(writes[1]).toEqual({ actorId: ids.personMember, roleId: ids.roleCustom, organizationId: ids.organization, tenantId: ids.tenant, workspaceId: ids.workspace2, operation: 'grant' });
});

test('role navigation follows assignment capability rather than member management', async ({ page }) => {
 let canAssignWorkspace = false;
 await page.route('**/api/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'actor', name: '', email: 'person@example.test' }, access: { actorId: ids.actor, platformRole: null, tenantRole: 'tenant_admin', tenantId: ids.tenant, permissions: ['members.manage'] }, can_assign_workspace_roles: canAssignWorkspace } });
  if (path === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/app');
 await expect(page.getByRole('heading', { level: 1 })).toHaveText('Espaces de travail');
 await openSidebar(page);
 await expect(page.getByRole('link', { name: 'Rôles et permissions', exact: true })).toHaveCount(0);
 await expect(page.locator('.ui-account summary')).toHaveText('person@example.test');
 canAssignWorkspace = true; await page.reload();
 await expect(page.getByRole('heading', { level: 1 })).toHaveText('Espaces de travail');
 await openSidebar(page);
 await expect(page.getByRole('link', { name: 'Rôles et permissions', exact: true })).toHaveCount(1);
});

test('global catalog never loads a roster without a tenant selection', async ({ page }) => {
 const rosterRequests: string[] = [];
 await page.route('**/api/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'super', name: 'Operator', email: 'operator@example.test' }, access: { actorId: ids.actor, platformRole: 'super_admin', tenantId: null, tenantRole: null, permissions: ['roles.assign'], level: 4 } } });
  if (path === '/api/roles') return route.fulfill({ json: [{ id: ids.roleCustom, code: 'support', name: 'Support', scope: 'tenant', permissions: [], level: 0, delegable: true, builtin: false, archivedAt: null, updatedAt: '2026-10-25T00:00:00Z', impactCount: 0 }] });
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
