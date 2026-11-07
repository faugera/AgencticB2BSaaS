import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  accessContextSchema,
  accessLinkSchema,
  accessRequestListSchema,
  accessReviewResultSchema,
  auditPageSchema,
  guideSchema,
  invitationListSchema,
  meSchema,
  memberListSchema,
  organizationSummaryListSchema,
  preferencesSchema,
  profileDetailsSchema,
  roleDefinitionListSchema,
  rolePersonListSchema,
  tenantSummaryListSchema,
  workspaceListSchema,
  workspacePageSchema,
  memberPageSchema,
  invitationPageSchema,
} from './contracts/api.js';
import { api, HttpError, InvalidResponseError } from './http.js';

const healthSchema = z.object({ status: z.literal('ok') }).strict();

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api response validation', () => {
  it.each([
    ['meSchema', meSchema, { user: {}, access: {}, workspaces: [] }],
    ['tenantSummaryListSchema', tenantSummaryListSchema, [{}]],
    ['organizationSummaryListSchema', organizationSummaryListSchema, [{}]],
    ['workspaceListSchema', workspaceListSchema, [{}]],
    ['workspacePageSchema', workspacePageSchema, { items: [{}], nextCursor: null }],
    ['invitationListSchema', invitationListSchema, [{}]],
    ['invitationPageSchema', invitationPageSchema, { items: [{}], nextCursor: null }],
    ['memberListSchema', memberListSchema, [{}]],
    ['memberPageSchema', memberPageSchema, { items: [{}], nextCursor: null }],
    ['preferencesSchema', preferencesSchema, { locale: 'fr' }],
    ['auditPageSchema', auditPageSchema, { events: [{}], nextCursor: null }],
    ['accessRequestListSchema', accessRequestListSchema, [{}]],
    ['accessLinkSchema', accessLinkSchema, {}],
    ['accessReviewResultSchema', accessReviewResultSchema, {}],
    ['guideSchema', guideSchema, { fr: [] }],
    ['roleDefinitionListSchema', roleDefinitionListSchema, [{}]],
    ['rolePersonListSchema', rolePersonListSchema, [{}]],
    ['profileDetailsSchema', profileDetailsSchema, {}],
  ])('rejects missing required fields for %s', async (_name, schema, payload) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => payload,
      }),
    );

    await expect(api('/contract', schema)).rejects.toBeInstanceOf(
      InvalidResponseError,
    );
  });

  it.each([
    ['accessContextSchema platform role', accessContextSchema, { actorId: '00000000-0000-4000-8000-000000000001', platformRole: 'owner', tenantId: null, tenantRole: null, handle: null }],
    ['accessContextSchema tenant role', accessContextSchema, { actorId: '00000000-0000-4000-8000-000000000001', platformRole: null, tenantId: null, tenantRole: 'owner', handle: null }],
    ['accessContextSchema organization role', accessContextSchema, { actorId: '00000000-0000-4000-8000-000000000001', platformRole: null, tenantId: null, tenantRole: null, handle: null, organizationRole: 'owner' }],
    ['accessContextSchema permission', accessContextSchema, { actorId: '00000000-0000-4000-8000-000000000001', platformRole: null, tenantId: null, tenantRole: null, handle: null, permissions: ['system.root'] }],
    ['meSchema', meSchema, { user: { id: 'actor', name: 'A', email: 'a@example.test' }, access: { actorId: '00000000-0000-4000-8000-000000000001', platformRole: null, tenantId: null, tenantRole: 'owner', handle: null }, can_assign_workspace_roles: false }],
    ['workspaceListSchema', workspaceListSchema, [{ id: '00000000-0000-4000-8000-000000000001', tenant_id: '00000000-0000-4000-8000-000000000002', name: 'Workspace', visibility: 'public' }]],
    ['invitationListSchema role', invitationListSchema, [{ id: '00000000-0000-4000-8000-000000000001', email: 'user@example.test', role: 'owner', expires_at: '', accepted_at: null, revoked_at: null, delivery: 'pending' }]],
    ['invitationListSchema delivery', invitationListSchema, [{ id: '00000000-0000-4000-8000-000000000001', email: 'user@example.test', role: 'member', expires_at: '', accepted_at: null, revoked_at: null, delivery: 'queued' }]],
    ['memberListSchema', memberListSchema, [{ id: '00000000-0000-4000-8000-000000000001', name: 'Member', email: 'user@example.test', role: 'owner' }]],
    ['preferencesSchema', preferencesSchema, { locale: 'de', theme: 'system' }],
    ['preferencesSchema theme', preferencesSchema, { locale: 'fr', theme: 'auto' }],
    ['preferencesSchema date format', preferencesSchema, { locale: 'fr', theme: 'system', date_format: 'DD-MM-YYYY' }],
    ['accessRequestListSchema', accessRequestListSchema, [{ id: '00000000-0000-4000-8000-000000000001', first_name: 'A', last_name: 'B', email: 'user@example.test', status: 'queued', created_at: '' }]],
    ['accessReviewResultSchema', accessReviewResultSchema, { delivery: 'queued' }],
    ['roleDefinitionListSchema', roleDefinitionListSchema, [{ id: '00000000-0000-4000-8000-000000000001', code: 'reader', name: 'Reader', scope: 'global', level: 0, permissions: [], delegable: false, builtin: false, archivedAt: null, updatedAt: '', impactCount: 0 }]],
    ['roleDefinitionListSchema permission', roleDefinitionListSchema, [{ id: '00000000-0000-4000-8000-000000000001', code: 'reader', name: 'Reader', scope: 'tenant', level: 0, permissions: ['system.root'], delegable: false, builtin: false, archivedAt: null, updatedAt: '', impactCount: 0 }]],
    ['rolePersonListSchema status', rolePersonListSchema, [{ id: '00000000-0000-4000-8000-000000000001', name: 'Member', email: 'user@example.test', status: 'queued', roles: [] }]],
    ['rolePersonListSchema role scope', rolePersonListSchema, [{ id: '00000000-0000-4000-8000-000000000001', name: 'Member', email: 'user@example.test', status: 'active', roles: [{ id: '00000000-0000-4000-8000-000000000002', code: 'reader', name: 'Reader', scope: 'global', permissions: [], level: 0, delegable: false, organizationId: '00000000-0000-4000-8000-000000000003', tenantId: null, workspaceId: null }] }]],
  ])('rejects unknown enum values for %s', async (_name, schema, payload) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => payload,
      }),
    );

    await expect(api('/contract', schema)).rejects.toBeInstanceOf(
      InvalidResponseError,
    );
  });

  it('accepts partial access payloads needed for UI role redirects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: 'operator', name: 'Operator', email: 'operator@example.test' },
          access: { platformRole: 'super_admin', tenantRole: null },
        }),
      }),
    );

    await expect(api('/api/me', meSchema)).resolves.toMatchObject({
      user: { id: 'operator', name: 'Operator', email: 'operator@example.test' },
      access: { platformRole: 'super_admin', tenantRole: null },
    });
  });

  it('accepts a legacy /api/me payload without access context', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            id: 'legacy-user',
            name: 'Legacy user',
            email: 'legacy@example.test',
          },
        }),
      }),
    );

    await expect(api('/api/me', meSchema)).resolves.toEqual({
      user: {
        id: 'legacy-user',
        name: 'Legacy user',
        email: 'legacy@example.test',
      },
    });
  });

  it.each([
    ['workspacePageSchema', workspacePageSchema, [{ id: '00000000-0000-4000-8000-000000000001', tenant_id: '00000000-0000-4000-8000-000000000002', name: 'Workspace', visibility: 'private' }]],
    ['invitationPageSchema', invitationPageSchema, [{ id: '00000000-0000-4000-8000-000000000001', email: 'user@example.test', role: 'member', expires_at: '2026-11-06T00:00:00.000Z', accepted_at: null, revoked_at: null, delivery: 'pending' }]],
    ['memberPageSchema', memberPageSchema, [{ id: '00000000-0000-4000-8000-000000000001', name: 'Member', email: 'user@example.test', role: 'member' }]],
  ])('accepts legacy paginated arrays for %s', async (_name, schema, payload) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => payload,
      }),
    );

    await expect(api('/paged', schema)).resolves.toMatchObject({
      items: payload,
      nextCursor: null,
    });
  });

  it('returns a response that matches its runtime schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      }),
    );

    await expect(api('/health', healthSchema)).resolves.toEqual({
      status: 'ok',
    });
  });

  it('accepts pending delivery for an access review response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ delivery: 'pending' }),
      }),
    );

    await expect(api('/access-review', accessReviewResultSchema)).resolves.toEqual({
      delivery: 'pending',
    });
  });

  it.each([
    { payload: {}, reason: 'missing required fields' },
    { payload: { status: 'ready' }, reason: 'unknown enum values' },
    {
      payload: { status: 'ok', secret: 'unexpected' },
      reason: 'unexpected response fields',
    },
  ])('rejects $reason', async ({ payload }) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => payload,
      }),
    );

    await expect(api('/health', healthSchema)).rejects.toBeInstanceOf(
      InvalidResponseError,
    );
  });

  it('preserves safe HTTP status errors without exposing response bodies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ secret: 'must not escape' }),
      }),
    );

    const request = api('/health', healthSchema);
    await expect(request).rejects.toBeInstanceOf(HttpError);
    await expect(request).rejects.not.toThrow('must not escape');
  });
});
