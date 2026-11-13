# Guide de validation : Fiabilisation du socle SaaS

Ce guide décrit les preuves à exécuter quand les tâches d’implémentation seront
approuvées. Il n’atteste aucun déploiement ni aucune infrastructure distante.

## Prérequis

- Node 24 LTS et pnpm 11.25.0.
- Dépendances restaurées avec `pnpm install --frozen-lockfile`.
- Pour les intégrations métier : PostgreSQL jetable configuré explicitement avec
  les rôles runtime et migration distincts.
- Pour le parcours email : Mailpit jetable et URLs locales.
- Ne jamais utiliser la base locale de développement ou une base de production
  pour les tests destructifs.

## Validation locale sans base

```powershell
pnpm docs:test
pnpm docs:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm smoke
```

Résultat attendu : contrôles documentaires, typage, lint, tests unitaires,
build et smoke réussis. Ces commandes ne prouvent ni l’isolation PostgreSQL ni
la reprise SMTP.

## Rejeu, outbox et contrats

Avec PostgreSQL jetable et Mailpit :

1. Créer une invitation et conserver la clé de rejeu, la portée et le contenu
   de demande.
2. Rejouer dix fois la même requête ; vérifier une seule invitation et un seul
   résultat métier.
3. Réutiliser la clé avec un contenu différent ; vérifier `409` et l’absence
   de seconde mutation.
4. Interrompre le traitement après commit puis le reprendre ; vérifier que le
   mail est traité depuis l’événement durable et que les jetons en base sont
   illisibles sans la clé de chiffrement.
5. Simuler une panne après soumission SMTP mais avant l’accusé enregistré ;
   vérifier que l’état reste explicite, qu’un doublon possible est documenté
   et que l’invitation ne perd pas son lien valide.
6. Révoquer ou accepter l’invitation avant livraison ; vérifier que le worker
   ne livre pas le lien devenu invalide.
7. Soumettre une réponse HTTP invalide au validateur client ; vérifier qu’elle
   ne devient pas un DTO typé accepté.

## Limites multi-instance

Avec la même base PostgreSQL jetable, démarrer au moins trois instances API sur
des ports distincts avec même configuration de limite :

1. Répartir les requêtes d’une même règle entre instances.
2. Atteindre la limite cumulée et vérifier le refus et `Retry-After`.
3. Redémarrer une instance et vérifier que le compteur partagé n’est pas remis
   à zéro.
4. Rendre le store indisponible en environnement isolé et vérifier le refus
   explicite, le log opérationnel et l’indépendance de `/health`.

## Pagination et isolation

Dans une base jetable avec plusieurs tenants et plus de trois pages de données :

1. Parcourir les membres et invitations au moyen des curseurs successifs.
2. Vérifier l’ordre stable, l’absence de doublon et l’absence d’omission entre
   pages.
3. Rejouer un curseur invalide et présenter un curseur depuis une autre portée ;
   vérifier un refus sans fuite de données.
4. Changer de page dans l’interface au clavier et en FR/EN ; vérifier
   l’accessibilité et l’affichage aux profils mobile, tablette et desktop.

## Commandes de sécurité et d’intégration

Configurer des URLs de bases jetables selon `docs/testing.md` et le runbook privé,
puis exécuter :

```powershell
pnpm verify:security
pnpm verify:tenant-isolation
```

Les tests navigateur et le parcours SMTP piloté par navigateur sont retirés à la demande du propriétaire. Si PostgreSQL jetable est indisponible, classer les contrôles SQL `NOT_RUN`, jamais `PASS`.

## Vérification de restauration et exploitation

Suivre la procédure opérateur décrite dans
[`docs/setup/private-pilot.md`](../../docs/setup/private-pilot.md) sur une
copie isolée. Vérifier les rôles, propriétaires, grants, RLS, fonctions privées,
états de livraison et reprise des migrations. Noter date, révision, environnement
isolé, résultat et limites. Ne pas modifier le runbook pour présenter une
restauration non exécutée comme une preuve.

## Preuves du premier incrément — 2026-11-01

Révision de base : `e2130c3`. Périmètre vérifié : validation runtime des
réponses HTTP web, configuration/versionnement des clés d’outbox et primitives
de chiffrement authentifié. Aucune migration n’a été appliquée.

| Contrôle | Statut | Résultat et limite |
|---|---|---|
| `pnpm typecheck` | PASS | TypeScript strict sur les workspaces. |
| `pnpm lint` | PASS | ESLint sans avertissement. |
| `pnpm test` | PASS | 62 tests ; inclut les nouveaux tests API, configuration et chiffrement. |
| `pnpm build` | PASS | API et web compilés ; avertissements de commentaires dans la dépendance Zod, sans échec. |
| `pnpm smoke` | PASS | `/health` HTTP et arrêt propre de l’API compilée. |
| `pnpm docs:test` et `pnpm docs:check` | PASS | 22 tests documentaires ; liens, routage et artefacts valides. |
| `git diff --check` | PASS | Aucune erreur d’espacement. |
| `pnpm test:e2e` | FAIL | Chromium termine au lancement avec `Invalid file descriptor to ICU data received`; réessai isolé après `playwright install chromium` identique. Aucun résultat produit UI n’est affirmé. |
| PostgreSQL/Mailpit, `verify:security`, `verify:tenant-isolation`, `test:auth:e2e` | NOT_RUN | Aucune URL de base jetable ni endpoint Mailpit configuré ; aucune base locale ou réelle utilisée. |
| Restauration PostgreSQL isolée | NOT_RUN | Aucun environnement jetable configuré. |

