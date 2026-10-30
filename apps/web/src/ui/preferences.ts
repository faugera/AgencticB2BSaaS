import { useEffect, useState, useSyncExternalStore } from 'react';
import type { UIPreferences } from '@enterprise/shared';
import { api } from '../http';

const listeners = new Set<() => void>();
export function localLocale(): 'fr' | 'en' { try { return localStorage.getItem('locale') === 'en' ? 'en' : 'fr'; } catch { return 'fr'; } }
export function localTheme(): UIPreferences['theme'] {
  try { const value = localStorage.getItem('theme'); return value === 'light' || value === 'dark' ? value : 'system'; } catch { return 'system'; }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = () => { locale = localLocale(); theme = localTheme(); listener(); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}
let locale = localLocale();
let theme = localTheme();
export function setLocalPreferences(value: UIPreferences) {
  locale = value.locale; theme = value.theme;
  try { localStorage.setItem('locale', locale); localStorage.setItem('theme', theme); } catch { /* Browser storage is optional; memory remains authoritative. */ }
  document.documentElement.dataset.theme = theme;
  document.documentElement.lang = locale;
  listeners.forEach((listener) => listener());
}
export function useLocalPreferences() {
  const currentLocale = useSyncExternalStore(subscribe, () => locale);
  const currentTheme = useSyncExternalStore(subscribe, () => theme);
  useEffect(() => { document.documentElement.dataset.theme = currentTheme; document.documentElement.lang = currentLocale; }, [currentLocale, currentTheme]);
  return { locale: currentLocale, theme: currentTheme };
}
export function useAccountPreferences(identity: string) {
  const current = useLocalPreferences();
  const [details, setDetails] = useState<Pick<UIPreferences, 'timezone' | 'date_format'>>({ timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setReady(false); setError(false);
    void api<UIPreferences | null>('/api/preferences').then(async (value) => {
      if (!active) return;
      if (value && ['fr', 'en'].includes(value.locale) && ['system', 'light', 'dark'].includes(value.theme)) { setLocalPreferences(value); setDetails({ timezone: value.timezone ?? 'Europe/Paris', date_format: value.date_format ?? 'DD/MM/YYYY' }); }
      else if (value === null) await api('/api/preferences', { locale, theme }, 'PUT');
      if (active) setReady(true);
    }).catch(() => { if (active) { setError(true); setReady(true); } });
    return () => { active = false; };
  }, [identity]);
  async function save(next: UIPreferences) {
    setBusy(true); setError(false);
    try { const value = { ...details, ...next }; await api('/api/preferences', value, 'PUT'); setLocalPreferences(value); setDetails({ timezone: value.timezone ?? 'Europe/Paris', date_format: value.date_format ?? 'DD/MM/YYYY' }); return true; } catch { setError(true); return false; } finally { setBusy(false); }
  }
  return { ...current, ...details, save, busy: busy || !ready, error };
}
