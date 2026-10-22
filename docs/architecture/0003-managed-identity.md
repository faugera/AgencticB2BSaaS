# ADR-003 — Managed identity (superseded)

Status: superseded by [ADR-004](0004-better-auth.md), following the owner's
decision to remove Clerk and use self-hosted Better Auth.

The former provider choice was documented, but no Clerk SDK, identity mapping or
application user database was committed to main. Runtime dependencies and
authentication are now defined by ADR-004 and `../setup/better-auth.md`.

Keep this short historical record so old links remain understandable.
External Clerk keys, CLI credentials and the provider application are not deleted
by a Git migration; the account owner must review/revoke unused credentials after
checking other consumers. Do not export or drop existing users without a separate
migration plan if any are discovered.
