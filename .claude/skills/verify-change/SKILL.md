---
name: verify-change
description: Vérifier un changement selon son impact et produire des preuves honnêtes.
---

1. Lire AGENTS.md, la constitution commune et spec/plan/tasks du changement.
2. Examiner code, appelants et tests ; ne pas élargir le périmètre pour rendre un gate vert.
3. Docs seules : pnpm docs:test et pnpm docs:check ; contrôler diff et liens.
   Outillage JS/CI : ajouter son test ciblé et pnpm lint. Code applicatif : pnpm verify.
4. UI modifiée : vérifier les contrats concernés par les tests disponibles ; signaler
   que les parcours, le clavier et le responsive ne sont plus couverts par navigateur.
5. Auth, SQL ou autorisation modifiés : pnpm verify:security et
   pnpm verify:tenant-isolation avec PostgreSQL jetable explicitement configuré. Ne pas lire de fichiers privés ni migrer une DB de développement.
6. Consigner commande, date, révision/périmètre, PASS/FAIL/NOT_RUN/NOT_APPLICABLE,
   résultat, preuve et limite. Un gate obligatoire absent bloque la validation ;
   UI simulée et anciens rapports ne prouvent pas une autorisation serveur actuelle.
7. Résoudre le diff contre la base PR/push. En local, définir
   `DOCS_SYNC_BASE=origin/main` (ou le SHA de base disponible), puis exécuter
   `pnpm docs:check`. Une base absente/invalide ou une décision manquante est un
   échec, jamais `NOT_APPLICABLE`.
8. Pour toute règle `required` affectée dans `.specs/standards/doc-sync-map.yml`,
   mettre à jour chaque cible ou inscrire une ligne par cible dans
   `specs/<feature>/documentation-impact.md` : `UPDATED` exige la cible dans le
   diff ; `REVIEWED_NO_CHANGE` et `NOT_APPLICABLE` exigent une cible non modifiée
   et un motif. Utiliser les colonnes exactes `Règle | Cible | Statut | Motif`.
   Le fichier de décision doit lui-même apparaître dans le diff.
9. Exécuter `verify-change` avant la porte finale `review-convergence` du workflow ;
   la convergence seule ne certifie pas la synchronisation documentaire. Ne pas
   modifier une spec livrée historique.
