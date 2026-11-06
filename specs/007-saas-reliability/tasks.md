# Tâches : Fiabilisation du socle SaaS

**Entrées** : documents de conception dans `specs/007-saas-reliability/`.

**Prérequis** : `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/api.md`, `quickstart.md`.

**Organisation** : tâches groupées par parcours pour garder chaque incrément
vérifiable. Les tests sont demandés par la spécification et précèdent les
implémentations correspondantes.

## Phase 1 — Préparation

**Objectif** : aucun nouveau bootstrap du monorepo n’est requis. La stack,
Vitest, PostgreSQL jetable, Mailpit et les rôles existants sont réutilisés.

## Phase 2 — Fondations bloquantes

**Objectif** : aucune fondation commune additionnelle n’est nécessaire ; les
modifications de chaque parcours restent isolées dans leur phase. Toute suite
PostgreSQL nouvellement ajoutée doit utiliser les gardes de base jetable déjà
documentées.

## Phase 3 — User Story 1 : Rejouer une mutation sans doublon (P1, MVP)

**But** : une mutation d’invitation peut être rejouée et ses emails repris sans
perte d’état ni exposition des jetons.

**Test indépendant** : dix rejeux identiques ne créent qu’une invitation ; une
clé réutilisée avec d’autres données est refusée ; arrêt puis reprise SMTP
conservent l’état et ne livrent pas un lien révoqué.

### Tests

- [X] T001 [P] [US1] Ajouter dans `apps/api/src/business/idempotency.integration.test.ts` des tests d’intégration où dix rejeux identiques, y compris concurrents, ne créent qu’une mutation métier et où une clé réutilisée avec une autre empreinte est refusée.
- [X] T002 [P] [US1] Ajouter les tests de réservation concurrente, arrêt/reprise, révocation, expiration et accusé SMTP ambigu dans `apps/api/src/business/outbox.integration.test.ts`.
- [X] T003 [P] [US1] Tester le chiffrement, l’échec d’authentification, la version de clé et l’absence de jeton en clair dans `apps/api/src/business/jobs/outbox-crypto.test.ts`.

### Implémentation

- [X] T004 [US1] Ajouter une migration additive `apps/api/migrations/0016_idempotency_outbox.sql` avec unicités, contraintes d’état, échéances et fonctions restreintes d’enregistrement, réservation, reprise et accusé, conformément à `specs/007-saas-reliability/data-model.md`.
- [X] T005 [US1] Ajouter la configuration obligatoire de chiffrement d’outbox et ses validations dans `apps/api/src/auth/config.ts` et `apps/api/src/auth/config.test.ts`, puis documenter le nom, la génération et la rotation de la clé dans `.env.example` et `README.md` sans valeur réelle.
- [X] T006 [US1] Implémenter dans `apps/api/src/business/jobs/outbox-crypto.ts` le chiffrement authentifié des charges sensibles, la lecture par version de clé et le refus explicite d’une version ou d’un tag invalide ; limiter ce module aux primitives cryptographiques.
- [X] T007 [US1] Implémenter les fonctions d’accès à l’outbox, le traitement des baux expirés et l’effacement du texte chiffré après livraison/expiration dans `apps/api/src/business/jobs/outbox-store.ts`, sans accès direct runtime aux tables privées.
- [X] T008 [US1] Ajouter la réservation atomique et le rejeu de résultat sûr par acteur, action, portée et empreinte dans `apps/api/src/business/store.ts` et les routes critiques de `apps/api/src/business/routes.ts` et `apps/api/src/business/access-routes.ts`.
- [ ] T009 [US1] Remplacer l’envoi synchrone d’invitation par l’enregistrement d’événements d’activation, de vérification et d’invitation dans `apps/api/src/business/routes.ts` et `apps/api/src/auth/operator.ts`, en invalidant les événements d’activation obsolètes.
- [X] T010 [US1] Implémenter le worker reprenable, le backoff borné, la réautorisation métier et l’arrêt propre dans `apps/api/src/business/jobs/outbox-worker.ts`, puis le démarrer et l’arrêter avec le cycle de vie de `apps/api/src/app.ts`.
- [X] T011 [US1] Adapter l’état de livraison et l’action de reprise autorisée dans `apps/api/src/business/routes.ts` et `apps/web/src/pages/InvitationManagement.tsx` sans exposer de jeton ; faire précéder toute modification UI par la revue d’accessibilité requise.
- [ ] T012 [US1] Vérifier les parcours d’invitation, activation, reprise et refus d’accès avec PostgreSQL/Mailpit dans `apps/api/src/business/outbox.integration.test.ts` et `apps/api/src/auth/flow.integration.test.ts`.

**Point de contrôle** : Story 1 fonctionne sans dépendre de la pagination ou du
limiteur partagé ; les doublons SMTP possibles après accusé ambigu restent
explicitement au moins une fois.

