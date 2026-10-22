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
};
export type MeResponse = {
  user: { id: string; name: string; email: string };
  access?: AccessContext;
  workspaces?: Workspace[];
};
