# Tasks: Agent guide

**Input**: Design documents from `specs/007-agent-guide/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`

## Phase 1: Setup

**Purpose**: Verify the maintained project facts before editing the guide.

- [x] T001 Confirm commands, runtime versions, stack and source links against `package.json`, `.specs/standards/architecture-stack.md`, `docs/architecture.md` and `docs/setup/private-pilot.md`

---

## Phase 2: Foundational

No separate infrastructure or implementation prerequisite is needed for this documentation change.

---

## Phase 3: User Story 1 - Comprendre le projet rapidement (Priority: P1)

**Goal**: Explain the template purpose, current scope, stack and module boundaries.

**Independent Test**: Check that the summary separates implemented foundations from deferred capabilities and links to maintained architecture documentation.

- [x] T002 [US1] Add the project purpose, current pilot scope, stack and module responsibilities to `AGENTS.md`

---

## Phase 4: User Story 2 - Exécuter les contrôles appropriés (Priority: P1)

**Goal**: Make development and verification commands discoverable with their important prerequisites.

**Independent Test**: Match every command against `package.json` and ensure infrastructure-dependent gates are not presented as having passed automatically.

- [x] T003 [US2] Add exact install, development, verification, documentation, security and database-test commands with concise prerequisites to `AGENTS.md`

---

## Phase 5: User Story 3 - Respecter les règles de contribution (Priority: P1)

**Goal**: Surface concise contribution rules and direct contributors to authoritative sources.

**Independent Test**: Verify Spec Kit stages, do/don’t guidance and local links to governance, standards, architecture, runbooks, tests and design references.

- [x] T004 [US3] Add do/don’t guidance and links to Spec Kit, constitution and key maintained documents in `AGENTS.md`
- [x] T005 [US3] Apply the two safe, approved Markdown link corrections to `docs/setup/private-pilot.md` and the five distinct link-label corrections to `docs/sdd/legacy-reconciliation.md`
- [x] T006 [US3] Record the complete reference-file scan and unresolved findings without editing official generated Spec Kit skills or historical legacy artifacts in `MARKDOWN-ACCESSIBILITY-AUDIT.md`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the finished documentation and its links.

- [x] T007 Run `pnpm docs:test` and `pnpm docs:check`; resolve any failures in `AGENTS.md` and `specs/007-agent-guide/`
- [x] T008 Compare the final changes with the spec and document any verification limits in `specs/007-agent-guide/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup**: T001 verifies factual sources before guide edits.
- **Foundational**: Not applicable; this change adds no code or infrastructure.
- **User stories**: T002 through T006 depend on T001; T003/T004 also depend on T002 because all changes update the same guide or its audit context.
- **Polish**: T007 and T008 depend on all documentation updates.

### User Story Dependencies

- **US1**: Starts after T001; no dependency on another story.
- **US2**: Depends on the common fact verification in T001; its content can be integrated with US1 in `AGENTS.md`.
- **US3**: Depends on T001; references and review are integrated with the guide update.

### Parallel Opportunities

- No guide-edit tasks are parallelizable because the primary stories update the same file.
- Once the documentation is complete, `pnpm docs:test` and `pnpm docs:check` are separate checks but run together as one validation command sequence.

## Implementation Strategy

1. Verify facts and authoritative links.
2. Update `AGENTS.md` as one coherent navigation guide.
3. Apply only safe, approved corrections to maintained direct-reference documents. Preserve generated Spec Kit files and historical artifacts.
4. Record scanner results and run the documentation checks.

## Notes

- Do not change runtime code, application behavior, SQL, or CI.
- Preserve the constitution’s role as the authority for governance.
- A finding in an official generated file or a historical artifact remains reported, not silently edited.
