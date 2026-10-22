import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { readAuthConfig } from '../../apps/api/src/auth/config';
import { createMailer } from '../../apps/api/src/auth/mail';
import { inviteIdentity } from '../../apps/api/src/auth/operator';

test('invited identity activates, sets password, signs in and signs out with PostgreSQL and SMTP', async ({ page, request }) => {
  const config = readAuthConfig();
  const mailbox = process.env.AUTH_TEST_MAILPIT_URL;
  if (!config || !mailbox || !new URL(config.databaseURL).pathname.startsWith('/enterprise_auth_test')) {
    throw new Error('Live authentication E2E requires explicit auth config, a test database and Mailpit');
  }
  const email = `browser-${randomBytes(8).toString('hex')}@example.test`;
  const password = randomBytes(24).toString('base64url');
  const mailer = createMailer(config.smtp);
  try { await inviteIdentity(config, mailer.send, email, 'Browser test'); }
  finally { mailer.close(); }

  async function mailLink(subject: string) {
    let id = '';
    await expect.poll(async () => {
      const response = await request.get(mailbox + '/api/v1/search?query=' + encodeURIComponent('to:' + email));
      const data = await response.json() as { messages?: { ID: string; Subject: string }[] };
      id = data.messages?.find((message) => message.Subject.startsWith(subject))?.ID ?? '';
      return Boolean(id);
    }, { timeout: 10000 }).toBe(true);
    const response = await request.get(mailbox + '/api/v1/message/' + id);
    const data = await response.json() as { Text?: string };
    const url = data.Text?.match(/https?:\/\/\S+/)?.[0];
    if (!url) throw new Error('Expected a verification/recovery link in the test mailbox');
    return url;
  }

  await page.goto(await mailLink('Vérifier'));
  await expect(page.getByRole('heading', { name: 'Retrouver votre accès' })).toBeVisible();
  await page.getByLabel('Adresse email').fill(email);
  await page.getByRole('button', { name: 'Envoyer le lien' }).click();
  await expect(page.getByRole('status')).toContainText('Si ce compte existe');
  await page.goto(await mailLink('Définir'));
  await page.getByLabel('Nouveau mot de passe').fill(password);
  await page.getByRole('button', { name: 'Définir mon mot de passe' }).click();
  await expect(page.getByRole('status')).toContainText('Votre mot de passe a été enregistré');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenue, Browser test.' })).toBeVisible();
  expect((await page.request.get('/api/me')).status()).toBe(200);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeVisible();
  expect((await page.request.get('/api/me')).status()).toBe(401);
});
