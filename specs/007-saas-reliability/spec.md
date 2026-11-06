# Spécification : Fiabilisation du socle SaaS

**Feature Branch**: `faugera-audit-architecture-saas`

**Created**: 2026-11-01

**Status**: In Progress

**Input**: « Propose moi un plan » — suite à l’audit architectural et à ses cinq
priorités : fiabilité des mutations avec effets email, validation des contrats,
limitation de débit multi-instance, pagination des listes et préparation de
l’exploitation.

## User Scenarios & Testing — Scénarios utilisateur et tests

### User Story 1 — Rejouer une mutation sans doublon (Priority: P1)

Un administrateur peut réessayer une création après un délai ou une réponse
perdue sans créer plusieurs tenants, invitations ou demandes d’accès.

**Pourquoi cette priorité** : les mutations déclenchant un email traversent
plusieurs systèmes et peuvent échouer après leur premier enregistrement.

**Test indépendant** : soumettre plusieurs fois la même opération, y compris
après une réponse interrompue, puis vérifier qu’une seule mutation métier est
conservée et que les reprises n’effacent pas son état.

**Scénarios d’acceptation** :

1. **Étant donné** une mutation déjà acceptée, **quand** le client la rejoue avec
   la même clé et les mêmes données, **alors** il retrouve le résultat initial.
2. **Étant donné** une clé déjà utilisée avec d’autres données, **quand** le
   client la réutilise, **alors** l’opération est refusée sans seconde mutation.
3. **Étant donné** un service email indisponible, **quand** la mutation métier
   est confirmée, **alors** son état de livraison reste visible et récupérable.
4. **Étant donné** une identité créée ou réactivée pour une invitation,
   **quand** son email de vérification ou d’activation échoue, **alors** la
   livraison reste récupérable sans perdre l’invitation métier.

### User Story 2 — Obtenir des réponses et listes prévisibles (Priority: P1)

Les utilisateurs et intégrations reçoivent des réponses conformes aux contrats
et peuvent parcourir de grandes listes sans charger tous les enregistrements.

**Pourquoi cette priorité** : un typage uniquement statique ne protège pas les
clients lorsque les réponses changent ou sont mal formées ; les listes sans
limite deviennent coûteuses avec la croissance des tenants.

**Test indépendant** : présenter une réponse mal formée et parcourir une liste
plus grande que sa taille de page, en vérifiant validation, ordre et continuité.

**Scénarios d’acceptation** :

1. **Étant donné** une réponse incompatible avec le contrat, **quand** le client
   la reçoit, **alors** elle n’est pas traitée comme une réponse valide.
2. **Étant donné** une liste paginée, **quand** plusieurs pages sont demandées,
   **alors** chaque élément autorisé apparaît une seule fois dans un ordre stable.
3. **Étant donné** un curseur ou une portée appartenant à un autre tenant,
   **quand** une page suivante est demandée, **alors** aucune donnée étrangère
   n’est révélée.

### User Story 3 — Appliquer des limites cohérentes entre instances (Priority: P1)

Les opérateurs peuvent exécuter plusieurs instances du service sans que le
redémarrage d’une instance ou l’ajout d’une réplique annule les limites de
requêtes configurées.

**Pourquoi cette priorité** : un compteur isolé par processus augmente la limite
effective avec le nombre d’instances et ne protège pas contre les rejeux répartis.

**Test indépendant** : envoyer des requêtes depuis plusieurs instances puis
redémarrer l’une d’elles ; vérifier que la même limite globale s’applique.

**Scénarios d’acceptation** :

1. **Étant donné** plusieurs instances, **quand** une limite est atteinte par
   des requêtes cumulées, **alors** les requêtes suivantes sont refusées.
2. **Étant donné** que le mécanisme de comptage partagé est indisponible,
   **quand** une requête protégée arrive, **alors** la limite n’est pas
   silencieusement contournée et l’incident est observable.

### User Story 4 — Exploiter et restaurer le service avec des preuves (Priority: P2)

Les opérateurs peuvent distinguer une panne d’authentification, de base, de
limitation ou de livraison email et vérifier la reprise avant une mise en service.

**Pourquoi cette priorité** : des réponses volontairement génériques protègent
les détails sensibles, mais nécessitent des signaux internes utiles et une reprise
répétée pour réduire le risque opérationnel.

**Test indépendant** : provoquer des erreurs représentatives, examiner les
signaux disponibles sans secret, puis suivre le guide de restauration sur une
base isolée.

**Scénarios d’acceptation** :

1. **Étant donné** une erreur serveur, **quand** elle est diagnostiquée,
   **alors** l’opérateur peut retrouver son type et son contexte sans exposer
   de jeton, secret ou donnée personnelle inutile.
2. **Étant donné** une procédure de sauvegarde et restauration, **quand** elle
   est exécutée sur une copie isolée, **alors** le résultat et les limites sont
   consignés avant toute mise en service.

## Cas limites

- Une réponse peut être perdue après le commit métier ou après acceptation de
  l’email par le relais SMTP.
- Un événement de livraison peut devenir obsolète après révocation ou acceptation
  de l’invitation correspondante.
- Le relais SMTP peut accepter un message puis perdre la connexion avant son
  accusé de réception ; le système doit expliciter le risque de doublon.
- Un curseur mal formé, réutilisé dans un autre tenant ou pointant sur une ligne
  supprimée ne doit pas élargir la portée autorisée.
