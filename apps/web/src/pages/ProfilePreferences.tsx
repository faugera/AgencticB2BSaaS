import { useState } from 'react';
import { useLanguage } from '../i18n';
import { useAccountPreferences } from '../ui/preferences';
import { Alert, Button, Field, Input, Select } from '../ui/primitives';
export function ProfilePreferences({ identity }: { identity: string }) {
 const { t } = useLanguage(); const prefs = useAccountPreferences(identity);
 const [saved, setSaved] = useState(false);
 return <section><h2>{t('profile_preferences')}</h2><form onSubmit={(event) => {
  event.preventDefault(); const form = new FormData(event.currentTarget); const format = form.get('date_format'); setSaved(false);
  void prefs.save({ locale: prefs.locale, theme: prefs.theme, timezone: String(form.get('timezone') ?? ''), date_format: format === 'MM/DD/YYYY' || format === 'YYYY-MM-DD' ? format : 'DD/MM/YYYY' }).then((success) => setSaved(success));
 }}>
  <Field label={t('timezone')}>{(props) => <Input {...props} name="timezone" required maxLength={100} defaultValue={prefs.timezone} key={prefs.timezone} placeholder="Europe/Paris" />}</Field>
  <Field label={t('date_format')}>{(props) => <Select {...props} name="date_format" defaultValue={prefs.date_format} key={prefs.date_format}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></Select>}</Field>
  <Button type="submit" busy={prefs.busy}>{t('save')}</Button>
  {prefs.error && <Alert tone="danger">{t('preferences_error')}</Alert>}{saved && <Alert tone="success">{t('changes_saved')}</Alert>}
 </form></section>;
}
