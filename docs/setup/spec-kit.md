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
1. Codex : $speckit-specify ; Claude : /speckit-specify. Décrire résultat, limites et critères.
2. Clarify uniquement si un arbitrage manque ; les décisions acquises restent acquises.
3. Speckit-plan puis speckit-tasks : approche réutilisant le code, tâches traçables.
4. Speckit-checklist selon le risque ; examiner la qualité des exigences, pas leur implémentation.
5. Speckit-analyze : analyse en lecture seule, résoudre les contradictions bloquantes.
6. Speckit-implement : tâches et preuves ; suivre les deux skills projet applicables.
7. Speckit-converge : rechercher le travail restant ; compléter puis reconverger si nécessaire.
8. PR reviewable ; pas de merge ni déploiement automatique.

Ces noms désignent des skills exécutés par l'assistant, pas des commandes shell.
L'agent peut enchaîner dans le périmètre approuvé sans autorisation répétée. Les arbitrages
bloquants, opérations destructives non autorisées et élargissements exigent une question.
Les contraintes de checklist des skills officiels restent applicables.
Spec, plan et tâches sont requis même pour une correction locale ou documentaire ; garder
ces artefacts courts et les tests proportionnés. Aucun ancien parcours direct ne subsiste.

## État, reprise et conservation
Les nouvelles features vivent dans specs, avec spec.md, plan.md et tasks.md.
Statuts projet : Draft (cadrage), In Progress (travail/preuves), Complete (critères démontrés).
Le pointeur .specify/feature.json est local et ignoré ; changer de branche ne le change pas.
Sur un checkout neuf, définir explicitement SPECIFY_FEATURE_DIRECTORY vers la feature avant
les commandes. Ne pas partager un chemin absolu propre à une machine.
Conserver un checkpoint : objectif, tâches restantes, décisions, état Git, résultats,
révision/périmètre couvert et limites. PASS/FAIL/NOT_RUN/NOT_APPLICABLE sont distincts.
Après livraison, conserver les artefacts comme historique et créer une nouvelle feature.
Les dossiers legacy ne sont ni reformattés ni promus implicitement :
[registre de réconciliation](../sdd/legacy-reconciliation.md).

## Sources de vérité et documentation
- Constitution : principes ; AGENTS.md : navigation ; CLAUDE.md : renvoi commun.
- Docs spécialisées et carte produit : état courant ; specs livrées : histoire du changement.
- Fichiers officiels : gérés par Spec Kit, aucune personnalisation en place.
- Deux skills projet : vérification selon impact et frontières tenant.
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
et l'intégrité des fichiers des deux intégrations. Il ne télécharge aucun lien externe,
ne contrôle pas les ancres, ne lit aucun fichier privé et ne prouve pas la cohérence métier.
Les preuves datées, anciens skills et anciennes specs sont exclus des nouvelles exigences.
Les fichiers YAML ciblés utilisent nos formes simples path et targets sur une ligne ;
le contrôle n'est pas un parseur YAML général. Toute évolution de ce format exige ses tests.
Docs seules : contrôles docs. Outillage : tests ciblés et lint. Produit : pnpm verify ;
UI et SQL/IAM ajoutent leurs gates selon verify-change. Aucun gate obligatoire absent
ne devient PASS ; une raison explicite est requise pour NOT_APPLICABLE.

## Mises à jour
Créer une PR dédiée pour changer de version. Installer la version exacte via uv, utiliser
specify integration upgrade codex puis claude, examiner les changements et refaire status,
docs:test et docs:check. Ne pas écraser un fichier local modifié avec --force sans examen.
Mettre à jour ensemble version documentée, intégrations, scripts et manifestes. Aucune
mise à jour automatique ou extension Git additionnelle ; conserver les branches codex/.
