import { describe, expect, it } from 'vitest';
import { safeDestination } from './redirect';

describe('post-login destinations', () => {
  it.each([
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/login',
    '/app%2f..',
    '/app\n',
  ])('rejects %s', (url) => {
    expect(safeDestination(url)).toBe('/app');
  });
  it('retains internal destinations', () => {
    expect(safeDestination('/app/workspaces/123')).toBe('/app/workspaces/123');
    expect(safeDestination('/invite')).toBe('/invite');
  });
});
