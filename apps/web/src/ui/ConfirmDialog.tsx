import { useEffect, useId, useRef, useState } from 'react';
import { Button } from './primitives';
import { useLanguage } from '../i18n';

export function ConfirmDialog({ title, onConfirm, trigger, disabled = false, variant = 'danger' }: { title: string; onConfirm: () => void; trigger: string; disabled?: boolean; variant?: 'primary' | 'danger' }) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return <>
    <Button ref={button} type="button" variant={variant} disabled={disabled} onClick={() => setOpen(true)}>{trigger}</Button>
    <dialog ref={dialog} className="ui-dialog" aria-labelledby={id} onClose={() => { setOpen(false); button.current?.focus(); }} onCancel={() => setOpen(false)}>
      <h2 id={id}>{title}</h2>
      <div className="ui-dialog-actions"><Button type="button" variant="secondary" autoFocus onClick={() => setOpen(false)}>{t('cancel_action')}</Button><Button type="button" variant={variant} onClick={() => { setOpen(false); onConfirm(); }}>{t('confirm')}</Button></div>
    </dialog>
  </>;
}
