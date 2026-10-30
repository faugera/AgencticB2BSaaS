import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SidebarSimpleIcon } from '@phosphor-icons/react';
import type { MeResponse, Workspace } from '@enterprise/shared';
import { AdminSidebar, FeatureNavigation } from '../admin/AdminSidebar';
import { useLanguage } from '../i18n';
import { useAccountPreferences } from './preferences';
import { Alert, Button, Field, Select } from './primitives';

export function AppShell({ me, admin, scope, tenants, workspaces, selected, onScopeChange, onSignOut, busy, children }: {
 me: MeResponse; admin: boolean; scope: string; tenants: readonly { id: string; name: string }[];
 workspaces: readonly Workspace[]; selected: Workspace | null; onScopeChange: (value: string) => void;
 onSignOut: () => void; busy: boolean; children: ReactNode;
}) {
 const { t } = useLanguage();
 const prefs = useAccountPreferences(me.user.id);
 const [collapsed, setCollapsed] = useState(false);
 const [mobileOpen, setMobileOpen] = useState(false);
 useEffect(() => {
  const desktop = window.matchMedia('(min-width: 768px)');
  const closeMobile = () => { if (desktop.matches) setMobileOpen(false); };
  desktop.addEventListener('change', closeMobile);
  return () => desktop.removeEventListener('change', closeMobile);
 }, []);
 const navigate = useNavigate();
 const location = useLocation();
 const base = admin ? '/admin' : '/app';
 const query = scope ? '?tenantId=' + encodeURIComponent(scope) : '';
 const color = !admin && selected?.color && location.pathname.endsWith('/workspaces/' + selected.id) && /^#[\da-f]{6}$/i.test(selected.color) ? selected.color : undefined;
 const workspacePath = selected ? base + '/workspaces/' + selected.id + query : base;
 return <div className={`ui-root ui-shell ${collapsed ? 'ui-collapsed' : ''} ${mobileOpen ? 'ui-mobile-open' : ''}`} style={color ? { '--workspace-color': color } as CSSProperties : undefined}>
  <a className="ui-skip" href="#app-main">{t('back_to_the_application')}</a>
  <aside className="admin-sidebar ui-sidebar" aria-label={t(admin ? 'platform_administration' : 'main_navigation')}>
   <Link className="ui-wordmark" to={base} aria-label="AgencticB2BSaaS" title="AgencticB2BSaaS">{collapsed ? 'A' : 'AgencticB2BSaaS'}</Link>
   <Button variant="quiet" type="button" className="ui-collapse-control" aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)} aria-label={t(collapsed ? 'expand_menu' : 'collapse_menu')} title={t(collapsed ? 'expand_menu' : 'collapse_menu')}>{collapsed ? <SidebarSimpleIcon size={16} aria-hidden="true" /> : t('collapse_menu')}</Button>
   <Button variant="quiet" type="button" className="ui-close-mobile" onClick={() => setMobileOpen(false)}>{t('close_menu')}</Button>
   <div className="ui-sidebar-context">
    {(admin || tenants.length > 0) && <AdminSidebar scope={scope || me.access?.tenantId || ''} tenants={tenants} t={t} onScopeChange={onScopeChange} />}
    {!admin && workspaces.length > 0 && <div><label>{t('context_workspace')}<Select value={selected?.id ?? ''} onChange={(event) => { void navigate(event.target.value ? base + '/workspaces/' + event.target.value + query : base); setMobileOpen(false); }} aria-describedby={selected ? 'workspace-context-help' : undefined}><option value="">{t('select_workspace')}</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name} ({workspace.id})</option>)}</Select></label>{selected && <p id="workspace-context-help" className="ui-help">{selected.name} ({selected.id})</p>}</div>}
   </div>
   <FeatureNavigation admin={admin} manager={me.access?.tenantRole === 'tenant_admin' || me.access?.organizationRole === 'organization_admin' || Boolean(me.access?.permissions?.includes('members.manage'))} canRoles={admin || Boolean(me.access?.permissions?.includes('roles.assign')) || Boolean(me.workspaces?.some((workspace) => workspace.can_assign_roles)) || (me.access?.permissions === undefined && me.access?.tenantRole === 'tenant_admin')} canAudit={Boolean(me.access?.permissions?.includes('audit.read'))} organizationAdmin={me.access?.organizationRole === 'organization_admin' || Boolean(me.access?.permissions?.includes('organization.manage'))} query={query} t={t} onNavigate={() => setMobileOpen(false)} />
   <details className="ui-account" open><summary title={me.user.name || me.user.email}>{me.user.name || me.user.email}</summary><div className="ui-account-settings">
    <Link to={base + '/profile'}>{t('profile')}</Link>
    <Field label={t('language')}>{(props) => <Select {...props} disabled={prefs.busy} value={prefs.locale} onChange={(event) => { void prefs.save({ locale: event.target.value === 'en' ? 'en' : 'fr', theme: prefs.theme }); }}><option value="fr">Français</option><option value="en">English</option></Select>}</Field>
    <Field label={t('theme')}>{(props) => <Select {...props} disabled={prefs.busy} value={prefs.theme} onChange={(event) => { const value = event.target.value; void prefs.save({ locale: prefs.locale, theme: value === 'dark' || value === 'light' ? value : 'system' }); }}><option value="system">{t('theme_system')}</option><option value="light">{t('theme_light')}</option><option value="dark">{t('theme_dark')}</option></Select>}</Field>
    <Button type="button" variant="quiet" disabled={busy} onClick={onSignOut}>{t('sign_out')}</Button>
    {prefs.error && <Alert tone="danger">{t('preferences_error')}</Alert>}
   </div></details>
  </aside>
  <div className="ui-main-content" data-workspace-tint={Boolean(color)} inert={mobileOpen}>{children}</div>
  <nav className="ui-bottom-nav" aria-label={t('menu')}><Link to={workspacePath} onClick={() => setMobileOpen(false)} aria-current={location.pathname === workspacePath.split('?')[0] ? 'page' : undefined}>{selected?.name ?? t('workspaces')}</Link><Link to={base + '/profile'} onClick={() => setMobileOpen(false)}>{t('profile')}</Link><Button type="button" variant="quiet" aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>{t(mobileOpen ? 'close_menu' : 'menu')}</Button></nav>
 </div>;
}
