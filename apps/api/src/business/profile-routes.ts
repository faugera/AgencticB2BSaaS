import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import type { AccessContext, ProfileDetails } from '@enterprise/shared';
import { AccessError } from './store.js';
import { profileInputSchema, profileQuerySchema } from './profile-dto.js';

type Transact = <T>(request: FastifyRequest, action: string, run: (client: PoolClient, context: AccessContext) => Promise<T>, tenant?: string) => Promise<T>;

export function registerProfileRoutes(app: FastifyInstance, transact: Transact) {
  app.get('/api/profile', async (request) => {
    const query = profileQuerySchema.safeParse(request.query);
    if (!query.success) throw new AccessError(400, 'INVALID_REQUEST');
    return transact(request, 'profile.read', async (client) => {
      const result = await client.query<{ profile: ProfileDetails }>('SELECT business.profile() profile');
      return result.rows[0]?.profile ?? null;
    }, query.data.tenantId);
  });
  app.put('/api/profile', async (request) => {
    const query = profileQuerySchema.safeParse(request.query);
    const input = profileInputSchema.safeParse(request.body);
    if (!query.success || !input.success) throw new AccessError(400, 'INVALID_REQUEST');
    const profile = input.data;
    return transact(request, 'profile.updated', async (client) => {
      const result = await client.query<{ profile: ProfileDetails }>(
        'SELECT business.save_profile($1,$2,$3,$4,$5,$6) profile',
        [profile.first_name, profile.last_name, profile.avatar_url, profile.phone_number, profile.job_title, profile.department],
      );
      return result.rows[0]?.profile ?? null;
    }, query.data.tenantId);
  });
}
