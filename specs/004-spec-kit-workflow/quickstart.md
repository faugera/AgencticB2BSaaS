# Vérification — Fiabilisation du workflow Spec Kit

Depuis la racine du dépôt, sur Node 24 et pnpm 11.25.0 :

```sh
pnpm docs:test
pnpm docs:check
pnpm lint
```

Résultats attendus :

- Les tests acceptent le workflow conforme et détectent une étape manquante, un ordre
  incorrect, une barrière d'approbation absente et une commande de fusion/déploiement.
- Les tests détectent l'absence ou la divergence des skills projet dans l'une des
  intégrations.
- `docs:check` vérifie les liens, le routage documentaire et les empreintes des fichiers
  officiels sans réseau, la version de workflow et l'égalité des skills projet.
- La CI affiche les contrôles sous une étape de gouvernance/workflow documentaire.

Pour vérifier les prérequis d'une feature sans modifier le pointeur local :

```sh
SPECIFY_FEATURE_DIRECTORY=specs/004-spec-kit-workflow \
SPECIFY_FEATURE_NO_PERSIST=true \
bash .specify/scripts/bash/check-prerequisites.sh --json --paths-only
```

Sous PowerShell, définir les deux variables d'environnement dans le processus avant
d'appeler le script via Git Bash. Le résultat doit référencer les chemins absolus de
`spec.md`, `plan.md` et `tasks.md`, et le statut Git ne doit pas montrer `.specify/feature.json`
comme changement suivi.

La suite Spec Kit réellement orchestrée par Claude/Codex reste à vérifier dans chacune
des intégrations. Ce guide n'affirme pas que les portes statiques valident un appel réel au
moteur de workflow.

## Résultats réels

Date UTC : 2026-10-31. Révision de base : `b5cddb2a92a382a035f02aba61701ef3aa102864`
(modifications locales non commitées). Périmètre : workflow et registre Spec Kit, contrôle
documentaire/tests, guide et artefacts `specs/004-spec-kit-workflow/`, skills projet miroir.

| Statut | Contrôle | Preuve | Limite |
|---|---|---|---|
| PASS | `pnpm docs:test` | 18 tests réussis, aucun échec. | Tests unitaires locaux. |
| PASS | `pnpm docs:check` | Liens, structures, routage, empreintes et architecture valides. | Contrôle statique local. |
| PASS | `pnpm lint` | ESLint terminé sans erreur ni avertissement. | N'exécute pas le workflow Spec Kit. |
| PASS | `git diff --check` | Aucun problème d'espacement dans le diff. | Vérification du diff local. |
| PASS | Manifestes officiels Spec Kit | 12 fichiers Spec Kit, 10 Claude et 10 Codex ; aucune divergence SHA256. | Empreintes du checkout courant. |
| PASS | Analyse `speckit-analyze` | 12 FR et 5 SC couverts ; les deux écarts relevés ont été corrigés. | Analyse initiale après le début des changements, avant les corrections approuvées. |
| NOT_RUN | Exécution réelle via Claude et Codex | Non exécutée dans cette validation. | Les contrôles statiques ne certifient pas le moteur d'orchestration. |
| NOT_APPLICABLE | Gates UI, SQL, IAM et isolation tenant | Aucun code produit, UI, SQL ou autorisation modifié. | Ces domaines sont hors périmètre. |

Limite de séquencement : l'analyse initiale a eu lieu après le début des changements de cette
feature. Ses deux constats ont été corrigés après approbation ; la tâche T013 est désormais
placée avant l'implémentation pour les cycles suivants.
