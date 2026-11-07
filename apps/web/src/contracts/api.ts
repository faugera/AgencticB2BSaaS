import { z } from 'zod';

const uuid = z.string().uuid();
const permission = z.enum([
  'organization.manage',
  'tenant.read',
  'tenant.manage',
  'workspace.read',
  'workspace.create',
  'workspace.update',
  'workspace.members.manage',
  'members.read',
  'members.manage',
  'invitations.manage',
  'audit.read',
  'roles.assign',
]);

export const accessContextSchema = z
  .object({
    actorId: uuid.nullable().optional(),
    platformRole: z.literal('super_admin').nullable().optional(),
    tenantId: uuid.nullable().optional(),
    tenantRole: z.enum(['tenant_admin', 'member']).nullable().optional(),
    handle: z.string().nullable().optional(),
    organizationId: uuid.nullable().optional(),
    organizationRole: z.literal('organization_admin').nullable().optional(),
    tenants: z
      .array(
        z
          .object({
            id: uuid,
            name: z.string(),
            organization_id: uuid,
          })
          .strict(),
      )
      .optional(),
    roles: z.array(z.string()).optional(),
    permissions: z.array(permission).optional(),
    level: z.number().int().optional(),
  })
  .strict()
  .transform(
    ({
      actorId,
      platformRole,
      tenantId,
      tenantRole,
      handle,
      organizationId,
      organizationRole,
      tenants,
      roles,
      permissions,
      level,
    }) => ({
      actorId: actorId ?? null,
      platformRole: platformRole ?? null,
      tenantId: tenantId ?? null,
      tenantRole: tenantRole ?? null,
      handle: handle ?? null,
      ...(organizationId === undefined ? {} : { organizationId }),
      ...(organizationRole === undefined ? {} : { organizationRole }),
      ...(tenants === undefined ? {} : { tenants }),
      ...(roles === undefined ? {} : { roles }),
      ...(permissions === undefined ? {} : { permissions }),
      ...(level === undefined ? {} : { level }),
    }),
  );

export const workspaceSchema = z
  .object({
    id: uuid,
    tenant_id: uuid,
    name: z.string(),
    visibility: z.enum(['private', 'tenant']),
    can_manage: z.boolean().optional(),
    can_assign_roles: z.boolean().optional(),
    role_level: z.number().int().optional(),
    color: z.string().nullable().optional(),
  })
  .strict()
  .transform(({ can_manage, can_assign_roles, role_level, color, ...required }) => ({
    ...required,
    ...(can_manage === undefined ? {} : { can_manage }),
    ...(can_assign_roles === undefined ? {} : { can_assign_roles }),
    ...(role_level === undefined ? {} : { role_level }),
    ...(color === undefined ? {} : { color }),
  }));

export const meSchema = z.object({
  user: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
    })
    .strict(),
  access: accessContextSchema,
  can_assign_workspace_roles: z.boolean().optional(),
}).strict();

export const tenantSummarySchema = z
  .object({ id: uuid, name: z.string(), organization_id: uuid })
  .strict();
export const tenantSummaryListSchema = z.array(tenantSummarySchema);
export const organizationSummarySchema = z
  .object({ id: uuid, name: z.string() })
  .strict();
export const organizationSummaryListSchema = z.array(organizationSummarySchema);
export const workspaceListSchema = z.array(workspaceSchema);
const pageCursor = z.string().regex(/^[A-Za-z0-9_-]{1,512}$/).max(512);
const pagedListSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.union([
    z
      .object({ items: z.array(itemSchema), nextCursor: pageCursor.nullable() })
      .strict(),
    z.array(itemSchema).transform((items) => ({ items, nextCursor: null })),
  ]);

export const workspacePageSchema = pagedListSchema(workspaceSchema);

