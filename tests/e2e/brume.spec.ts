import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openSidebar, closeSidebar } from './support/sidebar';

const tenant = '10000000-0000-4000-8000-000000000001';
const workspace = '10000000-0000-4000-8000-000000000002';
async function fixture(page: Page, locale: 'fr' | 'en', theme: 'light' | 'dark', admin = false) {
 let color = '#b5a2df';
 let preferences = { locale, theme: theme as 'light' | 'dark' | 'system' };
 const writes: { path: string; body: unknown }[] = [];
 const invitations = [{ id: 'invite-a', email: 'lea.bernard@example.test', role: 'member', delivery: 'sent', accepted_at: null as string | null, revoked_at: null as string | null }, { id: 'invite-b', email: 'sophie.durand@example.test', role: 'member', delivery: 'sent', accepted_at: '2026-10-02', revoked_at: null }];
 const requests = [{ id: 'request-a', first_name: 'Thomas', last_name: 'Lefèvre', email: 'thomas.lefevre@example.test', status: 'pending', created_at: '2026-10-22T10:00:00Z' }];
 await page.addInitScript((value) => { localStorage.setItem('locale', value.locale); localStorage.setItem('theme', value.theme); }, { locale, theme });
 await page.route('**/api/**', async (route) => {
  const request = route.request(); const path = new URL(request.url()).pathname;
  const space = { id: workspace, tenant_id: tenant, name: 'Opérations', visibility: 'tenant', can_manage: true, color };
  if (['POST', 'PUT'].includes(request.method())) writes.push({ path, body: request.postDataJSON() });
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'fixture', name: 'Camille Martin', email: 'camille@example.test' }, access: { actorId: 'fixture', platformRole: admin ? 'super_admin' : null, tenantRole: admin ? null : 'tenant_admin', tenantId: admin ? null : tenant }, workspaces: [space] } });
  if (path === '/api/preferences') { if (request.method() === 'PUT') preferences = request.postDataJSON(); return route.fulfill({ json: preferences }); }
  if (path === '/api/platform/tenants') return route.fulfill({ json: [{ id: tenant, name: 'Atelier' }] });
  if (path === '/api/platform/docs') return route.fulfill({ json: { fr: [{ title: 'Guide des organisations', text: 'Contenu réservé aux super-admins.' }], en: [{ title: 'Organization guide', text: 'Content restricted to super-admins.' }] } });
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
for (const locale of ['fr', 'en'] as const) for (const theme of ['light', 'dark'] as const) for (const width of [375, 768, 1280]) {
 test(`Brume workflows (${locale}, ${theme}, ${width})`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 1024 });
  const writes = await fixture(page, locale, theme);
  await page.goto('/app/invitations');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Invitations');
  await expect(page.getByRole('cell', { name: 'lea.bernard@example.test', exact: true })).toBeVisible();
  await expect(page.locator('.ui-main-content svg')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('invitations.png'), fullPage: true });
  await page.getByLabel(locale === 'fr' ? 'Rechercher une adresse' : 'Search an email address').fill('missing');
  await expect(page.getByText(locale === 'fr' ? 'Aucun résultat pour ces filtres.' : 'No results for these filters.')).toBeVisible();
  await page.getByLabel(locale === 'fr' ? 'Rechercher une adresse' : 'Search an email address').fill('');
  await page.getByLabel(locale === 'fr' ? 'Statut' : 'Status', { exact: true }).selectOption('accepted');
  await expect(page.getByRole('cell', { name: 'lea.bernard@example.test' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: locale === 'fr' ? 'Renvoyer' : 'Resend', exact: true })).toHaveCount(0);
  await page.getByLabel(locale === 'fr' ? 'Statut' : 'Status', { exact: true }).selectOption('all');
  await page.getByRole('button', { name: locale === 'fr' ? 'Révoquer' : 'Revoke', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: info.outputPath('confirmation.png'), fullPage: true });
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
  await expect(page.locator('.ui-shell')).toHaveCSS('--workspace-color', '#93b9df');
  await page.screenshot({ path: info.outputPath('workspace.png'), fullPage: true });
  await openSidebar(page);
  await page.getByLabel(locale === 'fr' ? 'Thème' : 'Theme', { exact: true }).selectOption(theme === 'dark' ? 'light' : 'dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme === 'dark' ? 'light' : 'dark');
  await closeSidebar(page);
  expect(writes.find((item) => item.path === '/api/preferences')?.body).toEqual({ locale, theme: theme === 'dark' ? 'light' : 'dark' });
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme === 'dark' ? 'light' : 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 });
}

