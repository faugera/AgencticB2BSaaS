# Contrat profil

Les routes existantes restent inchangées.

| Méthode et route | Autorisation | Résultat |
| --- | --- | --- |
| `GET /api/profile?tenantId=<uuid>` | Session vérifiée, acteur courant ; tenant facultatif réautorisé côté serveur | Champs propres à l'acteur et à sa membership active dans cette portée |
| `PUT /api/profile?tenantId=<uuid>` | Même contrôle ; origine vérifiée pour l'écriture ; DTO strict | Profil enregistré ou erreur métier générique |

Le corps `PUT` exige `first_name` et `last_name` non vides et peut contenir
`avatar_url`, `phone_number`, `job_title` et `department`. Les propriétés inconnues
(acteur, rôle, statut, vérification) sont refusées. Il n'existe aucun paramètre
d'identité cible. Le contrat ne modifie ni email ni état de session.

La route est protégée par la transaction métier partagée, sans middleware profil
distinct. Les réponses détaillées sont vérifiées dans `profile-routes.test.ts` et les
tests HTTP d'intégration existants ; aucune garantie de schéma de réponse Fastify
n'est ajoutée.
