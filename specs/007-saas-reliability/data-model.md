# Modèle de données : Fiabilisation du socle SaaS

Ce modèle décrit les concepts à prévoir pour la feature ; il ne signifie pas que
des migrations ont été appliquées. Les migrations existantes restent immuables.

## Enregistrements d’idempotence

| Champ logique | Règle |
|---|---|
| Identifiant | UUID généré côté serveur. |
| Acteur | Identité vérifiée à l’origine de la mutation ; null seulement pour un flux explicitement public déjà contrôlé. |
| Action et portée | Route/opération et tenant/organisation autorisés ; toujours réautorisés sur une nouvelle requête. |
| Clé d’idempotence | Empreinte non réversible de la clé fournie par le client ; unicité selon acteur, action et portée. |
| Empreinte de requête | Empreinte du contenu normalisé ; différence avec la valeur déjà enregistrée = conflit sans mutation. |
| Résultat rejouable | Résultat API sûr, sans secret ni jeton ; renvoyé pour le même contenu. |
| État | En cours, terminé, ou échec métier définitif ; une réservation concurrente ne peut pas exécuter deux mutations. |
| Échéance | Durée finie couvrant la fenêtre documentée de rejeu ; purge contrôlée, sans toucher aux journaux métier. |

## Événement de livraison

| Champ logique | Règle |
|---|---|
| Identifiant / clé d’opération | Clé unique permettant de dédupliquer le même effet métier et sa génération. |
| Type et référence métier | Provisionnement identité, activation/vérification ou invitation ; la référence reste liée à la portée d’origine. |
| Portée et acteur d’origine | Tenant et acteur persistés si applicables ; contrôlés à nouveau avant l’effet externe. |
| Charge chiffrée | Texte de mail et liens contenant des jetons, chiffrés avec chiffrement authentifié ; aucun secret en clair en base. |
| Version de clé | Identifiant non secret permettant de déchiffrer les événements en attente pendant une rotation. |
| État | En attente, réservé, envoyé, échec récupérable, échec terminal ou expiré. |
| Tentatives et prochaine disponibilité | Compteur et instant de reprise pour backoff borné et diagnostic sans détail sensible. |
| Bail | Propriétaire de réservation et échéance ; un seul worker actif traite l’événement à un instant donné. |
| Échéances | Conservation bornée ; le contenu chiffré est supprimé après envoi, révocation/expiration ou délai de reprise. |
| Dernier résultat | Code d’erreur classifié, non le corps SMTP, le jeton, l’adresse complète ou les identifiants sensibles. |

**Relations et transitions** : une mutation d’invitation crée son invitation,
son entrée d’idempotence et ses événements initiaux dans une transaction cohérente.
Un événement suit `pending -> leased -> sent`, `pending/leased -> retryable`,
puis `terminal/expired` après politique explicite. Une invitation acceptée,
révoquée ou expirée rend son message d’invitation non livrable. Une nouvelle
génération de vérification annule les messages d’activation précédents non envoyés.

## Fenêtre de limitation

| Champ logique | Règle |
|---|---|
| Règle | Identifie la route et la politique de limite, sans inclure de payload. |
| Clé opaque | HMAC/empreinte de l’adresse IP normalisée, et autres dimensions expressément retenues ; aucune IP brute persistée. |
| Début de fenêtre | Fenêtre déterministe pour une mise à jour concurrente atomique. |
| Compteur et échéance | Compteur augmenté atomiquement et date de purge. |

Les données de compteur ne sont pas un journal d’activité utilisateur et ne
servent pas d’autorisation tenant. Leur durée est courte ; les erreurs de stockage
ne basculent pas silencieusement vers un compteur local.

## Contrat de pagination

Une page est définie par une portée autorisée, une limite maximale, des éléments
ordonnés par `(created_at, id)` décroissant et un curseur lié à cette position.
Le serveur vérifie le tenant dans la transaction à chaque page. Les curseurs
mal formés ou hors ordre échouent sans élargir la requête.

## Règles de sécurité et conservation

- RLS, fonctions privées et rôles runtime restent la source de l’autorisation ;
  le worker n’hérite pas automatiquement des droits de l’acteur initial.
- Les permissions d’exécution des fonctions d’outbox et de compteur restent
  explicites ; aucun accès direct inutile aux tables sensibles.
- Les migrations sont additives, révisées, checksummées et testées sur bases
  jetables vide et déjà migrée.
- Aucun nettoyage des données métier ou de l’audit existants n’est impliqué.
- Les clés sont gérées hors base ; leur rotation conserve les anciennes versions
  seulement pendant la durée maximale de vie des messages chiffrés.
