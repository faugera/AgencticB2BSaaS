# Implementation Plan: Adoption Spec Kit

**Branch**: codex/spec-kit-adoption | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

## Summary
Installer les intégrations officielles 1.2.3, définir le contrat commun et réconcilier les
docs. Conserver l'historique, vérifier liens/structures/statuts par un script Node sans
nouvelle dépendance, puis livrer une PR. Aucun changement applicatif.

## Technical Context
**Language/Version**: Markdown, JSON/YAML, Node 24 ESM ; scripts officiels Bash.
**Primary Dependencies**: Spec Kit 1.2.3 existant ; aucune nouvelle dépendance npm.
**Storage**: fichiers Git uniquement, aucune DB.
**Testing**: node:test pour le vérificateur, ESLint, pnpm docs:check, manifestes Spec Kit.
**Target Platform**: Windows Git Bash et CI Linux ; chemins relatifs et séparateurs normalisés.
**Project Type**: outillage et documentation interne.
**Constraints**: historique immuable, pas de fichier géré officiel modifié ; aucune API/SQL.
**Scale/Scope**: cinq chantiers historiques, deux intégrations et docs maintenues.

## Constitution Check
Avant et après conception : I spec/plan/tasks présents ; II réutilisation Node et scripts
existants ; III aucun accès DB/secret ; IV preuves proportionnées ; V sources de vérité
séparées. Aucun écart constitutionnel. Clarifications : réponses utilisateur déjà acquises.

## Project Structure
- .specify : infrastructure officielle et constitution.
- .agents/skills et .claude/skills : intégrations ; deux skills projet conservés.
- specs : nouvelles specs par changement et éventuelle reprise de validation historique.
- docs : guide Spec Kit, registre historique et documents actuels corrigés.
- scripts/docs-check.mjs et scripts/docs-check.test.mjs : contrôle et fixtures temporaires.
- .github/workflows/ci.yml et package.json : commandes de vérification documentaire.

## Phases
1. Installer intégrations et constitution ; figer version et provenance.
2. Retirer les anciens skills du chargement actif en les conservant sous historique ;
   aligner AGENTS/CLAUDE, standards et docs ; réconcilier cinq chantiers sans les modifier.
3. Écrire d'abord les tests du contrôle ; prouver leur échec puis implémenter et relier la CI.
4. Vérifier chemin complet documentaire, analyse de cohérence et convergence ; publier PR.

## Validation et interfaces
Le contrôle retourne code 0 si valide, 1 avec chemin/cause sinon. Il valide les liens Markdown
inline et références locales (fichiers, pas ancres), les chemins de l'index/routage YAML,
les trois fichiers obligatoires des features et les statuts Draft/In Progress/Complete.
Il ignore les modèles officiels, anciens chantiers et preuves historiques pour les exigences
nouvelles. Les chemins racine déclarés sont vérifiés sans lire les fichiers privés.
Les tests utilisent des dossiers temporaires hors dépôt ; pas de réseau.
La validité sémantique reste sous revue humaine ; ni graphe de traçabilité automatique,
ni contrôle de disponibilité des liens externes. Pas de changement de contrat HTTP.

## Complexity Tracking
Aucune nouvelle dépendance, aucun orchestrateur personnalisé ; un seul contrôle documentaire.
