import { expect, test } from '@playwright/test';

const session = {
  user: {
    id: 'synthetic',
    name: 'Pilot',
    email: 'pilot@example.test',
    emailVerified: true,
  },
  session: { id: 'synthetic-session', expiresAt: '2099-01-01T00:00:00.000Z' },
};
test('logged-in recovery stays accessible; login refuses an external destination', async ({
  page,
}) => {
  await page.route('**/api/auth/get-session*', (route) =>
    route.fulfill({ json: session }),
  );
  await page.route('**/api/me', (route) =>
    route.fulfill({ json: { user: session.user } }),
  );
  await page.route('**/api/preferences', (route) => route.fulfill({ json: null }));
  await page.route('**/api/workspaces', (route) => route.fulfill({ json: [] }));
  await page.goto('/reset-password?token=synthetic');
  await expect(page.getByLabel('Nouveau mot de passe')).toBeVisible();
  await page.goto('/forgot-password');
  await expect(page.getByLabel('Adresse email')).toBeVisible();
  await page.goto('/login?returnTo=https://evil.example');
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole('heading', { name: 'Espaces de travail', level: 1 }),
  ).toBeVisible();
});

test('login supports password visibility, keyboard submission and explicit throttling', async ({
  page,
}) => {
  await page.route('**/api/auth/get-session*', (route) =>
    route.fulfill({ json: null }),
  );
  await page.route('**/api/auth/sign-in/email', (route) =>
    route.fulfill({
      status: 429,
      json: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts' },
    }),
  );
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill('pilot@example.test');
  await page
    .getByLabel('Mot de passe', { exact: true })
    .fill('synthetic-password-123');
  await page.getByRole('button', { name: 'Afficher le mot de passe' }).click();
  await expect(
    page.getByLabel('Mot de passe', { exact: true }),
  ).toHaveAttribute('type', 'text');
  await page.getByLabel('Langue').selectOption('en');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue(
    'synthetic-password-123',
  );
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page.getByRole('alert')).toContainText('Too many attempts');
  await expect(page.getByRole('button', { name: /sign up/i })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('network errors do not disclose account information', async ({ page }) => {
  await page.route('**/api/auth/get-session*', (route) =>
    route.fulfill({ json: null }),
  );
  await page.route('**/api/auth/sign-in/email', (route) =>
    route.abort('failed'),
  );
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill('unknown@example.test');
  await page
    .getByLabel('Mot de passe', { exact: true })
    .fill('synthetic-password-123');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Impossible de terminer');
});

test('MFA challenge and recovery controls are translated and keyboard-accessible', async ({
  page,
}) => {
  await page.route('**/api/auth/get-session*', (route) =>
    route.fulfill({ json: null }),
  );
  await page.route('**/api/auth/two-factor/verify-backup-code', (route) =>
    route.fulfill({ status: 400, json: { code: 'INVALID_BACKUP_CODE' } }),
  );
  await page.goto('/login/mfa');
  await expect(page.getByLabel('Code de votre application')).toHaveAttribute(
    'autocomplete',
    'one-time-code',
  );
  await page
    .getByRole('button', { name: 'Utiliser un code de récupération' })
    .click();
  await page.getByLabel('Code de récupération').fill('synthetic-recovery');
  await page.getByLabel('Langue').selectOption('en');
  await page.getByLabel('Recovery code').press('Enter');
  await expect(page.getByRole('alert')).toContainText('Unable to complete');
});

test('unknown application routes return an accessible 404', async ({
  page,
}) => {
  await page.goto('/app/not-a-route');
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});

test('login remains usable in dark mode with visible keyboard focus', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.route('**/api/auth/get-session*', (route) =>
    route.fulfill({ json: null }),
  );
  await page.goto('/login');
  await expect(page.getByLabel('Adresse email')).toBeVisible();
  await page.getByLabel('Adresse email').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Mot de passe', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveCSS(
    'outline-style',
    'solid',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('login-dark.png'),
    fullPage: true,
  });
});
