import { useEffect, useRef, useState } from 'react';
import type { AccessContext, RoleDefinition, RolePerson, TenantSummary, OrganizationSummary, Workspace } from '@enterprise/shared';
import { api } from '../http';
import {
  organizationSummaryListSchema,
  roleDefinitionListSchema,
  rolePersonListSchema,
  tenantSummaryListSchema,
  workspacePageSchema,
} from '../contracts/api';
import { useLanguage } from '../i18n';
import { Alert, Badge, EmptyState, Field, Select } from '../ui/primitives';
import { PageNavigation } from '../ui/PageNavigation';
import { RoleEditor } from './RoleEditor';
import { RoleAssignments } from './RoleAssignments';
export function Roles({ access, query }: { access: AccessContext; query: string }) {
 const { t } = useLanguage(); const [roles, setRoles] = useState<RoleDefinition[] | null>(null); const [people, setPeople] = useState<RolePerson[]>([]);
 const [tenants, setTenants] = useState<TenantSummary[]>([]); const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]); const [spaces, setSpaces] = useState<Workspace[]>([]);
 const [workspaceCursor, setWorkspaceCursor] = useState<string | null>(null); const [spacesBusy, setSpacesBusy] = useState(false);
 const [error, setError] = useState(false); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false); const [revision, setRevision] = useState(0);
 const [workspaceId, setWorkspaceId] = useState('');
 const superAdmin = access.platformRole === 'super_admin'; const generalAssignment = superAdmin || Boolean(access.permissions?.includes('roles.assign'));
 const assignableSpaces = spaces.filter((space) => space.can_assign_roles);
 const selectedSpace = assignableSpaces.find((space) => space.id === workspaceId);
 const canAssign = generalAssignment || assignableSpaces.length > 0;
 const tenantId = new URLSearchParams(query).get('tenantId') || access.tenantId;
 const queryRef = useRef(query);
 queryRef.current = query;
 useEffect(() => {
  let active = true;
  const workspaces = tenantId
   ? api('/api/workspaces' + query, workspacePageSchema)
   : Promise.resolve({ items: [], nextCursor: null });
  void Promise.all([api('/api/roles', roleDefinitionListSchema), api('/api/tenants', tenantSummaryListSchema), api('/api/organizations', organizationSummaryListSchema), workspaces]).then(([catalog, directory, clients, workspacePage]) => { if (active) { setRoles(catalog); setTenants(directory); setOrganizations(clients); setSpaces(workspacePage.items); setWorkspaceCursor(workspacePage.nextCursor); } }).catch(() => { if (active) setError(true); });
  return () => { active = false; };
 }, [query, revision, tenantId]);
 useEffect(() => {
  if (!tenantId || (!generalAssignment && !workspaceId)) return;
  let active = true; const params = new URLSearchParams(query);
  if (!generalAssignment) params.set('workspaceId', workspaceId);
  void api('/api/role-assignments?' + params.toString(), rolePersonListSchema).then((members) => { if (active) setPeople(members); }).catch(() => { if (active) setError(true); });
  return () => { active = false; };
 }, [query, generalAssignment, workspaceId, revision, tenantId]);
 async function loadMoreWorkspaces() {
  if (!workspaceCursor) return { count: 0, hasMore: false };
  const requestedQuery = query;
  const params = new URLSearchParams(query);
  params.set('before', workspaceCursor);
  setSpacesBusy(true);
  try {
   const page = await api('/api/workspaces?' + params.toString(), workspacePageSchema);
   if (queryRef.current !== requestedQuery) return { count: 0, hasMore: false };
   setSpaces((current) => [...current, ...page.items]);
   setWorkspaceCursor(page.nextCursor);
   return { count: page.items.length, hasMore: page.nextCursor !== null };
  } catch (loadError) {
   setError(true);
   throw loadError;
  } finally {
   setSpacesBusy(false);
  }
 }
 function action(run: () => Promise<unknown>) { setBusy(true); setError(false); setSaved(false); void run().then(() => { setSaved(true); setRevision((value) => value + 1); }).catch(() => setError(true)).finally(() => setBusy(false)); }
 return <div aria-busy={busy}>
  {error && <Alert tone="danger">{t('unable_to_complete_this_request_try_again_later')}</Alert>}{saved && <Alert tone="success">{t('changes_saved')}</Alert>}
  {!roles ? !error && <p role="status">{t('loading')}</p> : <section className="panel"><h2>{t('roles_catalog')}</h2><p>{t('roles_help')}</p>{!roles.length && <EmptyState title={t('no_roles')} />}
   <ul className="session-list">{roles.map((role) => <li key={role.id}><strong>{role.name}</strong> <span className="ui-help">({role.id})</span> <Badge>{t(role.builtin ? 'builtin_role' : 'custom_role')}</Badge> {role.archivedAt && <Badge>{t('archived_role')}</Badge>}<p>{t(({ organization: 'scope_organization', tenant: 'scope_tenant', workspace: 'scope_workspace' } as const)[role.scope])} · {role.level} · {role.delegable ? t('delegable') : '—'}</p><p>{role.permissions.map((permission) => t(permission)).join(', ') || '—'}</p>{superAdmin && !role.builtin && <details><summary>{t('edit_role')}</summary><RoleEditor key={role.updatedAt} role={role} busy={busy} action={action} /></details>}</li>)}</ul>
   {superAdmin && <details><summary>{t('create_role')}</summary><RoleEditor busy={busy} action={action} /></details>}
  </section>}
  {!generalAssignment && (canAssign || workspaceCursor !== null) && <Field label={t('context_workspace')} help={selectedSpace ? `${selectedSpace.name} (${selectedSpace.id})` : ''}>{(props) => <Select {...props} value={workspaceId} onChange={(event) => { setWorkspaceId(event.target.value); setPeople([]); }}><option value="">{t('select_workspace')}</option>{assignableSpaces.map((space) => <option key={space.id} value={space.id}>{space.name} ({space.id})</option>)}</Select>}</Field>}
  {generalAssignment && !tenantId && <section className="panel"><h2>{t('role_assignments')}</h2><p>{t('tenant_scope_help')}</p></section>}
  {canAssign && roles && tenantId && (generalAssignment || workspaceId) && <RoleAssignments key={workspaceId} workspaceOnly={!generalAssignment} initialWorkspaceId={workspaceId} access={access} roles={roles} people={people} tenants={tenants} organizations={organizations} workspaces={spaces} query={query} busy={busy} action={action} />}
  {generalAssignment && tenantId && <PageNavigation nextCursor={workspaceCursor} busy={spacesBusy} onLoadMore={loadMoreWorkspaces} />}
  {!generalAssignment && (canAssign || workspaceCursor !== null) && <PageNavigation nextCursor={workspaceCursor} busy={spacesBusy} onLoadMore={loadMoreWorkspaces} />}
 </div>;
}
