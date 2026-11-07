# Spécification : Administration multi-niveaux et control plane

**Feature Branch**: `faugera-audit-architecture-saas`

**Created**: 2026-11-06

**Status**: Draft

**Input**: « Dans l'architecture de l'app, l'Administration Générale est scindée en deux niveaux étanches garantissant le découplage strict entre la plateforme SaaS B2B et les organisations clientes :

1. L'Administration d'Organisation / Tenant (/settings) : à la main du TENANT_ADMIN pour configurer son organisation cliente, ses utilisateurs, ses agents IA et sa conformité.
2. Le Super-Admin Control Plane (/control) : réservé aux PLATFORM_OWNER et PLATFORM_ADMIN pour orchestrer la flotte multi-tenant, les quotas, les accès support et les diagnostics d'intégrité globale.

## Principes Directeurs & Invariants de Sécurité (Socle)

| Invariant | Description Fonctionnelle |
| --- | --- |
| **Isolation Multi-Tenant Stricte** | Chaque nouvelle features ressource devra être partitionnée par son tenantId. Tout accès cross-tenant non autorisé est rejeté avec HTTP 403 CROSS_TENANT_FORBIDDEN. |
| **Découplage Control Plane / Data Plane** | Les super-administrateurs opèrent avec tenantId: 0000. Les utilisateurs des tenants clients ne peuvent pas franchir la frontière du Control Plane (HTTP 403 CONTROL_PLANE_FORBIDDEN). |
| **RBAC Additif & Cloisonnement** | Le rôle TENANT_ADMIN est **strictement cantonné à la console d'administration (/settings)**. Il n'a aucun droit d'écriture implicite dans son tenant. |
| **Anti-Auto-Élévation de Privilèges** | Un administrateur ne peut s'auto-attribuer des privilèges supérieurs (SELF_PRIVILEGE_ESCALATION_FORBIDDEN). En cas de bootstrap (seul administrateur restant), l'opération est tracée avec une sévérité CRITICAL dans les logs |

»

## User Scenarios & Testing — Scénarios utilisateur et tests

### User Story 1 — Administration tenant dédiée à la configuration client (Priority: P1)

Un administrateur de tenant peut gérer la configuration de son organisation cliente, ses utilisateurs, ses agents IA et sa conformité sans dépendre des opérations de plateforme.

**Pourquoi cette priorité** : la console tenant doit rester le périmètre de décision du client et ne doit pas exposer les commandes de gestion multi-tenant.

**Test indépendant** : ouvrir la console `/settings` avec un compte TENANT_ADMIN, modifier les paramètres du tenant, puis vérifier que les actions ayant un impact global ou de plateforme restent inaccessibles.

**Scénarios d’acceptation** :

1. **Étant donné** un utilisateur avec le rôle TENANT_ADMIN, **quand** il accède à `/settings`, **alors** il peut gérer son organisation cliente, ses notifications de conformité et ses utilisateurs autorisés dans ce tenant.
2. **Étant donné** une configuration tenant, **quand** la demande modifie des ressources propres au tenant, **alors** l’action est autorisée seulement dans le tenant courant et avec le contexte serveur validé.
3. **Étant donné** un TENANT_ADMIN tentant d’accéder à des fonctions plateforme, **quand** il appelle une route ou une action de `/control`, **alors** la requête est refusée avec une erreur explicite et sans exécution.

### User Story 2 — Control Plane dédié aux opérateurs de plateforme (Priority: P1)

Les rôles PLATFORM_OWNER et PLATFORM_ADMIN peuvent opérer sur la flotte multi-tenant, les quotas, les accès de support et les diagnostics globaux, mais uniquement dans le control plane.

**Pourquoi cette priorité** : la couche plateforme est une surface d’administration distincte, avec des responsabilités et des garanties différentes de celles de l’administration client.

**Test indépendant** : se connecter avec un compte plateforme, tester les routes `/control`, exploiter un tenant, un quota et un diagnostic global, puis vérifier l’isolation des secteurs client.

**Scénarios d’acceptation** :

1. **Étant donné** un opérateur plateforme, **quand** il accède à `/control`, **alors** il voit les outils de supervision, de quotas et de diagnostic de multi-tenant autorisés.
2. **Étant donné** une ressource cliente et un contexte tenant, **quand** un opérateur plateforme agit dessus, **alors** il agit par les mécanismes de la plateforme et non par l’interface tenant.
3. **Étant donné** un utilisateur de tenant client, **quand** il tente d’entrer dans `/control`, **alors** l’accès est refusé avant toute exécution métier.

### User Story 3 — Isolation multi-tenant stricte et refus cross-tenant (Priority: P1)

Chaque ressource liée à un tenant est partitionnée par son tenantId ; tout accès cross-tenant non autorisé est évité côté serveur, par les règles métier et par l’API.

