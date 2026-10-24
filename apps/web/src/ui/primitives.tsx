import { useId } from 'react';
import type { ComponentPropsWithRef, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

export function Button({ variant = 'primary', busy = false, className = '', disabled, ...props }: ComponentPropsWithRef<'button'> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; busy?: boolean }) {
  return <button {...props} disabled={disabled || busy} aria-busy={busy || undefined} className={`ui-button ui-button-${variant} ${className}`} />;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`ui-input ${props.className ?? ''}`} />; }
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={`ui-input ${props.className ?? ''}`} />; }
export function Field({ label, help, error, children }: { label: string; help?: string; error?: string; children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode }) {
  const id = useId();
  const description = error || help;
  return <div className="ui-field"><label htmlFor={id}>{label}</label>{children({ id, ...(description ? { 'aria-describedby': id + '-help' } : {}), ...(error ? { 'aria-invalid': true } : {}) })}{description && <p id={id + '-help'} className={error ? 'ui-field-error' : 'ui-help'}>{description}</p>}</div>;
}
export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'warning' | 'danger'; children: ReactNode }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}
export function Alert({ tone = 'info', children }: { tone?: 'info' | 'success' | 'danger'; children: ReactNode }) {
  return <p className={`ui-alert ui-alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>{children}</p>;
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="ui-empty"><p>{title}</p>{children && <div className="ui-help">{children}</div>}</div>;
}
export function Skeleton({ label }: { label: string }) {
  return <div role="status" aria-busy="true" className="ui-skeleton"><span>{label}</span></div>;
}