for (const locale of ['fr', 'en'] as const) for (const theme of ['light', 'dark'] as const) for (const width of [375, 768, 1280]) {
 test(`Brume gallery and measured tokens (${locale}, ${theme}, ${width})`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 1024 });
  await fixture(page, locale, theme, true);
  await page.goto('/docs');
  await page.getByRole('button', { name: 'Design system', exact: true }).click();
  await expect(page.getByText(locale === 'fr' ? /aucune écriture métier/ : /no business writes/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '20px');
  await expect(page.getByRole('main')).toHaveCSS('font-size', '12px');
  await page.getByRole('button', { name: locale === 'fr' ? 'Révoquer' : 'Revoke', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('heading')).toHaveCSS('font-size', '16px');
  await page.getByRole('dialog').getByRole('button', { name: locale === 'fr' ? 'Confirmer' : 'Confirm', exact: true }).click();
  await expect(page.getByText(locale === 'fr' ? 'Action de démonstration confirmée.' : 'Demonstration action confirmed.')).toBeVisible();
  await page.getByLabel(locale === 'fr' ? 'Nom de l’exemple' : 'Example name').fill('Brume');
  await expect(page.getByLabel(locale === 'fr' ? 'Nom de l’exemple' : 'Example name')).toHaveCSS('font-size', '12px');
  await page.screenshot({ path: info.outputPath('gallery-top.png'), fullPage: true });
  await page.getByRole('heading', { name: locale === 'fr' ? 'Invitations en cours' : 'Current invitations', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('gallery-bottom.png'), fullPage: true });
  if (width >= 768) {
   expect(await page.locator('.ui-sidebar').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(264, 1);
   const first = page.getByRole('navigation', { name: locale === 'fr' ? 'Navigation principale' : 'Main navigation' }).getByRole('link').first();
   await expect(first).toHaveCSS('font-size', '13px');
   expect(await first.evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(34, 1);
   expect(await first.locator('svg').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(16, 1);
   await page.getByRole('button', { name: locale === 'fr' ? 'Réduire le menu' : 'Collapse menu' }).click();
   expect(await page.locator('.ui-sidebar').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(56, 1);
   await page.screenshot({ path: info.outputPath('collapsed.png'), fullPage: true });
   await page.getByRole('button', { name: locale === 'fr' ? 'Développer le menu' : 'Expand menu' }).click();
  } else {
   await openSidebar(page);
   await expect(page.locator('.ui-main-content')).toHaveAttribute('inert', '');
   await page.screenshot({ path: info.outputPath('mobile-menu.png'), fullPage: true });
   await closeSidebar(page);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 });
}

test('reference viewport invitation composition', async ({ page }, info) => {
 await page.setViewportSize({ width: 1487, height: 1058 });
 await fixture(page, 'fr', 'light');
 await page.goto('/app/invitations');
 await expect(page.getByRole('cell', { name: 'lea.bernard@example.test' })).toBeVisible();
 const capture = await page.screenshot({ path: info.outputPath('reference-actual.png'), scale: 'css', clip: { x: 0, y: 0, width: 1487, height: 1058 } });
 expect(capture.readUInt32BE(16)).toBe(1487);
 expect(capture.readUInt32BE(20)).toBe(1058);
});
