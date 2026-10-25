# Réconciliation des chantiers historiques — 25 octobre 2026

## Méthode et limites
Base inspectée : main après PR7, commit 10b4e7c. Les cinq dossiers sous .specs/changes
et leurs preuves ne sont pas modifiés ; leurs statuts implementing sont historiques.
Le code et les assertions correspondantes ont été lus. Le résultat GitHub CI verify de
8d37dd8 a été consulté le 25 octobre : completed/success,
[run 40179417858](https://github.com/faugera/AgencticB2BSaaS/actions/runs/40179417858/job/121127054987).
La CI comprend verify, UI, sécurité PostgreSQL, isolation et auth navigateur/SMTP.
Ce résultat borne la preuve à cette révision ; aucun de ces tests n'est relancé localement
pour la migration documentaire. Une fusion ne constitue pas à elle seule cette preuve.

## Registre
| Ancien chantier | Critères réconciliés et code | Preuves consultées | Conclusion / suite |
| --- | --- | --- | --- |
| 2026-10-24-audit-log-v0 | Huit critères : commit/rollback/no-op, refus, pagination50, filtre tenant, champs sans valeurs et UI FR/EN ; migration0010, audit-routes et tests audit SQL/UI | [checkpoint](../../.specs/changes/2026-10-24-audit-log-v0/tasks.md), [preuve réelle](../../.omo/evidence/audit-log-v0/live-browser/proof.json), CI ci-dessus | Réconcilié sur preuves historiques ciblées puis CI ; les anciens blocages lifecycle/429 sont traités par le chantier lifecycle. Pas de tâche applicative restante identifiée. |
| 2026-10-24-complete-frontend-pages | Huit parcours : demande/approbation/refus tenant, profil/sessions, permissions, FR/EN responsive et docs restreintes ; access-routes, Profile et migrations0008/0012 | [checkpoint](../../.specs/changes/2026-10-24-complete-frontend-pages/tasks.md), access.integration.test.ts et frontend-pages.spec.ts ; CI | Réconcilié : le test réel de profil modifie le nom en SQL, refuse email/rôle, révoque les autres sessions et préserve session courante/autre identité. L'ancienne absence de preuve DB est supersédée par la CI. |
| 2026-10-24-design-system-brume | Six critères : compositions/filtres, rôles/navigation, préférences, couleur/refus, galerie et clavier FR/EN375/768/1280 ; ui, pages et migration0009 | [checkpoint](../../.specs/changes/2026-10-24-design-system-brume/tasks.md), [normalisation](../design/css-normalization.md), access.integration.test.ts préférences/apparence et CI | Réconcilié : Lato et mesures utilisateur priment sur la maquette ; les tests cosmétiques ont ensuite été retirés volontairement. Pas de conformité WCAG exhaustive revendiquée. |
| 2026-10-24-lifecycle | Quatre critères : IDs/dates conservés, sessions révoquées, concurrence session/suppression, tenant/invitations isolés ; migration0011 et lifecycle.integration.test.ts | [checkpoint](../../.specs/changes/2026-10-24-lifecycle/tasks.md) :40 SQL,14 isolation,4 auth-live ; CI ultérieure | Réconcilié ; ancien incident ICU headless local ne signifie pas échec du produit. SQL opérateur seulement ; aucun déploiement déduit. |
| 2026-10-24-pr7-review | Six critères : resize, redirections, audit/login, pagination>100, curseur étranger/refus et approbation SMTP échoué ; AppShell/redirect/AccessRequests et migration0012 | [checkpoint](../../.specs/changes/2026-10-24-pr7-review/tasks.md) :182 UI/48captures et41 SQL ; [suite réduite](../testing.md) :72 UI ; CI de8d37dd8 | Réconcilié : le contrôle CI laissé à consulter dans l'ancien checkpoint a maintenant été consulté. Les48captures sont historiques, pas recréées par la migration. |

## Décision de migration
Aucun changement fonctionnel restant n'est identifié dans les critères inspectés ; aucun
chantier applicatif n'est artificiellement recréé dans specs. Les 32 critères historiques
regroupés ci-dessus sont couverts par code/assertions et preuves datées ; ce rapprochement
ne promeut pas rétroactivement les cinq statuts ni ne garantit une réexécution future.
Toute nouvelle anomalie reçoit une nouvelle spec avec reproduction et preuve proportionnée.

## Limites conservées
Aucune inspection DB développement/production ; migrations appliquées UNKNOWN. Pas de
rétention/export audit, MFA obligatoire, SSO, runtime IA ou audit WCAG exhaustif ajouté.
Ces exclusions ne deviennent pas des tâches de cette migration. Les preuves/captures datées
ne sont pas soumises rétroactivement au contrôle de structure Spec Kit.
