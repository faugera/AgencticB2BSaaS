import { expect, test } from '@playwright/test';

const tenantId = '10000000-0000-4000-8000-000000000001';
const workspace1 = {
  id: '10000000-0000-4000-8000-000000000011',
  tenant_id: tenantId,
  name: 'Workspace one',
  visibility: 'tenant',
};
const workspace2 = {
  id: '10000000-0000-4000-8000-000000000012',
  tenant_id: tenantId,
  name: 'Workspace two',
  visibility: 'tenant',
};
const member1 = {
  id: '10000000-0000-4000-8000-000000000021',
  name: 'Member one',
  email: 'member-one@example.test',
  role: 'member',
};
const member2 = {
  id: '10000000-0000-4000-8000-000000000022',
  name: 'Member two',
  email: 'member-two@example.test',
  role: 'member',
};
const invitation1 = {
  id: '10000000-0000-4000-8000-000000000031',
  email: 'invite-one@example.test',
  role: 'member',
  expires_at: '2026-11-08T00:00:00.000Z',
  accepted_at: null,
  revoked_at: null,
  delivery: 'pending',
};
const invitation2 = {
  ...invitation1,
  id: '10000000-0000-4000-8000-000000000032',
  email: 'invite-two@example.test',
};

for (const locale of ['fr', 'en'] as const) {
  test(`cursor pagination stays keyboard accessible (${locale})`, async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      localStorage.setItem('locale', value);
      localStorage.setItem('theme', 'light');
    }, locale);
    await page.route('**/api/**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const path = requestUrl.pathname;
      const next = requestUrl.searchParams.has('before');
      if (path === '/api/me')
        return route.fulfill({
          json: {
            user: {
              id: '10000000-0000-4000-8000-000000000041',
              name: 'Admin',
              email: 'admin@example.test',
            },
            access: {
              actorId: '10000000-0000-4000-8000-000000000041',
              platformRole: null,
              tenantId,
              tenantRole: 'tenant_admin',
              handle: null,
              permissions: ['members.read', 'members.manage', 'invitations.manage'],
            },
            can_assign_workspace_roles: false,
          },
        });
      if (path === '/api/preferences')
        return route.fulfill({ json: { locale, theme: 'light' } });
      if (path === '/api/workspaces')
        return route.fulfill({
          json: {
            items: [next ? workspace2 : workspace1],
            nextCursor: next ? null : 'workspace-cursor',
          },
        });
      if (path === '/api/members')
        return route.fulfill({
          json: {
            items: [next ? member2 : member1],
            nextCursor: next ? null : 'member-cursor',
          },
        });
      if (path === '/api/invitations')
        return route.fulfill({
          json: {
            items: [next ? invitation2 : invitation1],
            nextCursor: next ? null : 'invitation-cursor',
          },
        });
      return route.fulfill({ json: [] });
    });

    for (const { path, firstItem, secondItem } of [
      { path: '/app', firstItem: workspace1.name, secondItem: workspace2.name },
      { path: '/app/members', firstItem: member1.name, secondItem: member2.name },
      {
        path: '/app/invitations',
        firstItem: invitation1.email,
        secondItem: invitation2.email,
      },
    ]) {
      await page.goto(path + '?tenantId=' + tenantId);
      await expect(page.locator('main')).toContainText(firstItem);
      const more = page.getByRole('button', {
        name: locale === 'fr' ? 'Afficher plus' : 'Load more',
        exact: true,
      });
      await more.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('main')).toContainText(secondItem);
      await expect(page.locator('.ui-pagination-status')).toBeFocused();
      for (const width of [375, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
      }
    }
  });
}