## Phase 4 — User Story 2 : Réponses et listes prévisibles (P1)

**But** : les réponses API consommées sont validées à l’exécution et les listes
tenant-scopées sont bornées et parcourables.

**Test indépendant** : une réponse incompatible est rejetée ; trois pages
contiennent chaque élément une fois, dans un ordre stable, avec refus inter-tenant.

### Tests

- [X] T013 [P] [US2] Ajouter dans `apps/web/src/http.test.ts` des tests de contrat pour chaque schéma listé dans `specs/007-saas-reliability/contracts/api.md`, couvrant un champ requis manquant et les enums inconnus applicables, ainsi que les erreurs HTTP sûres.
- [X] T014 [P] [US2] Ajouter les tests PostgreSQL des curseurs, des bornes de page, des suppressions concurrentes et des refus inter-tenant dans `apps/api/src/business/pagination.integration.test.ts`.
- [X] T015 [P] [US2] Ajouter les tests clavier, FR/EN et responsive des contrôles de pagination dans `tests/e2e/pagination.spec.ts`.

### Implémentation

- [X] T016 [US2] Ajouter Zod comme dépendance directe de `apps/web/package.json` et synchroniser `pnpm-lock.yaml` avec la version déjà utilisée par l’API.
- [X] T017 [US2] Définir les schémas runtime des réponses consommées et leur correspondance avec les types existants dans `apps/web/src/contracts/api.ts`, sans ajouter de logique runtime à `packages/shared/src/index.ts`.
- [X] T018 [US2] Remplacer l’assertion `as Promise<T>` par une validation runtime dans `apps/web/src/http.ts` et passer le validateur adapté depuis tous les appels ciblés `api<T>` de `apps/web/src/`.
- [X] T019 [US2] Ajouter les curseurs stables date/UUID et les limites bornées aux lectures membres, invitations et workspaces dans `apps/api/migrations/0017_keyset_pagination.sql` et les routes métier concernées.
- [X] T020 [US2] Documenter le contrat `items`/`nextCursor` et les réponses validées dans `apps/api` et `specs/007-saas-reliability/contracts/api.md`, en gardant les erreurs sûres existantes.
- [X] T021 [US2] Implémenter la navigation paginée accessible et conserver la portée tenant sélectionnée dans `apps/web/src/pages/InvitationManagement.tsx`, `apps/web/src/pages/WorkspaceManagement.tsx` et `apps/web/src/application.tsx`.
- [ ] T022 [US2] Exécuter les tests d’intégration sur au moins trois pages, curseurs invalides et requêtes inter-tenant dans `apps/api/src/business/pagination.integration.test.ts` et `tests/e2e/pagination.spec.ts`.

**Point de contrôle** : aucune liste concernée ne charge sans borne ; les
réponses concernées sont contrôlées au runtime côté client et la portée reste
réautorisée à chaque page.

## Phase 5 — User Story 3 : Limites cohérentes entre instances (P1)

**But** : une règle de limitation métier s’applique de manière partagée même
après redémarrage d’une instance.

**Test indépendant** : trois instances utilisent le même compteur PostgreSQL ;
un dépassement et une panne du store sont vérifiés sans fallback local.

### Tests

- [X] T023 [P] [US3] Ajouter dans `apps/api/src/business/rate-limit.integration.test.ts` des tests sur exactement trois instances API indépendantes partageant PostgreSQL, y compris le redémarrage d’une instance, l’expiration de fenêtre, `Retry-After` et l’indisponibilité du store.

### Implémentation

- [X] T024 [US3] Ajouter la migration `apps/api/migrations/0018_shared_rate_limits.sql` pour les fenêtres expirables et une fonction atomique à droits limités, sans réutiliser la table Better Auth.
- [X] T025 [US3] Implémenter l’adaptateur PostgreSQL du plugin métier dans `apps/api/src/business/rate-limit-store.ts`, avec clé IP opaque à séparation de domaine et suppression bornée des fenêtres expirées.
- [X] T026 [US3] Brancher le store partagé, le refus explicite `503` en cas d’indisponibilité et les signaux de diagnostic dans `apps/api/src/app.ts`, sans changer le limiteur auth de `apps/api/src/auth/service.ts`.
- [ ] T027 [US3] Exécuter les tests inter-instances avec PostgreSQL jetable et intégrer `apps/api/src/business/rate-limit.integration.test.ts` à `.github/workflows/ci.yml`.

**Point de contrôle** : aucune requête protégée ne bascule silencieusement vers
la mémoire locale et `/health` demeure indépendant du store de limitation.

## Phase 6 — User Story 4 : Exploitation et restauration vérifiables (P2)

**But** : les incidents et les limites de reprise sont compréhensibles sans fuite
de données, et la procédure de restauration est éprouvée sur une copie isolée.

**Test indépendant** : simuler les catégories de panne ciblées, examiner les
signaux expurgés et exécuter une restauration jetable documentée.

