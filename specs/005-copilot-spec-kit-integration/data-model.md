# Modèle de données : Intégration de GitHub Copilot à Spec Kit

Le changement ne crée aucune donnée métier. Les artefacts de configuration sont :

| Entité | Champs importants | Contraintes |
|---|---|---|
| État Spec Kit | version, intégration par défaut, liste des intégrations installées | Copilot est présent ; `codex` reste le défaut ; Codex et Claude sont conservés. |
| Manifeste Copilot | identifiant, version, chemins générés et empreintes SHA256 | Chaque chemin doit rester dans le dépôt et chaque contenu doit correspondre à l’empreinte. |
| Dispatch de workflow | commande Spec Kit, paramètres, intégration choisie, résultat | `integration=copilot` cible Copilot ; un refus à la porte ne déclenche pas `implement`. |
| Preuve de validation | commande, état, date, prérequis et limite | Une absence de CLI ou d’authentification reste `NOT_RUN`. |

Les manifestes sont produits par Spec Kit, pas édités manuellement.
