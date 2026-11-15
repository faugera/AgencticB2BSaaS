# Tâches : Vérification UI par socle DOM minimal

**Prérequis** : `plan.md`, `spec.md`

## Phase 1 : Harnais

- [x] T001 Ajouter `jsdom`, `@testing-library/react` et `@testing-library/dom`
  en dépendances de développement à la racine
- [x] T002 Étendre l'`include` Vitest à `*.test.{ts,tsx}` en conservant
  l'environnement `node` par défaut

## Phase 2 : Tests DOM des parcours critiques

- [x] T003 [P] [US1] `apps/web/src/admin/navigation.dom.test.tsx` : liens
  `/app` vs `/admin`, liens conditionnels, propagation du `tenantId`
- [x] T004 [P] [US1] `apps/web/src/test/application-guard.dom.test.tsx` :
  refus d'un non-super-admin sur `/admin`, redirection `/app` → `/admin`
- [x] T005 [P] [US2] `apps/web/src/test/organizations-form.dom.test.tsx` :
  soumission du formulaire de création de tenant via `mutate()`

## Phase 3 : Documentation et vérification

- [x] T006 Documenter le socle et ses limites dans `docs/testing.md`, consigner
  la décision D2 et l'état de la spec 008 dans `specs/STATUS.md`
- [x] T007 Exécuter `pnpm typecheck`, `pnpm lint`, `pnpm test`,
  `pnpm docs:test` et `pnpm docs:check` ; consigner navigateur, CI et
  PostgreSQL en `NOT_RUN`
