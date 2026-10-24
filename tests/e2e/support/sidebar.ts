import type { Page } from '@playwright/test';
export async function openSidebar(page: Page) {
 if ((page.viewportSize()?.width ?? 1280) < 768 && !(await page.locator('.ui-sidebar').isVisible())) await page.getByRole('button', { name: 'Menu', exact: true }).click();
}
export async function closeSidebar(page: Page) {
 if ((page.viewportSize()?.width ?? 1280) < 768 && await page.locator('.ui-sidebar').isVisible()) await page.getByRole('button', { name: /^(Fermer le menu|Close menu)$/ }).first().click();
}
