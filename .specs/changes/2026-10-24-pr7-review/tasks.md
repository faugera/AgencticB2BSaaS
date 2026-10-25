# PR7 review — tâches
## Groupe 1 — Modèle
- [x] Migration0012, lecture paginée stable et index tenant/date/id.
## Groupe 2 — Backend
- [x] Paramètre before validé, contexte/permissions inchangés, tests négatifs.
## Groupe 3 — Frontend
- [x] Resize, destinations, pagination et rechargement invitations.
## Groupe 4 — Vérifications
- [x] Régressions reproduites, pnpm verify et41intégrations SQL/HTTP avant pause.
- [x] Tests UI FR/EN et375/768/1280 ; revue indépendante des captures fraîches.
- [ ] Contrôles DB et auth E2E à revérifier via CI : Docker local bloqué le25.
## Groupe 5 — Documentation
- [x] Synchroniser les cibles de spec.md ; vérifier diff sans secrets.

État initial propre, branche codex/audit-log-v0. Aucun accès à une DB réelle.
Ne résoudre les cinq conversations qu'après publication et preuves des corrections.

## Pause explicite demandée — 2026-10-24

Travail arrêté à la demande de l'utilisateur. Aucune publication ni résolution
supplémentaire de conversation ; changements non commités conservés.
Branche codex/audit-log-v0, HEAD9879825. Faire git fetch/status avant reprise,
préserver les modifications concurrentes. Ne pas reprendre sans demande utilisateur.

### Implémentation locale présente
- AppShell : listener matchMedia min-width768 ferme mobileOpen en quittant le mobile.
- Application : /app/invitations super-admin redirigé vers /admin/members, query conservée.
- safeDestination : /admin/audit autorisé, filtre conservé ; test unitaire ajouté.
- AccessRequests : historique de curseurs, boutons précédent/suivant FR/EN ; callback
  onApproved déclenche la révision Application, y compris livraison échouée.
- GET /api/access-requests accepte before UUID, réponse tableau inchangée.
- Migration0012 : index tenant/date/id ; fonction SQL paginée stable100, curseur
  exclusivement dans le tenant autorisé. Migration0008 inchangée.
- Régression SQL/HTTP ajoutée à access.integration.test.ts :105 demandes avec dates
  identiques, toutes atteignables, aucun doublon, refus member et curseur inter-tenant.
- Nouveau tests/e2e/review-regressions.spec.ts : resize, redirection, pagination et
  invitation fraîche après approbation/livraison échouée ; captures prévues.

### Preuves exécutées
| Commande | Résultat | Limite |
| --- | --- | --- |
| vitest redirect.test.ts avant correction | FAIL attendu | Destination audit perdue |
| playwright review-regressions avant correction | FAIL3 attendu | inert desktop,404 invitations, boutons absents |
| vitest access.integration.test.ts -t 'paginates past' avant correction | FAIL attendu | before rejeté400 |
| pnpm verify après correction | PASS | Types,lint,44unitaires,build,smoke |
| pnpm verify:security après correction | PASS | Dépendances sans vulnérabilité connue ;41intégrations PostgreSQL17.8 réelles |

### À terminer lors de la reprise
1. Exécuter review-regressions.spec.ts après build actuel ; dernier lancement était
   RED AVANT correction. Vérifier aussi le libellé réel du bouton Resend/Renvoyer.
2. Ajouter/vérifier le parcours /admin/audit anonyme -> login -> MFA -> audit avec
   filtre ; seul safeDestination est couvert en unitaire actuellement.
3. Ajouter au besoin une régression isolée approbation (celle présente est après
   pagination). Confirmer le rafraîchissement et le contrôle de renvoi visible.
4. Captures fraîches FR/EN375/768/1280, revue indépendante exigée par visual-qa
   (skills frontend/visual-qa déjà consultés). Aucun reviewer lancé pour ce delta.
5. Suites navigateur générales, verify:tenant-isolation et test:auth:e2e à exécuter.
   Chromium headless local échoue ICU ; mode headed fonctionne lors du delta précédent.
6. Synchroniser les documents listés en section6 de spec.md. AUCUN document produit
   n'a encore été synchronisé pour ce delta. Statut implementing conservé.
7. Revue diff/secrets, commit/push corrections sur PR7, puis résoudre les cinq
   conversations SEULEMENT après preuve/publication. Ne pas fusionner la PR.

