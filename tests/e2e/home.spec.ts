import { expect, test } from '@playwright/test';

test('foundation is readable and navigation works on desktop and mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Enterprise AI OS');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Intelligence.Avec intention.');
  await page.getByLabel('Langue').selectOption('en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Intelligence.With intention.');
  await page.getByRole('link', { name: 'Explore the foundation' }).click();
  await expect(page).toHaveURL(/#foundation$/);
  await expect(page.getByRole('heading', { name: 'Trust at the core' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