### Tests

- [X] T028 [P] [US4] Ajouter des assertions d’absence de jeton, secret, email complet et corps SMTP dans les logs testés par `apps/api/src/app.test.ts` et `apps/api/src/business/outbox.integration.test.ts`.

### Implémentation

- [ ] T029 [US4] Ajouter les signaux structurés pour catégories d’erreur API, profondeur/ancienneté des livraisons et santé du store sans PII dans `apps/api/src/app.ts` et `apps/api/src/business/jobs/outbox-worker.ts`.
- [X] T030 [US4] Actualiser l’architecture et les limites d’exploitation dans `docs/architecture.md`, `docs/architecture.html`, `docs/architecture/0005-private-pilot.md` et `docs/data-model.md`.
- [X] T031 [US4] Documenter la clé d’outbox, sa rotation, les fenêtres de reprise, la pagination et les commandes de preuve sans secrets dans `docs/setup/private-pilot.md`, `docs/testing.md`, `README.md` et `.env.example`.
- [ ] T032 [US4] Répéter deux fois une restauration PostgreSQL sur des copies isolées distinctes, contrôler rôles/propriétaires/RLS/fonctions à chaque reprise et consigner les deux résultats ou `NOT_RUN` dans `specs/007-saas-reliability/quickstart.md`.

## Phase 7 — Finition et preuves communes

**Objectif** : synchroniser la documentation, vérifier les critères et préparer
une livraison revue, sans merge ni déploiement.

- [X] T033 [P] Mettre à jour la carte produit et les capacités B2B uniquement si le statut fonctionnel change dans `.specs/domains/product-map.md` et `docs/features-b2b.md`.
- [X] T034 [P] Vérifier les exigences du routage documentaire et les liens de cette feature avec `pnpm docs:test` et `pnpm docs:check`.
- [ ] T035 Exécuter `pnpm verify`, `pnpm verify:security`, `pnpm verify:tenant-isolation`, `pnpm test:auth:e2e` et `pnpm test:e2e` selon leurs prérequis, inspecter les workflows CI et automatisations pour confirmer qu’aucun merge ou déploiement automatique n’est déclenché, puis consigner PASS/FAIL/NOT_RUN et les limites dans `specs/007-saas-reliability/quickstart.md`.
- [X] T036 Relancer l’analyse Spec Kit et la convergence, traiter les écarts et conserver les preuves sans modifier les historiques dans `specs/007-saas-reliability/`.

## Dépendances et ordre d’exécution

### Dépendances par phase

- Préparation et fondations : pas de nouveau bootstrap ; les suites réutilisent
  les gardes PostgreSQL et Mailpit du dépôt.
- Story 1 : tests T001–T003 avant migrations et code T004–T012 ; le worker
  dépend des fonctions SQL, du chiffrement et de l’adaptation des callbacks.
- Story 2 : tests T013–T015 avant validation et pagination T016–T022. La migration
  de pagination est indépendante des migrations d’outbox et de limite.
- Story 3 : T023 précède T024–T027 ; elle peut être développée après la
  préparation des tests, sans dépendance au worker.
- Story 4 : T028 peut commencer avec les tests Story 1 ; les métriques outbox
  dépendent de T010. La restauration reste indépendante des interfaces.
- Finition : T033–T036 dépendent des parcours retenus et de leurs résultats réels.

### Opportunités de parallélisme

- T001, T002 et T003 portent sur des fichiers de test distincts.
- T013, T014 et T015 sont des tests distincts et peuvent être préparés ensemble.
- T023 peut être développé en parallèle de T001–T022 sur son propre store et
  migration, puis branché à l’API après les validations.
- T028 et le guide de restauration T032 peuvent être préparés en parallèle des
  changements UI, mais la preuve de restauration n’est cochée qu’après exécution.
- Ne pas paralléliser deux tâches qui modifient la même migration, route
  centrale, configuration ou workflow CI.

## Stratégie d’implémentation

### MVP recommandé

Livrer d’abord **Story 1** : idempotence, outbox chiffrée, reprises de provisionnement
et emails, et états récupérables. Valider chaque scénario PostgreSQL/Mailpit avant
d’étendre le contrat à la pagination ou au multi-instance.

### Incréments suivants

1. Story 2, validation runtime et pagination accessible.
2. Story 3, limitation partagée et comportement fail-safe.
3. Story 4, signaux opérateur, restauration et synchronisation documentaire.

Les contrôles UI nécessitent la revue d’accessibilité prévue. Les tests DB/SMTP
requièrent des services jetables configurés ; aucune absence d’infrastructure
ne peut être qualifiée de réussite.

## Phase 8: Convergence

- [ ] T037 Diagnostiquer et corriger les parcours Playwright échoués, puis relancer `pnpm test:e2e` jusqu’à validation de SC-008 (partial).
