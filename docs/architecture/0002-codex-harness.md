# ADR-002 — Coding-agent execution and context contract

Status: proposed. Applies to Codex, Claude Code, Cursor and Windsurf; Codex-specific capabilities remain optional.

The Codex declarative SDD execution contract is now defined in
`../../.specs/standards/workflow.md`, routed by root `AGENTS.md`.
Its states, recovery and evidence rules take precedence over overlapping guidance
below. This historical cross-tool proposal does not imply automated SDD CI checks.

## Decision
Treat `AGENTS.md` as a compact navigation map, not a handbook. Prefer outcome-oriented tasks, minimal diffs, existing utilities and platform APIs. Load only task-relevant `docs/` and `.agents/skills/`; keep stable instructions ahead of volatile task details.

## Execution
1. Inspect repository, existing contracts and tests before changes.
2. Define goal, in-scope files, constraints and measurable acceptance.
3. Act autonomously for safe local reads, edits within approved scope and verification.
4. Request approval for destructive actions, production access, secrets, substantial new dependencies, architecture shifts, irreversible migrations and out-of-scope work.
5. Run applicable checks, inspect results and repair regressions caused by the task.
6. Report actual evidence, skipped checks, residual risks and a concise diff summary. Never claim unrun checks passed.
7. Use parallel agents only for independent work; isolate worktrees and avoid concurrent edits to the same files. Never merge automatically.

## Context budget and task recovery
- Skills must say when to load them; no automatic full-document ingestion.
- Keep durable checkpoints for long tasks: objective, scope, decisions, completed edits, verification, remaining work and blockers.
- Rehydrate from repository and tests rather than relying on long conversation transcripts.
- Use lower reasoning effort for routine tasks and increase for security, architecture, multi-module changes or unresolved failures; model choice is configurable, not hard-coded.
- Prefer deterministic tooling/CI over model self-assessment.

## Definition of Done
Requested behavior demonstrated; minimal diff; typecheck/lint/tests/build/smoke and relevant e2e/security checks executed; no explicit `any`; security boundaries preserved; documentation updated only where impacted; skipped tests stated plainly.

## Evaluation
Measure unnecessary file churn, regressions, test pass rate, instruction/context size, task completion and security failures. Review changes empirically before adding more rules.

## Reference
OpenAI, Practical guide to building with GPT-6: https://openai.com/fr-FR/index/practical-guide-building-gpt-6/
