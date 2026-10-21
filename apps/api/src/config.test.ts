import { describe, expect, it } from 'vitest';
import { readConfig } from './config.js';

describe('server configuration', () => {
  it('binds to loopback by default', () => {
    expect(readConfig({})).toEqual({ port: 3000, host: '127.0.0.1' });
  });
  it.each(['', '0', '-1', '65536', '3000.5', 'invalid'])('rejects invalid PORT=%s', (PORT) => {
    expect(() => readConfig({ PORT })).toThrow('PORT');
  });
  it('accepts an explicit container binding', () => {
    expect(readConfig({ PORT: '8080', HOST: '0.0.0.0' })).toEqual({ port: 8080, host: '0.0.0.0' });
  });
});
