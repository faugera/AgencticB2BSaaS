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
7. Synchroniser les documents affectés via .specs/standards/doc-sync-map.yml,
   analyser les artefacts puis converger ; ne pas modifier une spec livrée historique.
