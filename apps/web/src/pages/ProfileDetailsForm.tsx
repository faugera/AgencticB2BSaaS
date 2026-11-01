import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { ProfileDetails, ProfileInput } from '@enterprise/shared';
import { api } from '../http';
import { useLanguage } from '../i18n';
import { Alert, Button, Field, Input, Badge } from '../ui/primitives';

type LoadState = { query: string; profile: ProfileDetails | null; status: 'ready' | 'error' };
type SaveState = { query: string; status: 'saving' | 'saved' | 'error' };

export function ProfileDetailsForm({ query, onSaved }: { query: string; onSaved: () => void }) {
  const { locale, t } = useLanguage();
  const [loadState, setLoadState] = useState<LoadState | null>(null);
  const [saveState, setSaveState] = useState<SaveState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const activeQuery = useRef(query);
  const formHasFocus = useRef(false);
  const restoreFocus = useRef(false);
  const loading = loadState?.query !== query;
  const currentProfile = loadState?.query === query && loadState.status === 'ready'
    ? loadState.profile
    : null;
  const busy = saveState?.query === query && saveState.status === 'saving';
  const saved = saveState?.query === query && saveState.status === 'saved';
  const error = (loadState?.query === query && loadState.status === 'error')
    || (saveState?.query === query && saveState.status === 'error');
  const statusMessage = loading
    ? t('loading')
    : busy
      ? t('saving_changes')
      : saved
        ? t('profile_saved')
        : currentProfile
          ? t('profile_loaded')
          : '';

  useLayoutEffect(() => {
    activeQuery.current = query;
    return () => {
      restoreFocus.current = formHasFocus.current;
    };
  }, [query]);

  useLayoutEffect(() => {
    if (restoreFocus.current && loading) {
      statusRef.current?.focus();
      restoreFocus.current = false;
    }
  }, [loading, query]);

  useEffect(() => {
    let active = true;
    void api<ProfileDetails>('/api/profile' + query)
      .then((value) => {
        if (active && activeQuery.current === query) {
          setLoadState({ query, profile: value, status: 'ready' });
        }
      })
      .catch(() => {
        if (active && activeQuery.current === query) {
          setLoadState({ query, profile: null, status: 'error' });
        }
      });
    return () => {
      active = false;
    };
  }, [query]);

  return <>
    <p ref={statusRef} role="status" tabIndex={-1}>{statusMessage}</p>
    <section aria-busy={loading || busy}>
      <h2>{t('profile_details')}</h2>
      {error && <Alert tone="danger">{t('unable_to_complete_this_request_try_again_later')}</Alert>}
      {currentProfile && <>
        <form
          ref={formRef}
          onFocusCapture={() => { formHasFocus.current = true; }}
          onBlurCapture={(event) => {
            const next = event.relatedTarget;
            if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
              formHasFocus.current = false;
            }
          }}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const text = (key: string) => String(data.get(key) ?? '').trim();
          const body: ProfileInput = {
            first_name: text('first_name'),
            last_name: text('last_name'),
            avatar_url: text('avatar_url') || null,
            phone_number: text('phone_number') || null,
            job_title: text('job_title') || null,
            department: text('department') || null,
          };
          const submittedQuery = query;
          setSaveState({ query: submittedQuery, status: 'saving' });
          void api('/api/profile' + submittedQuery, body, 'PUT')
            .then(() => {
              if (activeQuery.current === submittedQuery) {
                setSaveState({ query: submittedQuery, status: 'saved' });
                onSaved();
              }
            })
            .catch(() => {
              if (activeQuery.current === submittedQuery) {
                setSaveState({ query: submittedQuery, status: 'error' });
              }
            });
        }}>
          <Field label={t('first_name')}>{(props) => <Input {...props} name="first_name" autoComplete="given-name" required maxLength={100} defaultValue={currentProfile.first_name ?? ''} />}</Field>
          <Field label={t('last_name')}>{(props) => <Input {...props} name="last_name" autoComplete="family-name" required maxLength={100} defaultValue={currentProfile.last_name ?? ''} />}</Field>
          <Field label={t('account_email')}>{(props) => <Input {...props} readOnly value={currentProfile.email} />}</Field>
          <p><Badge>{t(currentProfile.is_email_verified ? 'email_verified' : 'email_unverified')}</Badge></p>
          <Field label={t('avatar_url')}>{(props) => <Input {...props} name="avatar_url" type="url" maxLength={2048} defaultValue={currentProfile.avatar_url ?? ''} />}</Field>
          <Field label={t('phone_number')}>{(props) => <Input {...props} name="phone_number" type="tel" autoComplete="tel" pattern="\+[1-9][0-9]{1,14}" defaultValue={currentProfile.phone_number ?? ''} />}</Field>
          <Field label={t('job_title')}>{(props) => <Input {...props} name="job_title" autoComplete="organization-title" maxLength={120} defaultValue={currentProfile.job_title ?? ''} />}</Field>
          <Field label={t('department')}>{(props) => <Input {...props} name="department" maxLength={100} defaultValue={currentProfile.department ?? ''} />}</Field>
          <Button type="submit" busy={busy}>{t('save')}</Button>
        </form>
        <p className="ui-help">{t('profile_created')} : {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(currentProfile.created_at))}</p>
        <p className="ui-help">{t('profile_updated')} : {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(currentProfile.updated_at))}</p>
      </>}
    </section>
  </>;
}
