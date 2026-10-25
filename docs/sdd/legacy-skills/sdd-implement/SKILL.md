---
name: sdd-implement
description: Implémenter une spec SDD shaped ou reprendre son implémentation, avec synchronisation documentaire et preuves des tâches.
---

1. Lire spec.md et tasks.md du changement demandé, puis
   `.specs/standards/index.yml` et `.specs/standards/workflow.md`.
   Appliquer la reprise asynchrone avant toute édition ; draft doit d'abord être shaped.
   Une archive exige un nouveau delta ; une spec verified modifiée revient à implementing.
2. Charger les standards applicables, examiner code/appelants/tests et état Git,
   puis passer shaped à implementing avant les modifications.
3. Exécuter les tâches restantes des groupes 1 à 5 en réutilisant l'existant,
   avec le plus petit diff complet. Actualiser les cases seulement après résultat observable.
4. Exécuter les vérifications applicatives de `.agents/skills/verify-change/SKILL.md`
   si du code change ; utiliser `.agents/skills/tenant-boundary/SKILL.md` pour SQL/IAM.
5. Analyser `.specs/standards/doc-sync-map.yml` et synchroniser les cibles réellement
   affectées. Une documentation required manquante rend l'implémentation incomplète.
6. Consigner preuves, décisions documentaires, blocages et prochaine action dans
   tasks.md ; examiner le diff et les changements concurrents avant synthèse.

Ne jamais promouvoir vers verified : cette responsabilité appartient à `$sdd-verify`.
