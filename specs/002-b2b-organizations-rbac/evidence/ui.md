# Preuves UI T008 — 25 octobre 2026

- PASS : `pnpm --filter @enterprise/web build` (TypeScript strict et build Vite).
- PASS : `pnpm exec eslint apps/web/src tests/e2e/b2b.spec.ts`.
- PASS : 39/39 tests UI simulés, Chromium complet, via `pnpm exec playwright test --config specs/002-b2b-organizations-rbac/evidence/playwright-ui.config.ts --workers=3`.
- PASS après les dernières corrections de composition : 3/3 tests `b2b.spec.ts` ; profil FR/EN, erreur PUT avec saisie conservée, catalogue, dialogue d’impact, Escape et restitution du focus, erreur de modification, attributions limitées aux niveaux inférieurs et portée transmise.
- PASS : reflow sans débordement global du profil et des rôles en FR/EN aux largeurs 375/768/1280 ; captures dans `ui/`.
- Revue visuelle locale : captures profil FR 1280 et rôles FR 375 inspectées ; formulaire borné à la largeur Brume existante, cases et labels alignés avec cible tactile. Les captures desktop montrent le viewport de la zone défilante du shell.
- NOT_RUN : parcours API/SQL réels, revue visuelle indépendante et Lighthouse ; ces contrôles relèvent de l’intégration et de la revue finale.
- Limite environnement : Chromium headless-shell échoue avant toute assertion avec `icu_util.cc:232 Invalid file descriptor to ICU data received`. La configuration de preuve utilise `channel: chromium`, qui fonctionne ; la configuration habituelle du dépôt reste inchangée.

Les réponses API de ces tests sont simulées : elles ne constituent aucune preuve d’autorisation ou de persistance serveur.

## Passe courante après revue

Les douze anciennes images à la racine de `ui/` sont remplacées pour la revue par
`ui/current/`. Le manifeste `ui-current-manifest.json` vérifie que le build suit
la dernière modification frontend et que chaque PNG suit le build ; il contient
le SHA256 du bundle et les dates de toutes les images.

- PASS : suite complète 46/46 (`ui-current-tests.log`), puis 10/10 ciblés après le dernier ajustement de navigation par permission ; dernière matrice visuelle 6/6 (`ui-current-visual-tests.log`).
- PASS : FR/EN × 375/768/1280, avec 47 vues par combinaison, soit 282 captures viewport.
- Les captures `*-top` partent explicitement du début du document et du scroller interne ; les captures de bas de formulaire ciblent le contrôle concerné. Aucune capture `fullPage` ne mélange ici le document et la zone défilante.
- Chaque case de permission, la dernière action d’attribution et la pagination sont amenées dans le viewport ; leurs limites sont vérifiées au-dessus de la navigation mobile et dans la largeur visible. `audit-table-end` démontre l’accès à la dernière colonne dans le scroll local.
- Profil : début, préférences/sessions et erreur de sauvegarde. Rôles : catalogue, formulaire, treize contrôles, dernier contrôle, confirmation ouverte, Escape/focus, erreur et attributions renseignées.
- Client : attribution remplie, succès, dernière action, dialogue de retrait et refus. Organisations : liste, création tenant, succès, erreur, vide et chargement. Audit : global, tenant, dernière colonne, pagination, page ancienne, vide, erreur et chargement.
- Les quatre routes ont aussi une capture sombre ; menu mobile ouvert ou sidebar réduite selon la largeur. Les noms d’organisation, tenant, fonction et emails longs utilisent des fixtures explicites.
- L’action normale de sauvegarde et sa confirmation utilisent la variante principale ; les retraits conservent la variante danger.
- Les tests de portée ajoutés couvrent les rôles non délégables attribuables par super-admin, le membre de base sans retrait fictif, et les capacités d’attribution par workspace avec roster serveur scoping `workspaceId`.

La revue indépendante reste requise. La preuve visuelle est simulée et distincte
des contrôles API/SQL réels exécutés par l’intégration.
