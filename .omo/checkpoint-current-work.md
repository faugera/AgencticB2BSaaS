# Current work

- Preserve all dirty work on `codex/correct-audit-findings`; no commit/push requested.
- Audit fixes completed, local PostgreSQL provisioned/migrated through 0007.
- Local dev process: unified session 68687 (`pnpm dev`), web5173/API3000.
- Admin routing and local test credential display implemented and verified (39unit/28E2E, real local login). Credentials only in ignored apps/web/.env.local; never read/print them in reviews or captures. User approved handle adminRFE, synthetic email, generated password. No source credentials.
- Fresh prior route evidence: routes-audit/routes.json under the task visualization directory;174 captures,22API checks. Reviewers admin_integrity/admin_visual PASS. Signup/docs/profile are still missing, honestly documented.

## Active authorized work

1. User now requests `/admin` sidebar with feature navigation and right-hand main area. Implement existing organization/workspace/member-invitation/security features with real routes, retain tenant scope, responsive FR/EN. Preserve existing design tokens, no new dependencies.
2. User requested unique IDs and creation/update/deletion dates for users/organizations. IDs and identity createdAt/updatedAt already exist. User explicitly confirmed logical deletion with retained rows and revoked access. No lifecycle code written yet. Add new migration(s), not edit0001-0007; regression tests against an isolated disposable PostgreSQL cluster before applying to local dev.

## Lifecycle design explored, not implemented

- identity.user: add nullable deletedAt; enforce updatedAt with DB trigger. business.tenants: add created_at/updated_at/deleted_at, auto-update trigger; existing creation dates unknown must be documented/backfilled only with real evidence.
- Logical user deletion must remove sessions, disable existing business actor, prevent new sessions and lazy actor recreation. A database BEFORE INSERT session trigger can SELECT user row FOR SHARE then return NULL for deleted users; installed BetterAuth handles missing created session as401. Test adapter behavior rather than assume.
- Avoid RLS recursion when filtering deleted tenants: separate membership-only helper from tenant_access; tenant_read policy uses membership helper+deleted_at IS NULL; tenant_access may then safely query active tenant. Existing platform APIs keep server-role checks.
- Tenant logical deletion must revoke pending invitations. Keep all rows and FKs; no new delete UI/API requested yet.
- Need test active-admin guard still excludes deleted users, cross-tenant isolation, UUID preservation, timestamps, session revocation/creation races. Reuse skills tenant-boundary/verify-change and run private-pilot gates on disposable DB/Mailpit, never local real-data fixtures.
