import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { Pool } from 'pg';
import { readAuthConfig } from '../../apps/api/src/auth/config';

export function liveConfig() {
  const config = readAuthConfig();
  if (
    !config ||
    !process.env.AUTH_TEST_MAILPIT_URL ||
    !new URL(config.databaseURL).pathname.startsWith('/enterprise_auth_test')
  )
    throw new Error(
      'Explicit disposable PostgreSQL and Mailpit configuration required',
    );
  return config;
}
export async function resetTestLimits() {
  const config = liveConfig();
  const operatorURL = process.env.AUTH_TEST_MIGRATION_DATABASE_URL;
  if (
    !operatorURL ||
    new URL(operatorURL).pathname !== new URL(config.databaseURL).pathname
  )
    throw new Error('Test operator must target the disposable database');
  const pool = new Pool({ connectionString: operatorURL });
  try {
    await pool.query('DELETE FROM identity."rateLimit"');
  } finally {
    await pool.end();
  }
}
export async function mailLink(
  request: APIRequestContext,
  email: string,
  subject: string,
) {
  const mailbox = process.env.AUTH_TEST_MAILPIT_URL!;
  let id = '';
  await expect
    .poll(
      async () => {
        const response = await request.get(
          mailbox + '/api/v1/search?query=' + encodeURIComponent('to:' + email),
        );
        const data = (await response.json()) as {
          messages?: { ID: string; Subject: string }[];
        };
        id =
          data.messages?.find((message) => message.Subject.startsWith(subject))
            ?.ID ?? '';
        return Boolean(id);
      },
      { timeout: 10000 },
    )
    .toBe(true);
  const response = await request.get(mailbox + '/api/v1/message/' + id);
  const data = (await response.json()) as { Text?: string };
  const url = data.Text?.match(/https?:\/\/\S+/)?.[0];
  if (!url) throw new Error('Expected a test-mail link');
  return url;
}
export async function activate(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
) {
  await page.goto(await mailLink(request, email, 'Vérifier'));
  await page.locator('.auth-navigation select').selectOption('fr');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByRole('button', { name: 'Envoyer le lien' }).click();
  await expect(page.getByRole('status')).toContainText('Si ce compte existe');
  await page.goto(await mailLink(request, email, 'Définir'));
  await page.getByLabel('Nouveau mot de passe').fill(password);
  await page.getByRole('button', { name: 'Définir mon mot de passe' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Votre mot de passe a été enregistré',
  );
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
}
