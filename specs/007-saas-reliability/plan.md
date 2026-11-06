# Plan d’implémentation : Fiabilisation du socle SaaS

**Branche** : `faugera-audit-architecture-saas` | **Date** : 2026-11-01 | **Spec** : [spec.md](spec.md)

## Résumé

Réduire les risques identifiés par l’audit sans remplacer le monolithe modulaire :
garantir la reprise des mutations avec emails par une outbox transactionnelle et
des clés d’idempotence, valider les contrats aux frontières, partager les limites
de requêtes entre instances, paginer les listes tenant-scopées et rendre les
incidents et restaurations vérifiables. La livraison reste manuelle et aucune
migration appliquée n’est modifiée.

## Contexte technique

- **Langage et versions** : TypeScript strict, Node 24, pnpm 11.25.0.
- **Dépendances principales** : Fastify 5, React 19/Vite 7, PostgreSQL 17 via
  `pg`, Better Auth, Nodemailer ; Zod est déjà une dépendance directe de l’API.
- **Stockage** : PostgreSQL ; schémas identité, métier et autorisation privée ;
  migrations versionnées et immuables après application.
- **Tests** : Vitest unitaire, intégrations PostgreSQL jetables, Playwright,
  Mailpit, contrôles `pnpm verify`, `pnpm verify:security`,
  `pnpm verify:tenant-isolation`, `pnpm test:auth:e2e`,
  `pnpm docs:test` et `pnpm docs:check`.
- **Plateforme cible** : API Fastify derrière un proxy HTTPS same-origin, web
  statique, PostgreSQL et relais SMTP configurés par l’opérateur.
- **Type de projet** : monolithe modulaire web B2B.
- **Objectifs de performance** : aucun SLO de production documenté. Garder les
  appels de limitation courts et atomiques ; mesurer les listes et traitements
  différés avant d’engager un seuil de production.
- **Contraintes** : conserver le contexte tenant, RLS, audit, rôles runtime
  limités, types seuls dans `packages/shared`, MFA facultative et absence de
  merge/déploiement automatiques. Ne pas ajouter Redis ou un broker sans preuve
  qu’un stockage PostgreSQL partagé ne suffit pas.
- **Échelle et périmètre** : pilote privé existant, non certifié HA ; planifier
  une montée à plusieurs instances sans présumer un nombre d’utilisateurs ou un
  volume qui n’est pas encore spécifié.

## Constitution Check — Contrôle de constitution

| Principe | Évaluation |
|---|---|
| Réfléchir avant de coder | PASS — spec, plan, critères vérifiables et recherches sont présents ; les tâches restent une étape séparée. |
| Simplicité et modifications chirurgicales | PASS — conserver Fastify, PostgreSQL et le monolithe ; limiter les nouvelles abstractions aux besoins de reprise et de partage. |
| Frontières B2B et données protégées | PASS — toute page de liste revalide l’accès serveur ; l’outbox protège les jetons ; le worker revalide l’invitation avant envoi ; les rôles runtime n’obtiennent pas d’accès direct aux tables privées. |
| Vérification fondée sur les preuves | PASS — tests unitaires, PostgreSQL/Mailpit jetables et restauration isolée ; toute infrastructure absente reste NOT_RUN. |
| Contrats lisibles et expérience accessible | PASS — DTO et pages documentés ; pagination clavier/FR/EN et revue responsive incluses. |
| Livraison | PASS — nouvelle migration seulement, revue et PR séparées ; aucun merge ou déploiement automatique. |

**Gates** : aucun écart à la constitution ; aucun changement de rôle IAM ou de
modèle tenant ne doit contourner les tests PostgreSQL. Tout nouvel usage de
jetons, contexte tenant ou droits du worker reste soumis au contrôle de sécurité.

## Recherche de conception

Les décisions et alternatives sont détaillées dans [research.md](research.md).

