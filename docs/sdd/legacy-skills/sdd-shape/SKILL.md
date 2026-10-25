---
name: sdd-shape
description: Cadrer une évolution métier, de contrat ou de sécurité en spec Delta-First et tâches vérifiables avant implémentation.
---

1. Lire `.specs/standards/index.yml`, `.specs/standards/doc-sync-map.yml`,
   `.specs/standards/workflow.md`, `.specs/domains/product-map.md`.
2. Auditer le code pertinent, les appelants et tests ; sélectionner les standards
   via l'index et identifier les chemins exacts à réutiliser. Justifier chaque création.
3. Créer `.specs/changes/<YYYY-MM-DD>-<slug>/` depuis
   `.specs/changes/_template/spec.md` et `.specs/changes/_template/tasks.md`.
   Ne pas écraser un dossier existant ; reprendre sa spec si c'est le même changement.
4. Compléter les six sections, deltas ADDED/MODIFIED/REMOVED et GIVEN/WHEN/THEN,
   dont refus de sécurité applicables. Rendre les cinq groupes atomiques et vérifiables.
5. Compléter obligatoirement la section 6 et le groupe 5 via l'analyse sémantique
   du routage documentaire, même sans document impacté.
6. Résoudre les ambiguïtés bloquantes, vérifier les références et promouvoir de
   draft à shaped uniquement quand spec et tâches sont prêtes ; sinon rester draft.

Ne pas modifier le code applicatif ni implémenter la fonctionnalité.
