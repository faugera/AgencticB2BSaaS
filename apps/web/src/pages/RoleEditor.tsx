import { useState } from 'react';
import type { Permission, RoleDefinition } from '@enterprise/shared';
import { api } from '../http';
import { useLanguage } from '../i18n';
import { Button, Field, Input, Select } from '../ui/primitives';
import { ConfirmDialog } from '../ui/ConfirmDialog';
const permissions: readonly Permission[] = ['organization.manage', 'tenant.read', 'tenant.manage', 'workspace.read', 'workspace.create', 'workspace.update', 'workspace.members.manage', 'members.read', 'members.manage', 'invitations.manage', 'audit.read', 'roles.assign'];
export function RoleEditor({ role, busy, action }: { role?: RoleDefinition; busy: boolean; action: (run: () => Promise<unknown>) => void }) {
 const { t } = useLanguage(); const [name, setName] = useState(role?.name ?? '');
 const [scope, setScope] = useState(role?.scope ?? 'workspace');
 const [grants, setGrants] = useState<readonly Permission[]>(role?.permissions ?? []);
 const [delegable, setDelegable] = useState(role?.delegable ?? true);
 const write = (archived = false) => action(() => api('/api/roles' + (role ? '/' + role.id : ''), { name, scope, permissions: grants, delegable, archived, confirmed: Boolean(role) }, role ? 'PUT' : 'POST'));
 return <form onSubmit={(event) => { event.preventDefault(); if (!role) write(); }}>
  <Field label={t('role_name')}>{(props) => <Input {...props} required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />}</Field>
  <Field label={t('role_scope')}>{(props) => <Select {...props} value={scope} onChange={(event) => { const value = event.target.value; setScope(value === 'organization' || value === 'tenant' ? value : 'workspace'); }}><option value="organization">{t('scope_organization')}</option><option value="tenant">{t('scope_tenant')}</option><option value="workspace">{t('scope_workspace')}</option></Select>}</Field>
  <fieldset><legend>{t('permissions')}</legend>{permissions.map((permission) => <label className="ui-checkbox-label" key={permission}><input type="checkbox" checked={grants.includes(permission)} onChange={(event) => setGrants(event.target.checked ? [...grants, permission] : grants.filter((value) => value !== permission))} />{t(permission)}</label>)}</fieldset>
  <label className="ui-checkbox-label"><input type="checkbox" checked={delegable} onChange={(event) => setDelegable(event.target.checked)} />{t('delegable')}</label>
  {role ? <div className="ui-cluster"><ConfirmDialog variant="primary" title={name + ' — ' + t('global_role_impact') + ' ' + role.impactCount} trigger={t('save')} disabled={busy || !name.trim()} onConfirm={() => write(Boolean(role.archivedAt))} /><ConfirmDialog title={role.name + ' — ' + t('global_role_impact') + ' ' + role.impactCount} trigger={t(role.archivedAt ? 'restore_role' : 'archive_role')} disabled={busy} onConfirm={() => write(!role.archivedAt)} /></div> : <Button type="submit" busy={busy}>{t('create_role')}</Button>}
 </form>;
}