1. Écrire dans la transaction métier l’intention d’envoi et l’état initial de
   l’opération ; traiter ensuite les événements par lots avec bail, reprise
   bornée et backoff. Chiffrer authentifié les messages contenant des liens avec
   une clé opérateur distincte, versionnée et conservée hors base ; effacer le
   contenu chiffré dès qu’il n’est plus nécessaire. Accepter le doublon possible
   après un accusé SMTP ambigu au lieu de promettre le « exactement une fois ».
2. Conserver les enregistrements d’idempotence pour une durée bornée, liés à
   l’acteur, à l’action et à la portée ; mémoriser l’empreinte de requête et le
   résultat sûr, jamais un jeton.
3. Implémenter le compteur de limitation partagé par PostgreSQL avec une
   opération atomique, une clé opaque dérivée de l’adresse IP, une expiration
   et une réponse explicite en cas d’indisponibilité. Ne pas réutiliser la table
   de limitation propre à Better Auth.
4. Valider à l’exécution les réponses consommées par le web et documenter les
   réponses d’erreur ; garder `packages/shared` type-only. Comparer les schémas
   Fastify existants avec une validation de DTO côté client avant de fixer le
   point de partage des contrats.
5. Utiliser des curseurs stables date/UUID, un ordre total et des limites
   bornées ; garder la portée autorisée comme source de vérité SQL.
6. Étendre les logs structurés et signaux d’exploitation sans PII ni secret ;
   documenter et éprouver une restauration sur base jetable, sans fixer de RTO
   non demandé.

## Structure du projet

### Artefacts de cette feature

```text
specs/007-saas-reliability/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── checklists/
    └── requirements.md
```

### Code et tests concernés

```text
apps/api/src/
├── app.ts                         # plugins, erreurs sûres, readiness
├── auth/                          # livraison Better Auth et configuration
└── business/
    ├── routes.ts                  # créations/invitations et clés de rejeu
    ├── access-routes.ts           # demandes publiques et listes
    ├── store.ts                   # transactions et contexte local
    └── jobs/                      # traitement différé si le modèle validé le requiert
apps/api/migrations/               # nouvelles versions uniquement
apps/web/src/
├── http.ts                        # validation des réponses à la frontière
├── application.tsx                # chargements et erreurs de listes
└── pages/                         # pagination accessible des listes ciblées
packages/shared/src/index.ts       # types uniquement, si contrat public à ajuster
apps/api/src/**/*.test.ts          # tests API et règles de reprise
apps/api/src/**/*.integration.test.ts
tests/e2e/                         # parcours navigateur affectés
docs/architecture.md
docs/architecture.html
docs/data-model.md
docs/features-b2b.md
docs/setup/private-pilot.md
docs/testing.md
README.md
.env.example
```

**Décision de structure** : étendre les modules `auth` et `business` existants.
Ne pas créer un service séparé, un paquet `shared` exécutable ou un nouveau
broker. Mettre un traitement différé dans `apps/api/src/business/jobs/`
uniquement si le partage des pools et des fonctions SQL reste compréhensible ;
revoir ce choix lors de la production des tâches.

## Phases de livraison proposées

### Phase A — MVP : idempotence et livraison durable

Concevoir les nouvelles tables/fonctions et rôles nécessaires dans une migration
additive ; rendre les créations critiques idempotentes ; persister les envois
d’invitation, de vérification et d’activation ; traiter les jobs avec bail,
backoff, état récupérable et réautorisation à l’exécution. Tester les interruptions
avant/après commit et les accusés SMTP ambigus. Documenter la clé de chiffrement,
sa rotation et l’expiration des messages en attente.

### Phase B — Contrats d’API vérifiés et pagination

Définir les DTO et erreurs ciblés, valider chaque réponse structurée consommée
par le web, préserver les réponses génériques et ajouter des tests
d’incompatibilité. Ne pas ajouter les schémas de validation aux types partagés.
Ajouter ensuite les curseurs et limites bornées après confirmation que chaque
page conserve la réautorisation tenant côté serveur.

### Phase C — Limitation partagée

Remplacer le store métier local par un compteur atomique PostgreSQL à clés
opaques et fenêtres expirables. Le limiteur auth Better Auth reste séparé.
Vérifier sur au moins trois instances et ne jamais basculer silencieusement
vers un compteur en mémoire.

