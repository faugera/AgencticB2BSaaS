---
name: sdd-archive
description: Consolider et archiver un delta SDD verified en conservant ses décisions et preuves, sans modifier l'application.
---

1. Lire spec.md, tasks.md et `.specs/standards/workflow.md` ; exiger verified et
   des preuves encore valables pour le diff courant. Refuser toute spec incomplète.
2. Comparer le delta implémenté à `.specs/domains/product-map.md`, aux documents
   concernés et à `.specs/standards/doc-sync-map.yml` ; consolider les seuls écarts réels.
3. Vérifier la branche cible et réconcilier les changements documentaires concurrents,
   notamment carte produit et changelog, sans écrasement destructeur.
4. Proposer l'extraction d'un standard via `$sdd-discover` seulement si un pattern
   récurrent le justifie ; ne pas déclencher automatiquement une nouvelle découverte.
5. Déplacer le dossier entier vers `.specs/archive/<YYYY-MM-DD>-<slug>/`, créé au
   premier usage. Refuser une destination existante ; préserver décisions, tâches
   et preuves, corriger les liens relatifs affectés, puis passer status à archived.
6. Vérifier liens, statut et diff ; rapporter le chemin d'archive et les limites.

Seul ce skill promeut vers archived. Ne pas modifier le code applicatif ni supprimer
l'historique des décisions ; une évolution ultérieure exige un nouveau delta.
