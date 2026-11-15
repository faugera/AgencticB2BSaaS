# Impact documentaire

Impact consolidé de la branche `codex/rattrapage-documentaire`, qui porte les specs
010 (rattrapage documentaire) et 011 (idempotence côté client). Le contrôle exige un
impact unique pour plusieurs specs dans le même diff.

| Règle | Cible | Statut | Motif |
|---|---|---|---|
| documentation-harness | docs/setup/spec-kit.md | REVIEWED_NO_CHANGE | Seule la portabilité du test change ; les commandes et le parcours Spec Kit documentés restent identiques. |
| documentation-harness | .specs/standards/workflow.md | REVIEWED_NO_CHANGE | Le contrat de workflow est inchangé ; la correction ne modifie ni les étapes ni les portes. |
| feature | docs/features-b2b.md | UPDATED | La ligne d'idempotence décrit désormais la clé envoyée par le client, sans changer la limite SMTP. |
| feature | .specs/domains/product-map.md | UPDATED | La limite « client web sans clé » disparaît ; la fiabilité des mutations reste bornée aux preuves disponibles. |
