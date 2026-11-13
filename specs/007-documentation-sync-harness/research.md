# Recherche : Synchronisation vérifiable de la documentation

## Différencier intention et preuve

- **Décision** : comparer les chemins modifiés du PR avec les motifs sources des
  règles documentaires et exiger une décision par cible.
- **Rationale** : les statuts actuels de `doc-sync-map.yml` décrivent les cibles
  mais ne permettent pas de déterminer automatiquement si une règle est touchée.
- **Alternatives considérées** : demander une décision pour toutes les règles
  sur chaque changement (trop bruyant) ; inférer seulement depuis le nom des
  commits (non fiable).

## Conserver les décisions avec la feature

- **Décision** : enregistrer les résultats dans
  `specs/<feature>/documentation-impact.md`.
- **Rationale** : Spec Kit impose déjà une spec par changement ; l'évaluation
  devient traçable et ne pollue pas un fichier global avec l'état du dernier PR.
- **Alternatives considérées** : commentaire PR (non versionné et non rejouable) ;
  manifeste global (écrasement/concurrence et état périmé).

## Définir les frontières des changements

- **Décision** : `DOCS_SYNC_BASE` est un SHA Git, requis par le CLI. La CI le
  renseigne depuis l'événement PR ou push ; le développeur le fournit localement
  si `origin/main` n'est pas disponible.
- **Rationale** : un changement de base implicite ou une absence de fetch pourrait
  transformer un contrôle non exécuté en succès.
- **Alternatives considérées** : profondeur checkout par défaut (base absente
  pour certains événements) ; ignorer le contrôle localement (faux succès).

## Éviter la dérive du code de contrôle

- **Décision** : réutiliser le parseur restreint existant de `doc-sync-map.yml`
  et ne prendre en charge que des motifs relatifs simples.
- **Rationale** : le dépôt documente et teste déjà un sous-ensemble YAML réduit ;
  un nouveau parseur/dépendance n'est pas nécessaire.
- **Alternatives considérées** : ajouter un parseur YAML complet (nouvelle
  dépendance et élargissement de format non requis).
