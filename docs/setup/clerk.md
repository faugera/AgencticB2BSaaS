# Clerk development setup — Task 002

Status: preparation for implementation; the repository has no Clerk integration
or bootstrap command yet. Do not treat these names as existing application config.

## Account-owner steps

1. Create or select a dedicated development application in the Clerk Dashboard.
   Keep development and production separate. Do not subscribe to a paid plan
   unless its features are explicitly needed and approved.
2. Configure email verification, sign-in and recovery. Enable username support
   if username-based sign-in is required; otherwise keep the chosen username
   as an application handle and explicitly use email for sign-in.
3. Make application access invitation-only. Provider identity registration must
   never provision a tenant or grant a local role. Check the chosen instance's
   actual signup/invitation settings before choosing the corresponding SDK flow.
4. Set the frontend development origin to http://127.0.0.1:5173 consistently.
   Choose production domains separately; do not assume a hosting provider.
5. Keep credentials in private environment files or the environment secret store,
   never in chat, commits, screenshots, GitHub issues, or documentation.

Proposed variables to wire during implementation:

| Variable | Consumer | Classification |
| --- | --- | --- |
| VITE_CLERK_PUBLISHABLE_KEY | apps/web | Public publishable key only |
| CLERK_SECRET_KEY | apps/api / protected operator tooling | Private secret |
| CLERK_ISSUER | apps/api | Exact expected issuer from the selected instance |
| APP_ORIGIN | apps/api | Exact frontend origin |
| DATABASE_URL | apps/api | Private runtime DB connection |
| MIGRATION_DATABASE_URL | migration/operator tooling only | Private privileged DB connection |

All frontend VITE_* values are public. Never place a secret/database URL in them.
Configure approved origins and issuer validation server-side. The web frontend's
publishable key and the API secret/issuer must belong to the same instance.
Application-specific verification may also use the provider's public JWT key;
decide key rotation/revocation behavior when wiring the SDK.

## Initial platform administrator

Use private operator input for intended email, verified provider user ID,
username, first name and last name. Do not put personal account defaults in seeds.

The operator will verify the intended identity, use an expiring provider
invitation or recovery flow to set a new password, then run the protected local
bootstrap command once it has been implemented. The earlier shared password must
not be reused. Do not create the platform account through ordinary public signup
or promote a user merely because its email matches a request parameter.

The bootstrap must be idempotent for the intended identity and fail closed for a
different identity when an initial administrator already exists. Audit its result.
Test this flow on development before doing any production bootstrap.

## Required evidence

Successful verification of the intended email, sign-in, sign-out/session
revocation, recovery and explicit local platform-role assignment. Account
creation, invitations and emails are real external writes: do not claim they
occurred until the provider confirms them.

References:
- https://dashboard.clerk.com/
- https://clerk.com/docs/react/getting-started/quickstart
- https://clerk.com/docs/reference/backend/verify-token
