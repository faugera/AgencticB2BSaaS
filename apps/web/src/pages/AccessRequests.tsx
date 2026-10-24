import { useEffect, useState } from 'react';
import { api } from '../http';
import { useLanguage } from '../i18n';
import { Alert, Badge, Button, EmptyState, Field, Input, Select, Skeleton } from '../ui/primitives';
import { ConfirmDialog } from '../ui/ConfirmDialog';

type Request = { id: string; first_name: string; last_name: string; email: string; status: 'pending' | 'approved' | 'rejected'; created_at: string };
function RequestReview({ request, busy, review }: { request: Request; busy: boolean; review: (operation: 'approve' | 'reject', role: 'member' | 'tenant_admin') => void }) {
 const { t } = useLanguage();
 const [role, setRole] = useState<'member' | 'tenant_admin'>('member');
 return <div className="ui-request-row"><div><strong>{request.first_name} {request.last_name}</strong><p className="ui-help">{request.email}</p></div>
 {request.status !== 'pending' ? <Badge tone={request.status === 'approved' ? 'success' : 'neutral'}>{t(request.status)}</Badge> : <div className="ui-cluster"><Field label={t('role')}>{(props) => <Select {...props} value={role} onChange={(event) => setRole(event.target.value === 'tenant_admin' ? 'tenant_admin' : 'member')}><option value="member">{t('member')}</option><option value="tenant_admin">{t('tenant_admin')}</option></Select>}</Field><Button type="button" disabled={busy} onClick={() => review('approve', role)}>{t('approve_request')}</Button><ConfirmDialog trigger={t('reject_request')} title={t('confirm_reject_request')} disabled={busy} onConfirm={() => review('reject', role)} /></div>}
 </div>;
}
export function AccessRequests({ query }: { query: string }) {
 const { locale, t } = useLanguage();
 const [requests, setRequests] = useState<Request[]>([]);
 const [loading, setLoading] = useState(true);
 const [url, setURL] = useState('');
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState(false);
 const [notice, setNotice] = useState<'saved' | 'delivery' | null>(null);
 const [revision, setRevision] = useState(0);
 useEffect(() => {
  let active = true;
  void api<Request[]>('/api/access-requests' + query).then((data) => { if (active) setRequests(data); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
  return () => { active = false; };
 }, [query, revision]);
 return <section className="panel" aria-busy={busy || loading}>
  <div className="ui-section-heading"><h2>{t('access_requests')}</h2><Button variant="quiet" type="button" disabled={busy} onClick={() => {
   setBusy(true); setError(false);
   void api<{ url: string }>('/api/access-link' + query, {}).then((data) => setURL(data.url)).catch(() => setError(true)).finally(() => setBusy(false));
  }}>{t('create_access_link')}</Button></div>
  {error && <Alert tone="danger">{t('unable_to_complete_this_request_try_again_later')}</Alert>}
  {notice && <Alert tone="success">{t(notice === 'delivery' ? 'saved_but_email_delivery_failed_retry_from_invitations' : 'changes_saved')}</Alert>}
  {url && <Field label={t('access_link')}>{(props) => <Input {...props} readOnly value={url} onFocus={(event) => event.currentTarget.select()} />}</Field>}
  {loading ? <Skeleton label={t('loading')} /> : !requests.length && !error ? <EmptyState title={t('no_requests')}>{t('no_requests_help')}</EmptyState> : requests.map((request) => <div className="ui-request" key={request.id}>
   <RequestReview request={request} busy={busy} review={(operation, role) => {
    setBusy(true); setError(false); setNotice(null);
    void api<{ delivery?: string }>('/api/access-requests/' + request.id + query, { operation, role }).then((result) => { setNotice(result.delivery === 'failed' ? 'delivery' : 'saved'); setLoading(true); setRevision((value) => value + 1); }).catch(() => setError(true)).finally(() => setBusy(false));
   }} />
   <p className="ui-help">{t('request_date')} : <time dateTime={request.created_at}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(request.created_at))}</time></p>
  </div>)}
 </section>;
}
