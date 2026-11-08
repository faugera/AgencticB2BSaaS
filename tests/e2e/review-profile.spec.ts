import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openSidebar } from './support/sidebar';

const tenants = ['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'] as const;
const profile = (first: string) => ({ first_name: first, last_name: 'Person', email: 'person@example.test', is_email_verified: true, avatar_url: null, phone_number: null, job_title: null, department: null, created_at: '2026-10-24T08:00:00Z', updated_at: '2026-10-24T08:00:00Z' });
async function fixture(page: Page, locale = 'fr', theme = 'light') {
 await page.addInitScript((values) => { localStorage.setItem('locale', values.locale); localStorage.setItem('theme', values.theme); }, { locale, theme });
 await page.route('**/api/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/me') return route.fulfill({ json: { user: { id: 'actor', name: 'Person', email: 'person@example.test' }, access: { actorId: 'actor', platformRole: 'super_admin', tenantId: null, tenantRole: null } } });
  if (path === '/api/tenants') return route.fulfill({ json: tenants.map((id, index) => ({ id, name: `Tenant ${index + 1}` })) });
  if (path === '/api/profile') return route.fulfill({ json: profile('Initial') });
  if (path === '/api/preferences') return route.fulfill({ json: { locale: 'fr', theme: 'light', timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' } });
  return route.fulfill({ json: path === '/api/auth/get-session' ? null : [] });
 });
}

test('changement de tenant : aucune saisie précédente pendant ou après le chargement', async ({ page }) => {
 await fixture(page);
 let release: () => void = () => {};
 const waiting = new Promise<void>((resolve) => { release = resolve; });
 await page.route('**/api/profile*', async (route) => {
  const tenant = new URL(route.request().url()).searchParams.get('tenantId');
  if (tenant === tenants[1]) await waiting;
  await route.fulfill({ json: profile(tenant === tenants[1] ? 'Tenant B' : 'Tenant A') });
 });
 await page.goto('/admin/profile?tenantId=' + tenants[0]);
 await page.getByLabel('Prénom', { exact: true }).fill('Saisie privée');
 await openSidebar(page);
 await page.getByLabel('Tenant actif').selectOption(tenants[1]);
 await expect(page.getByLabel('Prénom', { exact: true })).toHaveCount(0);
 release();
 await expect(page.getByLabel('Prénom', { exact: true })).toHaveValue('Tenant B');
});

test('préférences : chargement partagé et écritures sans écraser les autres champs', async ({ page }) => {
 await fixture(page);
 let releaseLoad: () => void = () => {};
 let releaseWrite: () => void = () => {};
 const loading = new Promise<void>((resolve) => { releaseLoad = resolve; });
 const writing = new Promise<void>((resolve) => { releaseWrite = resolve; });
 let reads = 0;
 let preferences = { locale: 'fr', theme: 'light', timezone: 'America/Toronto', date_format: 'YYYY-MM-DD' };
 await page.route('**/api/preferences', async (route) => {
  if (route.request().method() === 'GET') { reads++; await loading; return route.fulfill({ json: preferences }); }
  preferences = { ...preferences, ...route.request().postDataJSON() };
  await writing;
  return route.fulfill({ json: preferences });
 });
 await page.goto('/admin/profile');
 const timezone = page.getByLabel('Fuseau horaire');
 await expect(timezone).toBeDisabled();
 releaseLoad();
 await expect(timezone).toHaveValue('America/Toronto');
 expect(reads).toBe(1);
 await timezone.fill('Europe/London');
 await page.getByLabel('Format de date').selectOption('MM/DD/YYYY');
 await page.getByRole('heading', { name: 'Préférences de date' }).locator('..').getByRole('button', { name: 'Enregistrer' }).click();
 await openSidebar(page);
 await expect(page.getByLabel('Thème', { exact: true })).toBeDisabled();
 releaseWrite();
 await expect(page.getByLabel('Thème', { exact: true })).toBeEnabled();
 await page.getByLabel('Thème', { exact: true }).selectOption('dark');
 await expect.poll(() => preferences).toEqual({ locale: 'fr', theme: 'dark', timezone: 'Europe/London', date_format: 'MM/DD/YYYY' });
});

test('préférences : une erreur de chargement interdit une écriture avec des valeurs par défaut', async ({ page }) => {
 await fixture(page);
 let writes = 0;
 await page.route('**/api/preferences', (route) => {
  if (route.request().method() === 'PUT') writes++;
  return route.fulfill({ status: 500, json: { code: 'ERROR' } });
 });
 await page.goto('/admin/profile');
 await expect(page.getByLabel('Fuseau horaire')).toBeDisabled();
 await expect(page.getByRole('alert').first()).toBeVisible();
 expect(writes).toBe(0);
});

test('préférences : une sauvegarde en cours survit au démontage et au remontage', async ({ page }) => {
 await fixture(page);
 let releaseWrite: () => void = () => {};
 let sawWrite: () => void = () => {};
 const writing = new Promise<void>((resolve) => { releaseWrite = resolve; });
 const writeStarted = new Promise<void>((resolve) => { sawWrite = resolve; });
 let reads = 0;
 let preferences = { locale: 'fr', theme: 'light', timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' };
 await page.route('**/api/preferences', async (route) => {
  if (route.request().method() === 'GET') { reads++; return route.fulfill({ json: preferences }); }
  const next = route.request().postDataJSON();
  sawWrite();
  await writing;
  preferences = { ...preferences, ...next };
  return route.fulfill({ json: preferences });
 });
 await page.goto('/admin/profile');
 const timezone = page.getByLabel('Fuseau horaire');
 await expect(timezone).toBeEnabled();
 await timezone.fill('Europe/London');
 await page.getByRole('heading', { name: 'Préférences de date' }).locator('..').getByRole('button', { name: 'Enregistrer' }).click();
 await writeStarted;
 await page.evaluate(() => { history.pushState(null, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); });
 await expect(page.getByRole('heading', { name: 'Informations du profil' })).toHaveCount(0);
 await page.evaluate(() => { history.pushState(null, '', '/admin/profile'); window.dispatchEvent(new PopStateEvent('popstate')); });
 await expect(page.getByLabel('Fuseau horaire')).toBeDisabled();
 expect(reads).toBe(1);
 releaseWrite();
 await expect(page.getByLabel('Fuseau horaire')).toHaveValue('Europe/London');
 await openSidebar(page);
 await page.getByLabel('Thème', { exact: true }).selectOption('dark');
 await expect.poll(() => preferences).toEqual({ locale: 'fr', theme: 'dark', timezone: 'Europe/London', date_format: 'DD/MM/YYYY' });
});

test('préférences : le changement de thème dans un autre onglet est conservé', async ({ page, context }) => {
 await fixture(page);
 let preferences = { locale: 'fr', theme: 'light', timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' };
 await page.route('**/api/preferences', (route) => {
  if (route.request().method() === 'PUT') preferences = { ...preferences, ...route.request().postDataJSON() };
  return route.fulfill({ json: preferences });
 });
 await page.goto('/admin/profile');
 await expect(page.getByLabel('Fuseau horaire')).toBeEnabled();
 const other = await context.newPage();
 await other.goto('/');
 preferences.theme = 'dark';
 await other.evaluate(() => localStorage.setItem('theme', 'dark'));
 await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
 await page.getByLabel('Fuseau horaire').fill('Europe/London');
 await page.getByRole('heading', { name: 'Préférences de date' }).locator('..').getByRole('button', { name: 'Enregistrer' }).click();
 await expect.poll(() => preferences).toEqual({ locale: 'fr', theme: 'dark', timezone: 'Europe/London', date_format: 'DD/MM/YYYY' });
 await other.evaluate(() => { localStorage.setItem('preferences.identity', 'other-actor'); localStorage.setItem('theme', 'light'); });
 await page.getByLabel('Fuseau horaire').fill('Europe/Berlin');
 await page.getByRole('heading', { name: 'Préférences de date' }).locator('..').getByRole('button', { name: 'Enregistrer' }).click();
 await expect.poll(() => preferences).toEqual({ locale: 'fr', theme: 'dark', timezone: 'Europe/Berlin', date_format: 'DD/MM/YYYY' });
 await other.close();
});

test('préférences : une réponse tardive conserve le thème écrit par un autre onglet', async ({ page, context }) => {
 await fixture(page);
 let releaseFirst: () => void = () => {};
 let firstStarted: () => void = () => {};
 const firstWrite = new Promise<void>((resolve) => { releaseFirst = resolve; });
 const started = new Promise<void>((resolve) => { firstStarted = resolve; });
 let delayed = false;
 let preferences = { locale: 'fr', theme: 'light', timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' };
 const writes: { tab: string; body: unknown }[] = [];
 const other = await context.newPage();
 await fixture(other);
 for (const tab of [page, other]) {
  await tab.route('**/api/preferences', async (route) => {
   if (route.request().method() === 'GET') return route.fulfill({ json: preferences });
   const next = route.request().postDataJSON();
   writes.push({ tab: tab === page ? 'A' : 'B', body: next });
   preferences = { ...preferences, ...next };
   const response = { ...preferences };
   if (tab === page && !delayed) { delayed = true; firstStarted(); await firstWrite; }
   return route.fulfill({ json: response });
  });
 }
 await page.goto('/admin/profile');
 await expect(page.getByLabel('Fuseau horaire')).toBeEnabled();
 await other.goto('/admin/profile');
 await expect(other.getByLabel('Fuseau horaire')).toBeEnabled();
 await page.getByLabel('Fuseau horaire').fill('Europe/London');
 await page.getByRole('heading', { name: 'Préférences de date' }).locator('..').getByRole('button', { name: 'Enregistrer' }).click();
 await started;
 await openSidebar(other);
 await other.getByLabel('Thème', { exact: true }).selectOption('dark');
 await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
 releaseFirst();
 await expect(page.getByLabel('Fuseau horaire')).toBeEnabled();
 await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
 await page.getByLabel('Fuseau horaire').fill('Europe/Berlin');
 await page.getByRole('heading', { name: 'Préférences de date' }).locator('..').getByRole('button', { name: 'Enregistrer' }).click();
 await expect.poll(() => preferences).toEqual({ locale: 'fr', theme: 'dark', timezone: 'Europe/Berlin', date_format: 'DD/MM/YYYY' });
 expect(writes).toEqual([{ tab: 'A', body: { timezone: 'Europe/London' } }, { tab: 'B', body: { theme: 'dark' } }, { tab: 'A', body: { timezone: 'Europe/Berlin' } }]);
 await other.close();
});

test('compte neuf : la première sauvegarde conserve la langue et le thème locaux', async ({ page }) => {
 await fixture(page, 'en', 'dark');
 let preferences: { locale: string; theme: string; timezone: string; date_format: string } | null = null;
 await page.route('**/api/preferences*', (route) => {
  const request = route.request();
  if (request.method() === 'GET') return route.fulfill({ json: preferences });
  const body = request.postDataJSON();
  if (request.method() === 'POST') preferences ??= { ...body, timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' };
  else preferences = { locale: 'fr', theme: 'system', timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY', ...preferences, ...body };
  return route.fulfill({ json: preferences });
 });
 await page.goto('/admin/profile');
 const timezone = page.getByLabel('Time zone');
 await expect(timezone).toBeEnabled();
 await timezone.fill('Europe/London');
 await page.getByRole('heading', { name: 'Date preferences' }).locator('..').getByRole('button', { name: 'Save' }).click();
 await expect.poll(() => preferences).toEqual({ locale: 'en', theme: 'dark', timezone: 'Europe/London', date_format: 'DD/MM/YYYY' });
 await expect(page.locator('html')).toHaveAttribute('lang', 'en');
 await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('compte neuf : une initialisation concurrente conserve la valeur déjà créée', async ({ page }) => {
 await fixture(page, 'en', 'dark');
 let preferences: { locale: string; theme: string; timezone: string; date_format: string } | null = null;
 let release: () => void = () => {};
 let sawPost: () => void = () => {};
 const waiting = new Promise<void>((resolve) => { release = resolve; });
 const started = new Promise<void>((resolve) => { sawPost = resolve; });
 await page.route('**/api/preferences', async (route) => {
  if (route.request().method() === 'GET') return route.fulfill({ json: preferences });
  sawPost();
  await waiting;
  preferences ??= { ...route.request().postDataJSON(), timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' };
  return route.fulfill({ json: preferences });
 });
 await page.goto('/admin/profile');
 await started;
 preferences = { locale: 'fr', theme: 'light', timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' };
 release();
 await expect(page.getByLabel('Fuseau horaire')).toBeEnabled();
 await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
 await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
