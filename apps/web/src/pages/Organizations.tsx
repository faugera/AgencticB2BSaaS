import { useEffect, useState } from 'react';
import type { OrganizationSummary, TenantSummary } from '@enterprise/shared';
import { api } from '../http';
import { useLanguage } from '../i18n';
import { Alert, Button, EmptyState, Field, Input, Select } from '../ui/primitives';
export function Organizations({ superAdmin }: { superAdmin: boolean }) {
 const { t } = useLanguage(); const [organizations, setOrganizations] = useState<OrganizationSummary[] | null>(null); const [tenants, setTenants] = useState<TenantSummary[]>([]);
 const [error, setError] = useState(false); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false); const [revision, setRevision] = useState(0);
 useEffect(() => { let active = true; void Promise.all([api<OrganizationSummary[]>('/api/organizations'), api<TenantSummary[]>('/api/tenants')]).then(([clients, directory]) => { if (active) { setOrganizations(clients); setTenants(directory); } }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, [revision]);
 function submit(element: HTMLFormElement, path: string, body: object) { setBusy(true); setError(false); setSaved(false); void api(path, body).then(() => { element.reset(); setSaved(true); setRevision((value) => value + 1); }).catch(() => setError(true)).finally(() => setBusy(false)); }
 return <section className="panel" aria-busy={busy}><h2>{t('organizations')}</h2>
  {error && <Alert tone="danger">{t('unable_to_complete_this_request_try_again_later')}</Alert>}{saved && <Alert tone="success">{t('changes_saved')}</Alert>}
  {!organizations ? !error && <p role="status">{t('loading')}</p> : <>
   {!organizations.length && <EmptyState title={t('no_organizations')} />}
   <ul className="session-list">{organizations.map((organization) => <li key={organization.id}><strong>{organization.name}</strong><p>{t('tenants')} : {tenants.filter((tenant) => tenant.organization_id === organization.id).map((tenant) => tenant.name).join(', ') || '—'}</p></li>)}</ul>
   {superAdmin && <form onSubmit={(event) => { event.preventDefault(); submit(event.currentTarget, '/api/organizations', { name: String(new FormData(event.currentTarget).get('name') ?? '') }); }}><h3>{t('create_client_organization')}</h3><Field label={t('organization_name')}>{(props) => <Input {...props} name="name" required maxLength={100} />}</Field><Button type="submit" busy={busy}>{t('create_client_organization')}</Button></form>}
   <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); submit(event.currentTarget, '/api/organizations/' + encodeURIComponent(String(data.get('organizationId'))) + '/tenants', { name: String(data.get('name') ?? ''), adminEmail: String(data.get('adminEmail') ?? '') }); }}><h3>{t('create_tenant')}</h3>
    <Field label={t('client_organization')}>{(props) => <Select {...props} name="organizationId" required><option value="">{t('select_scope')}</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</Select>}</Field>
    <Field label={t('tenant_name')}>{(props) => <Input {...props} name="name" required maxLength={100} />}</Field><Field label={t('administrator_email')}>{(props) => <Input {...props} name="adminEmail" type="email" required autoComplete="email" />}</Field><Button type="submit" busy={busy} disabled={!organizations.length}>{t('create_and_invite')}</Button>
   </form>
  </>}
 </section>;
}
