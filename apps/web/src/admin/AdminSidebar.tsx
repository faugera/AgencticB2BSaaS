import { NavLink } from 'react-router-dom';
import { HouseSimpleIcon, BuildingsIcon, SquaresFourIcon, UsersIcon, ShieldCheckIcon, UserCircleIcon, BookOpenIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react';
import type { UIMessage } from '../i18n';
import { Select } from '../ui/primitives';

export function FeatureNavigation({ admin, manager, query, t, onNavigate }: { admin: boolean; manager: boolean; query: string; t: (key: UIMessage) => string; onNavigate: () => void }) {
 const links = admin ? [
  { path: '/admin', label: 'overview', icon: HouseSimpleIcon },
  { path: '/admin/organizations', label: 'organizations', icon: BuildingsIcon },
  { path: '/admin/workspaces', label: 'workspaces', icon: SquaresFourIcon },
  { path: '/admin/members', label: 'invitations_and_members', icon: UsersIcon },
  { path: '/admin/audit', label: 'audit_log', icon: BookOpenIcon },
  { path: '/admin/security', label: 'account_security', icon: ShieldCheckIcon },
  { path: '/admin/profile', label: 'profile', icon: UserCircleIcon },
  { path: '/docs', label: 'docs', icon: BookOpenIcon },
 ] as const : [
  { path: '/app', label: 'workspaces', icon: SquaresFourIcon },
  ...(manager ? [{ path: '/app/members', label: 'members_page', icon: UsersIcon }, { path: '/app/invitations', label: 'invitations_page', icon: EnvelopeSimpleIcon }] as const : []),
  { path: '/app/security', label: 'account_security', icon: ShieldCheckIcon },
  { path: '/app/profile', label: 'profile', icon: UserCircleIcon },
 ] as const;
 return <nav aria-label={t('main_navigation')}>{links.map(({ path, label, icon: Icon }) => <NavLink key={path} to={path + (path === '/docs' || path.endsWith('/profile') ? '' : query)} end={path === '/admin' || path === '/app'} onClick={onNavigate} title={t(label)}><Icon size={16} weight="regular" aria-hidden="true" /><span>{t(label)}</span></NavLink>)}</nav>;
}
export function AdminSidebar({ scope, tenants, onScopeChange, t }: { scope: string; tenants: readonly { id: string; name: string }[]; onScopeChange: (value: string) => void; t: (key: UIMessage) => string }) {
 return <div className="admin-scope"><label>{t('active_organization')}<Select value={scope} onChange={(event) => onScopeChange(event.target.value)} aria-describedby="admin-scope-help"><option value="">{t('select_an_organization')}</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</Select></label><p id="admin-scope-help" className="ui-help">{t('organization_scope_help')}</p></div>;
}
