import { beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => vi.fn());
vi.mock('../http', () => ({ api }));
vi.mock('react', () => ({
  useEffect: (effect: () => unknown) => { effect(); },
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));

beforeEach(() => {
  vi.resetModules();
  api.mockReset();
  vi.stubGlobal('window', { addEventListener: vi.fn() });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
  vi.stubGlobal('document', { documentElement: { dataset: {}, lang: '' } });
});

it('bloque une écriture après échec puis recharge les valeurs serveur avant modification', async () => {
  const server = { locale: 'fr', theme: 'light', timezone: 'Asia/Tokyo', date_format: 'YYYY-MM-DD' };
  api.mockRejectedValueOnce(new Error('réseau'));
  let preferences = await import('./preferences');
  preferences.useAccountPreferences('compte');
  await vi.waitFor(() => expect(preferences.useAccountPreferences('compte').error).toBe(true));
  expect(await preferences.useAccountPreferences('compte').save({ theme: 'dark' })).toBe(false);
  expect(api).toHaveBeenCalledTimes(1);

  vi.resetModules();
  api.mockResolvedValueOnce(server).mockResolvedValueOnce({ ...server, theme: 'dark' });
  preferences = await import('./preferences');
  preferences.useAccountPreferences('compte');
  await vi.waitFor(() => expect(preferences.useAccountPreferences('compte').busy).toBe(false));
  expect(preferences.useAccountPreferences('compte').timezone).toBe('Asia/Tokyo');
  expect(await preferences.useAccountPreferences('compte').save({ theme: 'dark' })).toBe(true);
  expect(api).toHaveBeenLastCalledWith('/api/preferences', expect.anything(), { theme: 'dark' }, 'PUT');
  expect(preferences.useAccountPreferences('compte').date_format).toBe('YYYY-MM-DD');
});