Ces preuves valident uniquement le premier incrément et ne certifient ni
l’outbox transactionnelle, ni l’isolation/pagination SQL, ni le déploiement.

## Preuves d’implémentation — 2026-11-06

Base de comparaison : `e2130c38af372fc655c86473cd3c241e19fa5e38` ; modifications
locales non commitées de cette session. La migration 0016 a été revue statiquement,
mais n’a pas été appliquée. Les intégrations HTTP/outbox compilent ; aucun résultat
PostgreSQL/Mailpit n’est affirmé.

| Contrôle | Statut | Résultat et limite |
|---|---|---|
| `pnpm verify` | PASS | Typecheck, lint, 98 tests unitaires, build et smoke ; avertissements amont Rollup/Zod et dépréciation Node non bloquants. |
| Tests ciblés contrats/chiffrement/empreintes | PASS | 44 tests ; inclut les réponses pending et les empreintes canoniques. |
| `pnpm docs:test` | PASS | 22 tests du vérificateur de documentation et du manifeste d’architecture. |
| `pnpm docs:check` | PASS | Liens/statuts/chemins valides et sources d’architecture enregistrées après revue du modèle et de la migration 0016. |
| `pnpm test:e2e` | FAIL | 100 scénarios exécutés après build : 20 réussis, 80 échoués en 9,5 min. Les traces montrent des sélecteurs/URL attendus absents et des timeouts ; la cause racine n’est pas établie, aucun résultat UI global n’est affirmé. |
| Lint et typecheck des intégrations PostgreSQL | PASS | Les nouveaux tests `idempotency.integration.test.ts` et `outbox.integration.test.ts` compilent ; cela ne valide pas leur exécution. |
| `verify:security`, `verify:tenant-isolation`, `test:auth:e2e`, intégrations PostgreSQL/Mailpit | NOT_RUN | `pnpm test:auth:core` confirme l’échec du prérequis avant collecte : `AUTH_TEST_DATABASE_URL` et `AUTH_TEST_MIGRATION_DATABASE_URL` absents ; `AUTH_TEST_MAILPIT_URL` absent et moteur Docker arrêté. |
| Restauration PostgreSQL isolée répétée | NOT_RUN | Aucun serveur PostgreSQL ni environnement jetable disponible. |
| Revue CI merge/déploiement | PASS | Recherche dans `.github/workflows/` : aucun déclencheur de déploiement, environnement production ou merge automatisé observé. |

L’outbox actuelle couvre les emails d’invitation métier ; les callbacks généraux
de vérification/activation Better Auth ne sont pas encore des événements d’outbox
autonomes. Le comportement SMTP demeure au moins une fois ; les tests intégrés
nécessitent PostgreSQL jetable et doivent être exécutés avant de considérer la
migration opérationnelle.

## Reprise de vérification — 2026-11-06

Périmètre : corrections du test d’intégration de pagination, documentation
d’exploitation, carte produit et tâches Spec Kit. `pnpm verify` a été exécuté
après les corrections du test ; le parcours E2E complet a été relancé sur le
build produit par ce gate.

| Contrôle | Statut | Résultat et limite |
|---|---|---|
| `pnpm verify` | PASS | Typecheck, lint, 107 tests unitaires, build et smoke ; avertissements amont Rollup/Zod et dépréciation Node non bloquants. |
| `pnpm docs:test` et `pnpm docs:check` | PASS | 22 tests documentaires ; liens, statuts, routage et manifeste valides après les mises à jour. |
| `git diff --check` | PASS | Aucune erreur d’espacement ; avertissements Git de conversion LF/CRLF uniquement. |
| Pagination Playwright, FR/EN et tailles 375/768/1280 | PASS | Les deux parcours ciblés passent dans la suite complète ; couverture simulée, aucune preuve SQL. |
| `pnpm test:e2e` | FAIL | 104 scénarios : 28 réussis, 76 échoués en 10,4 min. Plusieurs parcours trouvent des éléments attendus absents ou restent sur une route différente ; la cause commune n’est pas établie. |
| Intégrations PostgreSQL (pagination, outbox, limite partagée), Mailpit et restauration | NOT_RUN | Aucune configuration explicitement confirmée pour une infrastructure jetable ; aucune migration appliquée. |
| `pnpm verify:security`, `pnpm verify:tenant-isolation`, `pnpm test:auth:e2e` | NOT_RUN | La revue/les contrôles de sécurité ont été annulés explicitement ; auth et isolation exigeraient aussi PostgreSQL/Mailpit jetables. |

Cette reprise ne certifie pas T009 (événements Better Auth de vérification et
d’activation), la profondeur/ancienneté opérationnelle de l’outbox, les tests
PostgreSQL/Mailpit ni la restauration. Le résultat E2E global reste bloquant ;
seul le scénario ciblé de pagination passe.

## Revue finale

Les contrôles locaux exécutés sont consignés ci-dessus. Toute migration, test
infra ou restauration non exécuté reste explicitement `NOT_RUN`. La validation
n’autorise ni merge automatique ni déploiement.
