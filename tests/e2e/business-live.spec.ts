import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { expect, test } from '@playwright/test';
import { createAuth, createAuthPool } from '../../apps/api/src/auth/service';
import { openSidebar, closeSidebar } from './support/sidebar';
import {
  liveConfig,
  resetTestLimits,
  mailLink,
  activate,
} from '../helpers/live-auth';

test.beforeEach(resetTestLimits);
test('operator creates a tenant; verified invitee accepts and manages a private workspace', async ({
  page,
  request,
}) => {
  const config = liveConfig();
  const pool = createAuthPool(config.databaseURL);
  const operator = new Pool({
    connectionString: process.env.AUTH_TEST_MIGRATION_DATABASE_URL,
  });
  const password = randomBytes(24).toString('base64url');
  let email = '';
  try {
    const mail: { text: string }[] = [];
    const auth = createAuth(
      config,
      pool,
      async (message) => {
        mail.push(message);
      },
      true,
    );
    const existing = await operator.query<{
      identity_id: string;
      email: string;
    }>(
      'SELECT a.identity_id,u.email FROM authorization_private.actors a JOIN identity."user" u ON u.id=a.identity_id WHERE platform_role=\'super_admin\'',
    );
    if (existing.rowCount) {
      email = existing.rows[0]!.email;
      if (!/^(?:isolation-|browser-super-).*@example\.test$/.test(email))
        throw new Error('Refusing to modify a non-fixture operator');
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: config.baseURL + '/reset-password' },
      });
      const link = new URL(mail.at(-1)!.text.match(/https?:\/\/\S+/)![0]);
      await auth.api.resetPassword({
        body: {
          token: link.pathname.split('/').at(-1)!,
          newPassword: password,
        },
      });
    } else {
      email = `browser-super-${randomBytes(8).toString('hex')}@example.test`;
      const account = await auth.api.signUpEmail({
        body: { email, name: 'Browser operator', password },
      });
      await operator.query(
        'UPDATE identity."user" SET "emailVerified"=true WHERE id=$1',
        [account.user.id],
      );
      await operator.query('SELECT business.bootstrap_super($1,$2)', [
        account.user.id,
        'browser-operator',
      ]);
    }
  } finally {
    await Promise.all([pool.end(), operator.end()]);
  }
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Vue d’ensemble' }),
  ).toBeVisible();
  const tenantName = 'Pilot ' + randomBytes(5).toString('hex');
  const adminEmail = `browser-admin-${randomBytes(8).toString('hex')}@example.test`;
  await page.getByLabel('Nom de l’organisation').fill(tenantName);
  await page.getByRole('button', { name: 'Créer l’organisation cliente', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Modification enregistrée');
  const organizationSelect = page.getByLabel('Organisation cliente', { exact: true });
  const organizationId = await organizationSelect.locator('option').filter({ hasText: tenantName }).getAttribute('value');
  if (!organizationId) throw new Error('Created organization is missing');
  await organizationSelect.selectOption(organizationId);
  await page.getByLabel('Nom du tenant', { exact: true }).fill(tenantName + ' — Paris');
  await page.getByLabel('Email de l’administrateur').fill(adminEmail);
  await page
    .getByRole('button', { name: 'Créer et inviter', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Modification enregistrée',
  );
  const invitation = await mailLink(request, adminEmail, 'Votre invitation');
  await openSidebar(page);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await activate(page, request, adminEmail, password);
  await page.goto(invitation);
  await expect(page).toHaveURL(/\/invite$/);
  await page.getByRole('button', { name: 'Accepter l’invitation' }).click();
  const general = page.getByRole('link', { name: 'General Privé' });
  await expect(general).toBeVisible();
  await general.click();
  await expect(
    page.getByRole('heading', { name: 'Attribuer un accès' }),
  ).toBeVisible();
  await page.getByLabel('Nom de l’espace').fill('Private pilot');
  const settings = page
    .locator('form')
    .filter({ has: page.getByLabel('Nom de l’espace') });
  await settings
    .getByRole('button', { name: 'Enregistrer', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Private pilot', exact: true }),
  ).toBeVisible();
  await openSidebar(page);
  await page.getByLabel('Langue').selectOption('en');
  await closeSidebar(page);
  await expect(
    page.getByRole('heading', { name: 'Assign access' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const me = await page.request.get('/api/me');
  expect(me.status()).toBe(200);
  expect((await me.json()).access.tenantRole).toBe('tenant_admin');
  await openSidebar(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
});
