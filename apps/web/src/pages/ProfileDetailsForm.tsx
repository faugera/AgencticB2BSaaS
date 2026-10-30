import { useEffect, useState } from 'react';
import type { ProfileDetails, ProfileInput } from '@enterprise/shared';
import { api } from '../http';
import { useLanguage } from '../i18n';
import { Alert, Button, Field, Input, Badge } from '../ui/primitives';

export function ProfileDetailsForm({ query, onSaved }: { query: string; onSaved: () => void }) {
 const { locale, t } = useLanguage();
 const [profile, setProfile] = useState<ProfileDetails | null>(null);
 const [error, setError] = useState(false);
 const [busy, setBusy] = useState(false);
 const [saved, setSaved] = useState(false);
 useEffect(() => {
  let active = true;
  void api<ProfileDetails>('/api/profile' + query).then((value) => { if (active) setProfile(value); }).catch(() => { if (active) setError(true); });
  return () => { active = false; };
 }, [query]);
 return <section aria-busy={busy}><h2>{t('profile_details')}</h2>
  {error && <Alert tone="danger">{t('unable_to_complete_this_request_try_again_later')}</Alert>}
  {saved && <Alert tone="success">{t('profile_saved')}</Alert>}
  {!profile ? !error && <p role="status">{t('loading')}</p> : <>
   <form onSubmit={(event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? '').trim();
    const body: ProfileInput = { first_name: text('first_name'), last_name: text('last_name'), avatar_url: text('avatar_url') || null, phone_number: text('phone_number') || null, job_title: text('job_title') || null, department: text('department') || null };
    setBusy(true); setError(false); setSaved(false);
    void api('/api/profile' + query, body, 'PUT').then(() => { setSaved(true); onSaved(); }).catch(() => setError(true)).finally(() => setBusy(false));
   }}>
    <Field label={t('first_name')}>{(props) => <Input {...props} name="first_name" autoComplete="given-name" required maxLength={100} defaultValue={profile.first_name ?? ''} />}</Field>
    <Field label={t('last_name')}>{(props) => <Input {...props} name="last_name" autoComplete="family-name" required maxLength={100} defaultValue={profile.last_name ?? ''} />}</Field>
    <Field label={t('account_email')}>{(props) => <Input {...props} readOnly value={profile.email} />}</Field>
    <p><Badge>{t(profile.is_email_verified ? 'email_verified' : 'email_unverified')}</Badge></p>
    <Field label={t('avatar_url')}>{(props) => <Input {...props} name="avatar_url" type="url" maxLength={2048} defaultValue={profile.avatar_url ?? ''} />}</Field>
    <Field label={t('phone_number')}>{(props) => <Input {...props} name="phone_number" type="tel" autoComplete="tel" pattern="\+[1-9][0-9]{1,14}" defaultValue={profile.phone_number ?? ''} />}</Field>
    <Field label={t('job_title')}>{(props) => <Input {...props} name="job_title" autoComplete="organization-title" maxLength={100} defaultValue={profile.job_title ?? ''} />}</Field>
    <Field label={t('department')}>{(props) => <Input {...props} name="department" maxLength={100} defaultValue={profile.department ?? ''} />}</Field>
    <Button type="submit" busy={busy}>{t('save')}</Button>
   </form>
   <p className="ui-help">{t('profile_created')} : {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(profile.created_at))}</p>
   <p className="ui-help">{t('profile_updated')} : {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(profile.updated_at))}</p>
  </>}
 </section>;
}

