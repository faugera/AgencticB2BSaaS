# Recherche : Intégration de GitHub Copilot à Spec Kit

## Décision : utiliser la clé officielle `copilot` de Spec Kit 1.2.3

- **Preuve** : `specify integration list --catalog` décrit Copilot comme une intégration intégrée (`built-in`) v1.0.0 ; `specify integration info copilot` donne le dépôt officiel `github/spec-kit`.
- **Sources** : [guide Copilot Spec Kit 1.2.3](https://github.com/github/spec-kit/blob/v1.2.3/docs/integrations/copilot.md), [guide installation](https://github.com/github/spec-kit/blob/v1.2.3/docs/installation.md).
- **Raison** : la version utilisée par le dépôt inclut officiellement l’adaptateur Copilot, en mode IDE et CLI.
- **Alternatives écartées** : ajouter une intégration personnalisée ou un adaptateur communautaire serait redondant et augmenterait le périmètre de confiance.

## Décision : installer en mode skills sans changer le défaut

- **Preuve** : le guide Copilot indique que les skills sont le mode par défaut et sont écrits sous `.github/skills/speckit-*/SKILL.md`; en mode skills les commandes sont invoquées sous `/speckit-<commande>`. L’installation d’une seconde intégration ne modifie pas le défaut.
- **Source** : [intégrations CLI Spec Kit 1.2.3](https://github.com/github/spec-kit/blob/v1.2.3/docs/integrations/cli.md).
- **Raison** : le dépôt a déjà activé les skills et utilise Codex comme défaut ; le changement demandé ajoute Copilot sans retirer les autres intégrations.
- **Alternative écartée** : le mode commandes (`.agent.md`, `.prompt.md`, VS Code settings) est mutuellement exclusif avec le mode skills et n’est pas nécessaire ici.

## Décision : appliquer `--force` uniquement après inspection des destinations

- **Preuve** : le catalogue affiche `Multi-install safe: no` pour Copilot. La documentation partagée indique que les intégrations non déclarées compatibles exigent `--force`; les installations échouées sont annulées. L’inspection du checkout n’a trouvé aucune destination Copilot existante dans `.github/skills`, `.github/hooks`, `.github/agents` ou `.github/prompts`. Le mode skills ne touche pas le `.vscode/settings.json` existant.
- **Source** : [guide Copilot](https://github.com/github/spec-kit/blob/v1.2.3/docs/integrations/copilot.md), [règles multi-install](https://github.com/github/spec-kit/blob/v1.2.3/docs/integrations/cli.md#can-i-install-multiple-integrations-in-the-same-project).
- **Raison** : l’utilisateur a explicitement choisi l’installation parallèle avec force après vérification de conflits.
- **Alternative écartée** : `switch` remplacerait le défaut actif et ne répondrait pas à l’intention de préserver Codex et Claude.

## Décision : séparer disponibilité IDE et exécution du moteur

- **Preuve** : le guide Copilot dit que l’installation IDE ne nécessite pas de CLI, mais que l’exécution des étapes de workflow requiert Copilot CLI. L’implémentation du CLI construit `copilot -p "<prompt>"`, ajoute `--output-format json` en mode non-streaming, et ajoute `--yolo` par défaut, désactivable par `SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0`.
- **Source** : [guide Copilot](https://github.com/github/spec-kit/blob/v1.2.3/docs/integrations/copilot.md), [source de l’adaptateur Copilot livré avec le CLI](https://github.com/github/spec-kit/tree/v1.2.3/src/specify_cli/integrations/copilot).
- **Raison** : le support officiel peut être installé et testé statiquement sans confondre cela avec un dispatch réel.
- **État du poste** : l’exécutable `copilot` n’est pas dans le PATH. Il ne faut donc pas déclarer un test réel réussi sans installation/authentification séparée.
