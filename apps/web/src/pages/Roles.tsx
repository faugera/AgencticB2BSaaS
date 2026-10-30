import { useEffect, useState } from 'react';
import type { AccessContext, RoleDefinition, RolePerson, TenantSummary, OrganizationSummary, Workspace } from '@enterprise/shared';
import { api } from '../http';
import { useLanguage } from '../i18n';
import { Alert, Badge, EmptyState, Field, Select } from '../ui/primitives';
import { RoleEditor } from './RoleEditor';
import { RoleAssignments } from './RoleAssignments';
export function Roles({ access, query }: { access: AccessContext; query: string }) {
 const { t } = useLanguage(); const [roles, setRoles] = useState<RoleDefinition[] | null>(null); const [people, setPeople] = useState<RolePerson[]>([]);
 const [tenants, setTenants] = useState<TenantSummary[]>([]); const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]); const [spaces, setSpaces] = useState<Workspace[]>([]);
 const [error, setError] = useState(false); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false); const [revision, setRevision] = useState(0);
 const [workspaceId, setWorkspaceId] = useState('');
 const superAdmin = access.platformRole === 'super_admin'; const generalAssignment = superAdmin || Boolean(access.permissions?.includes('roles.assign'));
 const assignableSpaces = spaces.filter((space) => space.can_assign_roles);
 const canAssign = generalAssignment || assignableSpaces.length > 0;
 const tenantId = new URLSearchParams(query).get('tenantId') || access.tenantId;
 useEffect(() => {
  let active = true;
  void Promise.all([api<RoleDefinition[]>('/api/roles'), api<TenantSummary[]>('/api/tenants'), api<OrganizationSummary[]>('/api/organizations'), api<Workspace[]>('/api/workspaces' + query)]).then(([catalog, directory, clients, workspaces]) => { if (active) { setRoles(catalog); setTenants(directory); setOrganizations(clients); setSpaces(workspaces); } }).catch(() => { if (active) setError(true); });
  return () => { active = false; };
 }, [query, revision]);
 useEffect(() => {
  if (!tenantId || (!generalAssignment && !workspaceId)) return;
  let active = true; const params = new URLSearchParams(query);
  if (!generalAssignment) params.set('workspaceId', workspaceId);
  void api<RolePerson[]>('/api/role-assignments?' + params.toString()).then((members) => { if (active) setPeople(members); }).catch(() => { if (active) setError(true); });
  return () => { active = false; };
 }, [query, generalAssignment, workspaceId, revision, tenantId]);
 function action(run: () => Promise<unknown>) { setBusy(true); setError(false); setSaved(false); void run().then(() => { setSaved(true); setRevision((value) => value + 1); }).catch(() => setError(true)).finally(() => setBusy(false)); }
 return <div aria-busy={busy}>
  {error && <Alert tone="danger">{t('unable_to_complete_this_request_try_again_later')}</Alert>}{saved && <Alert tone="success">{t('changes_saved')}</Alert>}
  {!roles ? !error && <p role="status">{t('loading')}</p> : <section className="panel"><h2>{t('roles_catalog')}</h2><p>{t('roles_help')}</p>{!roles.length && <EmptyState title={t('no_roles')} />}
   <ul className="session-list">{roles.map((role) => <li key={role.id}><strong>{role.name}</strong> <span className="ui-help">({role.id})</span> <Badge>{t(role.builtin ? 'builtin_role' : 'custom_role')}</Badge> {role.archivedAt && <Badge>{t('archived_role')}</Badge>}<p>{t(({ organization: 'scope_organization', tenant: 'scope_tenant', workspace: 'scope_workspace' } as const)[role.scope])} · {role.level} · {role.delegable ? t('delegable') : '—'}</p><p>{role.permissions.map((permission) => t(permission)).join(', ') || '—'}</p>{superAdmin && !role.builtin && <details><summary>{t('edit_role')}</summary><RoleEditor key={role.updatedAt} role={role} busy={busy} action={action} /></details>}</li>)}</ul>
   {superAdmin && <details><summary>{t('create_role')}</summary><RoleEditor busy={busy} action={action} /></details>}
  </section>}
  {!generalAssignment && canAssign && <Field label={t('context_workspace')}>{(props) => <Select {...props} value={workspaceId} onChange={(event) => { setWorkspaceId(event.target.value); setPeople([]); }}><option value="">{t('select_workspace')}</option>{assignableSpaces.map((space) => <option key={space.id} value={space.id}>{space.name} ({space.id})</option>)}</Select>}</Field>}
  {generalAssignment && !tenantId && <section className="panel"><h2>{t('role_assignments')}</h2><p>{t('tenant_scope_help')}</p></section>}
  {canAssign && roles && tenantId && (generalAssignment || workspaceId) && <RoleAssignments key={workspaceId} workspaceOnly={!generalAssignment} initialWorkspaceId={workspaceId} access={access} roles={roles} people={people} tenants={tenants} organizations={organizations} workspaces={spaces} query={query} busy={busy} action={action} />}
 </div>;
}



