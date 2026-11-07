# Tasks: Enrichissement B2B

## Phase 1: Contrats et préparation
- [x] T001 Consolider les arbitrages, inspecter sources et appeler les recherches indépendantes.
- [x] T002 Résoudre noms inconnus, règles de reprise et finaliser spec/plan/modèle/contrats.
- [x] T003 Analyser couverture FR-001..018, checklist et préparer PostgreSQL jetable.

## Phase 2: Modèle et tests de sécurité
- [x] T004 [P] Profil0013 et métadonnées : tests rouges, SQL, DTO strict et routes profil/préférences (FR-010..014,016).
- [x] T005 [P] Organisation/RBAC0014 : tests rouges, memberships multiples/statuts, permissions et pyramide (FR-001..008,016).
- [x] T006 [P] Journal0015 : tests rouges, RLS, reprise/archivage et routes du journal unique (FR-015,016).

## Phase 3: Intégration API et UI
- [x] T007 Relier store/context/types et routes organisation/catalogue/attributions ; adapter anciens chemins de création (FR-001..008,010..014).
- [x] T008 [P] Étendre Mon profil, sélection tenant, interfaces super/adminclient et audit, FR/EN (FR-009..012,015).
- [x] T009 Adapter fixtures et assertions incompatibles avec le nouveau contrat ; conserver les refus inter-client et protections SDK (FR-017).

## Phase 4: Vérification et livraison
- [x] T010 Exécuter gates réels, test reprise/rejeu et parcours ; documenter PASS/FAIL/NOT_RUN (FR-016,017).
- [x] T011 Synchroniser docs/standards/carte produit/design/README/changelog, sans modifier les historiques (FR-018).
- [ ] T012 Revue sécurité et visuelle, analyse/convergence, commit et PR reviewable sans merge (FR-018).

## Dependencies & Execution Order
T003 avant implémentation. T004/T005/T006 indépendants par fichier avec contrat partagé,
validation complète séquentielle après intégration ; T008 attend types/API stabilisés.
Aucun auteur ne modifie les fichiers d’un autre. T009 après schéma, T010 avant livraison.

## Checkpoint
Branche codex/b2b-organizations-rbac depuis main f47449c, état initial propre.
Arbitrages terminés ; aucune migration appliquée hors services jetables.
Docker indisponible ; PostgreSQL17 portable et Mailpit isolés utilisés. Résultats dans evidence/verification.md. T012 reste ouvert jusqu’aux revues et à la PR.

## Convergence après revue indépendante

- [x] T013 Corriger l’identité invitée email seule : aucun prénom inventé ; assertion HTTP des champs null (FR-010/011).
- [x] T014 Restreindre catalogue SQL aux administrateurs avec roles.assign dans leur portée ; refus membre et contrôles positifs (FR-006/007).
- [x] T015 Corriger et prouver le focus clavier mobile au-dessus de la navigation fixe ; nouvelles captures ciblées (FR-009/SC-004).
- [x] T016 Réconcilier research.md avec l’arbitrage nullable résolu et l’état implémenté (FR-018).
- [ ] T017 Revoir les seuls deltas et le commit final, puis publier la PR sans merge (FR-018).

- [x] T018 Garder le catalogue global utilisable sans requête roster hors portée tenant ; régression rouge/verte (FR-009).

- [x] T019 Stabiliser LF des nouvelles migrations au checkout Windows et vérifier les checksums identiques, sans toucher aux anciennes versions (FR-016).

- [x] T020 Nommer l'action, la personne, le rôle et sa portée dans la confirmation de retrait ; vérifier FR/EN et les trois tailles (FR-009).
- [x] T021 Distinguer les portées homonymes dans la liste et la confirmation, puis vérifier l'identifiant transmis (FR-009).
- [x] T022 Distinguer les portées et rôles dans les sélecteurs d'attribution et de contexte ; vérifier octroi et retrait (FR-009).
- [x] T023 Distinguer les rôles homonymes dans le catalogue et les confirmations globales (FR-008/009).
- [x] T024 Afficher entièrement la sélection et son identifiant sur les petits écrans ; conserver l'état des formulaires indépendants (FR-009).
- [x] T025 Aligner le timeout transactionnel local du worker sur les livraisons SMTP lentes, sans relâcher les verrous pendant l'envoi ; ajouter une régression au-delà de l'ancien délai (FR-017).
- [x] T026 Ne modifier le statut de livraison qu'à partir du message d'outbox correspondant au jeton courant ; couvrir les retries pending et failed (FR-016/017).

## Corrections de revue PR #16
- [x] T027 Borner le lot du worker à deux invitations et réutiliser le pool d'identité de l'application ; réserver trois connexions métier aux requêtes HTTP (FR-016/017).
- [x] T028 Rendre le contexte `access` optionnel dans le schéma `/api/me` et couvrir le payload legacy `{ user }` (FR-010/011).
- [x] T029 Isoler les dix rejeux du test d'idempotence par IP de test, sans désactiver le limiteur de production (FR-016/017).
- [x] T030 Calculer l'attendu de pagination depuis les fixtures, workspace `General` inclus (FR-017).
- [x] T031 Utiliser `invitation_id` pour retrouver une invitation et l'ID du message pour les appels/contrôles worker (FR-016/017).
- [x] T032 Élargir seulement le `statement_timeout` de la transaction de révocation du scénario SMTP lent (FR-017).
- [x] T033 Ajouter une migration additive qui ignore l'accusé d'échec d'un ancien jeton et prouver le statut et l'absence d'audit obsolète (FR-016/017).
- [x] T034 Synchroniser les documents et les preuves, analyser/converger puis exécuter les gates disponibles ; garder PostgreSQL/Mailpit en NOT_RUN si absents (FR-018).
