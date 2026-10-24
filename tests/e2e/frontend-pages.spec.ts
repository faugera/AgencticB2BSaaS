import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const tenant = '10000000-0000-4000-8000-000000000001';
const link = '20000000-0000-4000-8000-000000000001';
const session = { id: 'current', token: 'synthetic-current', userId: 'fixture', createdAt: '2026-10-24T08:00:00Z', updatedAt: '2026-10-24T08:00:00Z', expiresAt: '2030-10-24T08:00:00Z', userAgent: 'Test browser' };
async function fixture(page: Page, role: 'super_admin' | 'tenant_admin' | 'member' | 'anonymous') {
  let name = 'Fixture';
  let others = true;
  const writes: { path: string; body: unknown }[] = [];
  await page.route('**/api/**', (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST') writes.push({ path, body: request.postDataJSON() });
    const user = { id: 'fixture', name, email: 'fixture@example.test' };
    if (path === '/api/me') return route.fulfill({ status: role === 'anonymous' ? 401 : 200, json: { user, access: { actorId: 'fixture', platformRole: role === 'super_admin' ? role : null, tenantRole: role === 'super_admin' ? null : role, tenantId: role === 'super_admin' ? null : tenant, handle: null } } });
    if (path === '/api/auth/get-session') return route.fulfill({ json: role === 'anonymous' ? null : { user, session } });
    if (path === '/api/auth/list-sessions') return route.fulfill({ json: others ? [session, { ...session, id: 'other', token: 'synthetic-other', userAgent: 'Other browser' }] : [session] });
    if (path === '/api/auth/update-user') { name = request.postDataJSON().name; return route.fulfill({ json: { status: true } }); }
    if (path === '/api/auth/revoke-other-sessions') { others = false; return route.fulfill({ json: { status: true } }); }
    if (path === '/api/platform/tenants') return route.fulfill({ json: [{ id: tenant, name: 'Organization' }] });
    if (path === '/api/platform/docs') return route.fulfill({ status: role === 'super_admin' ? 200 : 403, json: { fr: [{ title: 'Guide des organisations', text: 'Contenu réservé aux super-admins.' }], en: [{ title: 'Organization guide', text: 'Content restricted to super-admins.' }] } });
    if (path === '/api/access-link') return route.fulfill({ json: { url: 'http://127.0.0.1:4173/signup?link=' + link } });
    if (path === '/api/access-requests') return route.fulfill({ status: request.method() === 'POST' ? 202 : 200, json: request.method() === 'POST' ? { received: true } : [] });
    return route.fulfill({ json: [] });
  });
  return writes;
}

