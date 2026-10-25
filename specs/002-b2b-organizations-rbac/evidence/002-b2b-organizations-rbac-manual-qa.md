# Manual QA — delta visuel/fonctionnel final

Date : 25 octobre 2026  
Révision vérifiée : `163f198e32887eaa729874f42c64f842f07d649c`  
Périmètre : rendu navigateur, navigation mobile fixe et reachability clavier du delta courant. Aucun produit n’a été modifié pendant cette revue.

## Verdict global

**PASS.** Le défaut précédent d’occlusion mobile est corrigé et démontré par la matrice Chromium finale : 6/6 scénarios, 90 captures ciblées (scroll + focus), 6 vues du catalogue global et 288 vues d’ensemble. Aucun blocker visuel ou fonctionnel ne reste dans le périmètre de ce delta.

La preuve UI utilise des réponses API simulées. Elle ne remplace pas les preuves SQL/HTTP/SMTP séparées ; celles-ci sont hors périmètre de ce verdict visuel.

## `manualQa.surfaceEvidence`

| scenario id | criterion reference | surface | exact invocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| VFD-001 | SC-004 / DESIGN_UI §6, §9 | Chromium complet, surfaces B2B FR/EN aux viewports 375×900, 768×900 et 1280×900 | `pnpm exec playwright test tests/e2e/b2b-visual.spec.ts --config specs/002-b2b-organizations-rbac/evidence/playwright-ui.config.ts --workers=3` ; résultat consigné dans `ui-reachability-final.log` | PASS — 6/6 | A01, A02, A06 |
| VFD-002 | DESIGN_UI §6, §9 — barre fixe et reachability | 90 PNG `ui/reachability/` : actions centrées et actions focalisées par Tab, profil/organisations/attribution/rôles sombres, FR/EN × 3 largeurs | Même invocation Playwright ciblée ; inspection `view_image` des douze planches par largeur et groupe, puis des originaux mobiles critiques | PASS — 90/90 présents, non vides, dimensions valides ; les boutons focalisés restent au-dessus de `.ui-bottom-nav` | A01, A02, A03, A04, A05, A07 |
| VFD-003 | SC-004 — catalogue global sans erreur artificielle | Vue `/admin/roles` sans `tenantId`, FR/EN × 375/768/1280 | Même invocation Playwright ciblée ; états `roles-global-catalog-*` dans `ui-global-catalog-green.log` | PASS — 12/12 scénarios ciblés et six vues globales lisibles | A01, A04, A07 |
| VFD-004 | FR-009 / DESIGN_UI §9 — textes, labels et reflow | Captures d’ensemble `ui/current/` et captures ciblées mobiles | `view_image(path=<planche reachability>, detail=high)` puis `view_image(path=<capture critique>, detail=original)` | PASS — pas de clipping horizontal, labels FR/EN lisibles, continuation du document non confondue avec une action focalisée | A01, A07, A08 |
| VFD-005 | Régression 847,5 px / 839 px | Profil erreur mobile, organisation succès/erreur, attribution succès, rôles dark | Comparaison du scénario initial échoué puis du scénario final ; `ui-reachability-initial.log` et `ui-reachability-final.log` | PASS après correction — l’échec historique est reproduit avant le correctif et la matrice finale passe après `scroll-padding-bottom` | A02, A09, A10 |
| VFD-006 | DESIGN_UI §5, §7, §9 — Escape et restitution du focus | Dialogue d’impact de rôle et parcours B2B complet | `pnpm exec playwright test --config specs/002-b2b-organizations-rbac/evidence/playwright-ui.config.ts --workers=3` ; `ui-keyboard-current-tests.log` | PASS — 47/47 ; Escape ferme le dialogue et le bouton déclencheur récupère le focus | A03, A06, A11 |

## `manualQa.adversarialCases`

