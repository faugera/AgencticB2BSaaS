# Route verification — 2026-10-23

The local routing check covers French/English at 375, 768 and 1280 pixels.
Browser navigation checks the rendered heading and final URL, not just the
frontend HTTP status, because the SPA fallback also serves unknown paths.

| Routes | Current behavior |
| --- | --- |
| `/` | Public homepage |
| `/login`, `/login/mfa` | User sign-in and MFA challenge |
| `/forgot-password`, `/reset-password` | User recovery and password reset |
| `/verify-email`, `/auth`, `/auth/reset` | Existing authentication aliases; verification links themselves are handled by `/api/auth/verify-email` |
| `/app`, `/app/security`, `/app/workspaces/:id` | Verified user area; anonymous visitors go to `/login`; super-admins go to the equivalent `/admin` route |
| `/admin`, `/admin/security`, `/admin/workspaces/:id` | Super-admin area; anonymous visitors go to `/admin/login`; ordinary members go to `/403` |
| `/admin/login`, `/admin/login/mfa` | Dedicated administrator sign-in and MFA challenge |
| `/admin/forgot-password`, `/admin/reset-password` | Administrator recovery retaining the admin destination |
| `/invite` | Invitation acceptance or instruction to reopen the invitation email |
| `/403` | Access denied |
| Unknown frontend paths | Rendered 404 page |
| `/health`, `/ready` | API liveness and readiness |
| Business API routes | Anonymous requests rejected with 401 |
| `/api`, unknown API paths | JSON 404; `/api` is a namespace, not an index page |

## Added routes — 2026-10-24

- `/signup?link=<uuid>`: access-request form with first name, last name and email;
  organization comes only from the shared link, without a public directory.
- `/docs`: super-admin-only guide, served by an independently authorized API.
- `/app/profile`, `/admin/profile`: profile editing and active-session management.
- `/app/members`, `/app/invitations`: dedicated pages using existing permissions;
  invitations includes own-tenant request links and request review.

These routes now render implemented UI. Browser checks use intercepted APIs and
do not prove database authorization or persistence; migration 0008 and disposable
PostgreSQL checks remain pending. Ordinary members cannot open administration pages.
Passkeys and SSO remain deferred. Existing optional MFA is retained.

## Evidence and limits

2026-10-24 addition: 58 browser scenarios pass with headed Chromium, including
FR/EN at 375/768/1280 pixels; 40 unit tests, lint, build and smoke pass. The root
typecheck is blocked by three errors in the preexisting lifecycle integration
draft. Security scanning and dependency audit pass, while auth/isolation database
tests fail initialization because disposable PostgreSQL credentials are absent.
The headless Chromium installation lacks ICU data; headed Chromium was used.
The dated evidence below belongs to the earlier route audit.

- Standard gates: types, lint, 39 unit tests, build and built API smoke pass.
- Browser regression suite: 28 passing scenarios on desktop/mobile, including
  admin login, MFA destination, member denial, admin navigation and tenant history.
- Direct API check: 22 method/path checks passed, without authenticated writes.
- Local test administrator sign-in, persisted super-admin role and sign-out were
  checked against real PostgreSQL. The account was explicitly requested for local
  development; its credentials remain in ignored environment configuration.
- Route rendering uses synthetic sessions for exhaustive locale/viewport checks;
  it does not replace authenticated backend isolation tests.

## Brume verification — 2026-10-24

The latest stable run reports 108 passing headed Chromium scenarios. 304 screenshots
are retained under `.omo/brume-captures-stable`, with the complete run receipt at
`.omo/brume-capture-stable.log`. Shared UI covers invitations/requests, member/profile,
signup, documentation and component-gallery states, workspace appearance, collapsed
sidebar and mobile menu in FR/EN and light/dark at 375/768/1280. The reference view
is also captured at 1487x1058; typography, spacing and sidebar differences follow
later explicit user decisions in DESIGN_UI.md. No marketing redesign.
These scenarios intercept APIs. Migration 0009, real preference persistence and
SQL authorization remain unverified until disposable PostgreSQL is available.
