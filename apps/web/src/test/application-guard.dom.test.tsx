// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Application } from '../application';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock('../http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../http')>();
  return { ...actual, api: mocks.api };
});

const user = { id: 'user-1', name: 'Test User', email: 'test@example.test' };

afterEach(() => {
  cleanup();
  mocks.api.mockReset();
});

describe('Application access guard', () => {
  it('refuses a non super-admin on the admin surface', async () => {
    mocks.api.mockResolvedValueOnce({ user, access: { tenantId: 'tenant-1' } });
    render(
      <MemoryRouter initialEntries={['/admin/roles']}>
        <Routes>
          <Route path="/admin/*" element={<Application adminOnly />} />
          <Route path="/403" element={<p>access denied surface</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('access denied surface')).toBeTruthy());
    expect(mocks.api).toHaveBeenCalledWith('/api/me', expect.anything());
  });

  it('redirects a super-admin from the tenant surface to the admin surface', async () => {
    mocks.api.mockResolvedValueOnce({ user, access: { platformRole: 'super_admin' } });
    render(
      <MemoryRouter initialEntries={['/app/members']}>
        <Routes>
          <Route path="/app/*" element={<Application />} />
          <Route path="/admin/*" element={<p>admin surface</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('admin surface')).toBeTruthy());
  });
});
