import { expect, test } from '@playwright/test';
import { openSidebar } from './support/sidebar';

test('la capacité invitations seule charge les invitations sans demander les membres', async ({ page }) => {
 const requests: string[] = [];
 await page.route('**/api/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  requests.push(path);
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'user', name: 'Utilisateur', email: 'user@example.test' }, access: { tenantId: 'tenant-a', tenantRole: 'member', permissions: ['invitations.manage'] } } });
  if (path === '/api/members') return route.fulfill({ status: 403, json: { code: 'ACCESS_DENIED' } });
  if (path === '/api/invitations') return route.fulfill({ json: [{ id: 'invite', email: 'invited@example.test', role: 'member', delivery: 'sent', accepted_at: null, revoked_at: null }] });
  if (path === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/app/invitations');
 await expect(page.getByRole('cell', { name: 'invited@example.test', exact: true })).toBeVisible();
 expect(requests).not.toContain('/api/members');
 await openSidebar(page);
 await expect(page.getByRole('link', { name: 'Invitations', exact: true })).toBeVisible();
 await expect(page.getByRole('link', { name: 'Membres', exact: true })).toHaveCount(0);
});

test('la capacité membres seule ne charge pas les invitations et ne donne pas accès à leur page', async ({ page }) => {
 const requests: string[] = [];
 await page.route('**/api/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  requests.push(path);
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'user', name: 'Utilisateur', email: 'user@example.test' }, access: { tenantId: 'tenant-a', tenantRole: 'member', permissions: ['members.manage'] } } });
  if (path === '/api/invitations') return route.fulfill({ status: 403, json: { code: 'ACCESS_DENIED' } });
  if (path === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/app/members');
 await expect(page.getByRole('heading', { name: 'Membres', exact: true })).toBeVisible();
 expect(requests).not.toContain('/api/invitations');
 await page.goto('/app/invitations');
 await expect(page).toHaveURL(/\/403$/);
});

test('le changement de tenant attend les nouvelles capacités avant de charger les données', async ({ page }) => {
 let releaseMe: () => void = () => {};
 const delayedMe = new Promise<void>((resolve) => { releaseMe = resolve; });
 let pendingMe = false;
 const forbiddenRequests: string[] = [];
 await page.route('**/api/**', async (route) => {
  const url = new URL(route.request().url());
  const tenant = url.searchParams.get('tenantId');
  if (url.pathname === '/api/me') {
   if (tenant === 'tenant-b') { pendingMe = true; await delayedMe; }
   return route.fulfill({ json: { user: { id: 'user', name: 'Utilisateur', email: 'user@example.test' }, access: { tenantId: tenant, tenantRole: 'member', permissions: tenant === 'tenant-b' ? ['invitations.manage'] : ['invitations.manage', 'members.manage'], tenants: [{ id: 'tenant-a', name: 'Tenant A' }, { id: 'tenant-b', name: 'Tenant B' }] } } });
  }
  if (url.pathname === '/api/members' && tenant === 'tenant-b') { forbiddenRequests.push(url.pathname); return route.fulfill({ status: 403, json: { code: 'ACCESS_DENIED' } }); }
  if (url.pathname === '/api/invitations') return route.fulfill({ json: [{ id: 'invite', email: `${tenant}@example.test`, role: 'member', delivery: 'sent', accepted_at: null, revoked_at: null }] });
  if (url.pathname === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/app/invitations?tenantId=tenant-a');
 await expect(page.getByRole('cell', { name: 'tenant-a@example.test', exact: true })).toBeVisible();
 await openSidebar(page);
 await page.getByLabel('Tenant actif').selectOption('tenant-b');
 await expect.poll(() => pendingMe).toBe(true);
 await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
 expect(forbiddenRequests).toEqual([]);
 releaseMe();
 await expect(page.getByRole('cell', { name: 'tenant-b@example.test', exact: true })).toBeVisible();
 await expect(page).toHaveURL(/\/app\/invitations\?tenantId=tenant-b$/);
 expect(forbiddenRequests).toEqual([]);
});

test('le catalogue et le journal utilisent le tenant affiché ou le tenant effectif', async ({ page }) => {
 const catalogScopes: (string | null)[] = [];
 const auditScopes: (string | null)[] = [];
 await page.route('**/api/**', (route) => {
  const url = new URL(route.request().url());
  if (url.pathname === '/api/me') return route.fulfill({ json: { user: { id: 'user', name: 'Utilisateur', email: 'user@example.test' }, access: { tenantId: url.searchParams.get('tenantId') ?? 'tenant-a', tenantRole: 'member', permissions: ['roles.assign', 'audit.read'] } } });
  if (url.pathname === '/api/roles') { catalogScopes.push(url.searchParams.get('tenantId')); return route.fulfill({ json: [] }); }
  if (url.pathname === '/api/audit-logs') { auditScopes.push(url.searchParams.get('tenantId')); return route.fulfill({ json: { events: [], nextCursor: null } }); }
  if (url.pathname === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/app/roles?tenantId=tenant-b');
 await expect.poll(() => catalogScopes.at(-1)).toBe('tenant-b');
 await page.goto('/app/roles');
 await expect.poll(() => catalogScopes.at(-1)).toBe('tenant-a');
 await page.goto('/app/audit');
 await expect.poll(() => auditScopes.at(-1)).toBe('tenant-a');
 await page.goto('/app/audit?tenantId=tenant-b');
 await expect.poll(() => auditScopes.at(-1)).toBe('tenant-b');
});

test('les liens profil conservent le tenant sélectionné', async ({ page }) => {
 await page.route('**/api/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'user', name: 'Utilisateur', email: 'user@example.test' }, access: { tenantId: 'tenant-b', tenantRole: 'member', permissions: [] } } });
  if (path === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light' } });
  if (path === '/api/profile') return route.fulfill({ json: { first_name: 'Utilisateur', last_name: 'Test', job_title: null, department: null } });
  return route.fulfill({ json: [] });
 });
 await page.goto('/app?tenantId=tenant-b');
 const links = page.getByRole('link', { name: 'Mon profil', exact: true, includeHidden: true });
 await expect(links).toHaveCount(3);
 for (const link of await links.all()) await expect(link).toHaveAttribute('href', '/app/profile?tenantId=tenant-b');
 const mobileLink = page.locator('.ui-bottom-nav a[href^="/app/profile"]');
 if (await mobileLink.isVisible()) await mobileLink.click();
 else await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Mon profil' }).click();
 await expect(page).toHaveURL(/\/app\/profile\?tenantId=tenant-b$/);
});
