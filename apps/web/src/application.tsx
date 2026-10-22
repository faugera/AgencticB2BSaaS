import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authClient } from './auth/client';
import { useLanguage } from './i18n';
import type { UIMessage } from './i18n';
import type { MeResponse as Me, Workspace } from '@enterprise/shared';

type Tenant = { id: string; name: string };
type Member = { id: string; name: string; email: string; role: string | null };
type Invitation = {
  id: string;
  email: string;
  role: string;
  delivery: string;
  accepted_at: string | null;
  revoked_at: string | null;
};
export class HttpError extends Error {
  constructor(public status: number) {
    super('Request failed');
  }
}
async function api<T>(
  path: string,
  body?: object,
  method = body ? 'POST' : 'GET',
): Promise<T> {
  const result = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!result.ok) throw new HttpError(result.status);
  return result.json() as Promise<T>;
}
export function Application() {
  const { locale, setLocale, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState<Me | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [scope, setScope] = useState(
    () => new URLSearchParams(window.location.search).get('tenantId') ?? '',
  );
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Workspace | null>(null);
  const [loadedPath, setLoadedPath] = useState('');
  const superAdmin = me?.access?.platformRole === 'super_admin';
  const admin = superAdmin || me?.access?.tenantRole === 'tenant_admin';
  const query = scope ? `?tenantId=${encodeURIComponent(scope)}` : '';
  useEffect(() => {
    let active = true;
    void api<Me>('/api/me')
      .then(async (data) => {
        if (!active) return;
        setMe(data);
        if (data.access?.platformRole === 'super_admin') {
          const directory = await api<Tenant[]>('/api/platform/tenants');
          if (active) setTenants(directory);
        }
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof HttpError && e.status === 401)
          void navigate(
            '/login?returnTo=' +
              encodeURIComponent(location.pathname + location.search),
            { replace: true },
          );
        else if (e instanceof HttpError && e.status === 403)
          void navigate('/403', { replace: true });
        else setError('access');
      });
    return () => {
      active = false;
    };
  }, [navigate, location.pathname, location.search, revision]);
  useEffect(() => {
    if (!me) return;
    let active = true;
    void (async () => {
      const workspaceId = location.pathname.match(
        /^\/app\/workspaces\/([^/]+)$/,
      )?.[1];
      const [spaces, current, invites] = await Promise.all([
        api<Workspace[]>('/api/workspaces' + query),
        workspaceId
          ? api<Workspace>(
              '/api/workspaces/' + encodeURIComponent(workspaceId) + query,
            )
          : Promise.resolve(null),
        admin
          ? api<Invitation[]>('/api/invitations' + query)
          : Promise.resolve([]),
      ]);
      const people = current?.can_manage
        ? await api<Member[]>(
            '/api/workspaces/' + current.id + '/members' + query,
          )
        : admin
          ? await api<Member[]>('/api/members' + query)
          : [];
      if (active) {
        setWorkspaces(spaces);
        setSelected(current);
        setMembers(people);
        setInvitations(invites);
        setLoadedPath(location.pathname + query);
      }
    })().catch((error: unknown) => {
      if (!active) return;
      if (error instanceof HttpError && error.status === 403)
        void navigate('/403', { replace: true });
      else if (error instanceof HttpError && error.status === 404)
        void navigate('/not-found', { replace: true });
      else setError('access');
    });
    return () => {
      active = false;
    };
  }, [me, query, admin, location.pathname, revision, navigate]);
  async function action(run: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = (await run()) as { delivery?: string } | undefined;
      setNotice(result?.delivery === 'failed' ? 'delivery' : 'saved');
      setRevision((value) => value + 1);
    } catch {
      setError('failure');
    } finally {
      setBusy(false);
    }
  }
  function submit(
    event: FormEvent<HTMLFormElement>,
    run: (form: FormData) => Promise<unknown>,
  ) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    void action(async () => {
      const result = await run(form);
      element.reset();
      return result;
    });
  }
  const text = (form: FormData, key: string) => String(form.get(key) ?? '');
  return (
    <div className="application">
      <header className="masthead">
        <Link className="brand" to="/app">
          <span className="brand-mark" aria-hidden="true">
            e
          </span>
          Enterprise AI OS
        </Link>
        <label>
          {t('language')}{' '}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value === 'en' ? 'en' : 'fr')}
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
        <button
          disabled={busy}
          onClick={() => {
            void action(async () => {
              const result = await authClient.signOut();
              if (result.error) throw new Error();
              void navigate('/login');
            });
          }}
        >
          {t('sign_out')}
        </button>
      </header>
      <nav aria-label={t('main_navigation')}>
        <Link to="/app">{t('workspaces')}</Link>
        <Link to="/app/security">{t('account_security')}</Link>
      </nav>
      {error && (
        <p role="alert">
          {error === 'access'
            ? t('access_unavailable_or_denied_contact_your_administrator')
            : t('unable_to_complete_this_request_try_again_later')}
        </p>
      )}
      {notice && (
        <p role="status">
          {notice === 'delivery'
            ? t('saved_but_email_delivery_failed_retry_from_invitations')
            : t('changes_saved')}
        </p>
      )}
      {!me && !error ? (
        <p role="status">{t('loading')}</p>
      ) : (
        me && (
          <main aria-busy={busy}>
            <p className="eyebrow">{t('private_pilot')}</p>
            <h1>
              {t('welcome')}, {me.user.name}.
            </h1>
            {loadedPath !== location.pathname + query ? (
              <p role="status">{t('loading')}</p>
            ) : location.pathname === '/app/security' ? (
              <Security t={t} />
            ) : (
              <>
                {superAdmin && (
                  <section className="panel">
                    <h2>{t('platform_administration')}</h2>
                    <label>
                      {t('active_organization')}
                      <select
                        value={scope}
                        onChange={(e) => {
                          setScope(e.target.value);
                          setSelected(null);
                          setWorkspaces([]);
                          setMembers([]);
                          setInvitations([]);
                          setError('');
                          void navigate(
                            '/app' +
                              (e.target.value
                                ? '?tenantId=' +
                                  encodeURIComponent(e.target.value)
                                : ''),
                          );
                        }}
                      >
                        <option value="">{t('select_an_organization')}</option>
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <form
                      onSubmit={(e) =>
                        submit(e, (form) =>
                          api('/api/platform/tenants', {
                            name: text(form, 'name'),
                            adminEmail: text(form, 'email'),
                          }),
                        )
                      }
                    >
                      <h3>{t('create_an_organization')}</h3>
                      <label>
                        {t('organization_name')}
                        <input name="name" required maxLength={100} />
                      </label>
                      <label>
                        {t('administrator_email')}
                        <input
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                        />
                      </label>
                      <button disabled={busy}>{t('create_and_invite')}</button>
                    </form>
                  </section>
                )}
                <section
                  className={selected ? 'panel workspace-panel' : 'panel'}
                >
                  <h2>{selected ? selected.name : t('your_workspaces')}</h2>
                  {selected ? (
                    <p>{t('this_workspace_is_authorized_by_the_server')}</p>
                  ) : (
                    <ul className="workspace-list">
                      {workspaces.map((space) => (
                        <li key={space.id}>
                          <Link to={'/app/workspaces/' + space.id + query}>
                            {space.name}{' '}
                            <span>
                              {space.visibility === 'private'
                                ? t('private')
                                : t('organization')}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!selected && !workspaces.length && (
                    <p>
                      {t(
                        'no_accessible_workspace_ask_your_administrator_for_access',
                      )}
                    </p>
                  )}
                  {admin && (!superAdmin || scope) && (
                    <form
                      onSubmit={(e) =>
                        submit(e, (form) =>
                          api('/api/workspaces' + query, {
                            name: text(form, 'name'),
                          }),
                        )
                      }
                    >
                      <label>
                        {t('new_private_workspace')}
                        <input name="name" required maxLength={100} />
                      </label>
                      <button disabled={busy}>{t('create_workspace')}</button>
                    </form>
                  )}
                  {selected?.can_manage && (
                    <form
                      onSubmit={(e) =>
                        submit(e, (form) =>
                          api(
                            '/api/workspaces/' +
                              selected.id +
                              '/members' +
                              query,
                            {
                              actorId: text(form, 'actor'),
                              role: text(form, 'role'),
                            },
                          ),
                        )
                      }
                    >
                      <h3>{t('assign_access')}</h3>
                      <label>
                        {t('member')}
                        <select name="actor" required>
                          {members.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {t('role')}
                        <select name="role">
                          <option value="member">{t('member')}</option>
                          <option value="workspace_admin">
                            {t('workspace_administrator')}
                          </option>
                        </select>
                      </label>
                      <button disabled={busy}>{t('save')}</button>
                    </form>
                  )}
                  {selected?.can_manage && (
                    <>
                      <form
                        onSubmit={(e) =>
                          submit(e, (form) =>
                            api(
                              '/api/workspaces/' + selected.id + query,
                              {
                                name: text(form, 'name'),
                                visibility: text(form, 'visibility'),
                              },
                              'PATCH',
                            ),
                          )
                        }
                      >
                        <label>
                          {t('workspace_name')}
                          <input
                            name="name"
                            defaultValue={selected.name}
                            key={selected.name}
                            required
                            maxLength={100}
                          />
                        </label>
                        <label>
                          {t('visibility')}
                          <select
                            name="visibility"
                            defaultValue={selected.visibility}
                          >
                            <option value="private">{t('private')}</option>
                            <option value="tenant">{t('organization')}</option>
                          </select>
                        </label>
                        <button disabled={busy}>{t('save')}</button>
                      </form>
                      <ul>
                        {members
                          .filter((member) => member.role)
                          .map((member) => (
                            <li key={member.id}>
                              {member.name}
                              <button
                                disabled={busy}
                                onClick={() => {
                                  void action(() =>
                                    api(
                                      '/api/workspaces/' +
                                        selected.id +
                                        '/members/' +
                                        member.id +
                                        query,
                                      undefined,
                                      'DELETE',
                                    ),
                                  );
                                }}
                              >
                                {t('remove_from_workspace')}
                              </button>
                            </li>
                          ))}
                      </ul>
                    </>
                  )}
                </section>
                {admin && (!superAdmin || scope) && (
                  <section className="panel">
                    <h2>{t('invitations_and_members')}</h2>
                    <form
                      onSubmit={(e) =>
                        submit(e, (form) =>
                          api('/api/invitations' + query, {
                            email: text(form, 'email'),
                            role: text(form, 'role'),
                          }),
                        )
                      }
                    >
                      <label>
                        {t('email_address')}
                        <input name="email" type="email" required />
                      </label>
                      <label>
                        {t('role')}
                        <select name="role">
                          <option value="member">{t('member')}</option>
                          <option value="tenant_admin">
                            {t('organization_administrator')}
                          </option>
                        </select>
                      </label>
                      <button disabled={busy}>{t('invite')}</button>
                    </form>
                    <ul>
                      {invitations.map((invite) => (
                        <li key={invite.id}>
                          {invite.email} —{' '}
                          {invite.accepted_at
                            ? t('accepted')
                            : invite.revoked_at
                              ? t('revoked')
                              : invite.delivery === 'failed'
                                ? t('delivery_failed')
                                : t('pending')}
                          {!invite.accepted_at && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => {
                                  void action(() =>
                                    api(
                                      '/api/invitations/' + invite.id + query,
                                      { operation: 'retry' },
                                    ),
                                  );
                                }}
                              >
                                {t('resend')}
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => {
                                  void action(() =>
                                    api(
                                      '/api/invitations/' + invite.id + query,
                                      { operation: 'revoke' },
                                    ),
                                  );
                                }}
                              >
                                {t('revoke')}
                              </button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                    <ul>
                      {members.map((member) => (
                        <li key={member.id}>
                          {member.name} — {member.email}
                          <button
                            disabled={busy}
                            onClick={() => {
                              void action(() =>
                                api(
                                  '/api/members/' + member.id + query,
                                  undefined,
                                  'DELETE',
                                ),
                              );
                            }}
                          >
                            {t('remove_access')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </main>
        )
      )}
    </div>
  );
}

function Security({ t }: { t: (key: UIMessage) => string }) {
  const { data: session } = authClient.useSession();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError(false);
    try {
      await operation();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      setPassword('');
    }
  }
  return (
    <section className="panel">
      <h2>{t('two_factor_authentication_optional')}</h2>
      <p>{t('use_a_totp_authenticator_and_keep_recovery_codes_offline')}</p>
      {error && <p role="alert">{t('verification_failed_try_again')}</p>}
      {!setup ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (session?.user.twoFactorEnabled) {
                const result = await authClient.twoFactor.disable({ password });
                if (result.error) throw new Error();
              } else {
                const result = await authClient.twoFactor.enable({ password });
                if (
                  result.error ||
                  !result.data ||
                  result.data.method !== 'totp'
                )
                  throw new Error();
                setSetup(result.data);
              }
            });
          }}
        >
          <label>
            {t('current_password')}
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button disabled={busy}>
            {session?.user.twoFactorEnabled
              ? t('disable_mfa')
              : t('set_up_mfa')}
          </button>
        </form>
      ) : (
        <>
          <p>
            {t(
              'add_this_uri_to_your_authenticator_then_confirm_a_code_do_not_sh',
            )}
          </p>
          <code className="secret">{setup.totpURI}</code>
          <h3>{t('recovery_codes')}</h3>
          <ul>
            {setup.backupCodes.map((backup) => (
              <li key={backup}>
                <code>{backup}</code>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const result = await authClient.twoFactor.verifyTotp({ code });
                if (result.error) throw new Error();
                setSetup(null);
                setCode('');
              });
            }}
          >
            <label>
              {t('verification_code')}
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button disabled={busy}>{t('confirm')}</button>
          </form>
        </>
      )}
    </section>
  );
}

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
