# Admin routes final gate review

- recommendation: APPROVE
- blockers: []
- originalIntent: Fix the `/admin` 404, verify the route surface, and show the explicitly authorized synthetic super-admin credentials only on a local development admin login.
- desiredOutcome: Dedicated admin login/MFA/recovery routes, server-established super-admin gating, scope-preserving navigation, responsive bilingual pages, and no credential leakage into production output.
- userOutcomeReview: The reviewed implementation meets the requested outcome. Anonymous admin routes return to `/admin/login`; ordinary members are redirected to `/403`; super-admins remain in the admin route family; local credential rendering requires Vite DEV, a loopback hostname, and all three configured values. The audited route matrix has 174 captures, no horizontal overflow, no unexpected 404, and all screenshot files exist. Four explicitly pending routes remain 404 and are accurately documented as pending.

## Checked artifacts

- `apps/web/src/main.tsx`
- `apps/web/src/application.tsx`
- `apps/web/src/auth/AuthPage.tsx`
- `apps/web/src/auth/LocalTestAdminCredentials.tsx`
- `apps/web/src/auth/messages.ts`
- `apps/web/src/auth/redirect.ts`
- `apps/web/src/auth/redirect.test.ts`
- `tests/e2e/admin.spec.ts`
- `docs/architecture/routes-verification.md`
- `C:/Users/fauge/.codex/visualizations/2026/10/23/01a169aa-dc6f-7913-8b5e-de0dd7209baf/routes-audit/routes.json`
- Direct visual inspection: French 375px admin login, English 768px authenticated admin, French 1280px authenticated admin security, English 375px expected `/admin/profile` 404.

## Reproduced evidence

- `pnpm test -- --run`: PASS, 39/39.
- `pnpm build`: PASS; shared/API/web compilation and production Vite build completed.
- `pnpm lint`: PASS.
- Fresh production bundle scan: no local-admin environment variable names, approved fixture email, or approved fixture handle. Localized panel labels remain because they share the message catalog; this is not credential leakage.
- Route manifest: 174 captures (156 unauthenticated, 18 authenticated), 0 overflow, 0 unexpected 404, 30 expected-missing captures, 0 missing screenshot files.
- `.env.local` is ignored and untracked. Its contents were not read.

## Direct programming and slop/overfit pass

- No dependency, speculative abstraction, parser, normalization layer, dead debug code, or removal-only/deletion-only test was introduced in the reviewed scope.
- Redirect tests assert security-relevant observable destinations rather than implementation details.
- Admin E2E tests cover anonymous login/MFA destination retention, member denial, super-admin redirect/navigation, and admin sign-out destination. They are behavioral rather than tautological.
- Credential rendering is a small leaf component with boundary checks. The production guard is compile-time (`import.meta.env.DEV`) plus runtime loopback and complete-fixture checks.
- NOTE: the three admin `Route` entries use the same React key (`key="admin"`). The static route table and captured behavior work, so this does not violate a stated success criterion, but `key={path}` would avoid duplicate-key diagnostics during future reconciliation.
- NOTE: `application.tsx` exceeds the remove-ai-slops 250 pure-LOC guideline, but this is pre-existing structure and architecture size is not a stated acceptance criterion for this route fix.

## Evidence gaps

- No separate executor/code-review/manual-QA report files were present under a ULW evidence directory, and `omo ulw-loop status --json` could not be obtained because the Windows wrapper rejected the command syntax. Direct diff, source, test, build, route-manifest, and screenshot inspection supplied sufficient evidence for the stated criteria.
- A fresh headless Playwright rerun did not execute because all Chromium processes failed at launch with `Invalid file descriptor to ICU data received`. This is an environment-level launch failure before test code ran. The existing 28-test headed run claim was not independently reproduced in this pass; the 174 fresh screenshot artifacts and direct image inspection corroborate the route/UI behavior.
- Credential text in screenshots is deliberately masked, so screenshots prove placement/overflow but not the literal values. Source guards, ignored-file status, prior real login evidence supplied to the reviewer, and production-bundle scans cover the confidentiality criterion without reading the private env file.

## Pending routes (non-blocking)

- `/signup`, `/docs`, `/app/profile`, and `/admin/profile` remain 404 by design for this scoped fix and are explicitly listed in `docs/architecture/routes-verification.md`.
