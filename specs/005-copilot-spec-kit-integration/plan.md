# Plan d’implémentation : Intégration de GitHub Copilot à Spec Kit

**Branche** : `faugera-analyse-depot` | **Date** : 2026-11-01 | **Spec** : [spec.md](spec.md)

## Résumé

Installer l’intégration Copilot officielle de Spec Kit 1.2.3 en mode skills, après revue des chemins générés, tout en conservant Codex comme défaut et l’installation Claude. Étendre les contrôles du dépôt aux fichiers du manifeste Copilot et documenter la différence entre commandes IDE et dispatch réel, qui exige Copilot CLI. Vérifier la construction de l’invocation et la porte d’approbation ; exécuter un parcours réel si le CLI est disponible et authentifié.

## Contexte technique

**Langage/Version** : Python 3.13 (CLI Spec Kit 1.2.3), JavaScript ESM (contrôles du dépôt).

**Dépendances principales** : CLI `specify` 1.2.3 déjà installé ; aucune dépendance du dépôt ajoutée.

**Stockage** : Fichiers générés et manifeste de l’intégration sous `.specify/integrations/`.

**Tests** : `specify integration status --json`, empreintes manifestes, `pnpm docs:test`, `pnpm docs:check`, `pnpm lint`; dispatch réel via Copilot CLI dans un environnement authentifié.

**Plateforme cible** : Windows local et Linux en CI ; la procédure d’installation force Git Bash (`--script sh`) pour rester cohérente avec l’installation existante.

**Type de projet** : Configuration Spec Kit et documentation d’un dépôt multi-package.

**Objectifs de performance** : Aucun.

**Contraintes** : Copilot est officiellement intégré au CLI mais sa déclaration `multi_install_safe` est fausse. L’utilisateur a explicitement autorisé `--force` après examen des destinations. Le mode Copilot skills est distinct du mode commandes et le CLI Copilot manque dans l’environnement au départ. Ne pas modifier les fichiers générés à la main.

**Périmètre** : Une installation officielle Copilot, les contrôles de workflow/manifeste, tests ciblés, documentation et preuves.

## Vérification de la constitution

- Réfléchir avant de coder : PASS — exigences, clarification, plan, recherche et tâches présents.
- Simplicité : PASS — adapter les vérifications déjà existantes, sans dépendance de projet.
- Frontières B2B : N/A — aucun code applicatif, IAM ou données tenant touchés.
- Preuves : PASS sous réserve de distinguer les tests statiques et le dispatch réel (`NOT_RUN` si prérequis absent).
- Contrats et documentation : PASS — mise à jour des instructions du workflow, sans modifier les fichiers gérés manuellement.
- Livraison : PASS — ne pas fusionner ni déployer automatiquement.

## Conception

Le CLI Copilot installe les skills sous `.github/skills/speckit-*/SKILL.md`; le mode demandé est `--skills`, explicite et cohérent avec `.specify/init-options.json`. Les fichiers doivent conserver leurs octets pour que les empreintes du manifeste restent valides sous Windows comme sous Linux : `.gitattributes` fixe leurs fins de ligne à LF. Le contrôle vérifie la présence de Copilot dans `installed_integrations`, le manifeste `.specify/integrations/copilot.manifest.json`, ses empreintes, et sa déclaration dans la liste d’intégrations du workflow. La fixture de contrôle représente les trois intégrations.

L’examen préalable des destinations a confirmé l’absence de `.github/skills`, `.github/hooks`, `.github/agents` et `.github/prompts`. `.vscode/settings.json` existe mais le mode skills ne le modifie pas. L’installation automatique peut créer les skills Copilot et le fichier de hooks natif ; Spec Kit suit ces fichiers dans son manifeste. L’installation ajoute Copilot sans changer le défaut Codex.

La documentation donne la commande d’installation, explique que `--force` est nécessaire uniquement parce que la déclaration officielle interdit l’installation multiple automatique, et indique que l’ajout ne bascule pas le défaut. Pour le lancement du workflow, le paramètre explicite `integration=copilot` appelle le CLI Copilot avec le prompt `/speckit-<commande>` en mode skills. Le CLI doit être installé et authentifié séparément.

## Structure du projet

```text
.github/skills/speckit-*/SKILL.md             # produits par le CLI, non édités manuellement
.gitattributes                                 # préserve les empreintes des skills sur Windows
.github/hooks/speckit.json                   # éventuel dispatcher natif produit par le CLI
.specify/integration.json                    # liste des intégrations installées, défaut Codex
.specify/integrations/copilot.manifest.json  # propriétaire et empreintes des fichiers Copilot
scripts/docs-check.mjs                       # contrôle manifeste/intégration Copilot
scripts/docs-check.test.mjs                  # tests positifs et régressifs
docs/setup/spec-kit.md                       # installation et exécution via Copilot
specs/005-copilot-spec-kit-integration/      # spécification, plan, recherche, modèle, tâches
```

**Décision de structure** : utiliser les artefacts versionnés gérés par le CLI et étendre les vérifications existantes ; ne pas créer un second mécanisme d’installation.

## Conception des validations

- Fixtures de contrôle avec manifeste Copilot valide, absent, versionné incorrectement ou avec empreinte modifiée.
- Test qu’une déclaration `copilot` absente du workflow échoue.
- Test du constructeur Copilot qui vérifie l’invocation `/speckit-specify` et les options de dispatch.
- Parcours d’installation réel sur le dépôt : `specify integration install copilot --script sh --integration-options="--skills" --force`, suivi de `specify integration status --json`.
- Parcours réel du workflow via `specify workflow run .specify/workflows/speckit/workflow.yml --input integration=copilot --input spec="..."`, uniquement avec CLI Copilot disponible/authentifié et un contexte jetable.
- Si le CLI Copilot reste indisponible, noter `NOT_RUN` pour l’exécution réelle ; ne pas présenter le test de l’adaptateur ou les tests statiques comme une exécution réelle.

## Hors périmètre et limites

- Remplacer Codex comme intégration par défaut.
- Migrer du mode skills vers le mode commandes ou modifier les paramètres VS Code.
- Installer Copilot CLI globalement ou modifier l’authentification de l’utilisateur.
- Exécuter un workflow réel dans le checkout de travail si cela peut créer des artefacts applicatifs non isolés.
- Modifier à la main les skills Copilot gérés par le manifeste.

## Complexité

Aucune nouvelle dépendance ou architecture de produit.
