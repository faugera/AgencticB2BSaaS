# Modèle de décision documentaire

## Routage (`.specs/standards/doc-sync-map.yml`)

Chaque règle possède un identifiant unique, une politique, une liste de motifs
`sources` relatifs au dépôt et des `targets` relatifs au dépôt. Les motifs
acceptent les chemins littéraux, `*` pour un segment et `**` pour toute suite de
segments. Ils ne peuvent être absolus ni contenir `..`.

## Artefact (`specs/<feature>/documentation-impact.md`)

Table Markdown avec une ligne pour chaque cible de chaque règle `required`
affectée par le diff :

| Règle | Cible | Statut | Motif |
|---|---|---|---|
| api | docs/architecture.md | UPDATED | Flux d'API documentés selon le contrat livré. |
| feature | docs/features-b2b.md | REVIEWED_NO_CHANGE | Aucun comportement métier ne change. |

`UPDATED` exige que la cible soit présente dans le diff ; son motif est une
description concise du contenu synchronisé. `REVIEWED_NO_CHANGE` et
`NOT_APPLICABLE` exigent une cible absente du diff et un motif non vide.

## Résolution du diff

`DOCS_SYNC_BASE` contient une révision Git valide. Les chemins comparés incluent
`git diff --name-only --diff-filter=ACDMRT <base>` (changements staged et
unstaged) et `git ls-files --others --exclude-standard` (nouveaux fichiers
locaux), normalisés avec des séparateurs `/`. En CI, le workspace checkouté
contient le commit testé ; le même contrôle compare la base PR/push à ces fichiers.
Un seul répertoire `specs/<feature>` peut être actif dans un même contrôle.
