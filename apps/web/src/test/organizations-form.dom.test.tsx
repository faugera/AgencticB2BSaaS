// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { Organizations } from '../pages/Organizations';

const mocks = vi.hoisted(() => ({ api: vi.fn(), mutate: vi.fn() }));

vi.mock('../http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../http')>();
  return { ...actual, api: mocks.api, mutate: mocks.mutate };
});

function required<T extends Element>(value: T | null): T {
  if (!value) throw new Error('missing form element');
  return value;
}

afterEach(() => {
  cleanup();
  mocks.api.mockReset();
  mocks.mutate.mockReset();
});

describe('Organizations tenant form', () => {
  it('submits the tenant creation through mutate', async () => {
    mocks.api.mockImplementation((path: string) => {
      if (path === '/api/organizations') return Promise.resolve([{ id: 'org-1', name: 'Org A' }]);
      if (path === '/api/tenants') return Promise.resolve([]);
      return Promise.reject(new Error(`unexpected request ${path}`));
    });
    mocks.mutate.mockResolvedValue({ delivery: 'pending' });

    const { container } = render(<Organizations superAdmin={false} />);
    const select = await waitFor(() => required(container.querySelector<HTMLSelectElement>('select[name="organizationId"]')));
    fireEvent.change(select, { target: { value: 'org-1' } });
    fireEvent.change(required(container.querySelector<HTMLInputElement>('input[name="name"]')), { target: { value: 'Tenant A' } });
    fireEvent.change(required(container.querySelector<HTMLInputElement>('input[name="adminEmail"]')), { target: { value: 'admin@example.test' } });
    fireEvent.submit(required(container.querySelector('form')));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith('/api/organizations/org-1/tenants', {
        name: 'Tenant A',
        adminEmail: 'admin@example.test',
      }),
    );
    expect(mocks.api).not.toHaveBeenCalledWith('/api/organizations/org-1/tenants', expect.anything());
  });

  it('keeps client organization creation on the non idempotent path', async () => {
    mocks.api.mockImplementation((path: string) => {
      if (path === '/api/organizations') return Promise.resolve([]);
      if (path === '/api/tenants') return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    const { container } = render(<Organizations superAdmin />);
    const organizationForm = await waitFor(() => {
      const form = [...container.querySelectorAll('form')].find((item) => !item.querySelector('select[name="organizationId"]'));
      return required(form ?? null);
    });
    fireEvent.change(required(organizationForm.querySelector<HTMLInputElement>('input[name="name"]')), { target: { value: 'Org B' } });
    fireEvent.submit(organizationForm);

    await waitFor(() => expect(mocks.api).toHaveBeenCalledWith('/api/organizations', { name: 'Org B' }));
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
