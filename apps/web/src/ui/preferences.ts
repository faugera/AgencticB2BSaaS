import { useEffect, useSyncExternalStore } from 'react';
import type { UIPreferences } from '@enterprise/shared';
import { api } from '../http';
import { preferencesSchema } from '../contracts/api';

const listeners = new Set<() => void>();
export function localLocale(): 'fr' | 'en' { try { return localStorage.getItem('locale') === 'en' ? 'en' : 'fr'; } catch { return 'fr'; } }
export function localTheme(): UIPreferences['theme'] {
  try { const value = localStorage.getItem('theme'); return value === 'light' || value === 'dark' ? value : 'system'; } catch { return 'system'; }
}
function notify() { listeners.forEach((listener) => listener()); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
let locale = localLocale();
let theme = localTheme();
export function setLocalPreferences(value: UIPreferences, identity?: string) {
  locale = value.locale; theme = value.theme;
  try { if (identity) localStorage.setItem('preferences.identity', identity); else localStorage.removeItem('preferences.identity'); localStorage.setItem('locale', locale); localStorage.setItem('theme', theme); if (identity) { localStorage.setItem('preferences.timezone', value.timezone ?? 'Europe/Paris'); localStorage.setItem('preferences.date_format', value.date_format ?? 'DD/MM/YYYY'); } } catch { /* Browser storage is optional; memory remains authoritative. */ }
  document.documentElement.dataset.theme = theme;
  document.documentElement.lang = locale;
  notify();
}
export function useLocalPreferences() {
  const currentLocale = useSyncExternalStore(subscribe, () => locale);
  const currentTheme = useSyncExternalStore(subscribe, () => theme);
  useEffect(() => { document.documentElement.dataset.theme = currentTheme; document.documentElement.lang = currentLocale; }, [currentLocale, currentTheme]);
  return { locale: currentLocale, theme: currentTheme };
}

type AccountSnapshot = { preferences: UIPreferences; ready: boolean; pending: number; error: boolean };
type PreferenceField = 'locale' | 'theme' | 'timezone' | 'date_format';
type AccountStore = { identity: string; snapshot: AccountSnapshot; users: number; queue: Promise<void>; versions: Record<PreferenceField, number> };
const emptySnapshot: AccountSnapshot = { preferences: { locale: 'fr', theme: 'system', timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' }, ready: false, pending: 0, error: false };
let account: AccountStore | null = null;
window.addEventListener('storage', (event) => {
  let sameAccount = false;
  try { sameAccount = localStorage.getItem('preferences.identity') === account?.identity; } catch { /* Storage is optional. */ }
  if (account && !sameAccount) return;
  if (account && sameAccount) {
    const current = account.snapshot.preferences;
    const patch: Partial<UIPreferences> = {};
    if (event.key === 'locale' && (event.newValue === 'fr' || event.newValue === 'en') && current.locale !== event.newValue) patch.locale = event.newValue;
    if (event.key === 'theme' && (event.newValue === 'system' || event.newValue === 'light' || event.newValue === 'dark') && current.theme !== event.newValue) patch.theme = event.newValue;
    if (event.key === 'preferences.timezone' && event.newValue && current.timezone !== event.newValue) Object.assign(patch, { timezone: event.newValue });
    if (event.key === 'preferences.date_format' && (event.newValue === 'DD/MM/YYYY' || event.newValue === 'MM/DD/YYYY' || event.newValue === 'YYYY-MM-DD') && current.date_format !== event.newValue) Object.assign(patch, { date_format: event.newValue });
    for (const field of ['locale', 'theme', 'timezone', 'date_format'] as const) if (field in patch) account.versions[field]++;
    if (Object.keys(patch).length) account.snapshot = { ...account.snapshot, preferences: { ...current, ...patch } };
  }
  locale = localLocale(); theme = localTheme();
  notify();
});
function update(store: AccountStore, patch: Partial<AccountSnapshot>) {
  store.snapshot = { ...store.snapshot, ...patch };
  if (account === store) notify();
}
export function useAccountPreferences(identity: string) {
  const current = useLocalPreferences();
  const snapshot = useSyncExternalStore(subscribe, () => account?.identity === identity ? account.snapshot : emptySnapshot);
  useEffect(() => {
    if (!account || account.identity !== identity) {
      const store: AccountStore = { identity, users: 0, queue: Promise.resolve(), versions: { locale: 0, theme: 0, timezone: 0, date_format: 0 }, snapshot: { ...emptySnapshot, preferences: { ...emptySnapshot.preferences, locale, theme } } };
      account = store; notify();
      const versions = { ...store.versions };
      void api('/api/preferences', preferencesSchema).then(async (value) => {
        if (account !== store) return;
        if (value === null) value = await api('/api/preferences', preferencesSchema, { locale: store.snapshot.preferences.locale, theme: store.snapshot.preferences.theme });
        if (account !== store) return;
        if (!value || !['fr', 'en'].includes(value.locale) || !['system', 'light', 'dark'].includes(value.theme)) throw new Error('Invalid preferences');
        const preferences = { ...store.snapshot.preferences, ...value };
        for (const field of ['locale', 'theme', 'timezone', 'date_format'] as const) {
          if (versions[field] !== store.versions[field]) Object.assign(preferences, { [field]: store.snapshot.preferences[field] });
        }
        update(store, { preferences, ready: true });
        setLocalPreferences(preferences, store.identity);
      }).catch(() => { if (account === store) update(store, { error: true }); });
    }
    const store = account;
    store.users++;
    return () => { if (--store.users === 0 && store.snapshot.pending === 0 && account === store) account = null; };
  }, [identity]);
  async function save(next: Partial<UIPreferences>) {
    const store = account;
    if (!store || store.identity !== identity || !store.snapshot.ready) return false;
    update(store, { pending: store.snapshot.pending + 1, error: false });
    const operation = store.queue.then(async () => {
      if (account !== store) return false;
      if (!Object.keys(next).length) return true;
      const versions = { ...store.versions };
      try {
        const value = await api('/api/preferences', preferencesSchema, next, 'PUT');
        if (account !== store) return false;
        if (!value || !['fr', 'en'].includes(value.locale) || !['system', 'light', 'dark'].includes(value.theme)) throw new Error('Invalid preferences');
        const preferences = { ...store.snapshot.preferences, ...value };
        for (const field of ['locale', 'theme', 'timezone', 'date_format'] as const) {
          if (versions[field] !== store.versions[field]) Object.assign(preferences, { [field]: store.snapshot.preferences[field] });
        }
        update(store, { preferences });
        setLocalPreferences(preferences, store.identity);
        return true;
      } catch {
        if (account === store) update(store, { error: true });
        return false;
      }
    });
    store.queue = operation.then(() => undefined);
    try { return await operation; } finally {
      update(store, { pending: store.snapshot.pending - 1 });
      if (store.users === 0 && store.snapshot.pending === 0 && account === store) account = null;
    }
  }
  return { ...current, timezone: snapshot.preferences.timezone ?? 'Europe/Paris', date_format: snapshot.preferences.date_format ?? 'DD/MM/YYYY', save, busy: !snapshot.ready || snapshot.pending > 0, error: snapshot.error };
}
