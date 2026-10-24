# Tâches lifecycle

## Groupe 1 — Modèle de données et validation
- [x] Migration additive 0011 avec dates et IDs préservés.
## Groupe 2 — Backend et sécurité B2B
- [x] Révocation sessions, contexte et tenant ; audit et invitations conservés.
## Groupe 3 — Frontend
- [x] NOT_APPLICABLE : aucun changement UI/API de suppression demandé.
## Groupe 4 — Tests et vérifications
- [x] RED : six tests lifecycle échouent sur PostgreSQL 17.8 jetable avant migration.
- [x] Lifecycle et suites sécurité/isolation/auth réelles : 40/40, dont lifecycle 6 et isolation 14.
- [x] pnpm verify : typecheck, lint, 43 tests, build et smoke PASS.
- [x] Navigateur auth : 4/4 en mode visible, PostgreSQL/Mailpit réels.
## Groupe 5 — Auto-Documentation
- [x] Synchroniser les cibles déclarées dans spec.md et contrôler le diff.

Checkpoint : correction TypeScript locale préexistante conservée. Aucun changement
de DB de développement. Toutes les vérifications DB utilisent une instance jetable.

## Preuves du 2026-10-24

| Contrôle | Résultat | Limite |
| --- | --- | --- |
| Lifecycle avant migration | FAIL 6/6 | Colonnes et révocation absentes, reproduit avant édition |
| pnpm verify | PASS | 43 unitaires ; n'exécute pas les suites DB |
| pnpm verify:security | PASS | Audit dépendances et 40 intégrations sur PostgreSQL 17.8 jetable |
| pnpm verify:tenant-isolation | PASS 14/14 | Base jetable, migration finale |
| pnpm test:auth:e2e --headed | PASS 4/4 | Activation/récupération/MFA/session/invitation/espace réels, desktop/mobile |
| pnpm test:auth:e2e | FAIL infrastructure | Chromium headless local échoue avant scénario : ICU invalid file descriptor |
| Suite E2E générale | NOT_RUN | Aucun code UI modifié ; suites auth réelles ciblées exécutées |

Fixtures : IP IPv6 distinctes par suite pour éviter la collision des limites DB.
Les tests live réutilisent les helpers de menu mobile, vérifient l'identité serveur
au lieu d'anciens titres, et sélectionnent explicitement la langue après chargement
des préférences du compte. Le lanceur auth-e2e.mjs relance le serveur par profil,
sans shell ni affaiblissement des limites : les deux profils ensemble atteignaient
le quota métier de120/min (429 confirmé dans la trace réseau).

## Décisions documentaires

| Document | Politique | Décision | Justification |
| --- | --- | --- | --- |
| docs/data-model.md | required | UPDATED | Colonnes, historique inconnu et contrat opérateur |
| docs/architecture/0005-private-pilot.md | required | UPDATED | Révocation et RLS des lignes actives |
| docs/features-b2b.md | required | UPDATED | Statut lifecycle et résolution des anciens blocages |
| .specs/standards/b2b-tenancy-rbac.md | required | UPDATED | Garanties de sécurité livrées |
| .specs/domains/product-map.md | required | UPDATED | Migration 0011 présente, sans prétention de déploiement |
| CHANGELOG.md | review | UPDATED | Capacité de suppression logique opérateur |
| docs/architecture.md | review | REVIEWED_NO_CHANGE | Aucun endpoint ni flux HTTP ajouté |
| README.md/.env.example | environment | NOT_APPLICABLE | Aucune variable applicative ajoutée ; commande pnpm inchangée |
| DESIGN.md/DESIGN_UI.md | review | REVIEWED_NO_CHANGE | Aucun code UI modifié |

Statut implementing conservé : pas de promotion SDD verified sans sdd-verify.
Migration non appliquée au développement ; pas de nouvelle UI/API de suppression.
