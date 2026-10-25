# Tâches — 2026-10-24-complete-frontend-pages

## Groupe 1 — Modèle de données et validation

- [x] Résoudre l'audience/contenu de `/docs`, préciser les contrats puis promouvoir shaped : super-admin uniquement et contenu autorisé côté serveur.
- [x] Définir le lien de demande d'organisation, le modèle persisté et les validations à la frontière.
- [x] Ajouter une migration additive ; préserver toutes les migrations préexistantes.

## Groupe 2 — Backend et sécurité B2B

- [x] Implémenter collecte publique bornée, limitée en débit et sans privilège implicite.
- [x] Autoriser lecture/traitement uniquement dans la portée tenant administrée ; réutiliser les invitations et l'audit.
- [ ] Vérifier le comportement effectif des endpoints Better Auth profil et sessions avec des identités distinctes.

## Groupe 3 — Frontend

- [x] Créer `/signup` lié à l'organisation et le traitement des demandes dans la zone autorisée.
- [x] Créer les deux routes profil avec nom, email/rôles en lecture seule et gestion des sessions.
- [x] Créer `/app/members` et `/app/invitations`, réutiliser les formulaires et permissions existants.
- [x] Créer `/docs` selon l'arbitrage utilisateur.
- [x] Ajouter navigation, FR/EN, états et accessibilité dans le style existant.

## Groupe 4 — Tests et vérifications

- [ ] Écrire et faire passer les régressions positives/négatives sur demandes, profils/sessions et accès tenant.
- [ ] Exécuter typecheck, lint, unitaires, build et smoke.
- [ ] Exécuter sécurité, isolation et auth E2E contre PostgreSQL/Mailpit jetables explicites.
- [ ] Vérifier les nouvelles pages en fr/en sur mobile/tablette/desktop, navigation clavier et absence d'overflow.
- [ ] Vérifier chaque GIVEN/WHEN/THEN avec preuve ; distinguer les échecs préexistants du test lifecycle local.

## Groupe 5 — Auto-Documentation

- [x] Synchroniser chaque cible required de la section 6.
- [x] Justifier README/changelog et environnement selon leur impact réel.
- [x] Vérifier cohérence code/spec/docs et enregistrer les résultats documentaires.

## Checkpoint — 2026-10-24

Branche `codex/complete-frontend-pages`. Code, migration additive 0008 et tests
ajoutés ; les modifications préexistantes (dont 0007 et lifecycle) sont conservées.
Statut **implementing** : aucune promotion verified sans preuve PostgreSQL.

| Contrôle | Résultat | Preuve et limite |
| --- | --- | --- |
| `pnpm --filter @enterprise/web typecheck` | PASS | Types frontend |
| `pnpm typecheck` | FAIL | Trois erreurs préexistantes dans lifecycle.integration.test.ts (142,145,149) |
| `pnpm lint` | PASS | Aucun avertissement ESLint |
| `pnpm test` | PASS | 40 tests unitaires |
| `pnpm build` | PASS | API et UI construites |
| `pnpm smoke` | PASS | API construite : health et arrêt propre |
| `pnpm exec playwright test --headed --workers=2 --max-failures=2` | PASS | 58 scénarios après correction des états vides |
| Suite frontend-pages headed, après ajouts captures/clavier | PASS | 26 scénarios, FR/EN, 375/768/1280, captures clair/sombre dans test-results, Tab prénom vers nom |
| `pnpm verify:security` | FAIL | Scan et audit dépendances PASS ; tests auth bloqués à l'initialisation sans DB jetable |
| `pnpm verify:tenant-isolation` | FAIL | Credentials PostgreSQL jetables absents ; aucun scénario SQL exécuté |
| Migration 0008, auth E2E PostgreSQL/Mailpit | NOT_RUN | Docker indisponible ; aucune migration appliquée à une base non jetable |
| `git diff --check` | PASS | Aucun défaut de whitespace |

Le premier rerun des états vides utilisait un build périmé et a échoué ; après
reconstruction les 58 tests passent. Chromium headless échoue avant lancement
(ICU manquant) ; Chromium headed installé fonctionne. Les API des scénarios UI
sont interceptées : elles ne prouvent ni persistance SQL ni autorisation serveur.

### Critères GIVEN/WHEN/THEN

- Collecte par lien : formulaire/payload UI PASS ; test SQL/HTTP réel écrit dans
  access.integration.test.ts, NOT_RUN (persistance et absence d'enrollment).
- Approbation par tenant-admin : code réutilise business.invite et audit ; test réel
  de concurrence et approbation écrit, NOT_RUN.
- Refus inter-tenant : gardes transactionnelles/SQL inspectées ; test réel NOT_RUN.
- Profil/sessions : appels SDK et maintien session courante PASS dans fixture UI ;
  test réel avec identités distinctes NOT_RUN.
- Refus membre ordinaire/docs : navigation UI PASS ; test réel serveur écrit, NOT_RUN.
- FR/EN responsive : PASS dans les captures et assertions overflow aux trois tailles.
  Navigation clavier vérifiée sur les champs signup ; pas d'audit clavier exhaustif.
- Revue indépendante intégrité : PASS, confiance moyenne (limite DB).
  Revue visuelle initiale REVISE (deux états vides et captures sombres manquantes),
  corrections livrées puis revue finale PASS, confiance haute : 156 captures valides
  et récentes, états vides et mode sombre inspectés, aucun blocage visuel restant.

### Synchronisation documentaire

UPDATED : docs/data-model.md (tables/contraintes), docs/architecture.md (flux HTTP),
docs/architecture/0005-private-pilot.md (collecte sans enrollment),
.specs/standards/b2b-tenancy-rbac.md (frontière tenant), docs/features-b2b.md et
.specs/domains/product-map.md (capacités et statut),
docs/architecture/routes-verification.md (routes et preuves), README.md (parcours),
CHANGELOG.md (delta utilisateur), DESIGN.md (primitives réutilisées).
REVIEWED_NO_CHANGE : .env.example, aucune variable supplémentaire.

Prochaine étape : fournir PostgreSQL/Mailpit jetables, appliquer 0008 dans cet
environnement et exécuter les tests sécurité/isolation/auth avant promotion verified.
Aucun merge ni déploiement effectué.
