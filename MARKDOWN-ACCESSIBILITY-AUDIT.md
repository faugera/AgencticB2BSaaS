# Markdown Accessibility Audit

An audit of markdown documentation, run on 2026-11-07. Read the executive summary for the verdict, the priorities section for what to do first, and the findings tables for detail.

## Metadata

What was audited, with what, and under which settings.

| Field | Value |
|---|---|
| Date | 2026-11-07 |
| Scope | 29 items |
| Skills run | markdown-scanner |
| Tooling | node v24.22.1, a11y-mcp-server 7.1.0 |
| Scan configuration | defaults, no config file found |
| Checks counted | 20 |

## Review decisions

- The scan covered all nine Markdown accessibility domains. Per the selected
  reporting profile, only critical and serious findings are included; moderate
  and minor findings were not reported.
- The user selected removal of emoji, prose in place of diagrams, and dash
  normalization. No applicable finding required those changes.
- Seven approved link fixes were applied in `docs/setup/private-pilot.md` and
  `docs/sdd/legacy-reconciliation.md`.
- Eleven serious heading findings remain in generated Spec Kit skills and
  archived SDD documents. Repository instructions prohibit modifying these files.
- The initial scan reported a missing H1 in `docs/features-b2b.md`; inspection
  confirmed an existing H1, and a verification scan reported no finding.

Audited:

- `.agents\skills\speckit-analyze\SKILL.md`
- `.agents\skills\speckit-converge\SKILL.md`
- `.agents\skills\speckit-implement\SKILL.md`
- `.agents\skills\speckit-plan\SKILL.md`
- `.agents\skills\speckit-specify\SKILL.md`
- `.agents\skills\speckit-tasks\SKILL.md`
- `.agents\skills\tenant-boundary\SKILL.md`
- `.agents\skills\verify-change\SKILL.md`
- `.specify\memory\constitution.md`
- `.specs\domains\product-map.md`
- `AGENTS.md`
- `DESIGN_UI.md`
- `docs\architecture.md`
- `docs\architecture\0005-private-pilot.md`
- `docs\data-model.md`
- `docs\features-b2b.md`
- `docs\sdd\000-foundation-v1.3.md`
- `docs\sdd\001-bootstrap.md`
- `docs\sdd\002-iam-tenant-isolation.md`
- `docs\sdd\002-implementation-plan.md`
- `docs\sdd\legacy-reconciliation.md`
- `docs\sdd\legacy-skills\sdd-archive\SKILL.md`
- `docs\sdd\legacy-skills\sdd-discover\SKILL.md`
- `docs\sdd\legacy-skills\sdd-implement\SKILL.md`
- `docs\sdd\legacy-skills\sdd-shape\SKILL.md`
- `docs\sdd\legacy-skills\sdd-verify\SKILL.md`
- `docs\setup\private-pilot.md`
- `docs\setup\spec-kit.md`
- `docs\testing.md`

## Executive summary

Fail. Critical or serious findings must be fixed before this ships.

The headline numbers for this run.

| Measure | Value |
|---|---|
| Score | 45 out of 100 |
| Grade | F |
| Findings | 11 |
| Blocking (critical plus serious) | 11 |
| Verdict | Fail |

## Severity breakdown

Counts by severity, highest impact first.

| Severity | Count | What it means |
|---|---:|---|
| critical | 0 | Blocks a person from completing the task |
| serious | 11 | Major barrier with a difficult workaround |
| moderate | 0 | Real friction, workaround exists |
| minor | 0 | Noticeable but rarely blocking |

## Findings

11 findings, ordered by severity then by rule.

### Serious (11)

Each row names the rule, the criterion it fails, where it is, and what to change.

| Rule | WCAG | Location | Problem | Fix |
|---|---|---|---|---|
| `MD-H1-001` | 1.3.1 A | .agents\skills\speckit-converge\SKILL.md:11 | The document has no level-one heading. | Add one descriptive H1 before the first H2 heading. |
| `MD-HEADING-001` | 1.3.1 A | .agents\skills\speckit-specify\SKILL.md:11 | The document has no level-one heading to identify its primary topic. | Add a single descriptive level-one heading near the start of the document, before the first level-two heading. |
| `MD025` | 1.3.1 A | docs\sdd\001-bootstrap.md:3 | The document contains multiple level-one headings. | Keep the task title as the only H1 and demote Scope, Acceptance, Exclusions, and Verification record to H2 headings. |
| `MD041` | 1.3.1 A | .agents\skills\speckit-analyze\SKILL.md:11 | The document has no level-one heading. | Add one descriptive level-one heading before the existing level-two headings. |
| `MD041` | 1.3.1 A | .agents\skills\speckit-implement\SKILL.md:11 | The document has no level-one heading and begins with a level-two heading. | Add one descriptive level-one heading before the first level-two heading. |
| `MD041` | 1.3.1 A | .agents\skills\speckit-plan\SKILL.md:11 | The document has no level-one heading. | Add one descriptive level-one heading before the existing level-two headings. |
| `MD041` | 1.3.1 A | .agents\skills\speckit-tasks\SKILL.md:11 | The document has no level-one heading. | Add one descriptive level-one heading after the front matter. |
| `MD041` | 1.3.1 A | docs\sdd\legacy-skills\sdd-archive\SKILL.md:6 | The document has no level-one heading. | Add one descriptive H1 after the YAML front matter. |
| `MD041` | 1.3.1 A | docs\sdd\legacy-skills\sdd-discover\SKILL.md:6 | The document has no level-one heading. | Add one descriptive H1 after the YAML front matter. |
| `MD041` | 1.3.1 A | docs\sdd\legacy-skills\sdd-implement\SKILL.md:1 | The document has no H1 heading. | Add one descriptive H1 that identifies the purpose of the skill. |
| `MD041` | 1.3.1 A | docs\sdd\legacy-skills\sdd-verify\SKILL.md:1 | The document has no level-one heading. | Add a descriptive H1 after the YAML front matter. |

