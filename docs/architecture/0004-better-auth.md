# ADR-004 — Self-hosted Better Auth

Status: accepted by owner; supersedes ADR-003's provider decision.

## Decision

Use Better Auth 1.7.12 in Fastify, its React client in Vite, and PostgreSQL for
identity, sessions, verification/recovery state and shared rate limits. No Clerk
account, SDK, CLI OAuth callback or identity-provider key is required.

Keep identity storage in schema `identity`. The migration operator owns it;
`identity_runtime` receives schema usage and table DML only, is not owner,
superuser, role creator or BYPASSRLS. Migration credentials live in a separate
operator environment file, never loaded by the API start/dev command.

Do not use the Better Auth organization/admin plugins as a second business role
registry. Authentication proves who the user is; no identity, public metadata,
request flag or first-user heuristic grants platform/tenant access.
The dedicated platform-role bootstrap and tenant/RBAC/RLS slice remain pending.

## Implemented boundary

- Public email signup is disabled in the HTTP instance. Only the explicit
  operator process can invite an identity with a random, unreported password.
- Verification is required; no session is granted by invitation or verification.
  After verification, the invited user requests a recovery link and chooses a
  password. This intentionally uses two email steps rather than a default password.
- Recovery tokens expire after 30 minutes and are single-use. Reset revokes
  existing sessions. Sessions use server-side storage, not a browser role cache.
- POST origins must match the exact configured public application origin. Use
  same-origin `/api` proxying, no wildcard CORS. Backend request URLs use the
  configured origin rather than an untrusted Host header.
- Preserve every Set-Cookie header separately. Secure cookies in HTTPS; HttpOnly
  sessions; no localStorage bearer tokens. Never log auth URLs, passwords or mail.
- Database-backed rate limits use the server-established client IP, not a
  client-supplied forwarding header. Proxy trust is off: deployments behind a proxy
  must deliberately configure trusted hops before per-user-IP limiting is assumed.
- API liveness remains independent of a database connection. Missing development
  auth config returns 503 on auth routes; production refuses disabled auth.
- UI defaults to French, supports English, and strips recovery tokens from the
  address bar. Referrer policy prevents links from being propagated.

## Operations and remaining work

We own security updates, secret rotation, database backup, session availability,
SMTP delivery and monitoring. Mailpit is development/test-only, loopback-bound;
production SMTP requires TLS. No production identity is created by tests.

The pinned SDK's supported migration API is run explicitly, never at API startup.
It refuses unsafe schema drift. Review generated schema changes on dependency
updates and test against a restored backup before production migrations.
Business-schema versioning/RLS, audit, tenant provisioning, platform MFA,
authorization and deployment hardening are not supplied by this identity slice.

Before removing external provider resources, check for real users and other
applications that use them. Git rollback does not restore provider sessions.
See the setup guide for cleanup and rollback boundaries.

## Verification

Unit/config tests; real PostgreSQL invitation/verification/recovery/session and
origin-denial tests; real SMTP/browser journey on desktop/mobile; UI language,
recovery error and overflow checks. The test DB must be explicitly configured;
missing configuration fails rather than silently skipping.

Sources: [Fastify integration](https://better-auth.com/docs/integrations/fastify),
[email/password](https://better-auth.com/docs/authentication/email-password),
[installation/migrations](https://better-auth.com/docs/installation).
