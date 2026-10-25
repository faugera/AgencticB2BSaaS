import { z } from 'zod';

export const profileQuerySchema = z.strictObject({ tenantId: z.uuid().optional() });
export const profileInputSchema = z.strictObject({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  avatar_url: z.url({ protocol: /^https?$/ }).nullable().optional().default(null),
  phone_number: z.string().regex(/^\+[1-9][0-9]{1,14}$/).nullable().optional().default(null),
  job_title: z.string().trim().max(120).nullable().optional().default(null),
  department: z.string().trim().max(100).nullable().optional().default(null),
});

