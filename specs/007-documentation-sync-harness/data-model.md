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
`git diff --name-only --no-renames --diff-filter=ACDMRT <merge-base>` (changements
committés depuis la divergence, staged et unstaged) et
`git ls-files --others --exclude-standard` (nouveaux fichiers locaux), normalisés
avec des séparateurs `/`. `merge-base` est l’ancêtre commun de la base et `HEAD`,
ce qui exclut les changements ultérieurs de la branche de base. Sans détection de
renommage, les chemins source et destination sont tous deux conservés.
Les commandes Git utilisent le séparateur NUL (`-z`) afin de préserver les chemins
Unicode et les caractères qui seraient autrement échappés.
Le SHA nul d’un premier push est remplacé par l’arbre Git vide afin d’inspecter
tout le contenu suivi. Les règles `required` de la carte au merge-base sont unies
à celles de la carte courante pour qu’une suppression ou une rétrogradation ne
contourne pas les décisions documentaires. Un seul répertoire `specs/<feature>`
peut être actif dans un même contrôle.
