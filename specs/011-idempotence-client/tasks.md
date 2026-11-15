# Tâches : Idempotence côté client

**Input**: Documents de conception dans `specs/011-idempotence-client/`

**Prérequis**: `plan.md`, `spec.md`

> Impact documentaire : consolidé dans
> `specs/010-rattrapage-documentaire/documentation-impact.md`, car le contrôle
> n'accepte qu'un impact unique lorsque plusieurs specs figurent dans le même diff.

## Phase 1 : Préparation

Aucun outil ni dépendance nouvelle. `crypto.randomUUID` et `fetch` sont natifs.

## Phase 2 : Tests rouges (US1/US2, Priority: P1)

- [x] T001 [P] [US1] Ajouter `apps/web/src/http-idempotency.test.ts` : en-tête
  présent sur `mutate`, méthode conservée, rejeu unique avec la même clé sur erreur
  réseau (fichier séparé pour préserver `http.test.ts`)
- [x] T002 [P] [US2] Ajouter les cas d'absence d'en-tête sur GET, de clé différente
  entre deux appels et d'absence de rejeu sur réponse HTTP en erreur

## Phase 3 : Implémentation (US1/US2, Priority: P1)

- [x] T003 [US1] Ajouter `mutate()` dans `apps/web/src/http.ts` avec génération de
  clé, rejeu unique sur erreur de transport et validation Zod inchangée
- [x] T004 [US1] Brancher `mutate()` sur la création de tenant, la création
  d'invitation, la mise à jour d'invitation et la revue de demande

## Phase 4 : Documentation et vérification

- [x] T005 [US2] Mettre à jour `docs/features-b2b.md` et
  `.specs/domains/product-map.md` : clé envoyée par le client, limite SMTP inchangée
- [x] T006 Exécuter `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm docs:test` et
  `pnpm docs:check` ; consigner PostgreSQL, navigateur et CI en `NOT_RUN`

## Dépendances et ordre d'exécution

- T001 et T002 précèdent T003 : les tests doivent échouer avant l'implémentation.
- T003 précède T004.
- T005 suit T004 pour décrire le comportement livré.
- T006 dépend de toutes les modifications.

## Possibilités de parallélisme

- T001 et T002 portent sur le même fichier de test ; les écrire ensemble.
- T004 touche trois pages distinctes, mais dépend de T003.
- T005 est indépendant de T004 en rédaction, mais doit être relu après.

## Stratégie MVP

T003 + T004 suffisent à livrer la capacité ; T001/T002 la prouvent ; T005 aligne
la documentation.

## Validation du format

Chaque tâche comporte une case, un identifiant séquentiel, une histoire utilisateur
et un chemin ou une commande vérifiable.
