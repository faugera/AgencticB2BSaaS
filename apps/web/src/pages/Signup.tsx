import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../http';
import { useLanguage } from '../i18n';

export function Signup() {
  const { locale, setLocale, t } = useLanguage();
  const [params] = useSearchParams();
  const link = params.get('link') ?? '';
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(link);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  return <main className="auth-page">
    <nav className="auth-navigation"><Link to="/">AgencticB2BSaaS</Link><label>{t('language')}<select value={locale} onChange={(e) => setLocale(e.target.value === 'en' ? 'en' : 'fr')}><option value="fr">Français</option><option value="en">English</option></select></label></nav>
    <section className="auth-card" aria-busy={busy}>
      <h1>{t('request_access')}</h1>
      {!valid ? <p>{t('request_link_required')}</p> : sent ? <p role="status">{t('request_received')}</p> : <>
        <p>{t('request_intro')}</p>
        {error && <p role="alert">{t('unable_to_complete_this_request_try_again_later')}</p>}
        <form onSubmit={(event) => {
          event.preventDefault(); const form = new FormData(event.currentTarget);
          setBusy(true); setError(false);
          void api('/api/access-requests', { link, firstName: String(form.get('firstName') ?? '').trim(), lastName: String(form.get('lastName') ?? '').trim(), email: String(form.get('email') ?? '').trim() })
            .then(() => setSent(true)).catch(() => setError(true)).finally(() => setBusy(false));
        }}>
          <label>{t('first_name')}<input name="firstName" autoComplete="given-name" required maxLength={100} pattern=".*\S.*" /></label>
          <label>{t('last_name')}<input name="lastName" autoComplete="family-name" required maxLength={100} pattern=".*\S.*" /></label>
          <label>{t('email_address')}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <button disabled={busy}>{t('request_access')}</button>
        </form>
      </>}
      <Link className="text-button" to="/login">{t('back_to_login')}</Link>
    </section>
  </main>;
}
