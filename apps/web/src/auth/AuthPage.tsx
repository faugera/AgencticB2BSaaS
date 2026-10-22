import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { authClient } from './client';
import { messages } from './messages';
import type { Locale, MessageKey } from './messages';

function savedLocale(): Locale {
  try { return localStorage.getItem('locale') === 'en' ? 'en' : 'fr'; }
  catch { return 'fr'; }
}

export function AuthPage() {
  const [locale, setLocale] = useState<Locale>(savedLocale);
  const t = messages[locale];
  const [token] = useState(() => new URL(window.location.href).searchParams.get('token') ?? '');
  const [mode, setMode] = useState<'sign-in' | 'forgot' | 'reset'>(() =>
    window.location.pathname === '/auth/reset' && token ? 'reset'
      : new URL(window.location.href).searchParams.has('activate') ? 'forgot' : 'sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<MessageKey | null>(() => {
    const query = new URL(window.location.href).searchParams;
    return query.has('error') ? 'invalidToken' : query.has('activate') ? 'activate' : query.has('verified') ? 'verified' : null;
  });
  const [failure, setFailure] = useState<MessageKey | null>(null);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    document.documentElement.lang = locale;
    try { localStorage.setItem('locale', locale); } catch { /* Storage can be unavailable. */ }
  }, [locale]);
  useEffect(() => {
    // Remove recovery/verification query data before navigation can leak it.
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setFailure(null); setNotice(null);
    try {
      if (mode === 'sign-in') {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          setFailure(result.error.code === 'EMAIL_NOT_VERIFIED' ? 'unverified' : 'failure');
        } else { setPassword(''); }
      } else if (mode === 'forgot') {
        const result = await authClient.requestPasswordReset({ email, redirectTo: window.location.origin + '/auth/reset' });
        if (result.error) setFailure('failure'); else setNotice('emailSent');
      } else {
        const result = await authClient.resetPassword({ token, newPassword: password });
        if (result.error) setFailure('invalidToken');
        else { setPassword(''); setMode('sign-in'); setNotice('passwordSaved'); }
      }
    } catch { setFailure('failure'); }
    finally { setBusy(false); }
  }

  async function resend() {
    setBusy(true); setFailure(null);
    try {
      const result = await authClient.sendVerificationEmail({ email, callbackURL: window.location.origin + '/auth?verified=1' });
      if (result.error) setFailure('failure'); else setNotice('emailSent');
    } catch { setFailure('failure'); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true); setFailure(null);
    try {
      const result = await authClient.signOut();
      if (result.error) setFailure('failure');
    } catch { setFailure('failure'); }
    finally { setBusy(false); }
  }

  return (
    <main className="auth-page">
      <div className="auth-navigation">
        <a href="/">{t.home}</a>
        <label>{t.language}
          <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
            <option value="fr">Français</option><option value="en">English</option>
          </select>
        </label>
      </div>
      <section className="auth-card" aria-busy={busy || isPending}>
        <span className="brand-mark" aria-hidden="true">e</span>
        {isPending ? <p role="status">{t.loading}</p> : session ? <>
          <h1>{t.sessionTitle}, {session.user.name}.</h1>
          <p>{t.sessionText}</p>
          <button disabled={busy} onClick={() => { void signOut(); }}>{busy ? t.busy : t.signOut}</button>
        </> : <>
          <h1>{mode === 'forgot' ? t.resetTitle : mode === 'reset' ? t.reset : t.title}</h1>
          <p>{mode === 'reset' ? t.resetSubtitle : t.subtitle}</p>
          <form onSubmit={(event) => { void submit(event); }}>
            {mode !== 'reset' && <label htmlFor="email">{t.email}
              <input id="email" type="email" autoComplete="email" required value={email}
                onChange={(event) => setEmail(event.target.value)} disabled={busy} />
            </label>}
            {mode !== 'forgot' && <label htmlFor="password">{mode === 'reset' ? t.newPassword : t.password}
              <input id="password" type="password" autoComplete={mode === 'reset' ? 'new-password' : 'current-password'}
                minLength={12} maxLength={128} required value={password}
                onChange={(event) => setPassword(event.target.value)} disabled={busy} />
            </label>}
            <button type="submit" disabled={busy}>{busy ? t.busy : mode === 'forgot' ? t.sendReset : mode === 'reset' ? t.reset : t.signIn}</button>
          </form>
          <div className="auth-actions">
            <button type="button" className="text-button" disabled={busy} onClick={() => {
              setMode(mode === 'sign-in' ? 'forgot' : 'sign-in'); setPassword(''); setFailure(null); setNotice(null);
            }}>{mode === 'sign-in' ? t.forgot : t.back}</button>
            {failure === 'unverified' && <button className="text-button" disabled={busy || !email} onClick={() => { void resend(); }}>{t.resend}</button>}
          </div>
          <p className="auth-footnote">{t.invitation}</p>
        </>}
        {notice && <p role="status">{t[notice]}</p>}
        {failure && <p role="alert">{t[failure]}</p>}
      </section>
    </main>
  );
}
