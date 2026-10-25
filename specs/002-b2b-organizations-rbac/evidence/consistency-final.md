# Analyse et convergence — 25 octobre2026

Préconditions Spec Kit vérifiées : spec/plan/tasks, constitution et contrats présents.
Aucun hook extension configuré. Aucun arbitrage produit restant ; dernière décision
noms inconnus traduite en noms nullable à invitation et PUT complet strict.

| Exigences | Code / preuve actuelle | Tâches |
| --- | --- | --- |
| FR-001/002 | Organisation cliente distincte, memberships composites ; SQL13 et HTTP5 | T005/T007/T009 |
| FR-003/004 | Active-only, organisation-admin transversal audité, refus client étranger | T005/T006/T010 |
| FR-005..008 | Pyramide, rôles cumulables exacts, catalogue gardé, confirmation et dernier admin | T005/T007/T013/T014 |
| FR-009 | Interfaces et scopes, FR/EN, focus mobile, catalogue global sans fausse erreur | T008/T015/T018 |
| FR-010..012 | Profil SDK canonique, identité invitée sans noms fabriqués, préférences/emploi tenant | T004/T013 |
| FR-013/014 | Metadata/slugs tenant/workspace sans paiement ni comportement archivage | T004 |
| FR-015/016 | Journal unique/archive, RLS, rollback/backfill/rejeu dates et IDs conservés | T006/T010 |
| FR-017 |65intégrations,15isolation,1reprise,4parcoursSMTP réels ; mocks distingués | T009/T010 |
| FR-018 | Docs, standards, runbook, CI reprise et registre ; contre-revue/PR encore en cours | T011/T012/T016/T017 |

Première revue : recherches obsolètes, noms issus d'email et catalogue trop ouvert
ont été relevés puis corrigés avec tests. La revue visuelle a également isolé un défaut
clavier réel malgré la possibilité de défilement manuel : test rouge puis correction
viewport ciblée et test vert. Ces corrections sont traçables T013–T018, sans réécriture
des exigences historiques ni extension du périmètre.

Les rapports FAIL précédents sont conservés comme étapes de revue ; ils ne constituent
pas un verdict final. La revue finale doit vérifier les corrections et pointer son SHA.
Aucune spec historique livrée modifiée ; aucune preuve production inférée des tests.
