import { messages } from './messages';
import type { Locale } from './messages';

export function LocalTestAdminCredentials({ locale }: { locale: Locale }) {
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname))
    return null;
  const email = import.meta.env.VITE_LOCAL_TEST_ADMIN_EMAIL;
  const password = import.meta.env.VITE_LOCAL_TEST_ADMIN_PASSWORD;
  const handle = import.meta.env.VITE_LOCAL_TEST_ADMIN_HANDLE;
  if (!email || !password || !handle) return null;
  const t = messages[locale];
  return (
    <aside className="auth-footnote" aria-label={t.localTestAccount}>
      <strong>{t.localTestAccount}</strong>
      <p>{t.localTestHandle}: <code>{handle}</code></p>
      <p>{t.email}: <code>{email}</code></p>
      <p>{t.password}: <code>{password}</code></p>
    </aside>
  );
}