**Pourquoi cette priorité** : le socle B2B exige que la frontière client soit durable et vérifiable, qu’il s’agisse de lecture, de mutation ou d’auto-attribution de droits.

**Test indépendant** : tenter un accès au tenant d’un autre client, tester une opération avec contexte malformé, puis vérifier le refus, l’audit et la non-exposition de données.

**Scénarios d’acceptation** :

1. **Étant donné** une ressource appartenant à un tenant A, **quand** un acteur du tenant B tente d’y accéder, **alors** l’action est rejetée avec HTTP 403 CROSS_TENANT_FORBIDDEN.
2. **Étant donné** un contexte de requête sans tenant ou avec un tenant différent de l’objet cible, **quand** la transaction s’exécute, **alors** la demande est fermée avant toute mutation.
3. **Étant donné** un contrôle d’audit, **quand** un accès cross-tenant est tenté, **alors** l’incident est tracé et la donnée n’est pas exposée.

### User Story 4 — Prévention de l’auto-élévation et du franchissement de frontière (Priority: P1)

Un administrateur ne peut pas modifier ses propres privilèges ni s’octroyer un droit supérieur. En cas de bootstrap du dernier administrateur, l’opération doit rester surveillée et documentée comme critique.

**Pourquoi cette priorité** : la sécurité du modèle de permissions repose sur la non-falsifiabilité de l’identité et de la hiérarchie des rôles.

**Test indépendant** : tenter une auto-attribution, vérifier le refus, puis simuler un bootstrap unique et confirmer la journalisation critique.

**Scénarios d’acceptation** :

1. **Étant donné** un utilisateur avec un rôle d’administration, **quand** il tente d’ajouter un rôle supérieur à son propre compte, **alors** la tentative est rejetée avec SELF_PRIVILEGE_ESCALATION_FORBIDDEN.
2. **Étant donné** un TENANT_ADMIN ou un PLATFORM_ADMIN, **quand** il tente de franchir la frontière de la console concernée, **alors** la requête est refusée avec CONTROL_PLANE_FORBIDDEN ou un équivalent explicite.
3. **Étant donné** un bootstrap de dernier administrateur, **quand** l’opération est autorisée, **alors** elle est journalisée avec une sévérité CRITICAL et un contexte explicite.

### User Story 5 — Réserves de sécurité autour du tenant sentinelle (Priority: P2)

Le tenant `0000` est un identifiant de contexte plateforme réservé et non un tenant client. Son utilisation est strictement limitée au control plane et à la validation de frontières, sans création ou appartenance cliente.

**Pourquoi cette priorité** : la sécurité du modèle repose sur la séparation entre un identifiant technique réservé et les objets métier régis par le multi-tenant.

**Test indépendant** : vérifier qu’aucune ressource client ne peut être créée ni référencée avec `tenantId = 0000` sous les chemins de production, et que le control plane est l’unique utilisateur du contexte réservé.

**Scénarios d’acceptation** :

1. **Étant donné** un service ou un acteur de plateforme, **quand** il utilise le contexte réservé `tenantId = 0000`, **alors** il est interprété comme signal de contrôle plateforme et non comme tenant client.
2. **Étant donné** une ressource cliente, **quand** une requête essaie de la lier à `0000`, **alors** la création ou la mise à jour est refusée.
3. **Étant donné** un diagnostic de plateforme, **quand** le système enregistre le contexte, **alors** la provenance et le rôle sont tracés sans ambiguïté.

## Cas limites

- Un acte de super-administration ne peut pas être déduit d’un token utilisateur ou d’un tenant client.
- Un administrateur client ne peut pas recevoir silencieusement des permissions de plateforme.
- Une création de tenant ou d’organisation ne peut pas réutiliser la forme `0000` comme identifiant client.
- Une demande de support, un quota ou un diagnostic global ne doit pas devenir une mutation tenant non autorisée.
- Les routes de l’administration tenant et du control plane doivent être visuellement et techniquement distinctes, sans zone de chevauchement.
- Les tentatives d’escalade de privilège ou de franchissement de frontière doivent rester auditables et non silencieuses.

## Requirements — Exigences

### Exigences fonctionnelles

