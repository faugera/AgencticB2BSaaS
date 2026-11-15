# Spécification : Vérification UI par socle DOM minimal

**Feature Branch**: `codex/rattrapage-documentaire`
**Status**: Complete
**Created**: 2026-11-15

## User Scenarios & Testing

Un mainteneur modifie la navigation ou un formulaire web et veut être averti
d'une régression de rendu logique sans réintroduire de navigateur automatisé.
Les tests s'exécutent dans la même commande `pnpm test`, sans réseau, sans
PostgreSQL et sans Playwright.

## Requirements

- **FR-001** : Ajouter `jsdom` et `@testing-library/react` en dépendances de
  développement à la racine, sans dépendance de production.
- **FR-002** : Exécuter les tests DOM par fichier (`@vitest-environment jsdom`),
  dans `pnpm test`, sans navigateur ni service externe.
- **FR-003** : Couvrir les parcours critiques : séparation de navigation
  `/app` et `/admin`, refus d'un non-super-admin sur `/admin`, redirection d'un
  super-admin de `/app` vers `/admin`, et soumission du formulaire de création
  de tenant passant par `mutate()`.
- **FR-004** : Ne modifier aucun code de production et ne remplacer aucune
  autorisation serveur par une assertion d'interface.
- **FR-005** : Documenter la portée et les limites dans `docs/testing.md` ;
  la CI existante exécute ces tests via `pnpm test`, sans étape navigateur.

## Success Criteria

- **SC-001** : Six tests DOM passent en jsdom sans réseau ni PostgreSQL.
- **SC-002** : `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm docs:test` et
  `pnpm docs:check` passent ; navigateur réel, CI et PostgreSQL restent
  explicitement hors de cette preuve.
