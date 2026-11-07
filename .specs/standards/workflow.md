# Workflow courant

Le workflow actif est [Spec Kit](../../docs/setup/spec-kit.md), gouverné par
[la constitution](../../.specify/memory/constitution.md). Spec, plan et tâches sont
obligatoires même pour docs et petites corrections. Aucun parcours direct sans spec.
Les anciens états draft/shaped/implementing/verified/archived ne concernent que
l'historique .specs/changes, conservé sans promotion rétroactive.

Toute modification analyse doc-sync-map.yml. La porte `verify-change` précède la
porte finale `review-convergence` ; exécuter la compétence avant de l'approuver.
`docs:check` compare les sources
des règles `required` au diff Git et exige une décision par cible dans
`specs/<feature>/documentation-impact.md` : `UPDATED` doit correspondre à une
cible modifiée ; `REVIEWED_NO_CHANGE` et `NOT_APPLICABLE` exigent un motif et
une cible non modifiée. Une base absente/invalide ou une décision manquante
bloque la validation. Charger les standards applicables ; préserver code et preuves concurrents.
Pour reprendre, lire spec/plan/tasks et checkpoint, comparer Git et les preuves réelles.
La vérification est proportionnée selon le skill verify-change ; une preuve manque
reste NOT_RUN et ne peut devenir PASS par une fusion. Après livraison, nouveau delta.