| scenario id | criterion reference | adversarial class | expected behavior | verdict | artifactRefs |
|---|---|---|---|---|---|
| ADV-001 | DESIGN_UI §6, §9 | fixed-nav occlusion à 375 px | Le bas de chaque contrôle visible est ≤ au bord supérieur de la barre fixe | PASS — assertions de bounds après stabilisation et captures d’action mobiles | A02, A06, A07 |
| ADV-002 | DESIGN_UI §9 | parcours Tab sans recentrage entre contrôles | Chaque contrôle activable reçoit le focus et reste entièrement visible après le Tab natif | PASS — `expect(control).toBeFocused()` et quatre limites contrôlées pour chaque contrôle | A03, A06, A07 |
| ADV-003 | DESIGN_UI §6, §9 | contrôles désactivés | Un contrôle désactivé reste atteignable par scroll et n’est pas forcé dans le parcours Tab natif | PASS — les boutons désactivés sont contrôlés par scroll puis exclus de `controls` | A02, A05, A06 |
| ADV-004 | FR-009 / SC-004 | FR/EN, labels longs, petites largeurs | Aucun libellé, aide, erreur ou action n’est tronqué ou orphelin | PASS — inspection des 90 ciblées et des vues d’ensemble 375/768/1280 | A01, A07, A08 |
| ADV-005 | SC-004 | catalogue global sans tenant sélectionné | La page affiche le catalogue sans fausse erreur ni roster hors portée | PASS — 12/12 et six captures globales | A04, A07 |
| ADV-006 | DESIGN_UI §4, §9 | thème sombre + navigation mobile | Contraste, hiérarchie, focus et barre mobile restent lisibles | PASS — rôles dark FR/EN aux trois largeurs, dont la capture mobile du contrôle désactivé | A01, A02, A07 |
| ADV-007 | DESIGN_UI §5, §7 | Escape et restitution du focus | Escape ferme la modale et rend le focus au bouton déclencheur | PASS — assertions B2B 47/47 et test ciblé du dialogue | A03, A06, A11 |
| ADV-008 | FR-003..008 / SC-001..002 | autorisation, persistance et isolation SQL | Les accès hors portée doivent être rejetés et les décisions persistées | NOT_APPLICABLE — ce verdict couvre uniquement le delta visuel/fonctionnel ; les preuves SQL/HTTP/SMTP sont séparées | — |

## `artifactRefs`

| id | kind | description | path |
|---|---|---|---|
| A01 | manifest | Manifest courant : build frais, 378 PNG, hashes JS/CSS et dates | `specs/002-b2b-organizations-rbac/evidence/ui-current-manifest.json` |
| A02 | browser-log | Matrice finale Chromium FR/EN × 375/768/1280, 6/6 | `specs/002-b2b-organizations-rbac/evidence/ui-reachability-final.log` |
| A03 | browser-log | Suite Chromium complète, 47/47 | `specs/002-b2b-organizations-rbac/evidence/ui-keyboard-current-tests.log` |
| A04 | browser-log | Catalogue global ciblé, 12/12 | `specs/002-b2b-organizations-rbac/evidence/ui-global-catalog-green.log` |
| A05 | contract-note | Description du correctif et de la couverture clavier | `specs/002-b2b-organizations-rbac/evidence/ui-keyboard-reachability.md` |
| A06 | source-test | Assertions `scrollIntoView`, focus Tab et quatre limites | `tests/e2e/support/reachability.ts` |
| A07 | screenshot-set | 90 captures ciblées scroll/focus inspectées | `specs/002-b2b-organizations-rbac/evidence/ui/reachability/` |
| A08 | screenshot-set | 288 vues d’ensemble et six vues catalogue global | `specs/002-b2b-organizations-rbac/evidence/ui/current/` |
| A09 | browser-log | Reproduction historique de l’occlusion 847,5 px > 839 px | `specs/002-b2b-organizations-rbac/evidence/ui-reachability-initial.log` |
| A10 | source-style | Correctif mobile `scroll-padding-bottom` limité au shell mobile | `apps/web/src/ui/shell.css` |
| A11 | source-test | Test Escape et restitution du focus du dialogue | `tests/e2e/b2b-visual.spec.ts` |

## Limites connues

- Cette revue ne requalifie pas les autorisations serveur, la persistance ou l’isolation tenant ; les contrôles SQL/HTTP/SMTP sont séparés.
- Lighthouse, axe et la conformité WCAG exhaustive ne sont pas déclarés.
- Les vues d’ensemble prises en haut de document peuvent montrer une continuation sous la barre fixe ; la preuve de non-occlusion repose sur les captures ciblées et les assertions de bounds après scroll/focus.