## Remediation priorities

Then the 11 remaining blocking findings, in this order:

1. `MD-H1-001` at .agents\skills\speckit-converge\SKILL.md:11. Add one descriptive H1 before the first H2 heading.
2. `MD-HEADING-001` at .agents\skills\speckit-specify\SKILL.md:11. Add a single descriptive level-one heading near the start of the document, before the first level-two heading.
3. `MD025` at docs\sdd\001-bootstrap.md:3. Keep the task title as the only H1 and demote Scope, Acceptance, Exclusions, and Verification record to H2 headings.
4. `MD041` at .agents\skills\speckit-analyze\SKILL.md:11. Add one descriptive level-one heading before the existing level-two headings.
5. `MD041` at .agents\skills\speckit-implement\SKILL.md:11. Add one descriptive level-one heading before the first level-two heading.
6. `MD041` at .agents\skills\speckit-plan\SKILL.md:11. Add one descriptive level-one heading before the existing level-two headings.
7. `MD041` at .agents\skills\speckit-tasks\SKILL.md:11. Add one descriptive level-one heading after the front matter.
8. `MD041` at docs\sdd\legacy-skills\sdd-archive\SKILL.md:6. Add one descriptive H1 after the YAML front matter.
9. `MD041` at docs\sdd\legacy-skills\sdd-discover\SKILL.md:6. Add one descriptive H1 after the YAML front matter.
10. `MD041` at docs\sdd\legacy-skills\sdd-implement\SKILL.md:1. Add one descriptive H1 that identifies the purpose of the skill.
11. `MD041` at docs\sdd\legacy-skills\sdd-verify\SKILL.md:1. Add a descriptive H1 after the YAML front matter.

## Comparison with the previous audit

The previous audit, dated 2026-11-01, covered eight files in
`specs/004-profile-scope-editing/`; it reported score 96 (A), 16 minor findings
and no critical or serious findings. This audit covers 29 agent-guide reference
files and reports only critical and serious findings; it reports score 45 (F)
and 11 remaining serious findings.

The scopes and severity filters differ, so the scores and counts are not
comparable as a trend. The earlier report does not provide a valid baseline for
fixed, new or persistent findings in this scope.

## What passed

9 checks ran and found nothing.

- Domain 1: Descriptive Links
- Domain 2: Image Alt Text
- Domain 3: Heading Hierarchy
- Domain 4: Table Accessibility
- Domain 5: Emoji
- Domain 6: Mermaid / ASCII Diagrams
- Domain 7: Em-Dash and En-Dash Normalization
- Domain 8: Anchor Links
- Domain 9: Plain Language and List Structure

## Next steps

The 11 remaining findings are reported but outside this change's approved scope:
they occur in generated Spec Kit skills and archived SDD documents, which repository
instructions say to leave unchanged. Any remediation requires a separate review of
their generated or archived status and an approved remediation path. Re-run the audit
after that decision; CI integration is not part of this documentation change.

Automated checks find a minority of accessibility barriers. A passing score is a floor, not a guarantee.

## Findings data

The merged findings, embedded so the next run can compute a delta without parsing this document.

