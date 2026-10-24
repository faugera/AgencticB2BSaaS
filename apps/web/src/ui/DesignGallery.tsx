import { useState } from 'react';
import { useLanguage } from '../i18n';
import { Alert, Badge, Button, EmptyState, Field, Input, Select, Skeleton } from './primitives';
import { ConfirmDialog } from './ConfirmDialog';
import { DataTable } from './DataTable';

export function DesignGallery() {
 const { t } = useLanguage();
 const [name, setName] = useState('');
 const [notice, setNotice] = useState(false);
 const [confirmed, setConfirmed] = useState(false);
 const [invalid, setInvalid] = useState(false);
 const [search, setSearch] = useState('');
 const [status, setStatus] = useState('all');
 const examples = [{ id: 'a', email: 'camille@example.test', role: 'member', status: 'pending' }, { id: 'b', email: 'alex@example.test', role: 'member', status: 'accepted' }];
 const rows = examples.filter((row) => row.email.includes(search.toLowerCase()) && (status === 'all' || row.status === status));
 return <section className="ui-gallery" aria-label={t('design_system')}>
  <p className="ui-help">Brume · {t('demo_data')}</p>
  <section className="panel"><h2>{t('buttons')}</h2><div className="ui-cluster">
   <Button type="button" onClick={() => setNotice(true)}>{t('save')}</Button>
   <Button type="button" variant="secondary" onClick={() => setNotice(false)}>{t('secondary_action')}</Button>
   <Button type="button" variant="quiet" onClick={() => setNotice(true)}>{t('quiet_action')}</Button>
   <Button type="button" disabled>{t('disabled_action')}</Button>
   <Button type="button" busy>{t('loading')}</Button>
   <ConfirmDialog title={t('confirmation_example')} trigger={t('revoke')} onConfirm={() => setConfirmed(true)} />
  </div>{notice && <Alert tone="success">{t('changes_saved')}</Alert>}{confirmed && <Alert tone="info">{t('demo_confirmed')}</Alert>}</section>
  <section className="panel"><h2>{t('forms')}</h2><form noValidate onSubmit={(event) => { event.preventDefault(); setInvalid(!name.trim()); setNotice(Boolean(name.trim())); }}>
   <Field label={t('sample_name')} help={t('demonstration')} error={invalid ? t('required_field') : ''}>{(props) => <Input {...props} value={name} onChange={(event) => setName(event.target.value)} required />}</Field>
   <Field label={t('role')}>{(props) => <Select {...props}><option>{t('member')}</option><option>{t('tenant_admin')}</option></Select>}</Field>
   <Field label={t('read_only')}>{(props) => <Input {...props} value="example@example.test" readOnly />}</Field>
   <Button type="submit">{t('save')}</Button>
  </form></section>
  <section className="panel"><h2>{t('states')}</h2><div className="ui-cluster"><Badge>{t('member')}</Badge><Badge tone="success">{t('accepted')}</Badge><Badge tone="warning">{t('pending')}</Badge><Badge tone="danger">{t('rejected')}</Badge></div>
   <Alert tone="danger">{t('required_field')}</Alert><EmptyState title={t('no_invitations')}>{t('no_invitations_help')}</EmptyState><Skeleton label={t('loading')} />
  </section>
  <section className="panel"><h2>{t('invitation_list')}</h2><div className="ui-filter">
   <Field label={t('search_addresses')}>{(props) => <Input {...props} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />}</Field>
   <Field label={t('status')}>{(props) => <Select {...props} value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">{t('all_statuses')}</option><option value="pending">{t('pending')}</option><option value="accepted">{t('accepted')}</option></Select>}</Field>
  </div><DataTable density="compact" label={t('demonstration')} rows={rows} rowKey={(row) => row.id} empty={t('no_results')} columns={[
   { key: 'email', heading: t('email_address'), cell: (row) => row.email },
   { key: 'status', heading: t('status'), cell: (row) => <Badge tone={row.status === 'accepted' ? 'success' : 'warning'}>{t(row.status === 'accepted' ? 'accepted' : 'pending')}</Badge> },
  ]} /></section>
 </section>;
}
