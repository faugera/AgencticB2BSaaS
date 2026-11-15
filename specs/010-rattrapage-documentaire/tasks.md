# Tâches : Rattrapage documentaire et portabilité du contrôle

**Input**: Documents de conception dans `specs/010-rattrapage-documentaire/`

**Prérequis**: `plan.md`, `spec.md`

## Phase 1 : Préparation

Le dépôt fournit déjà les scripts de contrôle et les documents cibles. Aucun outil
ni service supplémentaire n'est requis.

## Phase 2 : Portabilité du contrôle (US2, Priority: P1)

**But** : rendre `pnpm docs:test` fiable sous Windows sans affaiblir l'assertion.

**Test indépendant** : exécuter la suite complète et vérifier 40/40 ; simuler
l'absence de `bash` et vérifier un saut explicite.

- [x] T001 [US2] Convertir le chemin du script en forme POSIX et normaliser `cwd`
  dans `scripts/docs-check.test.mjs`
- [x] T002 [US2] Sauter explicitement le test si `bash` est introuvable, avec un
  motif visible, sans faux PASS

## Phase 3 : Réconciliation des documents d'état (US1, Priority: P1)

**But** : supprimer les références de branche close et les limites périmées.

**Test indépendant** : rechercher `codex/`, « synchronous », « 25 octobre 2026 »
dans les documents d'état et vérifier chaque occurrence restante comme historique.

- [x] T003 [US1] Actualiser les limites du `README.md` (outbox, worker, débit
  partagé, mono-instance applicative)
- [x] T004 [US1] Remplacer l'en-tête de branche de `docs/architecture.md` par
  l'état de `main`, puis régénérer `docs/architecture-sources.json`
- [x] T005 [US1] Actualiser l'en-tête et les statuts de `docs/features-b2b.md`,
  notamment l'idempotence API non branchée côté client
- [x] T006 [US1] Actualiser `.specs/domains/product-map.md` (date, branche,
  fiabilité livrée, retrait des tests navigateur)
- [x] T007 [US1] Ajouter l'entrée de fiabilisation SaaS 0020–0025 dans
  `CHANGELOG.md`

## Phase 4 : Visibilité du backlog (US3, Priority: P2)

**But** : donner une vue fiable des tâches restantes.

**Test indépendant** : comparer chaque ligne de `specs/STATUS.md` au `tasks.md`
correspondant et à la preuve citée.

- [x] T008 [US3] Créer `specs/STATUS.md` avec les dossiers de specs existants, tâches
  restantes, nature et blocage
- [x] T009 [US3] Réécrire la tâche T022 de `specs/007-saas-reliability/tasks.md`,
  qui référence `tests/e2e` supprimé, et annoter les tâches devenues obsolètes
- [x] T011 [US3] Auditer `specs/008-pr9-deblocage` : relier chaque tâche à une
  preuve de `main` ou au reliquat 009/D1, puis clôturer la spec comme supplantée
  (spec, tasks, verification, `specs/STATUS.md`)
- [x] T012 [US3] Décision D1 : geler les noms 0016–0025 et documenter la reprise
  des environnements migrés avant `1ec1f4a` dans `docs/setup/private-pilot.md`
- [x] T013 [US3] Décision D3 : acter `/app` et `/admin` comme surfaces livrées,
  conserver la sentinelle `0000`, puis aligner `specs/008-admin-control-plane` et
  `specs/STATUS.md`
- [x] T014 [US3] Décision D2 : socle DOM minimal (`jsdom` + Testing Library) sans
  navigateur, six tests sur navigation, gardes de redirection et formulaire de
  création de tenant ; spec `012-verification-ui-dom`

## Phase 5 : Validation

- [x] T010 Exécuter `pnpm docs:test`, `pnpm docs:check`, `pnpm typecheck`,
  `pnpm lint` et `pnpm test` ; consigner CI et PostgreSQL jetable en `NOT_RUN`

## Dépendances et ordre d'exécution

- T001 et T002 sont indépendants et précèdent T010.
- T004 précède la régénération du manifeste, incluse dans la même tâche.
- T003, T005, T006 et T007 sont indépendants entre eux.
- T008 et T009 précèdent T010 pour que le contrôle couvre le tableau final.

## Possibilités de parallélisme

- Les tâches documentaires T003–T007 portent sur des fichiers distincts.
- T001/T002 touchent un seul fichier de test.
- T010 dépend de toutes les modifications.

## Stratégie MVP

T002 puis T001 pour rétablir un contrôle fiable ; ensuite T004 et T003 pour corriger
les affirmations les plus trompeuses ; enfin T005–T009.

## Validation du format

Chaque tâche comporte une case, un identifiant séquentiel, une histoire utilisateur
et un chemin ou une commande vérifiable.
