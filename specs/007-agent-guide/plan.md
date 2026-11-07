# Implementation Plan: Agent guide

**Branch**: `007-agent-guide` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: User request to improve the repository's `AGENTS.md`.

## Summary

Faire de `AGENTS.md` une carte de démarrage concise, exacte et en français : objectif
et limites du template, stack et architecture, commandes utiles, règles « faire / ne
pas faire », puis liens vers les sources maintenues. Les documents spécialisés restent
les autorités détaillées ; aucun comportement applicatif ne change.

## Technical Context

**Language/Version**: Markdown ; dépôt TypeScript sur Node 24 LTS

**Primary Dependencies**: pnpm 11.25.0 ; stack existante décrite dans le guide d’architecture

**Storage**: N/A ; aucune modification de stockage

**Testing**: `pnpm docs:test`, `pnpm docs:check`

**Target Platform**: Documentation du dépôt

**Project Type**: SaaS B2B pilote ; monolithe modulaire web/API

**Performance Goals**: N/A

**Constraints**: Exactitude des commandes et liens ; résumé sans duplication des règles ; préserver les modifications existantes

**Scale/Scope**: `AGENTS.md`, deux documents maintenus concernés par les corrections approuvées et artefacts Spec Kit ; aucune modification code, API, schéma ou UI

## Constitution Check

*GATE: Pass*

- Spec, plan et tâches présents, y compris pour cette évolution documentaire.
- Changement ciblé ; les règles de sécurité et de workflow renvoient à leurs sources
  plutôt que d’être redéfinies.
- Vérification proportionnée à la documentation ; aucun contrôle DB requis.
- Le guide ne présente pas les preuves historiques ou capacités futures comme état courant.
- Aucun élargissement de périmètre ni action destructive.

## Project Structure

### Documentation (this feature)

```text
specs/007-agent-guide/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
AGENTS.md                          # Guide d’orientation et de contribution
docs/setup/private-pilot.md        # Liens textuels descriptifs
docs/sdd/legacy-reconciliation.md  # Libellés de liens historiques explicites
MARKDOWN-ACCESSIBILITY-AUDIT.md    # Rapport produit à partir des scans
specs/007-agent-guide/             # Spec, plan, tâches et preuves de validation
```

**Structure Decision**: Le changement est documentaire ; `AGENTS.md` reste la pièce
centrale. Les correctifs d’accessibilité ne modifient ni le sens ni les règles des
documents maintenus. Le registre de réconciliation est une référence maintenue ;
les skills Spec Kit générés et les documents SDD archivés restent inchangés.

## Complexity Tracking

No constitution violations.
