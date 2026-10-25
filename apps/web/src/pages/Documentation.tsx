import { useEffect, useState } from 'react';
import { DesignGallery } from '../ui/DesignGallery';
import { Button } from '../ui/primitives';
import { api } from '../http';
import { useLanguage } from '../i18n';

type Guide = { fr: { title: string; text: string }[]; en: { title: string; text: string }[] };
export function Documentation() {
  const { locale, t } = useLanguage();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'guide' | 'components'>('guide');
  useEffect(() => {
    let active = true;
    void api<Guide>('/api/platform/docs').then((value) => { if (active) setGuide(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  return <section className="panel documentation-panel">
    <div className="ui-tabs"><Button type="button" aria-pressed={tab === 'guide'} onClick={() => setTab('guide')}>{t('guide')}</Button><Button type="button" aria-pressed={tab === 'components'} onClick={() => setTab('components')}>{t('design_system')}</Button></div>
    {tab === 'components' ? <DesignGallery /> : <><p>{t('docs_intro')}</p>
    {error ? <p role="alert">{t('access_denied')}</p> : !guide ? <p role="status">{t('loading')}</p> : guide[locale].map((section) => <article key={section.title}><h3>{section.title}</h3><p>{section.text}</p></article>)}
    </>}
  </section>;
}
