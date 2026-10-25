import { expect, test } from '@playwright/test';
import { openSidebar } from './support/sidebar';

test('admin visitors get a dedicated login and retain the admin destination through MFA', async ({ page }) => {
  await page.route('**/api/auth/get-session*', (route) => route.fulfill({ json: null }));
  await page.route('**/api/me', (route) => route.fulfill({ status: 401, json: { code: 'UNAUTHENTICATED' } }));
  await page.route('**/api/auth/sign-in/email', (route) => route.fulfill({ json: { twoFactorRedirect: true } }));
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('heading', { name: 'Connexion administrateur' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Compte de test local' })).toHaveCount(0);
  await page.getByLabel('Adresse email').fill('operator@example.test');
  await page.getByLabel('Mot de passe', { exact: true }).fill('synthetic-password-123');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login\/mfa$/);
  await expect(page.getByLabel('Code de votre application')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('ordinary members cannot open the admin panel', async ({ page }) => {
  await page.route('**/api/me', (route) => route.fulfill({
    json: { user: { id: 'member', name: 'Member', email: 'member@example.test' }, access: { platformRole: null, tenantRole: 'member' } },
  }));
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/403$/);
  await expect(page.getByRole('heading', { name: /403/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Administration de la plateforme' })).toHaveCount(0);
});

test('super-admin navigation and sign-out stay in the admin portal', async ({ page }) => {
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path === '/api/me'
      ? { user: { id: 'operator', name: 'Operator', email: 'operator@example.test' }, access: { platformRole: 'super_admin', tenantRole: null } }
      : path === '/api/auth/get-session' ? null
        : path === '/api/auth/sign-out' ? { success: true } : [] });
  });
  await page.goto('/app');
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Administration de la plateforme' })).toBeVisible();
  await openSidebar(page);
  await page.getByRole('link', { name: 'Sécurité du compte', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/security$/);
  await expect(page.getByLabel('Mot de passe actuel')).toBeVisible();
  await openSidebar(page);
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});
