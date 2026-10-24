# Contrat d'exécution SDD

Lire l'index avant de sélectionner les standards ; charger seulement ceux
applicables, avec B2B obligatoire pour backend, DB, IAM ou autorisation.
Le contrat est déclaratif, exécuté par Codex : aucun nouveau contrôle CI automatisé.

## États

Le frontmatter de `spec.md` contient `id` et `status` :
`draft → shaped → implementing → verified → archived`.

| État | Condition et responsable |
| --- | --- |
| draft | Spec en cours de cadrage |
| shaped | `$sdd-shape` a terminé les six sections et les tâches vérifiables |
| implementing | `$sdd-implement` travaille sur une spec shaped ou reprend une implémentation |
| verified | Seul `$sdd-verify` peut promouvoir, après preuves de tous les contrôles obligatoires |
| archived | Seul `$sdd-archive` peut promouvoir une spec verified, après consolidation et déplacement |

En cas d'échec ou vérification obligatoire bloquée : conserver `implementing`,
enregistrer les blocages. Une modification après `verified` invalide ses preuves :
revenir à `implementing` avant édition et refaire `$sdd-verify`. Une archive reste
historique : créer un nouveau delta pour l'évolution suivante.

## Reprise asynchrone

Lire `spec.md`, puis `tasks.md`, examiner état Git et diff. Comparer chaque case
cochée au code et aux preuves réelles ; décocher une tâche non démontrée et reprendre
les seules tâches restantes. Conserver dans `tasks.md` un checkpoint concis : fichiers,
décisions, preuves, limites, blocages, prochaine action. Ne pas dépendre de la mémoire du chat.

## Choix du parcours

Nouvelle fonctionnalité métier, contrat ou sécurité : workflow SDD complet avec
`.specs/changes/<YYYY-MM-DD>-<slug>/spec.md` et `tasks.md` (chemin futur).
Correction localisée, refactoring limité sans changement de contrat, documentation
ou UI mineure : parcours direct sans nouvelle spec. Dans les deux cas : standards
pertinents, analyse documentaire, synchronisation et vérifications proportionnées,
avec contrôles non exécutés explicitement signalés.

## Documentation et preuves

Toute modification exige une analyse sémantique de `doc-sync-map.yml`, même directe.
Pour chaque cible enregistrer chemin, politique, décision et justification :
`UPDATED`, `REVIEWED_NO_CHANGE`, `NOT_APPLICABLE`, `MISSING`.
Une cible required réellement impactée doit être synchronisée dans la même tâche/PR.
`REVIEWED_NO_CHANGE` exige une justification factuelle d'absence d'impact ; il ne
dispense pas d'une mise à jour requise. `MISSING` bloque la validation.
N'éditer aucun document artificiellement ; aucune entrée vide de changelog.

Dans `tasks.md` ou, en parcours direct, dans le compte rendu, consigner pour chaque
contrôle : commande/méthode, `PASS` / `FAIL` / `NOT_RUN` / `NOT_APPLICABLE`, résultat
observable, preuve et limite. Une commande non exécutée ne passe jamais.
Un test vert ne prouve que les critères qu'il couvre. Un contrôle obligatoire
`FAIL` ou `NOT_RUN` interdit `verified` ; justifier chaque `NOT_APPLICABLE`.
Pour le code, utiliser les gates existants de `.agents/skills/verify-change/SKILL.md`.
Pour docs seules, vérifier contenu, liens locaux, YAML, diff et portée ; ne pas
présenter ces contrôles comme une preuve runtime de sécurité.

## Git et archivage

Photographier l'état initial, préserver les modifications préexistantes, utiliser
une branche dédiée. Avant finalisation, consulter l'état actuel de la branche cible
distante (ou noter l'impossibilité), comparer et réconcilier les changements pertinents,
particulièrement `product-map.md` et `CHANGELOG.md`. Ne jamais écraser une modification
concurrente ni forcer une résolution destructive. Livraison par PR reviewable ;
pas de merge ou déploiement automatique.

L'archive conserve spec, tâches, preuves et décisions dans
`.specs/archive/<YYYY-MM-DD>-<slug>/` (créé au premier archivage). Consolider seulement
les documents concernés, vérifier la carte produit et proposer un standard seulement
si un pattern récurrent le justifie. Ne pas inventer de fonctionnalité en consolidant.
