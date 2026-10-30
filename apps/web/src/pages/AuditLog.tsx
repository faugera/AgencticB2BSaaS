import { useEffect, useState } from 'react';
import type { AuditPage } from '@enterprise/shared';
import { api } from '../http';
import { useLanguage } from '../i18n';
import { Alert, Button, EmptyState } from '../ui/primitives';

export function AuditLog({ query, global = false }: { query: string; global?: boolean }) {
  const { locale, t } = useLanguage();
  const [before, setBefore] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<AuditPage | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(query);
    if (before) params.set('before', before);
    void api<AuditPage>('/api/audit-logs?' + params.toString())
      .then((value) => { if (active) setResult(value); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [query, before, revision]);
  const load = (cursor: string | null) => {
    setResult(null); setError(false); setBefore(cursor); setRevision((value) => value + 1);
  };
  const mutations: Readonly<Record<string, string>> = { 'change.created': t('audit_created'), 'change.updated': t('audit_updated'), 'change.deleted': t('audit_deleted') };
  const resources: Readonly<Record<string, string>> = {
    tenant: t('organizations'), workspace: t('workspaces'), user: t('audit_user'), actor: t('audit_actor'),
    membership: t('audit_membership'), workspace_member: t('audit_workspace_member'),
    invitation: t('invitations_page'), access_request: t('access_requests'), workspace_appearance: t('audit_appearance'),
  };
  return <section className="panel" aria-label={t('audit_log')} aria-busy={!result && !error}>
    <p>{t(global && !query ? 'audit_global' : 'audit_scoped')}</p>
    <p className="ui-help">{t('audit_privacy')}</p>
    <div className="ui-tabs"><Button type="button" variant="secondary" onClick={() => load(null)}>{t('audit_refresh')}</Button></div>
    {error ? <Alert tone="danger">{t('unable_to_complete_this_request_try_again_later')}</Alert>
      : !result ? <p role="status">{t('loading')}</p>
        : result.events.length === 0 ? <EmptyState title={t('audit_empty')} /> : <>
          <div className="ui-table-region" role="region" aria-label={t('audit_log')} tabIndex={0}>
            <table className="ui-table"><thead><tr>
              {(['audit_date', 'audit_event', 'audit_target', 'audit_author', 'audit_tenant', 'audit_fields'] as const).map((key) =>
                <th key={key} scope="col">{t(key)}</th>)}
            </tr></thead><tbody>{result.events.map((event) => <tr key={event.id}>
              <td><time dateTime={event.occurred_at}>{new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(event.occurred_at))}</time></td>
              <td>{mutations[event.action] ?? event.action}<div className="ui-help">{event.resource_type ? t('audit_change') : t('audit_legacy')}</div></td>
              <td>{event.resource_type ? resources[event.resource_type] ?? event.resource_type : null}<div><code>{event.resource_id ?? '—'}</code></div></td>
              <td><code>{event.actor_id ?? t('audit_unknown_author')}</code></td>
              <td><code>{event.tenant_id ?? t('audit_no_tenant')}</code></td>
              <td>{event.changed_fields.join(', ') || '—'}</td>
            </tr>)}</tbody></table>
          </div>
          <div className="ui-tabs"><Button type="button" variant="secondary" disabled={!result.nextCursor} onClick={() => load(result.nextCursor)}>{t('audit_older')}</Button><span className="ui-help">{t('audit_page_size')}</span></div>
        </>}
  </section>;
}
