import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openSidebar } from './support/sidebar';

const tenant = '10000000-0000-4000-8000-000000000001';
const id = (index: number) => '20000000-0000-4000-8000-' + String(index).padStart(12, '0');
async function fixture(page: Page, locale: string) {
  await page.addInitScript((value) => localStorage.setItem('locale', value), locale);
  let approved = false;
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === '/api/me') return route.fulfill({ json: { user: { id: 'op', name: 'Operator', email: 'op@example.test' }, access: { platformRole: 'super_admin', tenantRole: null } } });
    if (path === '/api/tenants') return route.fulfill({ json: [{ id: tenant, name: 'Organization A' }] });
    if (path === '/api/audit-logs') return route.fulfill({ json: { events: [], nextCursor: null } });
    if (path.startsWith('/api/access-requests/')) {
      approved = true;
      return route.fulfill({ json: { delivery: 'failed' } });
    }
    if (path === '/api/access-requests') return route.fulfill({ json: url.searchParams.has('before')
      ? [{ id: id(101), first_name: 'Older', last_name: 'Candidate', email: 'older@example.test', status: 'pending', created_at: '2026-01-01T00:00:00Z' }]
      : Array.from({ length: 100 }, (_, index) => ({ id: id(index + 1), first_name: 'Candidate', last_name: String(index + 1), email: `candidate${index + 1}@example.test`, status: approved && index === 0 ? 'approved' : 'pending', created_at: '2026-10-24T00:00:00Z' })) });
    if (path === '/api/invitations') return route.fulfill({ json: approved ? [{ id: id(500), email: 'candidate1@example.test', role: 'member', delivery: 'failed', accepted_at: null, revoked_at: null }] : [] });
    return route.fulfill({ json: path === '/api/auth/get-session' ? null : [] });
  });
}

for (const locale of ['fr', 'en'] as const) {
  test(`mobile menu releases desktop content and stays closed on return (${locale})`, async ({ page }) => {
    await fixture(page, locale);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/security');
    await openSidebar(page);
    await expect(page.locator('.ui-main-content')).toHaveAttribute('inert', '');
    for (const width of [768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('.ui-main-content')).not.toHaveAttribute('inert');
      const password = page.getByLabel(locale === 'fr' ? 'Mot de passe actuel' : 'Current password');
      await password.fill('synthetic-secret');
      await expect(password).toHaveValue('synthetic-secret');
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('.ui-sidebar')).toBeHidden();
    await expect(page.locator('.ui-main-content')).not.toHaveAttribute('inert');
  });

  test(`super-admin invitations redirect preserves tenant (${locale})`, async ({ page }) => {
    await fixture(page, locale);
    for (const path of ['/app/invitations', '/app/invitations/']) {
      await page.goto(path + '?tenantId=' + tenant);
      await expect(page).toHaveURL('/admin/members?tenantId=' + tenant);
      await expect(page.getByRole('button', { name: locale === 'fr' ? 'Inviter' : 'Invite', exact: true })).toBeVisible();
    }
  });

    test(`audit login and MFA preserve tenant destination (${locale})`, async ({ page }) => {
      await fixture(page, locale);
      let authenticated = false;
      await page.route('**/api/me*', (route) => route.fulfill(authenticated
        ? { json: { user: { id: 'op', name: 'Operator', email: 'op@example.test' }, access: { platformRole: 'super_admin', tenantRole: null } } }
        : { status: 401, json: { code: 'UNAUTHENTICATED' } }));
      await page.route('**/api/auth/sign-in/email', (route) => route.fulfill({ json: { twoFactorRedirect: true } }));
      await page.route('**/api/auth/two-factor/verify-totp', (route) => {
        authenticated = true;
        return route.fulfill({ json: { token: 'synthetic', user: { id: 'op' } } });
      });
      await page.goto('/admin/audit?tenantId=' + tenant);
      await expect(page.getByLabel(locale === 'fr' ? 'Adresse email' : 'Email address')).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/login$/);
      await page.getByLabel(locale === 'fr' ? 'Adresse email' : 'Email address').fill('op@example.test');
      await page.getByLabel(locale === 'fr' ? 'Mot de passe' : 'Password', { exact: true }).fill('synthetic-password-123');
      await page.getByRole('button', { name: locale === 'fr' ? 'Se connecter' : 'Sign in', exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/login\/mfa$/);
      const code = page.getByLabel(locale === 'fr' ? 'Code de votre application' : 'Authenticator code');
      await code.fill('123456');
      await expect(code).toHaveValue('123456');
      await page.getByRole('button', { name: locale === 'fr' ? 'Vérifier' : 'Verify', exact: true }).click();
      await expect(page).toHaveURL('/admin/audit?tenantId=' + tenant);
      await expect(page.getByRole('heading', { name: locale === 'fr' ? 'Journal d’audit' : 'Audit log', exact: true })).toBeVisible();
    });
    test(`request pagination and failed delivery refresh (${locale})`, async ({ page }) => {
      await fixture(page, locale);
      await page.goto('/admin/members?tenantId=' + tenant);
      const next = page.getByRole('button', { name: locale === 'fr' ? 'Demandes suivantes' : 'Next requests', exact: true });
      const previous = page.getByRole('button', { name: locale === 'fr' ? 'Demandes précédentes' : 'Previous requests', exact: true });
      await expect(previous).toBeDisabled();
      const query = page.waitForRequest((request) => new URL(request.url()).searchParams.get('before') === id(100));
      await next.click();
      expect(new URL((await query).url()).searchParams.get('tenantId')).toBe(tenant);
      await expect(page.getByText('older@example.test', { exact: true })).toBeVisible();
      await expect(next).toBeDisabled();
      await previous.scrollIntoViewIfNeeded();
      await previous.click();
      await page.getByRole('button', { name: locale === 'fr' ? 'Approuver et inviter' : 'Approve and invite', exact: true }).first().click();
      const row = page.getByRole('row').filter({ hasText: 'candidate1@example.test' });
      await expect(row).toBeVisible();
      await expect(row.getByRole('button', { name: locale === 'fr' ? 'Renvoyer' : 'Resend', exact: true })).toBeVisible();
      await row.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
}
