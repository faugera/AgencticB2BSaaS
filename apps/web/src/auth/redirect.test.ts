import { describe, expect, it } from 'vitest';
import { safeDestination } from './redirect';

describe('post-login destinations', () => {
  it('retains the audit destination and tenant filter', () => {
    expect(safeDestination('/admin/audit?tenantId=123', '/admin')).toBe('/admin/audit?tenantId=123');
  });
  it.each([
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/login',
    '/app%2f..',
    '/app\n',
    '/admin/login',
    '/admin/login/mfa',
  ])('rejects %s', (url) => {
    expect(safeDestination(url)).toBe('/app');
  });
  it('retains internal destinations', () => {
    expect(safeDestination('/app/workspaces/123')).toBe('/app/workspaces/123');
    expect(safeDestination('/invite')).toBe('/invite');
    expect(safeDestination('/admin')).toBe('/admin');
    expect(safeDestination('/admin/security')).toBe('/admin/security');
    expect(safeDestination('/admin/workspaces/123?tenantId=456')).toBe('/admin/workspaces/123?tenantId=456');
  });
  it('keeps failed admin redirects inside the admin portal', () => {
    expect(safeDestination(null, '/admin')).toBe('/admin');
    expect(safeDestination('https://evil.test', '/admin')).toBe('/admin');
    expect(safeDestination('/admin/login', '/admin')).toBe('/admin');
  });
  it('retains profile and protected docs destinations without permitting arbitrary paths', () => {
    expect(safeDestination('/admin/profile', '/admin')).toBe('/admin/profile');
    expect(safeDestination('/docs', '/admin')).toBe('/docs');
    expect(safeDestination('/docs')).toBe('/app');
    expect(safeDestination('/docs-malicious', '/admin')).toBe('/admin');
    expect(safeDestination('/app/members')).toBe('/app/members');
    expect(safeDestination('/app/invitations')).toBe('/app/invitations');
  });
});
