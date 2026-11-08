# Recherche : Exécutions d'intégration essentielles

## Décisions

### Écarter le lancement redondant de l'isolation

- **Décision** : ajouter une commande de suite centrale sans
  `isolation.integration.test.ts` et la faire utiliser par `verify:security`.
- **Rationale** : le workflow CI possède déjà une étape `verify:tenant-isolation`
  qui lance précisément ce fichier. La suite actuelle exécutée par
  `verify:security` comprend également tous les fichiers `*.integration.test.ts`.
- **Preuve observée** : `vitest.auth.config.ts` inclut tous les fichiers
  `apps/api/src/**/*.integration.test.ts`; le script `verify:security` lance
  `pnpm test:auth`; la CI lance ensuite `pnpm verify:tenant-isolation`.
- **Alternatives** :
  - Retirer l'étape dédiée d'isolation : rejeté, car cela retire une porte visible
    et ciblée sans économiser de couverture ailleurs.
  - Supprimer des scénarios qui se ressemblent : rejeté, car la similitude de leur
    intitulé ne prouve pas l'équivalence des contrôles SQL, HTTP et RLS.
  - Réduire les limites de tests unitaires ou navigateur : hors périmètre et sans
    lien avec le doublon observé.

### Préserver la suite complète et les bases séparées

- **Décision** : ne pas changer `test:auth`, `verify:tenant-isolation`, ni la
  commande dédiée à la préservation des migrations.
- **Rationale** : les développeurs gardent une commande exhaustive ; la CI conserve
  chaque scénario distinct, ainsi que l'ordre et les bases dédiées de migration.
- **Limite** : Vitest sélectionne des fichiers, pas la preuve de chaque assertion.
  Les commandes PostgreSQL doivent continuer à réussir sur leur infrastructure
  éphémère.

### Interprétation du coût

- **Décision** : mesurer le nombre de relances CI de la suite d'isolation et
  distinguer ce coût de calcul des tokens IA.
- **Rationale** : l'exécution locale des tests n'envoie pas de tokens à un modèle.
  La réduction ici concerne le temps et les ressources CI ainsi que le bruit
  d'exécution.
- **Alternatives** : supprimer du code de test pour diminuer le contexte des agents
  a été écarté tant qu'une couverture équivalente n'est pas démontrée.
