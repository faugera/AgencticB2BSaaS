# Tâches — <id de la spec>

Remplacer les entrées par des tâches atomiques avec résultat observable et méthode
de vérification. Conserver les cinq groupes ; justifier les groupes non applicables.
Ne cocher qu'après preuve. Contrat partagé : `.specs/standards/workflow.md`.

## Groupe 1 — Modèle de données et validation

- [ ] Définir le delta schémas/migrations/contraintes/validation/contrats et vérifier les cas invalides, ou justifier NOT_APPLICABLE.

## Groupe 2 — Backend et sécurité B2B

- [ ] Étendre les services/routes existants et démontrer autorisations, isolation tenant/workspace et portée des jobs concernés, ou justifier NOT_APPLICABLE.

## Groupe 3 — Frontend

- [ ] Étendre les composants existants, intégrer formulaires/états/feedback et vérifier fr/en et mobile/tablette/desktop, ou justifier NOT_APPLICABLE.

## Groupe 4 — Tests et vérifications

- [ ] Relier chaque GIVEN/WHEN/THEN à une preuve, dont cas négatifs applicables.
- [ ] Exécuter les tests unitaires/intégration/sécurité/E2E applicables avec les commandes réelles et enregistrer les résultats.
- [ ] Exécuter typecheck/lint/build et autres gates obligatoires selon le périmètre ; justifier les contrôles non applicables et signaler NOT_RUN.

## Groupe 5 — Auto-Documentation

- [ ] Analyser le routage documentaire et enregistrer chaque décision dans le tableau ci-dessous.
- [ ] Synchroniser chaque cible required réellement impactée, puis vérifier son contenu.
- [ ] Justifier chaque cible review laissée inchangée.
- [ ] Mettre à jour `.specs/domains/product-map.md` si le domaine fonctionnel évolue, sinon justifier l'absence d'impact.
- [ ] Vérifier cohérence code/spec/docs ; si aucune cible n'est impactée, en attester explicitement avec justification.

## Preuves et checkpoint de reprise

| Critère/contrôle | Commande ou méthode | PASS/FAIL/NOT_RUN/NOT_APPLICABLE | Résultat et preuve | Limite |
| --- | --- | --- | --- | --- |
| <contrôle> | <méthode> | NOT_RUN | <à produire> | <limite> |

| Document | Politique | UPDATED/REVIEWED_NO_CHANGE/NOT_APPLICABLE/MISSING | Justification et preuve |
| --- | --- | --- | --- |
| <chemin> | <politique> | <décision> | <preuve> |

- État Git et fichiers concernés : <état actuel>.
- Décisions : <arbitrages>.
- Blocages et vérifications manquantes : <liste ou aucun>.
- Prochaine action : <tâche restante>.
