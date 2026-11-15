# Tâches : Réconciliation de la sécurité B2B

## Phase 1 : Correctifs et preuves

- [x] T001 Reprendre l'isolation de l'annuaire et les réparations SQL additives sans toucher les migrations historiques.
- [x] T002 Propager les portées et les capacités, protéger les préférences et préserver le correctif de profil déjà fusionné.
- [x] T003 Associer les huit constats de revue à une preuve ou limite explicite.
- [x] T004 Vérifier types, lint, tests unitaires, documentation, sécurité et isolation sur la révision finale.
- [x] T005 Vérifier la reprise et les checksums dans une base jetable séparée.
- [x] T006 Confirmer l'historique des migrations des environnements non jetables avant de finaliser les noms et la livraison. — Décision D1 du 15 novembre 2026 : **gel** des noms 0016–0025 et **runbook de reprise** dans `docs/setup/private-pilot.md` (diagnostic, correspondance ancien→nouveau nom, vérification des empreintes, transaction de renommage, garde-fous). Aucun environnement non jetable n'a été inspecté : son historique reste `UNKNOWN`, et aucune migration appliquée n'a été modifiée.
