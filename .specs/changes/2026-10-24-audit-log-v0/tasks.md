# Tâches — 2026-10-24-audit-log-v0

## Groupe 1 — Modèle de données et validation
- [x] Migration additive, champs autorisés, triggers et pagination SQL.
## Groupe 2 — Backend et sécurité B2B
- [x] Endpoint super-admin avec validation et refus HTTP/SQL.
## Groupe 3 — Frontend
- [x] Page Brume FR/EN et navigation, pagination et états.
## Groupe 4 — Tests et vérifications
- [x] Tests négatifs HTTP et SQL, mutations/rollback, UI trois viewports.
- [ ] typecheck, lint, test, build, smoke et gates sécurité/DB/auth E2E.
## Groupe 5 — Auto-Documentation
- [x] Synchroniser toutes les cibles de la section 6 et consigner preuves/limites.

## Checkpoint
Branche codex/audit-log-v0 créée depuis codex/design-system-brume avec travail
préexistant conservé. Aucun fichier privé d'environnement lu. MFA facultative.

## Pause demandée par l’utilisateur — 2026-10-24

Opération arrêtée explicitement ; ne pas poursuivre sans demande de reprise.
Code et documentation modifiés, non commités. Aucune migration appliquée à la base.
Migration 0010_audit_log.sql, API audit-routes.ts, contrats AuditEvent/AuditPage,
page AuditLog.tsx et traductions/navigation ajoutés. Documentation synchronisée
dans les sept cibles listées dans spec.md. Pas de dépendance ajoutée.

Preuves obtenues :
- PASS : lint ; tests unitaires globaux 42/42 avant ajout du second test audit.
- PASS : tests audit-routes 2/2 après ajout du refus de rôle ordinaire.
- PASS : compilation frontend, build API/web et smoke.
- PASS : 9 scénarios UI interceptés FR/EN × 375/768/1280, pagination/filtre,
  vide/erreur et refus UI. Configuration Chromium complet dans
  .omo/evidence/audit-log-v0/playwright.config.ts ; 18 captures sous browser/.
- FAIL préexistant : typecheck global, lifecycle.integration.test.ts lignes
  142/145/149 ; ne pas confondre avec les nouveaux fichiers audit.
- FAIL infrastructure : verify:security et verify:tenant-isolation exigent
  AUTH_TEST_DATABASE_URL / AUTH_TEST_MIGRATION_DATABASE_URL absentes ; Docker
  indisponible malgré tentative de démarrage Desktop. Sous-contrôles security.mjs
  et pnpm audit passent ; le gate global ne passe pas.
- FAIL outil : pnpm test:auth:e2e, syntaxe AUTH_LIVE_TEST=true incompatible avec
  le shell Windows utilisé ; infrastructure DB/Mailpit également non préparée.
- Revue UI indépendante interrompue à la demande utilisateur, aucun verdict acquis.
- git diff --check signale une ligne vide finale préexistante dans application.tsx.
- Références distantes consultées via git ls-remote ; pas de commit/push/PR.

Reprise : relire spec/tasks et diff avant modification ; valider migration/triggers
sur cluster PostgreSQL jetable isolé, tests d’intégration audit, sécurité et auth E2E.
Finir revue UI indépendante et réconciliation documentaire des preuves. Les cases
restent non cochées tant que les contrôles requis ne sont pas démontrés. Statut
implementing, jamais verified. Ne pas inclure le travail Brume/frontend préexistant
dans un commit audit sans examiner les dépendances et la portée.

## Reprise autorisée et bilan actuel — 2026-10-24

La demande « reprend le travail » lève la pause ci-dessus. Le bilan suivant
remplace les blocages d’infrastructure de ce checkpoint historique.

