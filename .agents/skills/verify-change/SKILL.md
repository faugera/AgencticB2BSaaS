---
name: verify-change
description: Verify a code change in this monorepo and report evidence.
---

1. Read the root AGENTS.md and the affected app's source.
2. Keep changes scoped; do not add infrastructure for future capabilities.
3. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm smoke`.
4. For UI changes, install Chromium with `pnpm exec playwright install chromium`
   and run `pnpm test:e2e`. Check desktop/mobile layout and working navigation.
5. If tooling is unavailable, report the exact failing command and cause.
   Never substitute an unexecuted test for a passing result.
6. Update the relevant spec or architecture note when behavior or boundaries change.
7. For auth/business SQL changes, also run `pnpm verify:security`,
   `pnpm verify:tenant-isolation`, and `pnpm test:auth:e2e` against an explicit
   disposable PostgreSQL/Mailpit setup. Never read private environment files,
   downgrade a missing-infrastructure gate to skipped, or claim mocked UI proves
   server authorization. See `docs/setup/private-pilot.md`.
