# Implementation Plan: Enrichissement B2B

## Summary
Migration additive par étapes : 0013 profil/métadonnées, 0014 organisation et RBAC,
0015 journal unique. Conserver Better Auth et les contrats compatibles ; étendre les
routes ciblées, puis le profil et l’administration. Tests négatifs avant implémentation.

## Technical Context
Node24/pnpm11, PostgreSQL17, pg, Fastify5, React/Vite et Brume. Zod4.6.7 déjà transitif,
rendu dépendance directe API pour les nouveaux DTO seulement. Shared reste type-only.
Aucun ORM, nouveau store global, middleware d’auth alternatif ou moteur de facturation.
SQL versionné/checksums, migrations historiques immuables. Services de preuve isolés.

## Constitution Check
Spec et décisions vérifiables ; réutilisation des routes/shell ; autorisation SQL persistée,
RLS et contexte de transaction. Les règles mono-tenant des standards deviennent multi-tenant
au sein d’un seul client, conformément aux arbitrages utilisateur. MFA facultative.
Les noms inconnus restent nullable ; pas de double vérité SDK. Aucun écart constitutionnel.

## Modèle et reprise
Détails : data-model.md ; contrats : contracts/api.md ; validations : quickstart.md.
Le migrateur garde sa transaction/verrou/checksum. Le SQL brut n’est pas présenté comme
rejouable ; le migrateur saute les versions déjà appliquées. Test des deux comportements.
Backfill noms : normaliser espaces, premier token/prénoms restant selon règle premier mot
+ reste comme nom ; mononyme conserve prénom et nom NULL ; vide laisse deux NULL.
Cette heuristique n’identifie pas les noms composés : modification possible dans Mon profil.
Avatar/email vérifié/dates restent canoniques dans les colonnes SDK ; alias générés/DTO,
pas de deuxième vérité modifiable. Les dates existantes et deletedAt restent intactes.
Billing email ancien : premier admin actif non supprimé, ordre actor UUID ; à défaut
invitation tenant_admin non révoquée la plus ancienne, puis ID ; diagnostic et rollback
si aucune source exploitable. Pas d’email fictif. Nouveau provisioning fournit adminEmail.
Slugs : nom normalisé ASCII limité à30 caractères + '-' + UUID sans tirets (32), stable,
unique, 63caractères max ; prefixe 'tenant'/'workspace' si nom non ASCII sans transcription.
Chaque ancien tenant client reçoit une organisation propre ; IDs métier inchangés.
Joined_at historique inconnu reste NULL ; statut existant active, état explicite pour les suites.
Valeurs d’abonnement/pays/préférences sont les défauts explicitement demandés, sans limites commerciales.

## Autorisation
Catalogue global : scopes organization/tenant/workspace, permissions prédéfinies, niveau
dérivé des capacités sensibles. Builtins protégés ; customroles éditables seulement super.
Attributions cumulatives, jamais de permission plateforme dans un rôle client. Les permissions
tenant sont héritées dans ce tenant uniquement. Les contextes indiquent le tenant actif
et les tenants accessibles ; l’ID client n’est jamais une autorisation.
Hiérarchie 4/3/2/1/0 : super, organization_admin, tenant_admin, workspace_admin, member.
Pas de mutation de droits sur soi/pair/supérieur ; protection concurrente du dernier admin.
Changement global avec impact/confirmation et retrait effectif à la requête suivante.
Les routes historiques restent autorisées par les fonctions SQL actualisées, pas par un
rôle singulier côté client. Les champs legacy sont une compatibilité, pas l’autorité.

## Audit
Un journal business.audit_logs pour plateforme et tenant ; tenant nullable uniquement pour
les événements plateforme. Événements legacy compatibles copiés sans perdre leur ID source ;
les autres conservés en archive privée. Pas de suppression du journal historique.
RLS ENABLE/FORCE, runtime sans UPDATE/DELETE/TRUNCATE. Événements atomiques, métadonnées
serveur IP/proxy, champs personnels sous forme de clés seulement. Les différences de
permissions sont des identifiants techniques non sensibles et sont journalisées avec date/auteur.
Les changements de noms et rôle ne sont pas des snapshots de profil. Identifiants texte
pour préserver les cibles Better Auth et composites ; pas de conversion aveugle en UUID.

## Exécution et responsabilités
Tâches [P] indépendantes autorisées par speckit-implement : profil0013, autorisation0014,
audit0015 (contrat SQL partagé) et consommateurs web peuvent avancer en parallèle après
stabilisation des contrats. Aucun même fichier partagé entre implémenteurs. Intégration
routes/store/shared et adaptation globale des fixtures séquentielles sous responsabilité racine.

## Vérification
Unitaires DTO, migrations ancienne base/vide/rejeu, matrice HTTP/SQL deux clients,
statuts, hiérarchie et révocation, audit immuable et auth SDK. UI FR/EN375/768/1280,
revue visuelle, parcours réel avec PostgreSQL/Mailpit jetables. pnpm verify, docs gates,
security/isolation/auth-live, analyse/convergence et PR. Si infrastructure absente, NOT_RUN.