### Infrastructure conservée
Docker Desktop a été démarré pour ces tests, sans changement de ses données globales.
Conteneur agenctic-review-verify-20261024 ARRÊTÉ, non supprimé pour reprise ; données
uniquement synthétiques. Image postgres:17.8-alpine, port antérieur127.0.0.1:60223
(revérifier après docker start), DBenterprise_auth_test_review, opérateurenterprise.
Pour reprendre : docker start agenctic-review-verify-20261024 puis docker port.
Les variables AUTH_TEST_DATABASE_URL/AUTH_TEST_MIGRATION_DATABASE_URL doivent pointer
vers cette DB jetable ; ne jamais exécuter les fixtures sur la DB de développement.
Aucune DB de développement migrée ; aucun conteneur Mailpit créé dans ce delta.

### Conversations PR7 non résolues
- PRRT_kwDOVSo4ts6v5thz : resize menu.
- PRRT_kwDOVSo4ts6v5th1 : redirection invitations.
- PRRT_kwDOVSo4ts6v5th3 : pagination demandes.
- PRRT_kwDOVSo4ts6v54tv : rafraîchissement invitations.
- PRRT_kwDOVSo4ts6v54ty : retour audit.
Le thread lifecycle PRRT_kwDOVSo4ts6v5thx a déjà été résolu au tour précédent.

## Reprise autorisée — 2026-10-25

L'utilisateur demande de terminer et publier les corrections. Le fetch ne montre
aucune modification concurrente à réconcilier au départ. Les cinq threads étaient
encore ouverts ; ne pas confondre leur résolution et une fusion de la PR.

| Contrôle | Résultat constaté | Limite |
| --- | --- | --- |
| pnpm verify | PASS le25 | Types,lint,44unitaires,build,smoke |
| review-regressions.spec.ts --headed --workers1 | PASS32/32 | FR/EN375/768/1280, desktop/mobile, API simulée |
| playwright test --headed --workers2 | PASS182/182 | Suite complète,2.4min ; API simulée, hors auth-live |
| Revue visuelle finale pr7_final_visual | PASS |48PNG directement inspectés dans browser-final ; pas de preuve SQL |
| Revue intégrité pr7_integrity | PASS | Contrôle source/SQL/HTTP et captures ; remarque slash final corrigée/testée |
| verify:security le24, même SQL0012 | PASS41/41 | Preuve PostgreSQL réelle avant pause, non relancée localement le25 |
| DB/isolation/auth-live locaux le25 | Infrastructure indisponible | Docker ne démarre pas : point d'écoute dockerInference inaccessible |
| CI du commit publié | À consulter sur PR7 | Contrôles PostgreSQL/isolation/auth-live prévus par ci.yml |

Le premier lancement complet avec1worker a été interrompu au plafond de200s ;
deux tests MFA cliquaient avant stabilisation de la nouvelle route. Le test attend
maintenant la route MFA nettoyée et la valeur du champ avant soumission. Aucun délai
fixe, retry ajouté ni modification du code MFA. La suite finale complète passe.

Captures finales locales : .omo/evidence/pr7-review/browser-final (48PNG).
Log final : .omo/evidence/pr7-review/full-final.log. Ne pas ajouter ces médias
temporaires au commit. Le Docker Windows bloqué a été inspecté sans suppression
de socket, purge, reset, ACL, changement de paramètres ni modification de ses données.
La migration0012 n'a pas été appliquée à une DB de développement.

| Document | Politique | Décision | Motif |
| --- | --- | --- | --- |
| docs/data-model.md | required | UPDATED | Signature SQL, index et pagination stable |
| docs/architecture.md | required | UPDATED | Paramètre before et contrat tableau inchangé |
| docs/features-b2b.md | required | UPDATED | Parcours de revue des demandes et invitations |
| .specs/domains/product-map.md | required | UPDATED | Capacités corrigées et lien vers preuves |
| docs/architecture/0005-private-pilot.md | required | UPDATED | Curseur borné au tenant autorisé |
| .specs/standards/b2b-tenancy-rbac.md | required | UPDATED | Validation UUID et refus inter-tenant |
| CHANGELOG.md | review | UPDATED | Cinq corrections utilisateur |
| DESIGN_UI.md/DESIGN.md | review | REVIEWED_NO_CHANGE | Button/ui-tabs et breakpoint768 existants, aucun CSS ajouté |
| README.md/.env.example | environment | NOT_APPLICABLE | Aucune variable ou commande changée |

Statut implementing conservé, sans promotion SDD implicite. Publication autorisée,
pas de fusion ni de déploiement automatique. Les notes de pause ci-dessus restent
l'historique de reprise ; ce checkpoint décrit le dernier état constaté.
