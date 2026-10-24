---
name: sdd-discover
description: Auditer les patterns récurrents du dépôt et maintenir les standards SDD lors d'une demande de découverte ou consolidation, sans modifier l'application.
---

1. Lire `.specs/standards/index.yml`, `.specs/standards/workflow.md` et
   `.specs/standards/doc-sync-map.yml` ; charger uniquement les standards concernés.
2. Examiner état Git, modifications récentes et fichiers de référence réels ;
   distinguer travail local, code livré, propositions et résultats runtime.
3. Comparer les conventions réutilisables aux standards existants ; ne pas créer
   de standard pour un pattern ponctuel. Modifier seulement les standards nécessaires.
4. Actualiser les entrées id/path/summary/when_to_load de l'index et synchroniser
   uniquement la documentation technique affectée par les constats.
5. Vérifier chemins, cohérence et diff ; rapporter preuves et inconnues selon le workflow.

Ne pas modifier le code applicatif ni déclencher cette découverte après chaque
feature. Ne pas modifier un statut de spec dans ce workflow.
