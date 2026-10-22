# Better Auth setup

The current implementation and reproducible commands are documented once in
[the private pilot runbook](private-pilot.md). It covers PostgreSQL runtime roles,
versioned migrations, identity invitation, verified operator bootstrap, SMTP,
optional MFA, Codespaces, tests, secrets, backup/restore and rollback.

No provider account or authentication CLI is needed. Login is `/login`; `/auth`
and `/auth/reset` remain compatibility routes. Identity enrollment alone never
grants organization/platform permissions.

## Retiring Clerk safely

The inspected main branch contained no Clerk SDK or production identity mapping.
Repository cleanup removes competing npm lockfiles and obsolete installation
instructions, not external accounts. Unpushed Codespace changes must be reviewed
before pulling; never overwrite them using reset/clean.

Check the Clerk Dashboard for real users or other consumers before revoking
development keys and CLI OAuth grants. If real accounts exist, stop and plan
stable subject mapping, verified identity proof, credential reset and session
cutover. Do not auto-link privileged accounts by email or delete provider data.
Provider/account deletion is an explicit owner action, not part of this PR.
