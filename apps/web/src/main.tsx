import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { AuthPage } from './auth/AuthPage';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Application, AcceptInvitation, NotFound, AccessDenied } from './application';
import { useLanguage } from './i18n';

function App() {
  const { locale, setLocale, t } = useLanguage();
  return (
    <div className="page">
      <header className="masthead">
        <a className="brand" href="/" aria-label={t('enterprise_ai_os_home')}>
          <span className="brand-mark" aria-hidden="true">
            e
          </span>
          <span>
            enterprise<span className="brand-light"> / AI OS</span>
          </span>
        </a>
        <a className="header-link" href="#foundation">
          {t('the_foundation')} <span aria-hidden="true">↗</span>
        </a>
        <a className="header-link" href="/login">
          {t('sign_in')}
        </a>
        <label className="header-link">
          {t('language')}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value === 'en' ? 'en' : 'fr')}
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> {t('a_considered_beginning')}
            </p>
            <h1 id="hero-title">
              Intelligence.
              <br />
              {t('with_intention')}
            </h1>
            <p className="hero-description">
              {t(
                'a_clearer_foundation_for_the_way_your_enterprise_works_built_to_',
              )}
            </p>
            <a className="primary-link" href="#foundation">
              {t('explore_the_foundation')} <span aria-hidden="true">↓</span>
            </a>
            <p className="edition">
              {t('foundation_edition')} <span>001 / 2026</span>
            </p>
          </div>
          <div className="art-panel" aria-hidden="true">
            <div className="art-grid" />
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="core">
              <span>e</span>
            </div>
            <span className="art-label art-label-top">
              DESIGNED FOR CONNECTION
            </span>
            <span className="art-label art-label-bottom">
              A STRONGER CENTER. A CLEARER PATH.
            </span>
            <span className="art-coordinate">[ 01 — 03 ]</span>
          </div>
        </section>

        <section
          id="foundation"
          className="foundation"
          aria-labelledby="foundation-title"
        >
          <div className="section-heading">
            <p className="eyebrow">{t('the_foundation')}</p>
            <h2 id="foundation-title">
              {t('good_systems_start_with_clear_principles')}
            </h2>
          </div>
          <div className="principles">
            <article>
              <span className="principle-number">01 /</span>
              <h3>{t('clarity_by_design')}</h3>
              <p>
                {t(
                  'a_focused_workspace_with_room_to_grow_complexity_earns_its_place',
                )}
              </p>
            </article>
            <article>
              <span className="principle-number">02 /</span>
              <h3>{t('trust_at_the_core')}</h3>
              <p>
                {t(
                  'security_and_tenant_isolation_are_requirements_for_every_future_',
                )}
              </p>
            </article>
            <article>
              <span className="principle-number">03 /</span>
              <h3>{t('people_in_the_loop')}</h3>
              <p>
                {t(
                  'intelligent_tools_should_support_good_judgment_and_accountable_d',
                )}
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer>
        <span>Enterprise AI OS</span>
        <p>{t('thoughtfully_built_just_getting_started')}</p>
        <span>{t('foundation_001')}</span>
      </footer>
    </div>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        {[
          '/login',
          '/login/mfa',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/auth',
          '/auth/reset',
        ].map((path) => (
          <Route key={path} path={path} element={<AuthPage />} />
        ))}
        {['/app', '/app/security', '/app/workspaces/:id'].map((path) => (
          <Route key={path} path={path} element={<Application />} />
        ))}
        <Route path="/invite" element={<AcceptInvitation />} />
      <Route path="/403" element={<AccessDenied />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
