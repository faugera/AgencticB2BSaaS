# Modèle de données : Édition sûre du profil par tenant

Aucun changement de modèle ou de migration n'est prévu.

| Données existantes | Source canonique | Portée |
| --- | --- | --- |
| Prénom, nom, avatar, téléphone | Identité du compte | Acteur courant |
| Email, vérification, dates | Identité du compte, en lecture seule | Acteur courant |
| Poste, département | Membership active | Acteur et tenant courant |
| Rôle, statut, appartenance | Autorisation métier | Lecture seule depuis le profil |
| Langue, thème, fuseau, format de date | Préférences du compte | Acteur courant |

La query tenant demande un contexte ; elle ne confère aucun accès. La transaction
vérifie l'acteur et le tenant avant de lire ou modifier les données.