### Phase D — Pagination tenant-scopée

Ajouter curseurs et limites aux listes de membres, invitations et autres
collections concernées après mesure ; conserver les règles de portée et l’ordre
stable. Mettre à jour les pages web en clavier, FR/EN et aux trois tailles déjà
utilisées pour la revue responsive.

### Phase E — Exploitation et clôture

Ajouter les signaux nécessaires pour diagnostiquer erreurs API, retard de
livraison et store de limitation ; vérifier l’absence de secrets dans les logs.
Actualiser les docs ciblées par `doc-sync-map.yml`, répéter une restauration
jetable, exécuter les gates proportionnés, puis analyser et converger avant
préparation d’une PR séparée.

## Synchronisation documentaire attendue

- **Base et modèle** : `docs/data-model.md` et `docs/architecture.html`.
- **Routes, limites et flux** : `docs/architecture.md` et `docs/architecture.html`.
- **Sécurité/autorisation** : `docs/architecture/0005-private-pilot.md`,
  `docs/features-b2b.md`, `.specs/standards/b2b-tenancy-rbac.md` et
  `docs/architecture.html`, si les garanties changent.
- **Configuration de clé** : `.env.example` et `README.md`, sans valeur réelle.
- **Vérification et exploitation** : `docs/testing.md` et
  `docs/setup/private-pilot.md`.
- **Carte produit** : `.specs/domains/product-map.md` seulement si une capacité
  produit ou son statut change.
- **Changelog** : revue de pertinence, sans entrée artificielle pour un
  refactoring interne.

## Complexité et compromis

| Élément | Coût accepté | Alternative écartée |
|---|---|---|
| Outbox chiffrée et traitement reprenable | Nouvelle migration, cycle de vie des clés et reprise opérateur | Envoi synchrone actuel, qui perd l’intention en cas d’arrêt après commit. |
| Compteur PostgreSQL partagé | Écritures additionnelles et courte dépendance du limiteur à la base | Mémoire par processus, incorrecte à plusieurs instances ; Redis, nouvelle dépendance d’exploitation sans preuve de besoin. |
| Validation runtime des DTO | Schémas à maintenir près des frontières | Assertion `as T`, qui ne valide pas les données reçues. |
| Pagination explicite | Curseurs à gérer dans l’API et l’interface | Chargement illimité, qui augmente avec le volume. |

## Gates de vérification

- **Unitaire** : idempotence, empreintes différentes, validation runtime, curseur
  invalide, chiffrement et expiration, délais/backoff et erreurs du compteur.
- **PostgreSQL jetable** : migrations/rejeu, atomicité invitation-outbox,
  fonctions privées, permissions runtime, réservation concurrente de jobs,
  isolation entre tenants et compteur partagé entre instances.
- **SMTP/Mailpit** : activation/vérification et invitation, reprises, rejet,
  révocation, accusé ambigu, absence de jeton dans journaux et réponses.
- **Web** : contrat invalide, pagination, erreurs, clavier, FR/EN,
  responsive ; revue d’accessibilité avant changement UI.
- **Gates dépôt** : `pnpm docs:test`, `pnpm docs:check`, `pnpm verify`,
  `pnpm verify:security`, `pnpm verify:tenant-isolation`,
  `pnpm test:auth:e2e` selon les surfaces réellement modifiées.
- **Exploitation** : restauration d’une copie jetable ; si infrastructure
  absente, résultat `NOT_RUN`, jamais `PASS`.

## Réévaluation post-conception

Tous les choix préservent les principes constitutionnels. L’outbox introduit des
données sensibles chiffrées : l’implémentation exige des tests de permissions,
de rotation et d’expiration, ainsi qu’une clé gérée hors base. Aucun outil de
traitement n’a autorité implicite sur les droits : l’événement doit être
réautorisé selon l’acteur et le tenant avant livraison. L’envoi SMTP demeure
au moins une fois ; aucune garantie de livraison exactement une fois n’est
annoncée.
