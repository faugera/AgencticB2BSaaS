# Validation rapide : Synchronisation vérifiable de la documentation

## Prérequis

- Node 24, pnpm 11.25.0 et Git disponibles.
- La référence de base est disponible localement, par exemple `origin/main`.
- Le changement contient une spec active et son fichier `documentation-impact.md`
  si une règle `required` est affectée.

## Contrôle

PowerShell :

```powershell
$env:DOCS_SYNC_BASE = 'origin/main'
pnpm docs:test
pnpm docs:check
```

La CI définit le SHA de base depuis l'événement GitHub et récupère l'historique
complet. Le contrôle doit réussir uniquement lorsque chaque cible requise affectée
a une décision conforme. Pour tester les échecs, voir les tests unitaires
`scripts/docs-check.test.mjs` : décision absente, statut inconnu, motif vide,
cible `UPDATED` non modifiée et décision non-`UPDATED` pour une cible modifiée.

## Résultats attendus

- `pnpm docs:test` : tous les scénarios positifs et négatifs passent.
- `pnpm docs:check` : structure, liens, manifestes, synchronisation architecture
  et impact documentaire passent avec la base Git configurée.
- `pnpm lint` : scripts JavaScript valides.
- Toute base absente/invalide ou décision documentaire manquante produit un échec,
  jamais un succès de substitution.
