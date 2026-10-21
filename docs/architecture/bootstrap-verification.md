# Bootstrap verification

CI run: https://github.com/faugera/AgencticB2BSaaS/actions/runs/39669090642
Verified application commit: `19e544f213dab1d0090053bf6e6e86da8ec8318c`.
Runner: Ubuntu 24.04, Node 24.22.0, pnpm 11.25.0.

| Gate | Result |
| --- | --- |
| Frozen dependency installation | Passed |
| Strict TypeScript (apps, contracts, test configs) | Passed |
| ESLint | Passed |
| Vitest | 10 tests passed across 2 files |
| API and web production builds | Passed |
| Built API real HTTP /health + SIGTERM shutdown | Passed |
| Playwright desktop and mobile navigation/overflow | 2 tests passed |
| Compose validation + PostgreSQL startup + SELECT 1 | Passed |

A committed pnpm lockfile freezes dependency resolution. Only esbuild's required
dependency build script is explicitly allowed. No private credentials are included.

Local sandbox checks also passed: JavaScript syntax, JSON manifests, configuration
validation, port defaults/rejections, Git whitespace and Compose interpolation.
The sandbox cannot reach its configured proxy and denies the Docker socket, so
the full executable gates were run on GitHub Actions rather than locally.

This verifies the bootstrap, not production tenant isolation, IAM, agent execution
or deployment hardening; those capabilities are not implemented.
