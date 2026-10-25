import { useEffect, useState } from 'react';
import type { MeResponse } from '@enterprise/shared';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { authClient } from '../auth/client';
import { useLanguage } from '../i18n';

type Session = typeof authClient.$Infer.Session.session;
export function Profile({ me, onSaved }: { me: MeResponse; onSaved: () => void }) {
  const { locale, t } = useLanguage();
  const { data: current } = authClient.useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<'name' | 'sessions' | null>(null);
  useEffect(() => {
    let active = true;
    void authClient.listSessions().then((result) => {
      if (!active) return;
      if (result.error) setError(true);
      else setSessions(result.data);
      setLoading(false);
    }).catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, []);
  const role = me.access?.platformRole ?? me.access?.tenantRole;
  return <section className="panel profile-panel" aria-busy={busy}>
    <h2>{t('account_email')}</h2>
    {error && <p role="alert">{t('unable_to_complete_this_request_try_again_later')}</p>}
    {notice && <p role="status">{t(notice === 'name' ? 'profile_saved' : 'sessions_revoked')}</p>}
    <form onSubmit={(event) => {
      event.preventDefault();
      const name = String(new FormData(event.currentTarget).get('name') ?? '').trim();
      if (!name) return;
      setBusy(true); setError(false); setNotice(null);
      void authClient.updateUser({ name }).then(async (result) => {
        if (result.error) { setError(true); return; }
        await authClient.getSession({ query: { disableCookieCache: true } });
        setNotice('name'); onSaved();
      }).catch(() => setError(true)).finally(() => setBusy(false));
    }}>
      <label>{t('display_name')}<input name="name" required maxLength={100} defaultValue={me.user.name} key={me.user.name} autoComplete="name" /></label>
      <label>{t('account_email')}<input readOnly value={me.user.email} /></label>
      <p>{t('account_roles')} : {role === 'super_admin' ? t('super_admin') : role === 'tenant_admin' ? t('tenant_admin') : role === 'member' ? t('member') : t('no_role')}</p>
      <button disabled={busy}>{t('save')}</button>
    </form>
    <h3>{t('active_sessions')}</h3>
    {loading ? <p role="status">{t('loading')}</p> : <ul className="session-list">{sessions.map((session) => <li key={session.id}>
      <strong>{session.id === current?.session.id ? t('current_session') : t('session_device')}</strong>
      <p>{session.userAgent || t('unknown_device')}</p>
      <p>{t('session_created')} : <time dateTime={new Date(session.createdAt).toISOString()}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.createdAt))}</time></p>
      <p>{t('session_expires')} : <time dateTime={new Date(session.expiresAt).toISOString()}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.expiresAt))}</time></p>
    </li>)}</ul>}
    {!loading && sessions.length < 2 && <p>{t('no_other_sessions')}</p>}
    <ConfirmDialog title={t('confirm_revoke_sessions')} trigger={t('revoke_other_sessions')} disabled={busy || loading || sessions.length < 2} onConfirm={() => {
      setBusy(true); setError(false); setNotice(null);
      void authClient.revokeOtherSessions().then(async (result) => {
        if (result.error) { setError(true); return; }
        const refreshed = await authClient.listSessions();
        if (refreshed.error) { setError(true); return; }
        setSessions(refreshed.data); setNotice('sessions');
      }).catch(() => setError(true)).finally(() => setBusy(false));
    }} />
  </section>;
}
