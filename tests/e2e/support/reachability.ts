import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

async function expectUnobscured(page: Page, control: Locator) {
  const navigation = await page.locator('.ui-bottom-nav').isVisible() ? await page.locator('.ui-bottom-nav').boundingBox() : null;
  await expect.poll(async () => { const box = await control.boundingBox(); return (box?.y ?? 0) + (box?.height ?? 0); }).toBeLessThanOrEqual(navigation?.y ?? page.viewportSize()?.height ?? 900);
  const bounds = await control.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds?.y).toBeGreaterThanOrEqual(0);
  expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(navigation?.y ?? page.viewportSize()?.height ?? 900);
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.width ?? 1280);
}

export async function proveFormReachability(page: Page, prefix: string) {
  for (const [formIndex, form] of (await page.locator('main form').all()).entries()) {
    const controls: Locator[] = [];
    for (const [controlIndex, control] of (await form.locator('input,select,textarea,button').all()).entries()) {
      if (!await control.isVisible()) continue;
      await control.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
      await expectUnobscured(page, control);
      if (await control.evaluate((element) => element.tagName === 'BUTTON')) {
        await page.screenshot({ path: `specs/002-b2b-organizations-rbac/evidence/ui/reachability/${prefix}-form-${formIndex}-scroll-action-${controlIndex}.png` });
      }
      if (await control.isEnabled()) controls.push(control);
    }
    const first = controls[0];
    if (!first) continue;
    await first.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await first.focus();
    for (const [index, control] of controls.entries()) {
      if (index > 0) await page.keyboard.press('Tab');
      await expect(control).toBeFocused();
      await expectUnobscured(page, control);
      if (await control.evaluate((element) => element.tagName === 'BUTTON')) {
        await page.screenshot({ path: `specs/002-b2b-organizations-rbac/evidence/ui/reachability/${prefix}-form-${formIndex}-action-${index}.png` });
      }
    }
  }
}
