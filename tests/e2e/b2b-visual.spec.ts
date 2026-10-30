import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { proveFormReachability } from './support/reachability';

async function capture(page: Page, name: string, target?: Locator) {
  if (target) await target.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  else await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.querySelector('.ui-main-content')?.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (target) {
    const bounds = await target.boundingBox();
    const navigation = await page.locator('.ui-bottom-nav').isVisible() ? await page.locator('.ui-bottom-nav').boundingBox() : null;
    expect(bounds).not.toBeNull();
    expect(bounds?.y).toBeGreaterThanOrEqual(0);
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.width ?? 1280);
    expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(navigation?.y ?? 900);
  }
  await page.screenshot({ path: `specs/002-b2b-organizations-rbac/evidence/ui/current/${name}.png` });
}

for (const locale of ['fr', 'en'] as const) for (const width of [375, 768, 1280]) {
  test(`current B2B surfaces ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((value) => localStorage.setItem('locale', value), locale);
    const label = (fr: string, en: string) => locale === 'fr' ? fr : en;
    const shot = (name: string, target?: Locator) => capture(page, `${name}-${locale}-${width}`, target);
    let theme: 'light' | 'dark' = 'light'; let client = false; let failWrites = false; let mode: 'normal' | 'empty' | 'error' = 'normal';
    let gate: Promise<void> | null = null;
    const tenant = { id: 'tenant', name: 'Tenant Paris — équipe opérations internationales', organization_id: 'org' };
    const organization = { id: 'org', name: 'Organisation cliente Exemple International' };
    const role = { id: 'support', code: 'support', name: 'Support international', scope: 'tenant', level: 1, permissions: ['members.read', 'audit.read'], delegable: true, builtin: false, archivedAt: null, updatedAt: '2026-10-25T18:00:00Z', impactCount: 2 };
    await page.route('**/api/**', async (route) => {
      const request = route.request(); const url = new URL(request.url()); const path = url.pathname;
      if (['POST', 'PUT', 'PATCH'].includes(request.method())) return route.fulfill({ status: failWrites ? 409 : 200, json: failWrites ? { code: 'CONFLICT' } : { saved: true } });
      if (path === '/api/me') return route.fulfill({ json: { user: { id: 'actor', name: 'Camille Martin', email: 'camille@example.test' }, access: { actorId: 'actor', platformRole: client ? null : 'super_admin', tenantRole: null, tenantId: client ? tenant.id : null, organizationId: organization.id, organizationRole: null, level: client ? 3 : 4, permissions: ['roles.assign', 'audit.read', 'members.manage', 'organization.manage'], tenants: [tenant] } } });
      if (path === '/api/preferences') return route.fulfill({ json: { locale, theme, timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' } });
      if (path === '/api/profile') return route.fulfill({ json: { first_name: 'Camille', last_name: 'Martin', avatar_url: 'https://example.test/avatar.png', phone_number: '+33612345678', job_title: 'Responsable des opérations internationales', department: 'Accompagnement et support', email: 'camille@example.test', is_email_verified: true, created_at: '2026-10-24T08:00:00Z', updated_at: '2026-10-25T08:00:00Z' } });
      if (path === '/api/roles') return route.fulfill({ json: [role, { ...role, id: 'builtin', name: 'Administrateur intégré', builtin: true, level: 2 }] });
      if (path === '/api/role-assignments') return route.fulfill({ json: [{ id: 'member', name: 'Alexandra Dupont', email: 'alexandra.dupont@example.test', status: 'active', roles: [{ ...role, organizationId: 'org', tenantId: 'tenant', workspaceId: null }] }] });
      if (path === '/api/tenants') return route.fulfill({ json: [tenant] });
      if (path === '/api/organizations' || path === '/api/audit-logs') {
        if (gate) await gate;
        if (mode === 'error') return route.fulfill({ status: 503, json: { code: 'UNAVAILABLE' } });
        if (path === '/api/organizations') return route.fulfill({ json: mode === 'empty' ? [] : [organization] });
        return route.fulfill({ json: { events: mode === 'empty' ? [] : [{ id: 'event', occurred_at: '2026-10-25T08:00:00Z', actor_id: 'actor-00000000-0000-4000-8000-000000000001', tenant_id: url.searchParams.get('tenantId'), action: url.searchParams.has('before') ? 'change.updated' : 'change.created', resource_id: 'resource-00000000-0000-4000-8000-000000000002', resource_type: 'workspace', changed_fields: ['name', 'visibility'] }], nextCursor: url.searchParams.has('before') ? null : '00000000-0000-4000-8000-000000000003' } });
      }
      return route.fulfill({ json: [] });
    });

    await page.goto('/admin/profile');
    await expect(page.getByLabel(label('Prénom', 'First name'), { exact: true })).toHaveValue('Camille');
    await shot('profile-top');
    await shot('profile-preferences-sessions', page.getByRole('heading', { name: label('Sessions actives', 'Active sessions'), exact: true }));
    failWrites = true;
    await page.getByRole('button', { name: label('Enregistrer', 'Save'), exact: true }).first().click();
    await expect(page.getByRole('alert')).toBeVisible(); await shot('profile-error');
    await proveFormReachability(page, `profile-error-${locale}-${width}`); failWrites = false;

    await page.goto('/admin/roles');
    await expect(page.locator('strong').filter({ hasText: /^Support international$/ })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0); await shot('roles-global-catalog');
    await page.goto('/admin/roles?tenantId=tenant'); await expect(page.getByText('Support international', { exact: true }).first()).toBeVisible();
    await shot('roles-catalog-top');
    await shot('roles-populated-assignments', page.getByRole('heading', { name: label('Attributions de rôles', 'Role assignments'), exact: true }));
    await shot('roles-assignment-last-action', page.getByRole('button', { name: label('Suspendre', 'Suspend'), exact: true }));
    await page.getByText(label('Modifier', 'Edit'), { exact: true }).click();
    const editor = page.locator('details[open] form');
    await shot('roles-editor-top', editor.getByLabel(label('Nom du rôle', 'Role name')));
    for (const [index, row] of (await editor.locator('.ui-checkbox-label').all()).entries()) await capture(page, `roles-control-${index}-${locale}-${width}`, row);
    await shot('roles-editor-end', editor.getByLabel(label('Délégable', 'Delegable'), { exact: true }));
    const save = editor.getByRole('button', { name: label('Enregistrer', 'Save'), exact: true });
    await save.click(); await expect(page.getByRole('dialog')).toBeVisible(); await shot('roles-impact-dialog');
    await page.keyboard.press('Escape'); await expect(save).toBeFocused();
    failWrites = true; await save.click(); await page.getByRole('dialog').getByRole('button', { name: label('Confirmer', 'Confirm'), exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible(); await shot('roles-error'); failWrites = false;

    client = true; await page.goto('/app/roles?tenantId=tenant');
    if (width >= 768) await expect(page.getByRole('navigation', { name: label('Navigation principale', 'Main navigation') }).getByRole('link', { name: label('Organisations', 'Organizations'), exact: true })).toBeVisible();
    const member = page.getByLabel(label('Sélectionner un membre', 'Select a member'));
    await member.selectOption('member'); await page.getByLabel(label('Sélectionner un rôle', 'Select a role')).selectOption('support');
    await page.getByLabel(label('Sélectionner une portée', 'Select a scope')).selectOption('tenant');
    await shot('client-assignment-filled', member);
    await page.getByRole('button', { name: label('Attribuer', 'Assign'), exact: true }).click();
    await expect(page.getByRole('status')).toContainText(label('Modification enregistrée', 'Changes saved')); await shot('client-assignment-success');
    await proveFormReachability(page, `client-assignment-success-${locale}-${width}`);
    await shot('client-assignment-last-action', page.getByRole('button', { name: label('Suspendre', 'Suspend'), exact: true }));
    await page.getByRole('button', { name: label('Retirer le rôle', 'Revoke role'), exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveAccessibleName(label('Retirer le rôle', 'Revoke role') + ' — Alexandra Dupont — Support international — Tenant · tenant');
    await shot('client-revoke-dialog'); await page.keyboard.press('Escape');
    failWrites = true; await page.getByRole('button', { name: label('Attribuer', 'Assign'), exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible(); await shot('client-assignment-error'); failWrites = false;

    client = false; await page.goto('/admin/organizations');
    await expect(page.locator('strong').filter({ hasText: organization.name })).toBeVisible(); await shot('organizations-populated');
    await page.getByLabel(label('Organisation cliente', 'Client organization'), { exact: true }).selectOption('org');
    await page.getByLabel(label('Nom du tenant', 'Tenant name'), { exact: true }).fill('Tenant Montréal');
    await page.getByLabel(label('Email de l’administrateur', 'Administrator email'), { exact: true }).fill('admin@example.test');
    const createTenant = page.getByRole('button', { name: label('Créer et inviter', 'Create and invite'), exact: true });
    await shot('organizations-create-tenant', createTenant); await createTenant.click();
    await expect(page.getByRole('status')).toContainText(label('Modification enregistrée', 'Changes saved')); await shot('organizations-created');
    await proveFormReachability(page, `organizations-created-${locale}-${width}`);
    failWrites = true; await page.getByLabel(label('Nom de l’organisation', 'Organization name'), { exact: true }).fill('Nouvelle organisation');
    await page.getByRole('button', { name: label('Créer l’organisation cliente', 'Create client organization'), exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible(); await shot('organizations-error');
    await proveFormReachability(page, `organizations-error-${locale}-${width}`); failWrites = false;
    mode = 'empty'; await page.reload(); await expect(page.getByText(label('Aucune organisation cliente.', 'No client organizations.'), { exact: true })).toBeVisible(); await shot('organizations-empty');
    mode = 'normal'; let release = () => {}; gate = new Promise<void>((resolve) => { release = resolve; });
    await page.reload(); await expect(page.getByRole('status')).toContainText(label('Chargement', 'Loading')); await shot('organizations-loading'); release(); gate = null;

    await page.goto('/admin/audit'); await expect(page.getByRole('cell').filter({ hasText: label('Création', 'Created') })).toBeVisible(); await shot('audit-global');
    await page.goto('/admin/audit?tenantId=tenant'); await expect(page.getByRole('cell').filter({ hasText: label('Création', 'Created') })).toBeVisible(); await shot('audit-tenant');
    await shot('audit-table-end', page.getByRole('cell', { name: 'name, visibility', exact: true }));
    const older = page.getByRole('button', { name: label('Événements plus anciens', 'Older events'), exact: true });
    await shot('audit-pagination', older); await older.click(); await expect(older).toBeDisabled(); await shot('audit-older-page', older);
    mode = 'empty'; await page.reload(); await expect(page.getByText(label('Aucun événement à afficher.', 'No events to display.'), { exact: true })).toBeVisible(); await shot('audit-empty');
    mode = 'error'; await page.reload(); await expect(page.getByRole('alert')).toBeVisible(); await shot('audit-error');
    mode = 'normal'; gate = new Promise<void>((resolve) => { release = resolve; });
    await page.reload(); await expect(page.getByRole('status')).toContainText(label('Chargement', 'Loading')); await shot('audit-loading'); release(); gate = null;
    theme = 'dark';
    for (const path of ['profile', 'roles', 'organizations', 'audit']) {
      await page.goto('/admin/' + path + (path === 'roles' ? '?tenantId=tenant' : ''));
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('main [aria-busy=true]')).toHaveCount(0);
      await expect(page.getByRole('status').filter({ hasText: /Chargement|Loading/ })).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await shot(path + '-dark');
      if (path === 'roles') await proveFormReachability(page, `roles-dark-${locale}-${width}`);
    }
    if (width < 768) {
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await expect(page.locator('.ui-sidebar')).toBeVisible(); await shot('sidebar-mobile-open');
    } else {
      await page.getByRole('button', { name: label('Réduire le menu', 'Collapse menu'), exact: true }).click();
      await expect(page.locator('.ui-shell')).toHaveClass(/ui-collapsed/); await shot('sidebar-collapsed');
    }
  });
}