- Une panne du stockage des limites ne doit pas désactiver silencieusement la
  protection des routes concernées.
- Les journaux, événements et réponses d’erreur ne doivent pas contenir de jetons,
  secrets ou corps sensibles.
- Les tests de reprise et de restauration ne doivent jamais utiliser une base de
  développement ou de production.

## Requirements — Exigences

### Exigences fonctionnelles

- **FR-001** : Le système MUST permettre de rejouer une mutation critique sans
  créer une seconde opération métier lorsque la même clé et les mêmes données
  sont présentées.
- **FR-002** : Le système MUST refuser la réutilisation d’une clé de rejeu pour
  des données différentes.
- **FR-003** : La confirmation d’une mutation métier et l’enregistrement de ses
  emails d’invitation, de vérification ou d’activation MUST rester cohérents
  malgré l’arrêt du processus.
- **FR-004** : Les livraisons email MUST exposer un état récupérable, gérer les
  reprises et empêcher l’envoi d’une invitation révoquée ou déjà acceptée.
- **FR-005** : Les jetons et secrets nécessaires à une livraison différée MUST
  être protégés contre l’exposition en lecture, dans les journaux et dans les
  preuves ; leur durée de conservation MUST être bornée.
- **FR-006** : Les réponses consommées par l’interface MUST être validées à
  l’exécution selon leur contrat ; une réponse invalide MUST produire une erreur
  explicite et sûre.
- **FR-007** : Les listes volumineuses MUST être parcourables par pages de taille
  bornée et ordre stable.
- **FR-008** : Chaque page MUST réautoriser l’identité et le tenant côté serveur ;
  un curseur ne MUST NOT servir de preuve d’accès.
- **FR-009** : Les limites configurées MUST être cohérentes entre les instances
  et rester appliquées après redémarrage.
- **FR-010** : Une panne du mécanisme de limitation MUST être observable et ne
  MUST NOT entraîner de contournement silencieux.
- **FR-011** : Les opérateurs MUST pouvoir distinguer les catégories d’incidents
  sans inclure de secrets, jetons ou valeurs personnelles inutiles.
- **FR-012** : Les procédures de sauvegarde, restauration et reprise MUST être
  vérifiables sur un environnement jetable, avec résultats et limites documentés.
- **FR-013** : L’évolution MUST rester livrée par revue manuelle ; aucun
  déploiement, merge ou changement de production ne MUST être déclenché
  automatiquement.
- **FR-014** : Les interfaces de pagination MUST rester utilisables au clavier,
  en français et en anglais, sans perte de contexte de tenant.

### Entités principales

- **Mutation rejouable** : opération métier, acteur, portée, clé de rejeu,
  empreinte de la demande et résultat initial.
- **Livraison différée** : effet externe associé à une mutation, état, nombre
  d’essais, prochaine reprise et échéance de conservation.
- **Page de résultats** : portée autorisée, éléments, ordre et curseur de reprise.
- **Limite de requêtes** : règle, fenêtre, portée de comptage et état du stockage.
- **Preuve d’exploitation** : contrôle réalisé, environnement isolé, résultat,
  date et limites observées.

## Success Criteria — Critères de succès

### Résultats mesurables

- **SC-001** : Dix rejeux d’une mutation avec la même clé et les mêmes données
  produisent exactement une mutation métier.
- **SC-002** : Les scénarios de tests couvrent un arrêt après commit, un arrêt
  pendant l’envoi et une révocation avant livraison ; aucun test ne classe une
  livraison incertaine comme définitivement réussie.
- **SC-003** : Chaque réponse structurée listée dans
  `contracts/api.md#réponses-validées-au-runtime` est couverte par un test de
  contrat qui rejette un champ requis manquant et, pour les champs énumérés,
  une valeur inconnue.
- **SC-004** : Le parcours paginé ne perd ni ne répète aucun élément sur au moins
  trois pages et refuse chaque essai inter-tenant testé.
- **SC-005** : Les tests répartis sur exactement trois instances API
  indépendantes démontrent une limite cohérente, y compris après le
  redémarrage d’une instance.
- **SC-006** : Chaque erreur simulée dans les scénarios d’exploitation possède
  un signal opérateur sans valeur de secret ou jeton.
- **SC-007** : Une restauration sur base isolée est répétée avec résultat
  documenté ; toute infrastructure absente reste NOT_RUN.
- **SC-008** : Les changements passent les contrôles applicables et une revue
  des workflows confirme qu’aucun merge ni déploiement automatique n’est
  déclenché par cette évolution.

## Hypothèses

- Le périmètre couvre les cinq priorités de l’audit ; il ne remplace ni le RBAC,
  ni RLS, ni les migrations déjà appliquées.
- PostgreSQL reste le stockage métier de référence et les migrations appliquées
  restent immuables.
- L’envoi email peut être répété lorsque son accusé de réception est ambigu ;
  une garantie « exactement une fois » côté SMTP n’est pas supposée.
- Le choix du stockage des événements différés, de la limitation partagée et de
  l’instrumentation sera comparé pendant la planification, sans dépendance
  nouvelle présumée.
- Les frontières serveur, l’audit transactionnel, le contexte tenant et la
  suppression logique actuels sont conservés.
- La livraison reste revue et manuelle ; aucune action destructive ou
  modification d’infrastructure réelle n’est incluse.
