/** Public liveness contract. Does not imply database or provider readiness. */
export type HealthResponse = { status: 'ok' };

export type AccessContext = {
  actorId: string;
  platformRole: 'super_admin' | null;
  tenantId: string | null;
  tenantRole: 'tenant_admin' | 'member' | null;
  handle: string | null;
  readonly organizationId?: string | null;
  readonly organizationRole?: 'organization_admin' | null;
  readonly tenants?: readonly TenantSummary[];
  readonly roles?: readonly string[];
  readonly permissions?: readonly Permission[];
  readonly level?: number;
};
export type Workspace = {
  id: string;
  tenant_id: string;
  name: string;
  visibility: 'private' | 'tenant';
  can_manage?: boolean;
  can_assign_roles?: boolean;
  role_level?: number;
  color?: string | null;
};
export type MeResponse = {
  user: { id: string; name: string; email: string };
  access?: AccessContext;
  workspaces?: Workspace[];
};

export type UIPreferences = { locale: 'fr' | 'en'; theme: 'system' | 'light' | 'dark'; readonly timezone?: string; readonly date_format?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' };
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

export type Permission = 'organization.manage' | 'tenant.read' | 'tenant.manage' | 'workspace.read' | 'workspace.create' | 'workspace.update' | 'workspace.members.manage' | 'members.read' | 'members.manage' | 'invitations.manage' | 'audit.read' | 'roles.assign';
export type TenantSummary = { readonly id: string; readonly name: string; readonly organization_id: string };
export type OrganizationSummary = { readonly id: string; readonly name: string };
export type RoleDefinition = {
 readonly id: string; readonly code: string; readonly name: string;
 readonly scope: 'organization' | 'tenant' | 'workspace'; readonly level: number;
 readonly permissions: readonly Permission[]; readonly delegable: boolean;
 readonly builtin: boolean; readonly archivedAt: string | null; readonly updatedAt: string;
 readonly impactCount: number;
};
export type RoleAssignment = Pick<RoleDefinition, 'id' | 'code' | 'name' | 'scope' | 'permissions' | 'level' | 'delegable'> & {
 readonly organizationId: string; readonly tenantId: string | null; readonly workspaceId: string | null;
};
export type RolePerson = {
 readonly id: string; readonly name: string; readonly email: string;
 readonly status: 'invited' | 'active' | 'suspended'; readonly roles: readonly RoleAssignment[];
};
export type ProfileInput = {
 readonly first_name: string; readonly last_name: string;
 readonly avatar_url?: string | null; readonly phone_number?: string | null;
 readonly job_title?: string | null; readonly department?: string | null;
};
export type ProfileDetails = {
 readonly first_name: string | null; readonly last_name: string | null;
 readonly avatar_url: string | null; readonly phone_number: string | null;
 readonly job_title: string | null; readonly department: string | null;
 readonly email: string; readonly is_email_verified: boolean;
 readonly created_at: string; readonly updated_at: string;
};