| Contrôle | Méthode | Résultat | Preuve / limite |
| --- | --- | --- | --- |
| Mutation, rollback, no-op, auteur/cible, confidentialité, suppression historique, pagination, tenant | vitest auth config, audit.integration.test.ts sur PostgreSQL 17.11 jetable | PASS 4/4 | .omo/evidence/audit-log-v0/postgres-audit.log ; également 4/4 dans security-final.log |
| Isolation tenant existante | pnpm verify:tenant-isolation, base jetable séparée | PASS 14/14 | isolation-resume.log |
| Unitaires globaux | pnpm test | PASS 43/43 | unit-resume.log |
| Validation API et refus du rôle ordinaire avant SQL | audit-routes.test.ts | PASS 2/2 | inclus dans les 43 unitaires |
| Navigateur ciblé | playwright audit.spec.ts, config Chromium complet | PASS 9/9 | browser-resume.log ; API simulée, jamais preuve SQL |
| Non-régression navigateur globale | pnpm test:e2e --config .omo/evidence/audit-log-v0/playwright.config.ts --global-timeout 90000 | PASS 75/75 | e2e-all-resume.log ; un projet Chromium complet, les tests varient les viewports ; hors auth-live |
| Vrai navigateur → API → PostgreSQL | session synthétique, PATCH workspace puis consultation /admin/audit ; fr/en × 375/768/1280 | PASS | live-browser/proof.json + 6 captures ; aucune interception API ; login/mutation/lecture 200, anonyme 401, rôle super retiré 403 ; défilement local réellement exercé |
| Revue indépendante du périmètre audit | audit_final_gate | PASS | code et preuves réelles inspectés ; aucun bloqueur audit, pas de certification globale |
| Revue visuelle | audit_resume_visual | PASS | 18 captures liste/vide/erreur originales, sans défaut de composition |
| Lint | pnpm lint | PASS | lint-final.log |
| Build et smoke | pnpm build ; pnpm smoke | PASS | exécutés avant pause ; sources applicatives inchangées depuis, seul nettoyage de fixture d’intégration ajouté |
| Typecheck global | pnpm typecheck | FAIL préexistant | typecheck-final.log : lifecycle.integration.test.ts 142/145/149 ; compilation frontend et build API passent |
| Sécurité globale | pnpm verify:security sur cluster jetable | FAIL | security-final.log : 33 passent, 7 échouent ; 6 lifecycle sans schéma correspondant et 1 test profil 429 ; audit 4/4, auth 9/9 et isolation 14/14 passent ; audit dépendances sans vulnérabilité connue |
| Auth E2E standard | pnpm test:auth:e2e | FAIL outil / NOT_RUN runtime | syntaxe d’affectation Unix incompatible avec le shell Windows ; pas de Mailpit disponible. Le parcours audit réel ci-dessus n’est pas présenté comme remplacement du gate auth/SMTP |
| Diff ciblé audit | git diff --check sur les contrats et documents touchés | PASS | la ligne vide préexistante dans application.tsx reste hors de cette correction |
| Références distantes | git ls-remote --symref origin HEAD | PASS lecture seule | remote-final.log ; aucun push/commit/PR |

Le test audit nettoie ses propres quotas auth et rétrograde uniquement son
super-admin synthétique pour ne pas contaminer les autres suites. Aucun fichier
privé d’environnement lu, aucune dépendance applicative ajoutée. Le runtime
PostgreSQL est extrait de l’archive officielle EDB sous D:/Temp/agenctic-audit-pg17,
cluster dédié lié à 127.0.0.1:55443, bases enterprise_auth_test_audit_* uniquement.
Les rôles et migrations sont provisionnés uniquement dans ce cluster isolé.
API temporaire 33001, preview 44173 et PostgreSQL sont arrêtés ; archives de
téléchargement supprimées. Runtime et données purement synthétiques restent
disponibles pour reproduire les contrôles. Aucune base de développement migrée.

| Document | Politique | Décision | Justification |
| --- | --- | --- | --- |
| docs/data-model.md | required | UPDATED | colonnes, conservation des IDs, index et preuve DB |
| docs/architecture.md | required | UPDATED | endpoint, flux et limites vérifiées |
| docs/architecture/0005-private-pilot.md | required | UPDATED | contrôle SQL/HTTP et MFA facultative V0 |
| docs/features-b2b.md | required | UPDATED | consultation et statut réel |
| .specs/standards/b2b-tenancy-rbac.md | required | UPDATED | frontière de lecture et absence d’attribution fictive |
| .specs/domains/product-map.md | required | UPDATED | fonctionnalité et limites globales |
| CHANGELOG.md | review | UPDATED | nouvelle capacité de consultation |
| README.md / .env.example | environment | NOT_APPLICABLE | aucune variable applicative modifiée |
| DESIGN.md / DESIGN_UI.md | review | REVIEWED_NO_CHANGE | réutilisation des contrôles et gabarits existants |

Périmètre audit fonctionnel terminé et vérifié par preuves ciblées. Statut SDD
conservé implementing car les gates globaux obligatoires ne passent pas ; ne pas
masquer ni réparer le chantier lifecycle hors scope pour obtenir un vert artificiel.
Pas de commit ni PR : le checkout contient les évolutions Brume/frontend
préexistantes non commitées dont dépend la page. Une publication isolée exige
d’abord de réconcilier ces dépendances sans inclure arbitrairement ces travaux.

Complément de preuves UI : après la suite globale 75/75, le test ciblé capture
aussi le chargement initial contrôlé, le mode sombre et la pagination désactivée
en fin de liste. Nouvelle exécution 9/9 PASS dans browser-final.log ; lint-final.log
reste vert. Le dossier browser contient désormais 36 captures (6 variantes
locale/viewport × 6 états), en plus des 6 captures du backend réel. Aucun changement
du code applicatif pendant ce complément ; seules les preuves du test évoluent.

Revue finale audit_final_visual : PASS sur les36 captures d’états et6 captures
réelles, y compris chargement, sombre et dernière page désactivée. Aucun bloqueur
produit ou preuve restant dans le périmètre audit ; rapport consolidé dans
.omo/evidence/audit-log-v0/review.md. Les limites des gates globaux restent inchangées.
