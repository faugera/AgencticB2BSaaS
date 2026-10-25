import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Workspace } from '@enterprise/shared';
import { useLanguage } from '../i18n';
import { api } from '../http';
import { Alert, Button, Field, Input } from './primitives';

export const workspacePalette = [
 ['lavender', '#b5a2df'], ['blue', '#93b9df'], ['mint', '#9ccdbb'], ['sage', '#b4c69b'],
 ['peach', '#e2b69f'], ['rose', '#d9a7bc'], ['sand', '#d6c29a'], ['periwinkle', '#a6b0df'],
] as const;
export function WorkspaceAppearance({ workspace, query, onSaved }: { workspace: Workspace; query: string; onSaved: () => void }) {
 const { t } = useLanguage();
 const [color, setColor] = useState(workspace.color ?? '');
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState(false);
 const [saved, setSaved] = useState(false);
 return <section className="panel"><h2>{t('workspace_appearance')}</h2>
  <form onSubmit={(event) => {
   event.preventDefault(); setBusy(true); setError(false); setSaved(false);
   void api('/api/workspaces/' + workspace.id + '/appearance' + query, { color: color || null }, 'PUT')
    .then(() => { setSaved(true); onSaved(); }).catch(() => setError(true)).finally(() => setBusy(false));
  }}>
   <div role="group" aria-label={t('appearance_palette')} className="ui-palette">
    <Button type="button" variant="secondary" aria-pressed={color === ''} onClick={() => setColor('')}>{t('neutral_color')}</Button>
    {workspacePalette.map(([name, value]) => <Button key={name} type="button" className="ui-swatch" style={{ '--swatch': value } as CSSProperties} aria-pressed={color.toLowerCase() === value} onClick={() => setColor(value)}>{t(name)}</Button>)}
   </div>
   <Field label={t('workspace_color')} help={t('color_help')}>{(props) => <Input {...props} value={color} onChange={(event) => setColor(event.target.value)} pattern="#[0-9a-fA-F]{6}" maxLength={7} placeholder="#b5a2df" />}</Field>
   <Button type="submit" busy={busy}>{t('save_color')}</Button>
  </form>
  {error && <Alert tone="danger">{t('unable_to_complete_this_request_try_again_later')}</Alert>}
  {saved && <Alert tone="success">{t('color_saved')}</Alert>}
 </section>;
}
