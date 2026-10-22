import { expect, it } from 'vitest';
import { trustedProxies } from './proxy.js';
it('trusts no proxy by default and accepts explicit network ranges', () => {
  expect(trustedProxies(undefined)).toEqual([]);
  expect(trustedProxies('127.0.0.1,10.20.0.0/16')).toEqual([
    '127.0.0.1',
    '10.20.0.0/16',
  ]);
});
it.each([
  'true',
  '*',
  '0.0.0.0/0',
  '10.0.0.1/99',
  'localhost',
  '127.0.0.1/32/1',
])('rejects broad or ambiguous proxy configuration %s', (value) => {
  expect(() => trustedProxies(value)).toThrow();
});
