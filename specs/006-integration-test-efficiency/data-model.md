# Modèle de couverture des tests d'intégration

| Suite | Sélection | Exécutée par | Statut |
|---|---|---|---|
| Authentification centrale | Intégrations sauf isolation | `pnpm test:auth:core` puis `pnpm verify:security` | CI |
| Isolation tenant | `isolation.integration.test.ts` seule | `pnpm verify:tenant-isolation` | CI, une fois |
| Suite complète | Tous les fichiers d'intégration | `pnpm test:auth` | Disponible localement et en CI si appelée |
| Préservation/rejeu | `migration-preservation.integration.test.ts` et flag dédié | Étape migration CI séparée | Base vide obligatoire |

La configuration existante contient huit fichiers d'intégration. L'exécution
complète inclut aussi le test conditionnel de préservation/rejeu, qui est ignoré
dans la base standard. Le dossier d'isolation comprend 15 scénarios. Après le
changement, aucun scénario ni fichier ne disparaît de la commande complète.

Les suites couvrent des frontières différentes. Une intégration appelée
« isolation » ne remplace pas la preuve des transactions métier, de l'identité,
des contrôles d'audit ou de la livraison SMTP. Les tests navigateur simulés ne
prouvent pas la persistance ou l'autorisation SQL.
