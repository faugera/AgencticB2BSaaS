---
name: sdd-verify
description: Vérifier une implémentation SDD par preuves techniques, métier, sécurité et documentation avant de la promouvoir vers verified.
---

1. Lire spec.md, tasks.md, `.specs/standards/index.yml`,
   `.specs/standards/workflow.md` et les standards applicables. Examiner état Git,
   diff et code actuel ; appliquer le protocole de reprise. Ne pas valider une draft,
   une spec shaped non implémentée ou une archive.
2. Vérifier chaque GIVEN/WHEN/THEN et tâche cochée, dont les refus tenant/workspace
   et RBAC applicables. Une session UI simulée ne prouve pas une autorisation serveur.
3. Exécuter les commandes réelles adaptées aux critères ; pour code applicatif,
   suivre `.agents/skills/verify-change/SKILL.md`. Ne pas migrer une DB non jetable.
4. Comparer le delta à `.specs/standards/doc-sync-map.yml` et vérifier chaque cible
   required ; examiner la carte produit et la cohérence code/spec/docs.
5. Inscrire dans tasks.md le rapport de preuves du workflow : chaque contrôle porte
   commande/méthode, PASS/FAIL/NOT_RUN/NOT_APPLICABLE, résultat observable, preuve
   et limite. Chaque document porte UPDATED/REVIEWED_NO_CHANGE/NOT_APPLICABLE/MISSING
   avec justification. Aucun résultat inventé, aucune commande non exécutée en PASS.
6. Seul ce skill promeut implementing à verified si tous les critères et contrôles
   obligatoires sont satisfaits et aucune cible obligatoire n'est MISSING.
   En échec ou environnement bloqué, conserver/revenir à implementing et enregistrer
   les vérifications manquantes. Un test passant ne démontre pas un critère non couvert.

Ne pas élargir le périmètre pour rendre le rapport vert ; corriger via l'implémentation
et revérifier les preuves devenues obsolètes.
