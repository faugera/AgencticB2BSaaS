# Maintenance du schéma d'architecture

La vue versionnée [architecture.html](../architecture.html) décrit le code de la
révision courante, pas une base déployée. Sur une branche de PR, elle décrit cette
branche ; elle ne décrit `main` qu'après fusion. Les représentations sont simplifiées :
les sources de vérité restent [architecture.md](../architecture.md),
[data-model.md](../data-model.md) et les migrations SQL.

## Workflow

1. Lors d'un changement d'architecture, de données ou de sécurité, consulter le
   schéma et les règles de [routage documentaire](../../.specs/standards/doc-sync-map.yml).
2. Mettre à jour le dessin si les composants, flux, relations ou limites représentés
   changent. Si le changement n'affecte pas la vue, le noter dans la PR.
3. Après revue du dessin par rapport aux sources, exécuter :

   ```sh
   node scripts/architecture-sync.mjs --reviewed
   pnpm docs:test
   pnpm docs:check
   ```

4. Inclure le manifeste et, si nécessaire, le dessin dans la même PR. La CI exécute
   ces contrôles. La commande de confirmation ne vérifie pas l'exactitude du dessin.

Le contrôle compare des empreintes normalisées des deux documents de référence et
de tous les fichiers SQL du dossier migrations : ajout, suppression et modification
sont signalés. Une différence déclenche une **revue humaine**, pas une régénération
automatique. Un changement d'un autre fichier peut aussi nécessiter une mise à jour :
le routage documentaire et la revue de PR restent nécessaires. Une empreinte à jour
ne démontre ni cohérence sémantique ni état de production.

Le fichier local ouvert auparavant redirige vers la copie versionnée dans ce checkout.
Ce raccourci propre à la machine n'est pas suivi dans Git ; sur une autre machine,
ouvrir directement `docs/architecture.html`.
