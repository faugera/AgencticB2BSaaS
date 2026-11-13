# Tâches : Administration multi-niveaux et control plane

**Entrées** : documents de conception dans `specs/008-admin-control-plane/`.

**Prérequis** : `spec.md`, `plan.md`, `research.md` et `checklists/requirements.md`.

## Phase 1 — Préparation

**Objectif** : vérifier les surfaces existantes et marquer les points de séparation tenant / plateforme sans modifier le socle métier.

### Tests

- [ ] T001 Vérifier l’état actuel des routes, permissions et accès tenant / plateforme dans le codebase et les docs liées.
- [ ] T002 Ajouter des tests de refus pour cross-tenant, franchissement de frontière et auto-élévation.

### Implémentation

- [ ] T003 Définir la règle métier de séparation `/settings` vs `/control` et la portée explicitement autorisée.
- [ ] T004 Documenter le traitement du contexte `tenantId = 0000` comme réservé à la plateforme.

## Phase 2 — Sécurité des frontières

**Objectif** : sécuriser les points d’entrée et les actions à forte portée.

### Tests

- [ ] T005 Exécuter les tests autour des incidents de sécurité et d’accès non autorisé.
- [ ] T006 Vérifier que le bootstrap d’un dernier administrateur est journalisé avec sévérité CRITICAL.

### Implémentation

- [ ] T007 Refuser les tentatives de franchissement de frontière côté serveur et enregistrer les incidents.
- [ ] T008 Refuser les auto-attributions de privilège supérieur et les mutations de rôle non autorisées.
- [ ] T009 Rendre l’accès tenant et plateforme strictement distinct dans les parcours UI et les API concernées.

## Phase 3 — Validation et preuve

**Objectif** : confirmer que la séparation répond aux critères de sécurité et à la documentation du dépôt.

### Tests

- [ ] T010 Vérifier le comportement d’accès pour les rôles TENANT_ADMIN, PLATFORM_ADMIN et PLATFORM_OWNER.
- [ ] T011 Vérifier la non-réutilisation de `tenantId = 0000` comme tenant client.

### Implémentation

- [ ] T012 Synchroniser les docs impactées avec la nouvelle représentation architecture.
- [ ] T013 Faites le passage de revue de qualité et valider les docs et l’accessibilité des surfaces touchées.

## Dépendances et ordre d’exécution

- Les tâches de préparation doivent être complétées avant les validations de refus.
- Les tests de sécurité doivent précéder les changements de permissions et d’accès.
- La synchronisation documentaire se fait après validation des scénarios métier et de sécurité.

## Réconciliation PR #16 — contexte plateforme

- [x] T014 Tester l’UUID réservé dans l’API et la transaction, son refus aux acteurs ordinaires, l’absence de tenant client associé et le maintien de `null` sans appartenance.
- [x] T015 Ajouter une migration après `0024` protégeant l’UUID réservé et établissant le contexte à partir de l’acteur vérifié, sans modifier les migrations appliquées.
- [x] T016 Préserver les événements d’audit globaux à tenant SQL `NULL`, les clés d’idempotence existantes et les portées clientes explicites ; tester chaque comportement.
- [ ] T017 Adapter les consommateurs de l’API et vérifier les autorisations et la navigation sans tests navigateur.
- [ ] T018 Vérifier les migrations sur une base jetable neuve et une copie jetable d’un historique local, puis exécuter les contrôles sécurité, isolation, HTTP, SMTP, socle et documentation.
- [ ] T019 Actualiser les documents concernés, consigner les preuves, publier la PR et traiter les discussions après CI verte.
