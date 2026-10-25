import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authClient } from './auth/client';
import { useLanguage } from './i18n';
import type { UIMessage } from './i18n';
import type { MeResponse as Me, Workspace } from '@enterprise/shared';
import { Security } from './pages/Security';
import { WorkspaceManagement } from './pages/WorkspaceManagement';
export { AcceptInvitation, NotFound, AccessDenied } from './pages/PublicPages';
import { AppShell } from './ui/AppShell';
import { WorkspaceAppearance } from './ui/WorkspaceAppearance';
import { InvitationManagement, MemberManagement } from './pages/InvitationManagement';
import type { Member, Invitation } from './pages/InvitationManagement';
import { api, HttpError } from './http';
import { Profile } from './pages/Profile';
import { Documentation } from './pages/Documentation';
import { AccessRequests } from './pages/AccessRequests';
import { AuditLog } from './pages/AuditLog';
export { HttpError } from './http';

type Tenant = { id: string; name: string };
export function Application({ adminOnly = false }: { adminOnly?: boolean }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = adminOnly ? '/admin' : '/app';
  const loginPath = adminOnly ? '/admin/login' : '/login';
  const [me, setMe] = useState<Me | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const scope = new URLSearchParams(location.search).get('tenantId') ?? '';
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
  const adminPage = location.pathname.replace(/\/$/, '');
  const overview = adminPage === '/admin';
  const showOrganizations = !adminOnly || overview || adminPage === '/admin/organizations';
  const showWorkspaces = adminOnly ? overview || adminPage.startsWith('/admin/workspaces') : adminPage === '/app' || adminPage.startsWith('/app/workspaces/');
  const showMembers = adminOnly ? overview || adminPage === '/admin/members' : adminPage === '/app/members';
  const showInvitations = adminOnly ? showMembers : adminPage === '/app/invitations';
  const profilePage = adminPage === basePath + '/profile';
  const docsPage = adminPage === '/docs';
  const auditPage = adminPage === '/admin/audit';
  const adminHeading: UIMessage = overview ? 'overview'
    : adminPage === '/admin/organizations' ? 'organizations'
      : adminPage === '/admin/members' ? 'invitations_and_members'
        : auditPage ? 'audit_log' : docsPage ? 'docs' : profilePage ? 'profile' : adminPage === '/admin/security' ? 'account_security' : 'workspaces';
  useEffect(() => {
    let active = true;
    void api<Me>('/api/me')
      .then(async (data) => {
        if (!active) return;
        if (adminOnly && data.access?.platformRole !== 'super_admin') {
          void navigate('/403', { replace: true });
          return;
        }
        if (!adminOnly && ['/app/members', '/app/invitations'].includes(location.pathname) && data.access?.tenantRole !== 'tenant_admin' && data.access?.platformRole !== 'super_admin') {
          void navigate('/403', { replace: true });
          return;
        }
        if (!adminOnly && data.access?.platformRole === 'super_admin') {
          const path = adminPage === '/app/invitations' ? '/admin/members' : '/admin' + location.pathname.slice('/app'.length);
          void navigate(path + location.search, { replace: true });
          return;
        }
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
            loginPath + '?returnTo=' +
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
  }, [navigate, location.pathname, location.search, revision, adminOnly, loginPath, adminPage]);
  useEffect(() => {
    if (!me || (adminOnly && !superAdmin)) return;
    if (profilePage || docsPage || auditPage) return;
    let active = true;
    void (async () => {
      const workspaceId = location.pathname.match(
        /^\/(?:app|admin)\/workspaces\/([^/]+)$/,
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
  }, [me, query, admin, location.pathname, revision, navigate, adminOnly, superAdmin, profilePage, docsPage, auditPage]);
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
  if (!me) return <main className="auth-page"><p role={error ? 'alert' : 'status'}>{t(error ? 'access_unavailable_or_denied_contact_your_administrator' : 'loading')}</p></main>;
  return (
    <AppShell me={me} admin={adminOnly} scope={scope} tenants={tenants} workspaces={workspaces} selected={selected} busy={busy} onSignOut={() => {
      void action(async () => { const result = await authClient.signOut(); if (result.error) throw new Error(); void navigate(loginPath); });
    }} onScopeChange={(value) => {
      setSelected(null); setWorkspaces([]); setMembers([]); setInvitations([]); setError('');
      const path = adminPage.startsWith('/admin/workspaces/') ? '/admin/workspaces' : adminPage;
      void navigate(path + (value ? '?tenantId=' + encodeURIComponent(value) : ''));
    }}>
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
        me && (!adminOnly || superAdmin) && (
          <main id="app-main" aria-busy={busy}>
            <header className="ui-page-header"><h1>{adminOnly ? t(adminHeading) : t(profilePage ? 'profile' : adminPage.endsWith('/security') ? 'account_security' : showMembers ? 'members_page' : showInvitations ? 'invitations_page' : 'workspaces')}</h1>{showInvitations && <p>{t('access_description')}</p>}</header>
            {auditPage ? <AuditLog key={scope} query={query} /> : profilePage ? <Profile me={me} onSaved={() => setRevision((value) => value + 1)} /> : docsPage ? <Documentation /> : loadedPath !== location.pathname + query ? (
              <p role="status">{t('loading')}</p>
            ) : location.pathname === basePath + '/security' ? (
              <Security t={t} />
            ) : (
              <>
                {superAdmin && showOrganizations && (
                  <section className="panel">
                    <h2>{t('platform_administration')}</h2>
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
                {showWorkspaces && <WorkspaceManagement selected={selected} workspaces={workspaces} members={members} admin={admin} superAdmin={superAdmin} scope={scope} query={query} basePath={basePath} busy={busy} submit={submit} action={action} />}
                {selected?.can_manage && showWorkspaces && <WorkspaceAppearance key={selected.id} workspace={selected} query={query} onSaved={() => setRevision((value) => value + 1)} />}
                {(showMembers || showInvitations) && adminOnly && !scope && (
                  <section className="panel">
                    <h2>{t('invitations_and_members')}</h2>
                    <p>{t('organization_scope_help')}</p>
                  </section>
                )}
                {showInvitations && admin && (!superAdmin || scope) && <InvitationManagement invitations={invitations} query={query} busy={busy} action={action} />}
                {showMembers && admin && (!superAdmin || scope) && <MemberManagement members={members} query={query} busy={busy} action={action} />}
                {showInvitations && admin && (!superAdmin || scope) && <AccessRequests key={query} query={query} onApproved={() => setRevision((value) => value + 1)} />}
              </>
            )}
          </main>
        )
      )}
    </AppShell>
  );
}

