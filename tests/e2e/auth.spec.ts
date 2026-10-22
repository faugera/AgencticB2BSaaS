import { expect, test } from '@playwright/test';

test('auth UI preserves form state across languages and stays within viewport', async ({ page }) => {
  await page.route('**/api/auth/get-session*', (route) => route.fulfill({ json: null }));
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Votre espace commence ici.' })).toBeVisible();
  await page.getByLabel('Adresse email').fill('invited@example.test');
  await page.getByLabel('Langue').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByLabel('Email address')).toHaveValue('invited@example.test');
  await page.getByRole('button', { name: 'Forgot your password?' }).click();
  await expect(page.getByRole('heading', { name: 'Recover your access' })).toBeVisible();
  await page.getByLabel('Language').selectOption('fr');
  await expect(page.getByLabel('Adresse email')).toHaveValue('invited@example.test');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('recovery token is removed from the address bar and errors are localized', async ({ page }) => {
  await page.route('**/api/auth/get-session*', (route) => route.fulfill({ json: null }));
  await page.route('**/api/auth/reset-password', (route) => route.fulfill({ status: 400, json: { code: 'INVALID_TOKEN' } }));
  await page.goto('/auth/reset?token=not-a-real-token');
  await expect(page).toHaveURL(/\/auth\/reset$/);
  await page.getByLabel('Nouveau mot de passe').fill('unique-test-password-1234');
  await page.getByRole('button', { name: 'Définir mon mot de passe' }).click();
  await expect(page.getByRole('alert')).toContainText('Lien invalide ou expiré');
});
