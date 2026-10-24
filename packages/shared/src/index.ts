/** Public liveness contract. Does not imply database or provider readiness. */
export type HealthResponse = { status: 'ok' };

export type AccessContext = {
  actorId: string;
  platformRole: 'super_admin' | null;
  tenantId: string | null;
  tenantRole: 'tenant_admin' | 'member' | null;
  handle: string | null;
};
export type Workspace = {
  id: string;
  tenant_id: string;
  name: string;
  visibility: 'private' | 'tenant';
  can_manage?: boolean;
  color?: string | null;
};
export type MeResponse = {
  user: { id: string; name: string; email: string };
  access?: AccessContext;
  workspaces?: Workspace[];
};

export type UIPreferences = { locale: 'fr' | 'en'; theme: 'system' | 'light' | 'dark' };
export type AuditEvent = {
  readonly id: string;
  readonly occurred_at: string;
  readonly actor_id: string | null;
  readonly tenant_id: string | null;
  readonly action: string;
  readonly resource_id: string | null;
  readonly resource_type: string | null;
  readonly changed_fields: readonly string[];
};
export type AuditPage = {
  readonly events: readonly AuditEvent[];
  readonly nextCursor: string | null;
};