for (const locale of ['fr', 'en'] as const) {
  for (const width of [375, 768, 1280]) {
    test(`new pages, persistence calls and navigation (${locale}, ${width}px)`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((value) => localStorage.setItem('locale', value), locale);
      const writes = await fixture(page, 'tenant_admin');
      await page.goto('/signup');
      await expect(page.getByText(locale === 'fr' ? /utilisez le lien partagé/ : /use the link shared/)).toBeVisible();
      await expect(page.getByRole('textbox', { name: locale === 'fr' ? 'Prénom' : 'First name', exact: true })).toHaveCount(0);
      await page.goto('/signup?link=' + link);
      await page.getByLabel(locale === 'fr' ? 'Prénom' : 'First name', { exact: true }).focus();
      await page.keyboard.press('Tab');
      await expect(page.getByLabel(locale === 'fr' ? 'Nom de famille' : 'Last name', { exact: true })).toBeFocused();
      await page.getByLabel(locale === 'fr' ? 'Prénom' : 'First name', { exact: true }).fill('Test');
      await page.getByLabel(locale === 'fr' ? 'Nom de famille' : 'Last name', { exact: true }).fill('Candidate');
      await page.getByLabel(locale === 'fr' ? 'Adresse email' : 'Email address', { exact: true }).fill('candidate@example.test');
      await page.screenshot({ path: testInfo.outputPath('signup-form.png'), fullPage: true });
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.screenshot({ path: testInfo.outputPath('signup-form-dark.png'), fullPage: true });
      await page.emulateMedia({ colorScheme: 'light' });
      await page.getByRole('button', { name: locale === 'fr' ? 'Demander un accès' : 'Request access', exact: true }).click();
      await expect(page.getByRole('status')).toContainText(locale === 'fr' ? 'votre demande a été enregistrée' : 'your request has been recorded');
      expect(writes.find((entry) => entry.path === '/api/access-requests')?.body).toEqual({ link, firstName: 'Test', lastName: 'Candidate', email: 'candidate@example.test' });
      await page.screenshot({ path: testInfo.outputPath('signup.png'), fullPage: true });
      for (const path of ['/app/profile', '/app/members', '/app/invitations']) {
        await page.goto(path);
        const title = path.endsWith('profile') ? (locale === 'fr' ? 'Mon profil' : 'My profile') : path.endsWith('members') ? (locale === 'fr' ? 'Membres' : 'Members') : (locale === 'fr' ? 'Invitations' : 'Invitations');
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
        if (path.endsWith('profile')) {
          await page.getByLabel(locale === 'fr' ? 'Nom affiché' : 'Display name').fill('Updated');
          await page.getByRole('button', { name: locale === 'fr' ? 'Enregistrer' : 'Save', exact: true }).click();
          await expect(page.getByRole('status')).toContainText(locale === 'fr' ? 'Votre nom a été enregistré' : 'Your name has been saved');
          await expect(page.getByLabel(locale === 'fr' ? 'Email du compte' : 'Account email')).toHaveAttribute('readonly', '');
          await page.getByRole('button', { name: locale === 'fr' ? 'Déconnecter mes autres appareils' : 'Sign out my other devices' }).click();
          await page.getByRole('dialog').getByRole('button', { name: locale === 'fr' ? 'Confirmer' : 'Confirm', exact: true }).click();
          await expect(page.getByText('Other browser', { exact: true })).toHaveCount(0);
          await expect(page.getByText('Test browser', { exact: true })).toBeVisible();
        }
        if (path.endsWith('invitations')) {
          await expect(page.getByText(locale === 'fr' ? 'Aucune invitation.' : 'No invitations.', { exact: true })).toBeVisible();
          await page.getByRole('button', { name: locale === 'fr' ? 'Obtenir le lien de demande d’accès' : 'Get an access-request link' }).click();
          await expect(page.getByLabel(locale === 'fr' ? 'Lien à partager avec les candidats' : 'Link to share with applicants')).toHaveValue(/signup\?link=/);
        }
        if (path.endsWith('members')) await expect(page.getByText(locale === 'fr' ? 'Aucun membre.' : 'No members.', { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(path.split('/').at(-1) + '.png'), fullPage: true });
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.screenshot({ path: testInfo.outputPath(path.split('/').at(-1) + '-dark.png'), fullPage: true });
        await page.emulateMedia({ colorScheme: 'light' });
      }
      expect(writes.find((entry) => entry.path === '/api/auth/update-user')?.body).toEqual({ name: 'Updated' });
    });
    test(`super-admin profile and protected documentation (${locale}, ${width}px)`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((value) => localStorage.setItem('locale', value), locale);
      await fixture(page, 'super_admin');
      for (const path of ['/admin/profile', '/docs']) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(path === '/docs' ? 'Documentation' : locale === 'fr' ? 'Mon profil' : 'My profile');
        if (path === '/docs') await expect(page.getByRole('heading', { name: locale === 'fr' ? 'Guide des organisations' : 'Organization guide' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(path === '/docs' ? 'docs.png' : 'admin-profile.png'), fullPage: true });
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.screenshot({ path: testInfo.outputPath(path === '/docs' ? 'docs-dark.png' : 'admin-profile-dark.png'), fullPage: true });
        await page.emulateMedia({ colorScheme: 'light' });
      }
    });
  }
}
test('anonymous visitors and ordinary members cannot access protected pages', async ({ page }) => {
  await fixture(page, 'anonymous');
  await page.goto('/docs');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.unroute('**/api/**');
  await fixture(page, 'member');
  for (const path of ['/docs', '/admin/profile', '/app/members', '/app/invitations']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/403$/);
    await expect(page.getByRole('heading', { name: /403/ })).toBeVisible();
  }
});
