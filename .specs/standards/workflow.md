# Workflow courant

Le workflow actif est [Spec Kit](../../docs/setup/spec-kit.md), gouverné par
[la constitution](../../.specify/memory/constitution.md). Spec, plan et tâches sont
obligatoires même pour docs et petites corrections. Aucun parcours direct sans spec.
Les anciens états draft/shaped/implementing/verified/archived ne concernent que
l'historique .specs/changes, conservé sans promotion rétroactive.

Toute modification analyse doc-sync-map.yml : UPDATED, REVIEWED_NO_CHANGE,
NOT_APPLICABLE ou MISSING avec justification. MISSING bloque une cible required affectée.
Charger les standards applicables ; préserver code et preuves concurrents.
Pour reprendre, lire spec/plan/tasks et checkpoint, comparer Git et les preuves réelles.
La vérification est proportionnée selon le skill verify-change ; une preuve manque
reste NOT_RUN et ne peut devenir PASS par une fusion. Après livraison, nouveau delta.
