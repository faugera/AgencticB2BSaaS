import { describe, expect, it } from 'vitest';
import { requestDigest } from './outbox-store.js';

describe('canonical request digests', () => {
  it('is independent of object key order, including nested request values', () => {
    expect(
      requestDigest({
        method: 'POST',
        params: { organizationId: 'org', tenantId: 'tenant' },
        body: { name: 'Acme', administrator: { email: 'admin@example.test' } },
      }),
    ).toBe(
      requestDigest({
        body: { administrator: { email: 'admin@example.test' }, name: 'Acme' },
        params: { tenantId: 'tenant', organizationId: 'org' },
        method: 'POST',
      }),
    );
  });

  it('changes when a route scope or mutation body changes', () => {
    const request = {
      method: 'POST',
      route: '/api/organizations/:id/tenants',
      params: { id: 'organization-a' },
      body: { name: 'Acme' },
    };
    expect(requestDigest(request)).not.toBe(
      requestDigest({
        ...request,
        params: { id: 'organization-b' },
      }),
    );
    expect(requestDigest(request)).not.toBe(
      requestDigest({ ...request, body: { name: 'Other' } }),
    );
  });
});
