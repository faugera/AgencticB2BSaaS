# Analyse des huit retours de la PR 9

| Constat | Traitement | Preuve ou limite |
| --- | --- | --- |
| Audit historique sans tenant | Migration 0017 additive reprend les événements, y compris les actions longues | `review-repairs.integration.test.ts` et test de reprise historique |
| Catalogue de rôles hors tenant par défaut | Validation et propagation de `tenantId` | `rbac-routes.test.ts` et `review-role-http.integration.test.ts` |
| Profil au changement de tenant | Conservation du formulaire existant de la PR 12 et de sa portée explicite | Code et tests unitaires ; les scénarios navigateur ne sont plus exécutés |
| Création de workspace inter-tenant | Vérification du tenant de la ligne et de la capacité | `review-repairs.integration.test.ts` et isolation SQL |
| Préférences écrasées par une autre instance | Sauvegarde partielle atomique et initialisation sans écrasement | `review-preferences.integration.test.ts` |
| Permissions d'invitation et de membres indépendantes | Navigation et chargement selon la capacité correspondante | Inspection des gardes ; tests navigateur retirés à la demande du propriétaire |
| Contexte par défaut supprimé | Recherche d'un tenant actif et contexte sans tenant | `review-repairs.integration.test.ts` |
| Audit sans tenant explicite | Transmission du tenant effectif pour les utilisateurs non plateforme | Inspection de la portée ; tests navigateur retirés à la demande du propriétaire |

Les noms de migrations restent provisoires jusqu'à connaissance de l'historique des environnements non jetables. Les tests SQL utilisent des bases jetables, sans preuve sur un déploiement réel.
