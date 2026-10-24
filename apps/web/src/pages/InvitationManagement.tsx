import { useState } from 'react';
import { api } from '../http';
import { useLanguage } from '../i18n';
import { Badge, Button, EmptyState, Field, Input, Select } from '../ui/primitives';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DataTable } from '../ui/DataTable';

export type Invitation = { id: string; email: string; role: string; delivery: string; accepted_at: string | null; revoked_at: string | null };
export type Member = { id: string; name: string; email: string; role: string | null };
type Action = (run: () => Promise<unknown>) => Promise<void>;
const status = (invitation: Invitation) => invitation.accepted_at ? 'accepted' : invitation.revoked_at ? 'revoked' : invitation.delivery === 'failed' ? 'delivery_failed' : 'pending';
export function InvitationManagement({ invitations, query, busy, action }: { invitations: readonly Invitation[]; query: string; busy: boolean; action: Action }) {
 const { t } = useLanguage();
 const [search, setSearch] = useState('');
 const [filter, setFilter] = useState('all');
 const rows = invitations.filter((item) => item.email.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || status(item) === filter));
 return <div className="ui-invitations">
  <section><h2>{t('invitation_list')}</h2>
   {invitations.length > 0 && <div className="ui-filter"><Field label={t('search_addresses')}>{(props) => <Input {...props} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />}</Field><Field label={t('status')}>{(props) => <Select {...props} value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">{t('all_statuses')}</option>{(['pending', 'accepted', 'revoked', 'delivery_failed'] as const).map((value) => <option key={value} value={value}>{t(value)}</option>)}</Select>}</Field></div>}
   {!invitations.length ? <EmptyState title={t('no_invitations')}>{t('no_invitations_help')}</EmptyState> : <DataTable label={t('invitation_list')} rows={rows} rowKey={(row) => row.id} empty={t('no_results')} columns={[
    { key: 'email', heading: t('email_address'), cell: (row) => row.email },
    { key: 'role', heading: t('role'), cell: (row) => t(row.role === 'tenant_admin' ? 'organization_administrator' : 'member') },
    { key: 'status', heading: t('status'), cell: (row) => <Badge tone={status(row) === 'accepted' ? 'success' : status(row) === 'pending' ? 'warning' : 'neutral'}>{t(status(row))}</Badge> },
    { key: 'actions', heading: t('actions'), cell: (row) => !row.accepted_at && !row.revoked_at && <div className="ui-cluster"><Button type="button" variant="quiet" disabled={busy} onClick={() => { void action(() => api('/api/invitations/' + row.id + query, { operation: 'retry' })); }}>{t('resend')}</Button><ConfirmDialog title={t('revoke') + ' — ' + row.email} trigger={t('revoke')} disabled={busy} onConfirm={() => { void action(() => api('/api/invitations/' + row.id + query, { operation: 'revoke' })); }} /></div> },
   ]} />}
  </section>
  <section className="ui-invitation-form"><h2>{t('invite_member')}</h2><p className="ui-help">{t('access_description')}</p><form onSubmit={(event) => {
   event.preventDefault(); const element = event.currentTarget; const form = new FormData(element);
   void action(async () => { const result = await api('/api/invitations' + query, { email: String(form.get('email') ?? ''), role: String(form.get('role') ?? 'member') }); element.reset(); return result; });
  }}>
   <Field label={t('email_address')}>{(props) => <Input {...props} name="email" type="email" autoComplete="email" required maxLength={254} />}</Field>
   <Field label={t('role')}>{(props) => <Select {...props} name="role"><option value="member">{t('member')}</option><option value="tenant_admin">{t('organization_administrator')}</option></Select>}</Field>
   <Button type="submit" busy={busy}>{t('invite')}</Button>
  </form></section>
 </div>;
}
export function MemberManagement({ members, query, busy, action }: { members: readonly Member[]; query: string; busy: boolean; action: Action }) {
 const { t } = useLanguage();
 const [search, setSearch] = useState('');
 const rows = members.filter((member) => (member.name + ' ' + member.email).toLowerCase().includes(search.toLowerCase()));
 return <section className="panel">{members.length > 0 && <Field label={t('search_addresses')}>{(props) => <Input {...props} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />}</Field>}
 <DataTable label={t('members_page')} rows={rows} rowKey={(row) => row.id} empty={t(members.length ? 'no_results' : 'no_members')} columns={[
  { key: 'name', heading: t('display_name'), cell: (row) => row.name }, { key: 'email', heading: t('email_address'), cell: (row) => row.email },
  { key: 'actions', heading: t('actions'), cell: (row) => <ConfirmDialog title={t('remove_access') + ' — ' + row.name} trigger={t('remove_access')} disabled={busy} onConfirm={() => { void action(() => api('/api/members/' + row.id + query, undefined, 'DELETE')); }} /> },
 ]} /></section>;
}
