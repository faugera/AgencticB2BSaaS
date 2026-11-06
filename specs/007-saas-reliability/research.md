# Recherche : Fiabilisation du socle SaaS

## Contexte vérifié

- Les transactions métier configurent le contexte PostgreSQL tenant en local et
  enregistrent l’audit avant le commit (`apps/api/src/business/store.ts`).
- Les emails d’invitation et de vérification sont actuellement déclenchés après
  la création métier ; l’échec est marqué puis repris manuellement
  (`apps/api/src/business/routes.ts`, `apps/api/src/auth/operator.ts`).
- Better Auth utilise son propre stockage DB pour ses limites ; le plugin
  métier Fastify ne reçoit pas de store partagé (`apps/api/src/auth/service.ts`,
  `apps/api/src/app.ts`). `docs/architecture/0005-private-pilot.md` décrit
  explicitement cette limite par processus.
- Les données de rôle et de tenant sont protégées par fonctions SQL et RLS ;
  les fonctions SECURITY DEFINER fixent `search_path`, les rôles runtime n’ont
  pas accès direct aux schémas privés.
- L’API utilise les schémas Fastify/Ajv et Zod dans certaines routes ;
  `apps/web/src/http.ts` transforme aujourd’hui directement le JSON en `T`.
- L’audit et les demandes d’accès ont déjà une pagination bornée ; d’autres
  listes retournent des collections complètes.
- La CI lance PostgreSQL, Mailpit, tests navigateur, tests auth et isolation ;
  aucune action de déploiement n’est présente. La documentation précise que
  l’automatisation des sauvegardes/RTO n’est pas déployée.

## Décisions et alternatives

### Livraison des emails d’invitation

**Décision** : outbox transactionnelle dans PostgreSQL et travail récupérable,
avec état, bail, nombre d’essais, attente exponentielle et expiration. Protéger
le contenu contenant un jeton par chiffrement authentifié avec une clé séparée
de Better Auth, provenant de la configuration opérateur, identifiée par version
et jamais stockée dans la base. Effacer le contenu chiffré dès que le message
est envoyé ou que le lien expire. Le hash du jeton reste la valeur de vérification
dans l’invitation ; la valeur brute n’est jamais mise en clair dans la base ou
les logs.

Les appels `inviteIdentity` peuvent aussi déclencher vérification/activation
Better Auth. Leurs callbacks d’envoi doivent être intégrés au même mécanisme
durable : le travail d’identité peut être repris après arrêt, et chaque nouvelle
génération de lien d’activation doit remplacer les messages d’activation obsolètes
non remis. Réautoriser le contexte et vérifier l’état courant de l’invitation
avant envoi.

Un identifiant d’idempotence lie acteur, action, portée et empreinte de corps ;
un rejeu identique retourne le résultat sûr enregistré, une empreinte différente
est refusée. La durée de conservation des clés doit couvrir la fenêtre de reprise
supportée et être définie dans le contrat.

**Rationale** : l’écriture en base ne peut garantir l’envoi SMTP, mais la
transaction peut rendre durable l’intention d’envoi et permettre sa reprise après
arrêt du processus. Le worker ne dépend pas d’un broker additionnel.

**Alternatives considérées** :

- Envoi synchrone après commit : écarté, car un arrêt avant l’appel perd le mail.
- Reprise manuelle seule : écartée comme unique mécanisme, elle n’assure pas le
  traitement après un arrêt et renouvelle parfois le jeton.
- Jeton SMTP « exactement une fois » : non garanti ; après acceptation SMTP sans
  accusé, une reprise peut produire un doublon. Le contrat assume une livraison
  au moins une fois et garde un lien métier stable.
- Jeton en clair dans une table d’outbox : écarté car la fuite DB exposerait des
  invitations actives.

### Limitation de débit multi-instance

**Décision** : utiliser PostgreSQL comme compteur partagé métier, à travers une
opération atomique à durée bornée ; garder le limiteur de Better Auth séparé.
Hacher les clés d’adresse IP avec une clé dédiée ou une dérivation de clé avec
séparation de domaine ; purger les fenêtres expirées. Si le store est
indisponible, renvoyer une erreur explicite plutôt qu’un fallback mémoire.

**Rationale** : `pg` et PostgreSQL font déjà partie de la pile, contrairement à
Redis. Une limite en mémoire varie avec le nombre d’instances et les redémarrages.

**Alternatives considérées** :

- Store mémoire actuel : conservable en pilote à instance unique seulement ;
  ne satisfait pas le critère multi-instance.
- Réutilisation de la table Better Auth : écartée, car elle appartient au
  périmètre d’authentification et à un autre modèle de droits.
- Redis : écarté pour cette évolution tant qu’une charge mesurée ne justifie
  pas une nouvelle dépendance opératoire.
- Rate limit au proxy : reste possible ultérieurement si l’infrastructure est
  formellement retenue ; elle n’est pas établie dans le dépôt.

### Validation des contrats API

**Décision** : valider les réponses utilisées par le web au moment de la
consommation, compléter les contrats de réponse Fastify là où cela protège la
frontière serveur et conserver les types partagés sans logique runtime.
Réutiliser les bibliothèques et modèles déjà présents avant d’ajouter une
dépendance au workspace web.

**Rationale** : le typage TypeScript n’inspecte pas un JSON reçu. Une frontière
de validation évite qu’un payload inattendu soit traité comme un DTO valide.

**Alternatives considérées** :

- Garder `as Promise<T>` : écarté, ne valide aucune donnée.
- Ajouter des schémas d’exécution dans `packages/shared` : écarté, contrairement
  au contrat du dépôt qui maintient ce paquet type-only.
- Réécrire toutes les routes dans une nouvelle couche API : écarté, trop large ;
  viser les DTO consommés par les surfaces affectées.

### Pagination

**Décision** : étendre le modèle existant date/UUID à ordre stable et taille
maximale pour les listes actuellement non bornées. Chaque requête réautorise le
tenant dans le contexte transactionnel ; un curseur ne confère aucun accès.

**Rationale** : le même patron existe déjà pour l’audit et les demandes d’accès,
et évite les offsets qui deviennent instables lors de mutations concurrentes.

**Alternatives considérées** :

- Réutiliser un offset : écarté pour les listes susceptibles d’évoluer pendant
  la navigation.
- Charger toutes les lignes : écarté, coût mémoire/latence augmente avec le
  tenant.

### Observabilité et reprise

**Décision** : enrichir les logs structurés existants avec catégorie, identifiant
de requête, type d’opération et état de dépendance sans PII/jetons ; documenter
les procédures de sauvegarde et éprouver une restauration isolée. Aucun objectif
RTO/RPO n’est fixé faute de décision opérateur.

**Rationale** : les erreurs HTTP restent génériques pour le client ; les signaux
opérateur doivent être utiles sans rendre les secrets visibles.

**Alternatives considérées** :

- Ajouter d’emblée un fournisseur de traces/métriques : écarté sans choix de
  plateforme ou exigence de déploiement.
- Affirmer une restauration ou une disponibilité sans infrastructure réelle :
  interdit par les exigences de preuve du dépôt.
