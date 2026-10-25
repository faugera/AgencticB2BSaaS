import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openSidebar, closeSidebar } from './support/sidebar';

const tenant = '10000000-0000-4000-8000-000000000001';
const workspace = '10000000-0000-4000-8000-000000000002';
async function fixture(page: Page, locale: 'fr' | 'en') {
 let color = '#b5a2df';
 let preferences: { locale: 'fr' | 'en'; theme: 'light' | 'dark' | 'system' } = { locale, theme: 'light' };
 const writes: { path: string; body: unknown }[] = [];
 const invitations = [{ id: 'invite-a', email: 'lea.bernard@example.test', role: 'member', delivery: 'sent', accepted_at: null as string | null, revoked_at: null as string | null }, { id: 'invite-b', email: 'sophie.durand@example.test', role: 'member', delivery: 'sent', accepted_at: '2026-10-02', revoked_at: null }];
 const requests = [{ id: 'request-a', first_name: 'Thomas', last_name: 'Lefèvre', email: 'thomas.lefevre@example.test', status: 'pending', created_at: '2026-10-22T10:00:00Z' }];
 await page.addInitScript((value) => { localStorage.setItem('locale', value); localStorage.setItem('theme', 'light'); }, locale);
 await page.route('**/api/**', async (route) => {
  const request = route.request(); const path = new URL(request.url()).pathname;
  const space = { id: workspace, tenant_id: tenant, name: 'Opérations', visibility: 'tenant', can_manage: true, color };
  if (['POST', 'PUT'].includes(request.method())) writes.push({ path, body: request.postDataJSON() });
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'fixture', name: 'Camille Martin', email: 'camille@example.test' }, access: { actorId: 'fixture', platformRole: null, tenantRole: 'tenant_admin', tenantId: tenant }, workspaces: [space] } });
  if (path === '/api/preferences') { if (request.method() === 'PUT') preferences = request.postDataJSON(); return route.fulfill({ json: preferences }); }
  if (path === '/api/workspaces') return route.fulfill({ json: [space] });
  if (path === '/api/workspaces/' + workspace) return route.fulfill({ json: space });
  if (path.endsWith('/appearance')) { color = request.postDataJSON().color; return route.fulfill({ json: { color } }); }
  if (path === '/api/members' || path.endsWith('/members')) return route.fulfill({ json: [] });
  if (path === '/api/invitations') {
   if (request.method() === 'POST') { const body = request.postDataJSON(); invitations.push({ ...invitations[0], id: 'invite-c', email: body.email, role: body.role, delivery: 'sent', accepted_at: null, revoked_at: null }); }
   return route.fulfill({ json: invitations });
  }
  if (path === '/api/access-requests') return route.fulfill({ json: requests });
  if (path === '/api/access-requests/request-a') { requests[0]!.status = request.postDataJSON().operation === 'approve' ? 'approved' : 'rejected'; return route.fulfill({ json: { ok: true } }); }
  if (path === '/api/auth/get-session') return route.fulfill({ json: null });
  return route.fulfill({ json: [] });
 });
 return writes;
}
for (const locale of ['fr', 'en'] as const) {
 test(`invitation and preference workflows (${locale})`, async ({ page }) => {
  const writes = await fixture(page, locale);
  await page.goto('/app/invitations');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Invitations');
  await expect(page.getByRole('cell', { name: 'lea.bernard@example.test', exact: true })).toBeVisible();
  await page.getByLabel(locale === 'fr' ? 'Rechercher une adresse' : 'Search an email address').fill('missing');
  await expect(page.getByText(locale === 'fr' ? 'Aucun résultat pour ces filtres.' : 'No results for these filters.')).toBeVisible();
  await page.getByLabel(locale === 'fr' ? 'Rechercher une adresse' : 'Search an email address').fill('');
  await page.getByLabel(locale === 'fr' ? 'Statut' : 'Status', { exact: true }).selectOption('accepted');
  await expect(page.getByRole('cell', { name: 'lea.bernard@example.test' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: locale === 'fr' ? 'Renvoyer' : 'Resend', exact: true })).toHaveCount(0);
  await page.getByLabel(locale === 'fr' ? 'Statut' : 'Status', { exact: true }).selectOption('all');
  await page.getByRole('button', { name: locale === 'fr' ? 'Révoquer' : 'Revoke', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: locale === 'fr' ? 'Révoquer' : 'Revoke', exact: true })).toBeFocused();
  expect(writes).toHaveLength(0);
  await page.getByLabel(locale === 'fr' ? 'Adresse email' : 'Email address', { exact: true }).fill('new@example.test');
  await page.getByRole('button', { name: locale === 'fr' ? 'Inviter' : 'Invite', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'new@example.test' })).toBeVisible();
  expect(writes.find((item) => item.path === '/api/invitations')?.body).toEqual({ email: 'new@example.test', role: 'member' });
  await page.goto('/app/workspaces/' + workspace);
  await expect(page.getByRole('heading', { name: locale === 'fr' ? 'Apparence de l’espace' : 'Workspace appearance' })).toBeVisible();
  await page.getByLabel(locale === 'fr' ? 'Couleur personnalisée' : 'Custom color').fill('#93b9df');
  await page.getByRole('button', { name: locale === 'fr' ? 'Enregistrer la couleur' : 'Save color' }).click();
  await expect.poll(() => writes.some((item) => item.path.endsWith('/appearance'))).toBe(true);
  expect(writes.find((item) => item.path.endsWith('/appearance'))?.body).toEqual({ color: '#93b9df' });
  await openSidebar(page);
  await page.getByLabel(locale === 'fr' ? 'Thème' : 'Theme', { exact: true }).selectOption('dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  await closeSidebar(page);
  expect(writes.find((item) => item.path === '/api/preferences')?.body).toEqual({ locale, theme: 'dark' });
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 });
}
