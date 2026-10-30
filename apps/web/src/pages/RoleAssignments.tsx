import { useState } from 'react';
import type { AccessContext, RoleAssignment, RoleDefinition, RolePerson, TenantSummary, Workspace, OrganizationSummary } from '@enterprise/shared';
import { api } from '../http';
import { useLanguage } from '../i18n';
import { Button, Field, Select, Badge, EmptyState } from '../ui/primitives';
import { ConfirmDialog } from '../ui/ConfirmDialog';
export function RoleAssignments({ access, roles, people, tenants, organizations, workspaces, query, busy, action, workspaceOnly = false, initialWorkspaceId = '' }: {
 access: AccessContext; roles: readonly RoleDefinition[]; people: readonly RolePerson[]; tenants: readonly TenantSummary[]; organizations: readonly OrganizationSummary[]; workspaces: readonly Workspace[]; query: string; busy: boolean; action: (run: () => Promise<unknown>) => void; workspaceOnly?: boolean; initialWorkspaceId?: string;
}) {
 const { t } = useLanguage(); const [personId, setPersonId] = useState(''); const [roleId, setRoleId] = useState(''); const [scopeId, setScopeId] = useState(initialWorkspaceId);
 const superAdmin = access.platformRole === 'super_admin';
 const level = workspaceOnly ? workspaces.find((space) => space.id === initialWorkspaceId)?.role_level ?? 0 : access.level ?? (superAdmin ? 4 : access.organizationRole === 'organization_admin' ? 3 : access.tenantRole === 'tenant_admin' ? 2 : 0);
 const assignable = roles.filter((role) => (!workspaceOnly || role.scope === 'workspace') && !role.archivedAt && (superAdmin || role.delegable) && (superAdmin || role.level < level));
 const editable = people.filter((person) => person.id !== access.actorId && (superAdmin || person.roles.every((role) => role.level < level)));
 const role = assignable.find((value) => value.id === roleId);
 const targets = role?.scope === 'organization' ? organizations : role?.scope === 'tenant' ? tenants : workspaces.filter((space) => (superAdmin || space.can_assign_roles) && (!workspaceOnly || space.id === initialWorkspaceId));
 const target = targets.find((item) => item.id === scopeId);
 const tenant = role?.scope === 'tenant' ? tenants.find((value) => value.id === scopeId) : tenants.find((value) => value.id === workspaces.find((space) => space.id === scopeId)?.tenant_id);
 const organizationId = role?.scope === 'organization' ? scopeId : tenant?.organization_id ?? access.organizationId;
 const scopeName = (assignment: RoleAssignment) => {
  const id = assignment.workspaceId ?? assignment.tenantId ?? assignment.organizationId;
  const scopes = assignment.scope === 'organization' ? organizations : assignment.scope === 'tenant' ? tenants : workspaces;
  const match = scopes.find((item) => item.id === id);
  if (!match) return id;
  return `${match.name} (${id})`;
 };
 return <section className="panel"><h2>{t('role_assignments')}</h2><p className="ui-help">{t('roles_help')}</p>
  <form onSubmit={(event) => { event.preventDefault(); if (!role || !organizationId) return; action(() => api('/api/role-assignments', { actorId: personId, roleId: role.id, organizationId, ...(role.scope === 'tenant' ? { tenantId: scopeId } : role.scope === 'workspace' ? { tenantId: workspaces.find((value) => value.id === scopeId)?.tenant_id, workspaceId: scopeId } : {}), operation: 'grant' })); }}>
   <Field label={t('select_person')}>{(props) => <Select {...props} required value={personId} onChange={(event) => setPersonId(event.target.value)}><option value="">{t('select_person')}</option>{editable.map((person) => <option key={person.id} value={person.id}>{person.name} — {person.email}</option>)}</Select>}</Field>
   <Field label={t('select_role')} help={role ? `${role.name} (${role.id})` : ''}>{(props) => <Select {...props} required value={roleId} onChange={(event) => { setRoleId(event.target.value); setScopeId(initialWorkspaceId); }}><option value="">{t('select_role')}</option>{assignable.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}</Select>}</Field>
   <Field label={t('select_scope')} help={target ? `${target.name} (${target.id})` : ''}>{(props) => <Select {...props} required value={scopeId} onChange={(event) => setScopeId(event.target.value)}><option value="">{t('select_scope')}</option>{targets.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}</Select>}</Field>
   <Button type="submit" busy={busy} disabled={!role || !personId || !scopeId || !organizationId}>{t('assign_role')}</Button>
  </form>
  {!people.length && <EmptyState title={t('no_members')} />}
  <ul className="session-list">{people.map((person) => <li key={person.id}><strong>{person.name}</strong><p>{person.email} — <Badge>{t(person.status)}</Badge></p>
   {person.roles.map((assignment) => <div className="ui-cluster" key={[assignment.id, assignment.organizationId, assignment.tenantId, assignment.workspaceId].join(':')}><span>{assignment.name} ({assignment.id}) — {t(({ organization: 'scope_organization', tenant: 'scope_tenant', workspace: 'scope_workspace' } as const)[assignment.scope])} · {scopeName(assignment)}</span>{assignment.code !== 'member' && (!workspaceOnly || (assignment.scope === 'workspace' && assignment.workspaceId === initialWorkspaceId)) && editable.some((item) => item.id === person.id) && (superAdmin || assignment.delegable) && (superAdmin || assignment.level < level) && <ConfirmDialog title={t('revoke_role') + ' — ' + (person.name || person.email) + ' — ' + assignment.name + ' (' + assignment.id + ') — ' + t(({ organization: 'scope_organization', tenant: 'scope_tenant', workspace: 'scope_workspace' } as const)[assignment.scope]) + ' · ' + scopeName(assignment)} trigger={t('revoke_role')} disabled={busy} onConfirm={() => action(() => api('/api/role-assignments', { actorId: person.id, roleId: assignment.id, organizationId: assignment.organizationId, tenantId: assignment.tenantId, workspaceId: assignment.workspaceId, operation: 'revoke' }))} />}</div>)}
   {!workspaceOnly && editable.some((item) => item.id === person.id) && person.status !== 'invited' && <ConfirmDialog title={person.name + ' — ' + t(person.status === 'suspended' ? 'activate_member' : 'suspend_member')} trigger={t(person.status === 'suspended' ? 'activate_member' : 'suspend_member')} disabled={busy} onConfirm={() => action(() => api('/api/members/' + person.id + '/status' + query, { status: person.status === 'suspended' ? 'active' : 'suspended' }, 'PATCH'))} />}
  </li>)}</ul>
 </section>;
}