export const invitationSchema = z
  .object({
    id: uuid,
    email: z.string().email(),
    role: z.enum(['tenant_admin', 'member']),
    expires_at: z.string(),
    accepted_at: z.string().nullable(),
    revoked_at: z.string().nullable(),
    delivery: z.enum(['pending', 'sent', 'failed']),
  })
  .strict();
export const invitationListSchema = z.array(invitationSchema);
export const invitationPageSchema = pagedListSchema(invitationSchema);
export const memberSchema = z
  .object({
    id: uuid,
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['tenant_admin', 'workspace_admin', 'member']).nullable(),
  })
  .strict();
export const memberListSchema = z.array(memberSchema);
export const memberPageSchema = pagedListSchema(memberSchema);

export const preferencesSchema = z
  .object({
    locale: z.enum(['fr', 'en']),
    theme: z.enum(['system', 'light', 'dark']),
    timezone: z.string().optional(),
    date_format: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  })
  .strict()
  .transform(({ timezone, date_format, ...required }) => ({
    ...required,
    ...(timezone === undefined ? {} : { timezone }),
    ...(date_format === undefined ? {} : { date_format }),
  }))
  .nullable();

export const auditPageSchema = z
  .object({
    events: z.array(
      z
        .object({
          id: z.string(),
          occurred_at: z.string(),
          actor_id: uuid.nullable(),
          tenant_id: uuid.nullable(),
          action: z.string(),
          resource_id: z.string().nullable(),
          resource_type: z.string().nullable(),
          changed_fields: z.array(z.string()),
        })
        .strict(),
    ),
    nextCursor: uuid.nullable(),
  })
  .strict();

export const accessRequestSchema = z
  .object({
    id: uuid,
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email(),
    status: z.enum(['pending', 'approved', 'rejected']),
    created_at: z.string(),
  })
  .strict();
export const accessRequestListSchema = z.array(accessRequestSchema);
export const accessLinkSchema = z.object({ url: z.string().url() }).strict();
export const accessReviewResultSchema = z
  .object({ delivery: z.enum(['pending', 'sent', 'failed']).optional(), ok: z.literal(true).optional() })
  .strict()
  .refine((value) => value.delivery !== undefined || value.ok === true);

export const guideSchema = z
  .object({
    fr: z.array(
      z.object({ title: z.string(), text: z.string() }).strict(),
    ),
    en: z.array(
      z.object({ title: z.string(), text: z.string() }).strict(),
    ),
  })
  .strict();

export const roleDefinitionSchema = z
  .object({
    id: uuid,
    code: z.string(),
    name: z.string(),
    scope: z.enum(['organization', 'tenant', 'workspace']),
    level: z.number().int(),
    permissions: z.array(permission),
    delegable: z.boolean(),
    builtin: z.boolean(),
    archivedAt: z.string().nullable(),
    updatedAt: z.string(),
    impactCount: z.number().int().nonnegative(),
  })
  .strict();
export const roleDefinitionListSchema = z.array(roleDefinitionSchema);
export const roleAssignmentSchema = z
  .object({
    id: uuid,
    code: z.string(),
    name: z.string(),
    scope: z.enum(['organization', 'tenant', 'workspace']),
    permissions: z.array(permission),
    level: z.number().int(),
    delegable: z.boolean(),
    organizationId: uuid,
    tenantId: uuid.nullable(),
    workspaceId: uuid.nullable(),
  })
  .strict();
export const rolePersonSchema = z
  .object({
    id: uuid,
    name: z.string(),
    email: z.string().email(),
    status: z.enum(['invited', 'active', 'suspended']),
    roles: z.array(roleAssignmentSchema),
  })
  .strict();
export const rolePersonListSchema = z.array(rolePersonSchema);

export const profileDetailsSchema = z
  .object({
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    avatar_url: z.string().nullable(),
    phone_number: z.string().nullable(),
    job_title: z.string().nullable(),
    department: z.string().nullable(),
    email: z.string().email(),
    is_email_verified: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

export const uuidSchema = uuid;
