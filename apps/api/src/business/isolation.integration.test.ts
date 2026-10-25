import { randomBytes, createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { migrateAuth } from '../auth/migrate.js';
import { provisionRoles } from '../auth/provision.js';
import { createAuth, createAuthPool } from '../auth/service.js';
import type { AuthConfig } from '../auth/config.js';
import {
  assertRuntimePrivileges,
  businessTransaction,
  createBusinessPool,
} from './store.js';
import { buildApp } from '../app.js';

const identityURL = process.env.AUTH_TEST_DATABASE_URL;
const migrationURL = process.env.AUTH_TEST_MIGRATION_DATABASE_URL;
if (
  !identityURL ||
  !migrationURL ||
  !new URL(identityURL).pathname.startsWith('/enterprise_auth_test')
)
  throw new Error('Explicit disposable PostgreSQL test database required');
const businessURL = identityURL.replace(
  'identity_runtime:',
  'business_runtime:',
);
const config: AuthConfig = {
  baseURL: 'http://127.0.0.1:5173',
  secret: randomBytes(48).toString('base64url'),
  databaseURL: identityURL,
  businessDatabaseURL: businessURL,
  smtp: {
    host: '127.0.0.1',
    port: 1025,
    secure: false,
    from: 'test@example.test',
  },
};
const operator = new Pool({ connectionString: migrationURL, max: 3 });
const identity = createAuthPool(identityURL);
const business = createBusinessPool(businessURL);
const identities: string[] = [];
const actors: string[] = [];
const tenants: string[] = [];
const spaces: string[] = [];
const otherSpaces: string[] = [];
const password = randomBytes(24).toString('base64url');
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
let app: ReturnType<typeof buildApp>;
let superId = '';
const tx = <T>(
  index: number,
  tenant: string | undefined,
  run: Parameters<typeof businessTransaction<T>>[4],
) =>
  businessTransaction(business, identities[index]!, tenant, 'test.read', run);

describe('PostgreSQL B2B adversarial isolation', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, identityURL, businessURL);
    await migrateAuth(config, migrationURL);
    const auth = createAuth(config, identity, async () => {}, true);
    for (let index = 0; index < 5; index++) {
      const account = await auth.api.signUpEmail({
        body: {
          email: `isolation-${randomBytes(8).toString('hex')}@example.test`,
          name: 'Synthetic test',
          password,
        },
      });
      identities.push(account.user.id);
      await operator.query(
        'UPDATE identity."user" SET "emailVerified"=true WHERE id=$1',
        [account.user.id],
      );
      const actor = await businessTransaction(
        business,
        account.user.id,
        undefined,
        'test.read',
        async (_client, context) => context.actorId,
      );
      actors.push(actor);
    }
    // The first actor stays an ordinary user. Explicit operator bootstrap only.
    const previous = await operator.query<{ identity_id: string }>(
      "SELECT identity_id FROM authorization_private.actors WHERE platform_role='super_admin'",
    );
    if (previous.rowCount) superId = previous.rows[0]!.identity_id;
    else {
      superId = identities[4]!;
      await operator.query('SELECT business.bootstrap_super($1,$2)', [
        superId,
        'test-' + randomBytes(4).toString('hex'),
      ]);
    }
    for (let index = 0; index < 2; index++) {
      const tenant = await businessTransaction(
        business,
        superId,
        undefined,
        'test.tenant',
        async (client) => {
          const row = (
            await client.query<{ id: string }>(
              'INSERT INTO business.tenants(name) VALUES($1) RETURNING id',
              ['Test ' + index],
            )
          ).rows[0]!;
          await client.query("SELECT set_config('app.tenant_id',$1,true)", [
            row.id,
          ]);
          const space = (
            await client.query<{ id: string }>(
              'INSERT INTO business.workspaces(tenant_id,name) VALUES($1,$2) RETURNING id',
              [row.id, 'Private'],
            )
          ).rows[0]!;
          spaces.push(space.id);
          otherSpaces.push(
            (
              await client.query<{ id: string }>(
                'INSERT INTO business.workspaces(tenant_id,name) VALUES($1,$2) RETURNING id',
                [row.id, 'Other private'],
              )
            ).rows[0]!.id,
          );
          return row.id;
        },
      );
      tenants.push(tenant);
      await operator.query(
        "INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'tenant_admin'),($3,$2,'member')",
        [actors[index * 2], tenant, actors[index * 2 + 1]],
      );
    }
    app = buildApp({ authConfig: config });
  });
  afterAll(async () => {
    await app?.close();
    await Promise.all([operator.end(), identity.end(), business.end()]);
  });
  it('uses two non-owner runtimes, rejects owner role escalation and identity access', async () => {
    await assertRuntimePrivileges(identity);
    await assertRuntimePrivileges(business);
    await expect(business.query('SET ROLE business_owner')).rejects.toThrow();
    await expect(
      business.query('SELECT * FROM identity.account'),
    ).rejects.toThrow();
    await expect(
      business.query('SELECT * FROM authorization_private.memberships'),
    ).rejects.toThrow();
    await expect(
      business.query('SELECT business.bootstrap_super($1,$2)', [
        identities[0],
        'attacker',
      ]),
    ).rejects.toThrow();
  });
  it('is closed without context; does not promote the first verified user', async () => {
    expect(
      (await business.query('SELECT * FROM business.tenants')).rowCount,
    ).toBe(0);
    expect(
      (await business.query('SELECT * FROM business.workspaces')).rowCount,
    ).toBe(0);
    expect(
      (await tx(0, tenants[0], async (_client, context) => context))
        .platformRole,
    ).toBeNull();
    await expect(
      operator.query('SELECT business.bootstrap_super($1,$2)', [
        identities[0],
        'not-allowed',
      ]),
    ).rejects.toThrow();
    await operator.query('SELECT business.bootstrap_super($1,$2)', [
      superId,
      'test-operator',
    ]);
  });

  it('rejects unexpected runtime grants before serving requests', async () => {
    await operator.query(
      'GRANT USAGE ON SCHEMA authorization_private TO business_runtime',
    );
    try {
      await expect(assertRuntimePrivileges(business)).rejects.toThrow(
        'Unsafe runtime',
      );
    } finally {
      await operator.query(
        'REVOKE USAGE ON SCHEMA authorization_private FROM business_runtime',
      );
    }
    await assertRuntimePrivileges(business);
  });
  it('filters forgotten WHERE clauses, joins, private workspaces and forged tenant context', async () => {
    const rows = await tx(
      0,
      tenants[0],
      async (client) =>
        (
          await client.query(
            'SELECT t.id,w.id workspace FROM business.tenants t JOIN business.workspaces w ON w.tenant_id=t.id',
          )
        ).rows,
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.workspace).sort()).toEqual(
      [spaces[0], otherSpaces[0]].sort(),
    );
    expect(
      await tx(
        1,
        tenants[0],
        async (client) =>
          (await client.query('SELECT * FROM business.workspaces')).rowCount,
      ),
    ).toBe(0);
    await expect(tx(0, tenants[1], async () => null)).rejects.toThrow();
    expect(
      await tx(0, tenants[0], async (client) => {
        await client.query("SELECT set_config('app.tenant_id',$1,true)", [
          tenants[1],
        ]);
        return (await client.query('SELECT * FROM business.workspaces'))
          .rowCount;
      }),
    ).toBe(0);
  });
  it('rejects cross-tenant composite references and one-user/two-tenant memberships', async () => {
    await expect(
      tx(0, tenants[0], async (client) =>
        client.query("SELECT business.assign_workspace($1,$2,'member')", [
          spaces[0],
          actors[3],
        ]),
      ),
    ).rejects.toThrow();
    await expect(
      operator.query(
        "INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'member')",
        [actors[1], tenants[1]],
      ),
    ).rejects.toThrow();
  });
  it('does not leak transaction context between concurrent pooled queries, even after errors', async () => {
    await Promise.all(
      Array.from({ length: 20 }, async (_, index) => {
        const tenant = index % 2;
        const result = await tx(
          tenant * 2,
          tenants[tenant],
          async (client) =>
            (await client.query('SELECT tenant_id FROM business.workspaces'))
              .rows,
        );
        expect(result.every((row) => row.tenant_id === tenants[tenant])).toBe(
          true,
        );
      }),
    );
    await expect(
      tx(0, tenants[0], async (client) => client.query('SELECT 1/0')),
    ).rejects.toThrow();
    expect(
      (await business.query('SELECT * FROM business.workspaces')).rowCount,
    ).toBe(0);
  });
  it('revokes workspace/tenant access immediately and preserves the last tenant administrator', async () => {
    await tx(0, tenants[0], async (client) =>
      client.query(
        "SELECT business.assign_workspace($1,$2,'workspace_admin')",
        [spaces[0], actors[1]],
      ),
    );
    expect(
      await tx(
        1,
        tenants[0],
        async (client) =>
          (await client.query('SELECT * FROM business.workspaces')).rowCount,
      ),
    ).toBe(1);
    await tx(0, tenants[0], async (client) =>
      client.query('SELECT business.remove_member($1,$2)', [
        actors[1],
        spaces[0],
      ]),
    );
    expect(
      await tx(
        1,
        tenants[0],
        async (client) =>
          (await client.query('SELECT * FROM business.workspaces')).rowCount,
      ),
    ).toBe(0);
    await expect(
      tx(0, tenants[0], async (client) =>
        client.query('SELECT business.remove_member($1)', [actors[0]]),
      ),
    ).rejects.toThrow();
    await tx(0, tenants[0], async (client) =>
      client.query('SELECT business.remove_member($1)', [actors[1]]),
    );
    expect(
      (await tx(1, undefined, async (_client, context) => context)).tenantId,
    ).toBeNull();
  });
  it('binds invitations to verified email, rejects replay, expiry and existing-tenant conflicts', async () => {
    const email = (
      await operator.query<{ email: string }>(
        'SELECT email FROM identity."user" WHERE id=$1',
        [identities[1]],
      )
    ).rows[0]!.email;
    const token = randomBytes(32).toString('base64url');
    const id = await tx(
      0,
      tenants[0],
      async (client) =>
        (
          await client.query<{ id: string }>(
            "SELECT business.invite($1,'member',$2) id",
            [email, hash(token)],
          )
        ).rows[0]!.id,
    );
    await expect(
      tx(3, undefined, async (client) =>
        client.query('SELECT business.accept_invitation($1)', [hash(token)]),
      ),
    ).rejects.toThrow();
    await tx(1, undefined, async (client) =>
      client.query('SELECT business.accept_invitation($1)', [hash(token)]),
    );
    await expect(
      tx(1, undefined, async (client) =>
        client.query('SELECT business.accept_invitation($1)', [hash(token)]),
      ),
    ).rejects.toThrow();
    const token2 = randomBytes(32).toString('base64url');
    await tx(2, tenants[1], async (client) =>
      client.query("SELECT business.invite($1,'member',$2)", [
        email,
        hash(token2),
      ]),
    );
    await expect(
      tx(1, undefined, async (client) =>
        client.query('SELECT business.accept_invitation($1)', [hash(token2)]),
      ),
    ).rejects.toThrow();
    await operator.query(
      "UPDATE authorization_private.invitations SET accepted_at=NULL,expires_at=now()-interval '1 second' WHERE id=$1",
      [id],
    );
    await expect(
      tx(1, undefined, async (client) =>
        client.query('SELECT business.accept_invitation($1)', [hash(token)]),
      ),
    ).rejects.toThrow();
  });
  it('audits cross-tenant super-admin reads and prevents audit rewriting', async () => {
    const count = Number(
      (
        await operator.query<{ count: string }>(
          'SELECT count(*) FROM authorization_private.audit',
        )
      ).rows[0]!.count,
    );
    await businessTransaction(
      business,
      superId,
      tenants[1],
      'workspace.read',
      async (client) =>
        expect(
          (await client.query('SELECT * FROM business.workspaces')).rowCount,
        ).toBe(2),
    );
    expect(
      Number(
        (
          await operator.query<{ count: string }>(
            'SELECT count(*) FROM authorization_private.audit',
          )
        ).rows[0]!.count,
      ),
    ).toBeGreaterThan(count);
    await expect(
      business.query('DELETE FROM authorization_private.audit'),
    ).rejects.toThrow();
    await expect(
      business.query("UPDATE authorization_private.audit SET action='hidden'"),
    ).rejects.toThrow();
  });

  it('allows tenant-visible workspaces only inside the current membership', async () => {
    await tx(0, tenants[0], async (client) =>
      client.query(
        "UPDATE business.workspaces SET visibility='tenant' WHERE id=$1",
        [otherSpaces[0]],
      ),
    );
    const visible = await tx(
      1,
      tenants[0],
      async (client) =>
        (await client.query('SELECT id FROM business.workspaces')).rows,
    );
    expect(visible.map((row) => row.id)).toEqual([otherSpaces[0]]);
    expect(
      await tx(
        3,
        tenants[1],
        async (client) =>
          (await client.query('SELECT id FROM business.workspaces')).rowCount,
      ),
    ).toBe(0);
    expect(
      await tx(
        0,
        tenants[0],
        async (client) =>
          (
            await client.query('SELECT * FROM business.workspace_people($1)', [
              spaces[1],
            ])
          ).rowCount,
      ),
    ).toBe(0);
  });
  it('exposes generic HTTP failures, disables business access immediately, preserves SDK and liveness', async () => {
    const email = (
      await operator.query<{ email: string }>(
        'SELECT email FROM identity."user" WHERE id=$1',
        [identities[2]],
      )
    ).rows[0]!.email;
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      remoteAddress: '198.51.100.17',
      headers: { origin: config.baseURL },
      payload: { email, password },
    });
    expect(login.statusCode).toBe(200);
    const cookie = login.cookies
      .map((entry) => `${entry.name}=${entry.value}`)
      .join('; ');
    const me = await app.inject({ url: '/api/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().access.tenantId).toBe(tenants[1]);
    expect(
      (await app.inject({ url: '/api/platform/tenants', headers: { cookie } }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/workspaces',
          headers: { cookie, origin: 'https://evil.test' },
          payload: { name: 'No' },
        })
      ).statusCode,
    ).toBe(403);
    await businessTransaction(
      business,
      superId,
      undefined,
      'actor.disabled',
      async (client) =>
        client.query('SELECT business.disable_actor($1)', [actors[2]]),
    );
    expect(
      (await app.inject({ url: '/api/me', headers: { cookie } })).statusCode,
    ).toBe(403);
    expect((await app.inject({ url: '/health' })).statusCode).toBe(200);
    expect((await app.inject({ url: '/ready' })).statusCode).toBe(200);
  });

  it('preserves the last enabled administrator but permits removing a disabled administrator', async () => {
    await operator.query(
      "UPDATE authorization_private.memberships SET role='tenant_admin' WHERE actor_id=$1",
      [actors[1]],
    );
    await businessTransaction(business, superId, undefined, 'actor.disabled', async (client) =>
      client.query('SELECT business.disable_actor($1)', [actors[1]]),
    );
    try {
      await expect(tx(0, tenants[0], async (client) => {
        await client.query('SELECT business.remove_member($1)', [actors[0]]);
        // Roll back even if the guard regresses, preserving the shared fixture.
        throw new Error('Removal unexpectedly succeeded');
      })).rejects.toThrow('LAST_ADMIN');
      await tx(0, tenants[0], async (client) =>
        client.query('SELECT business.remove_member($1)', [actors[1]]),
      );
    } finally {
      await operator.query('UPDATE authorization_private.actors SET enabled=true WHERE id=$1', [actors[1]]);
      await operator.query(
        "INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'member') ON CONFLICT(actor_id) DO UPDATE SET role='member'",
        [actors[1], tenants[0]],
      );
    }
  });

  it('serializes competing removals and cannot remove both tenant administrators', async () => {
    await operator.query(
      "UPDATE authorization_private.memberships SET role='tenant_admin' WHERE actor_id=$1",
      [actors[1]],
    );
    const results = await Promise.allSettled([
      tx(0, tenants[0], async (client) =>
        client.query('SELECT business.remove_member($1)', [actors[1]]),
      ),
      tx(1, tenants[0], async (client) =>
        client.query('SELECT business.remove_member($1)', [actors[0]]),
      ),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      Number(
        (
          await operator.query<{ count: string }>(
            "SELECT count(*) FROM authorization_private.memberships WHERE tenant_id=$1 AND role='tenant_admin'",
            [tenants[0]],
          )
        ).rows[0]!.count,
      ),
    ).toBe(1);
  });

  it('enforces business HTTP rate limits without altering Better Auth contracts',async()=>{
    let response=await app.inject({url:'/api/workspaces',remoteAddress:'198.51.100.244'});
    expect(response.statusCode).toBe(401);
    for(let attempt=1;attempt<=120;attempt++)response=await app.inject({url:'/api/workspaces',remoteAddress:'198.51.100.244'});
    expect(response.statusCode).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
    expect((await app.inject({url:'/health',remoteAddress:'198.51.100.244'})).statusCode).toBe(200);
  });
});