```json a11y-findings
{
  "skills": [
    "markdown-scanner"
  ],
  "scope": [
    ".agents\\skills\\speckit-analyze\\SKILL.md",
    ".agents\\skills\\speckit-converge\\SKILL.md",
    ".agents\\skills\\speckit-implement\\SKILL.md",
    ".agents\\skills\\speckit-plan\\SKILL.md",
    ".agents\\skills\\speckit-specify\\SKILL.md",
    ".agents\\skills\\speckit-tasks\\SKILL.md",
    ".agents\\skills\\tenant-boundary\\SKILL.md",
    ".agents\\skills\\verify-change\\SKILL.md",
    ".specify\\memory\\constitution.md",
    ".specs\\domains\\product-map.md",
    "AGENTS.md",
    "DESIGN_UI.md",
    "docs\\architecture.md",
    "docs\\architecture\\0005-private-pilot.md",
    "docs\\data-model.md",
    "docs\\features-b2b.md",
    "docs\\sdd\\000-foundation-v1.3.md",
    "docs\\sdd\\001-bootstrap.md",
    "docs\\sdd\\002-iam-tenant-isolation.md",
    "docs\\sdd\\002-implementation-plan.md",
    "docs\\sdd\\legacy-reconciliation.md",
    "docs\\sdd\\legacy-skills\\sdd-archive\\SKILL.md",
    "docs\\sdd\\legacy-skills\\sdd-discover\\SKILL.md",
    "docs\\sdd\\legacy-skills\\sdd-implement\\SKILL.md",
    "docs\\sdd\\legacy-skills\\sdd-shape\\SKILL.md",
    "docs\\sdd\\legacy-skills\\sdd-verify\\SKILL.md",
    "docs\\setup\\private-pilot.md",
    "docs\\setup\\spec-kit.md",
    "docs\\testing.md"
  ],
  "findings": [
    {
      "rule": "MD-H1-001",
      "wcag": "1.3.1 A",
      "severity": "serious",
      "location": ".agents\\skills\\speckit-converge\\SKILL.md:11",
      "summary": "The document has no level-one heading.",
      "fix": "Add one descriptive H1 before the first H2 heading.",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD-HEADING-001",
      "wcag": "1.3.1 A",
      "severity": "serious",
      "location": ".agents\\skills\\speckit-specify\\SKILL.md:11",
      "summary": "The document has no level-one heading to identify its primary topic.",
      "fix": "Add a single descriptive level-one heading near the start of the document, before the first level-two heading.",
      "evidence": "## User Input",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD025",
      "wcag": "1.3.1 A",
      "severity": "serious",
      "location": "docs\\sdd\\001-bootstrap.md:3",
      "summary": "The document contains multiple level-one headings.",
      "fix": "Keep the task title as the only H1 and demote Scope, Acceptance, Exclusions, and Verification record to H2 headings.",
      "evidence": "# Task 001 — Enterprise AI OS bootstrap; # Scope; # Acceptance; # Exclusions; # Verification record",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD041",
      "wcag": "1.3.1 A",
      "severity": "serious",
      "location": ".agents\\skills\\speckit-analyze\\SKILL.md:11",
      "summary": "The document has no level-one heading.",
      "fix": "Add one descriptive level-one heading before the existing level-two headings.",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD041",
      "wcag": "1.3.1 A",
      "severity": "serious",
      "location": ".agents\\skills\\speckit-implement\\SKILL.md:11",
      "summary": "The document has no level-one heading and begins with a level-two heading.",
      "fix": "Add one descriptive level-one heading before the first level-two heading.",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD041",
      "wcag": "1.3.1 A",
      "severity": "serious",
      "confidence": "high",
      "location": ".agents\\skills\\speckit-plan\\SKILL.md:11",
      "summary": "The document has no level-one heading.",
      "fix": "Add one descriptive level-one heading before the existing level-two headings.",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD041",
      "wcag": "1.3.1 A",
      "severity": "serious",
      "location": ".agents\\skills\\speckit-tasks\\SKILL.md:11",
      "summary": "The document has no level-one heading.",
      "fix": "Add one descriptive level-one heading after the front matter.",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD041",
      "wcag": "1.3.1 A",
      "severity": "serious",
      "location": "docs\\sdd\\legacy-skills\\sdd-archive\\SKILL.md:6",
      "summary": "The document has no level-one heading.",
      "fix": "Add one descriptive H1 after the YAML front matter.",
      "evidence": "The first document heading is not a level-one heading.",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD041",
      "wcag": "1.3.1 A",
      "severity": "serious",
      "location": "docs\\sdd\\legacy-skills\\sdd-discover\\SKILL.md:6",
      "summary": "The document has no level-one heading.",
      "fix": "Add one descriptive H1 after the YAML front matter.",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD041",
      "wcag": "1.3.1 A",
      "severity": "serious",
      "location": "docs\\sdd\\legacy-skills\\sdd-implement\\SKILL.md:1",
      "summary": "The document has no H1 heading.",
      "fix": "Add one descriptive H1 that identifies the purpose of the skill.",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD041",
      "wcag": "1.3.1 A",
      "severity": "serious",
      "confidence": "high",
      "location": "docs\\sdd\\legacy-skills\\sdd-verify\\SKILL.md:1",
      "summary": "The document has no level-one heading.",
      "fix": "Add a descriptive H1 after the YAML front matter.",
      "foundBy": [
        "markdown-scanner"
      ]
    }
  ],
  "passed": [
    "Domain 1: Descriptive Links",
    "Domain 2: Image Alt Text",
    "Domain 3: Heading Hierarchy",
    "Domain 4: Table Accessibility",
    "Domain 5: Emoji",
    "Domain 6: Mermaid / ASCII Diagrams",
    "Domain 7: Em-Dash and En-Dash Normalization",
    "Domain 8: Anchor Links",
    "Domain 9: Plain Language and List Structure"
  ],
  "notes": [],
  "counts": {
    "critical": 0,
    "serious": 11,
    "moderate": 0,
    "minor": 0
  },
  "components": [],
  "score": 45,
  "grade": "F",
  "penalty": 55,
  "checks": 20,
  "generated": "2026-11-07",
  "template": "markdown"
}
```
