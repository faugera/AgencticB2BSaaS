import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '../auth/client';
import { api } from '../http';
import { useLanguage } from '../i18n';

// Keep invitation secrets in memory only, not query strings or persistent storage.
let pendingInvitation =
  window.location.pathname === '/invite' ? window.location.hash.slice(1) : '';
export function AcceptInvitation() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    window.history.replaceState(null, '', '/invite');
  }, []);
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>{t('your_invitation')}</h1>
        {!pendingInvitation ? (
          <p>{t('reopen_the_link_from_your_email')}</p>
        ) : isPending ? (
          <p role="status">{t('loading')}</p>
        ) : !session ? (
          <Link to="/login?returnTo=/invite">{t('sign_in_to_accept')}</Link>
        ) : (
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void api('/api/invitations/accept', { token: pendingInvitation })
                .then(() => {
                  pendingInvitation = '';
                  void navigate('/app');
                })
                .catch(() => setError(true))
                .finally(() => setBusy(false));
            }}
          >
            {t('accept_invitation')}
          </button>
        )}
        {error && (
          <p role="alert">
            {t('invitation_invalid_expired_or_incompatible_with_your_account')}
          </p>
        )}
      </section>
    </main>
  );
}
export function NotFound() {
  const { t } = useLanguage();
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>404</h1>
        <p>{t('page_not_found')}</p>
        <Link to="/app">{t('back_to_the_application')}</Link>
      </section>
    </main>
  );
}

export function AccessDenied() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>403 — {t('access_denied')}</h1>
        <p>{t('access_denied_help')}</p>
        <button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void authClient
              .signOut()
              .then((result) => {
                if (!result.error) void navigate('/login', { replace: true });
              })
              .finally(() => setBusy(false));
          }}
        >
          {t('sign_out')}
        </button>
      </section>
    </main>
  );
}
