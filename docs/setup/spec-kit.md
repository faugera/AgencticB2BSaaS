# Spec Kit : contrat de travail

## Installation reproductible
Spec Kit 1.2.3 est figé pour Codex et Claude Code. Source officielle :
[release v1.2.3](https://github.com/github/spec-kit/releases/tag/v1.2.3).
Le paquet installé a été comparé au wheel officiel PyPI : 377 fichiers identiques ;
SHA256 945ad1cdfddf3e5cf138259827564af4b41c4ade053e16a4222f1589248d0eaa.
L'infrastructure et les skills gérés sont versionnés ; aucun CLI Python n'est requis
pour pnpm docs:check en CI. Python/uv et Git Bash servent aux commandes Spec Kit locales.

~~~sh
uv tool install specify-cli==1.2.3
specify version
specify integration status
~~~

Le dépôt est déjà initialisé. Ne pas relancer init avec --force pour un travail courant.
Sur un nouveau dépôt seulement : init --here --integration codex avec
--integration-options="--skills" et --script sh, puis integration install claude --script sh.
Les scripts Bash fonctionnent sous Git Bash Windows et Linux. Les intégrations lisent
la même [constitution](../../.specify/memory/constitution.md). Les conventions détaillées
se chargent depuis [l'index](../../.specs/standards/index.yml), pas en recopiant les règles.

## Parcours obligatoire pour tout changement
1. `specify` crée les critères et scénarios ; revue explicite de la spec.
2. `clarify` vérifie les ambiguïtés ; il ne pose aucune question si la spec est déjà claire.
   Revue des clarifications avant de continuer.
3. `plan`, puis revue du plan ; exécuter manuellement `checklist` à cet endroit uniquement
   si le risque justifie une revue qualité séparée des exigences. Cette action est hors du
   workflow automatisé, qui ne documente pas de branchement conditionnel.
4. `tasks` produit la couverture et les dépendances ; revue des tâches.
5. `analyze` vérifie spec/plan/tâches en lecture seule et repère les contradictions bloquantes.
6. Après revue de l'analyse, approbation explicite obligatoire avant `implement`.
7. `converge` évalue le code par rapport aux artefacts, ajoute les tâches restantes et
   s'arrête après revue. Aucun merge ou déploiement automatique.
8. Préparer une PR reviewable séparément ; aucune PR n'est créée automatiquement par ce cycle.

Ces noms désignent des skills exécutés par l'assistant, pas des commandes shell.
L'approbation d'une étape ne valide pas les étapes futures ; l'approbation de l'analyse
autorise le démarrage de l'implémentation uniquement dans le périmètre validé. Les arbitrages
bloquants, opérations destructives non autorisées et élargissements exigent une question.
Les checklists sont des contrôles de qualité des exigences, pas des tests de l'implémentation.
Spec, plan et tâches sont requis même pour une correction locale ou documentaire ; garder
ces artefacts courts et les tests proportionnés. Aucun ancien parcours direct ne subsiste.

## État, reprise et conservation
Les nouvelles features vivent dans specs, avec spec.md, plan.md et tasks.md.
Statuts projet : Draft (cadrage), In Progress (travail/preuves), Complete (critères démontrés).
Le statut et les tâches d'une spec livrée décrivent son historique ; ils ne prouvent pas
l'état opérationnel actuel et ne doivent pas être réécrits rétroactivement. Pour le travail
courant, consulter les preuves datées, les changements Git et le statut de la PR applicable.

Le pointeur `.specify/feature.json` est propre au checkout, ignoré par Git, et n'est pas
mis à jour quand on change de branche. Un nouveau worktree ne le possède pas forcément ;
un ancien peut le conserver après un changement de feature. Sélectionner explicitement la
feature active dans les commandes plutôt que de se fier à un état implicite :

~~~sh
SPECIFY_FEATURE_DIRECTORY=specs/004-spec-kit-workflow \
SPECIFY_FEATURE_NO_PERSIST=true \
bash .specify/scripts/bash/check-prerequisites.sh --json --paths-only
~~~

Sous PowerShell, définir `$env:SPECIFY_FEATURE_DIRECTORY` et
`$env:SPECIFY_FEATURE_NO_PERSIST` avant l'appel à Git Bash. `SPECIFY_FEATURE_NO_PERSIST=true`
est important pour un contrôle read-only : sans cette option, une résolution à partir de
`SPECIFY_FEATURE_DIRECTORY` peut créer ou actualiser `.specify/feature.json`. Pour un cycle
de travail normal, le pointeur local peut rester utilisé ; pour changer de feature, fournir
le nouveau chemin explicitement ou relancer `specify` dans le contexte voulu. Ne jamais
partager un chemin absolu propre à une machine.

Conserver un checkpoint : objectif, tâches restantes, décisions, état Git, résultats,
révision/périmètre couvert et limites. PASS/FAIL/NOT_RUN/NOT_APPLICABLE sont distincts.
Après livraison, conserver les artefacts comme historique et créer une nouvelle feature.
Les dossiers legacy ne sont ni reformattés ni promus implicitement :
[registre de réconciliation](../sdd/legacy-reconciliation.md).

## Sources de vérité et documentation
- Constitution : principes ; AGENTS.md : navigation ; CLAUDE.md : renvoi commun.
- Docs spécialisées et carte produit : état courant ; specs livrées : histoire du changement.
- Fichiers officiels : gérés par Spec Kit, aucune personnalisation en place.
- Les skills projet `tenant-boundary` et `verify-change` sont disponibles dans
  `.agents/skills` pour Codex et `.claude/skills` pour Claude ; les copies doivent rester
  identiques. Ils ne font pas partie des fichiers officiels gérés.
Analyser le routage documentaire pour chaque changement ; justifier les documents non
modifiés. Les mentions de PR locales et preuves anciennes ne sont pas un statut courant.
Les contenus projet sont français ; conserver les identifiants et fichiers officiels anglais.

## Contrôle léger et limites
~~~sh
pnpm docs:test
pnpm docs:check
~~~
Le contrôle inspecte les liens Markdown locaux inline et par référence, hors blocs de code,
les chemins path/targets du routage YAML, les sections et statuts des nouvelles specs,
la cohérence des étapes/gates Spec Kit, la parité des skills projet et l'intégrité des
fichiers officiels des deux intégrations. Il ne télécharge aucun lien externe,
ne contrôle pas les ancres, ne lit aucun fichier privé et ne prouve pas la cohérence métier.
Les preuves datées, anciens skills et anciennes specs sont exclus des nouvelles exigences.
Les fichiers YAML ciblés utilisent des formes simples prises en charge ; le contrôle n'est
pas un parseur YAML général. Toute évolution de ce format exige ses tests.
Docs seules : contrôles docs. Outillage : tests ciblés et lint. Produit : pnpm verify ;
UI et SQL/IAM ajoutent leurs gates selon verify-change. Aucun gate obligatoire absent
ne devient PASS ; une raison explicite est requise pour NOT_APPLICABLE.

## Mises à jour
Créer une PR dédiée pour changer de version. Installer la version exacte via uv, utiliser
specify integration upgrade codex puis claude, examiner les changements et refaire status,
docs:test et docs:check. Ne pas écraser un fichier local modifié avec --force sans examen.
Mettre à jour ensemble version documentée, intégrations, scripts et manifestes. Aucune
mise à jour automatique ou extension Git additionnelle ; conserver les branches codex/.
