---
name: tenant-boundary
description: Change business authorization, SQL or tenant/workspace APIs safely.
---

1. Read `.specify/memory/constitution.md` and the current spec/plan/tasks. Read `docs/architecture/0005-private-pilot.md` before changing permissions.
2. Verified identity is not authorization. Use persisted enabled actors and
   membership inside `businessTransaction`; client tenant IDs are only requests.
3. New tenant content needs ENABLE/FORCE RLS, composite tenant references and
   two-tenant adversarial tests. Private authorization metadata stays behind
   narrowly granted functions. Do not grant runtime schema ownership/BYPASSRLS.
4. Preserve append-only audit, optional MFA and explicit operator bootstrap.
   Never log request tokens, credentials, raw SQL errors or mail contents.
5. Run all gates in `verify-change`; add a new SQL migration instead of editing
   applied files. Provisioning/secret rotation is never an application migration.
