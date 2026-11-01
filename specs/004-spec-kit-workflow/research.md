# Recherche — Fiabilisation du workflow Spec Kit

## Décisions

### Workflow déclaratif local

- **Décision** : étendre `.specify/workflows/speckit/workflow.yml` et conserver les
  portes de revue offertes par sa syntaxe existante.
- **Rationale** : c'est l'unique workflow projet présent ; les gates `type: gate`,
  options et `on_reject: abort` y sont déjà employés. Le dépôt ne contient pas de
  documentation d'un moteur de branchement conditionnel supplémentaire.
- **Alternatives** : ajouter des branches conditionnelles YAML non vérifiées ou créer
  un nouveau moteur de workflow ; ces solutions supposeraient un contrat absent du dépôt.

### Clarification sans embranchement conditionnel

- **Décision** : appeler `clarify` dans l'ordre normal ; ce skill est conçu pour déclarer
  qu'aucune clarification matérielle n'est nécessaire.
- **Rationale** : évite une syntaxe conditionnelle spéculative et garde le chemin
  reproductible.
- **Alternatives** : omettre l'étape ou inventer un champ de condition non documenté ;
  les deux risquent de réintroduire l'omission ou l'incompatibilité.

### Contrôle de configuration dans les gates documentaires

- **Décision** : compléter `scripts/docs-check.mjs` et ses tests existants ; la CI les
  exécute déjà via `pnpm docs:test` et `pnpm docs:check`.
- **Rationale** : aucun parseur YAML n'est déclaré comme dépendance ; les contrôles
  documentaires utilisent déjà un sous-ensemble YAML explicite et sans réseau.
- **Alternatives** : installer un parseur ou un runner distinct ; coût inutile pour la
  forme simple de cette seule définition.

### Pointeur de feature

- **Décision** : le choix explicite `SPECIFY_FEATURE_DIRECTORY` est documenté pour les
  checkouts neufs ; les analyses read-only ajoutent `SPECIFY_FEATURE_NO_PERSIST=true`.
- **Rationale** : le script Spec Kit donne priorité à la variable et expose déjà le mode
  sans persistance ; le pointeur est volontairement ignoré par Git.
- **Alternatives** : suivre ce pointeur en Git ou dériver la feature de la branche ;
  incompatibles avec son caractère local et sa stabilité au changement de branche.

### Skills des intégrations

- **Décision** : ajouter les deux skills projet dans `.claude/skills` comme copies exactes
  des sources `.agents/skills`, tout en laissant les manifestes des skills officiels
  inchangés.
- **Rationale** : les intégrations découvrent leurs skills dans des répertoires distincts.
- **Alternatives** : renvoyer Claude vers `.agents/skills` sans garantir sa découverte,
  ou modifier des fichiers officiels gérés.

## Limites de preuve

L'inspection confirme la syntaxe des gates dans le workflow déjà versionné, pas le
comportement d'exécution de chaque intégration Spec Kit. Le contrôle automatisé doit
rester un vérificateur du contrat local, sans prétendre certifier le moteur distant.