- **FR-001** : Le système MUST séparer l’administration tenant de l’administration plateforme en deux surfaces distinctes, respectivement `/settings` pour le TENANT_ADMIN et `/control` pour le PLATFORM_OWNER / PLATFORM_ADMIN.
- **FR-002** : Le rôle TENANT_ADMIN MUST être strictement cantonné à la gestion des ressources et paramètres de son organisation cliente ; il MUST NOT disposer d’écriture implicite dans la plateforme globale.
- **FR-003** : Le rôle PLATFORM_OWNER et le rôle PLATFORM_ADMIN MUST avoir l’autorité d’orchestration de la flotte multi-tenant, des quotas, du support et des diagnostics globaux, dans le control plane exclusif.
- **FR-004** : Toute ressource métier MUST être partitionnée par son tenantId ; les accès cross-tenant non autorisés MUST être rejetés avec HTTP 403 CROSS_TENANT_FORBIDDEN.
- **FR-005** : Les super-administrateurs MUST opérer avec un contexte réservé de plateforme, sans confondre ce contexte avec un tenant client ; les utilisateurs tenant ne peuvent pas franchir la frontière du control plane et reçoivent HTTP 403 CONTROL_PLANE_FORBIDDEN.
- **FR-006** : Le tenant sentinelle `0000` MUST être réservé à l’usage du control plane et MUST NOT être utilisé comme tenant client valide dans les objets métier persistés.
- **FR-007** : Les permissions de plateforme MUST rester additifs, explicites et scindés selon la portée ; aucun rôle tenant MUST déduire un droit de plateforme.
- **FR-008** : Un administrateur MUST NOT pouvoir s’auto-attribuer un privilège supérieur et MUST être rejeté avec SELF_PRIVILEGE_ESCALATION_FORBIDDEN.
- **FR-009** : Le cas de bootstrap d’un dernier administrateur MUST rester documenté, auditable et journalisé avec sévérité CRITICAL lorsque l’opération est explicite et justifiée.
- **FR-010** : Les opérations de support, de quotas et de diagnostic ne MUST NOT modifier des ressources tenant sans contexte et autorisation spécifiques.
- **FR-011** : Les requêtes de validation de frontières MUST être vérifiées côté serveur à partir de l’identité persistée, des rôles et du contexte de transaction, et non depuis le navigateur ou des données de client.
- **FR-012** : Les routes /settings et /control MUST être visible, navigable et testable comme deux surfaces administratives distinctes, sans chevauchement fonctionnel.
- **FR-013** : Le système MUST conserver un journal d’audit lisible et append-only pour les tentatives de franchissement, les refus cross-tenant et les opérations de contrôle porté par la plateforme.
- **FR-014** : Les changements de conception MUST être cohérents avec les modèles existants de permissions, de rôles, d’organisation et de tenant déjà établis dans le codebase.

## Success Criteria — Critères de succès

### Résultats mesurables

- **SC-001** : Les routes et permissions client / plateforme sont séparées par surface d’administration et les tests de parcours démontrent qu’un TENANT_ADMIN ne peut pas accéder à `/control` et qu’un organisateur de plateforme ne peut pas être confondu avec un tenant.
- **SC-002** : Une tentative de cross-tenant ou de franchissement de frontière est toujours rejetée et enregistrée ; au moins un test couvre chaque refus principal : CROSS_TENANT_FORBIDDEN, CONTROL_PLANE_FORBIDDEN et SELF_PRIVILEGE_ESCALATION_FORBIDDEN.
- **SC-003** : Le contexte `tenantId = 0000` est documenté comme réservé à la plateforme et il est démontré qu’aucune ressource cliente ne lui est associée en dur ou par création.
- **SC-004** : Le bootstrap du dernier administrateur reste traçable avec un journal critique ; une opération de ce type n’est pas silencieuse et sa provenance est explicite.
- **SC-005** : Les permissions et autorisations du socle restent cohérentes après les changements de rôles, sans propagation implicite d’un niveau de permission vers l’autre.

## Clarifications

- La séparation `/settings` vs `/control` est le modèle obligatoire de la feature ; elle ne remplace pas les permissions de tenant déjà existantes dans le codebase, mais les scinde visuellement et fonctionnellement.
- Le `tenantId = 0000` est traité comme un identifiant réservé au control plane, pas comme un tenant client commercial ou de production.
- Les niveaux de protection et les refus sont interprétés comme des décisions serveur, non comme des directives UI uniquement.

## Assumptions

- Le monolithe existant conserve sa séparation entre identité, rôles, permissions et ressources tenant ; la nouvelle architecture ne remplace pas les mécanismes de RLS ni la transaction locale déjà en place.
- Les rôles PLATFORM_OWNER et PLATFORM_ADMIN sont des permissions de plateforme, distinctes du rôle TENANT_ADMIN et des rôles workspace/client déjà présents dans le codebase.
- Le control plane est un espace d’orchestration et de supervision, sans qu’une ressource tenant y soit matérialisée comme un vrai client.
- La frontière est stricte : le tenant client est un monde de données, tandis que la plateforme est un monde d’administration globale, sans auto-élévation autorisée.
- Les évolutions documentaires qui précisent la surface `/settings` et `/control` doivent être alignées sur les routes et permissions existantes, sans introduire de nouvelles autorisations invisibles.
