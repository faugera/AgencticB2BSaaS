# Manual QA — passe visuelle indépendante finale

Date : 25 octobre 2026  
Périmètre : lecture seule des captures et journaux existants ; aucun serveur, navigateur, API ou SQL lancé ; aucune source produit modifiée.  
Dossier de tentative : `specs/002-b2b-organizations-rbac/evidence` (le wrapper `omo ulw-loop status --json` est indisponible sous Windows dans cette tentative).

## Verdict global

**FAIL / NEEDS WORK.** La couverture visuelle courante est fraîche et complète : 282 PNG, 48 états, FR/EN × 375/768/1280, manifestes et dimensions vérifiés. Un défaut produit reste visible à 375px : la barre inférieure fixe recouvre partiellement des boutons ou contrôles dans plusieurs états error/success/formulaire ; les assertions ciblées ne suffisent donc pas à certifier l’absence d’occlusion. Les preuves UI simulées ne certifient ni RBAC, ni persistance, ni isolation tenant.

## `manualQa.surfaceEvidence`

| scenario id | criterion reference | surface | exact invocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| VQ-001 | SC-004 — couverture visuelle courante | PNG navigateur, 48 états × FR/EN × 375/768/1280 | `PowerShell: manifest-integrity-check.txt` puis `PowerShell: coverage-check.txt` | PASS — 282/282 PNG intègres, bundle concordant, aucun état manquant/inattendu | A01, A02, A03, A04 |
| VQ-002 | DESIGN_UI §6/§9 — reflow, barre fixe, accès aux formulaires | web screenshots FR/EN, 375/768/1280 | `view_image(path=<contact-01..10.png>, detail=high)` puis `view_image(path=<original ciblé>, detail=original)` | FAIL — reflow global correct, mais occlusion partielle de boutons/contrôles à 375px dans les états error/success/formulaire | A05–A14, A20, A21, A22, A23 |
| VQ-003 | FR-009 / DESIGN_UI §9 — labels et textes longs | profil et organisations, FR/EN, 375/768/1280 | `view_image(path=ui/current/profile-top-fr-375.png, detail=original)` ; `view_image(path=ui/current/organizations-populated-fr-375.png, detail=original)` ; contact sheets complètes | PASS — libellés, emails, noms longs et aides restent lisibles ; aucune troncature horizontale constatée | A05–A14, A15, A16, A17, A18, A19 |
| VQ-004 | DESIGN_UI §5/§7/§9 — modal, Escape, restitution du focus | dialogue d’impact et retrait de rôle | `view_image(path=ui/current/roles-impact-dialog-fr-375.png, detail=original)` ; lecture de `tests/e2e/b2b.spec.ts` et `ui-current-tests.log` | FAIL pour la certification complète — géométrie des modales PASS, mais aucune nouvelle action navigateur Escape/focus n’a été rejouée dans cette passe interdite de serveur | A20, A21, A25, A26 |
| VQ-005 | FR-001..008 / SC-004 — organisations | `/admin/organizations`, liste/création/succès/erreur/vide/chargement | `view_image(path=ui/current/organizations-{populated,created,error,empty,loading}-fr-375.png, detail=original)` et variantes EN/768/1280 via contacts | PASS pour couverture de rendu — les cinq états existent dans les six combinaisons ; le défaut d’occlusion est reporté à VQ-002 | A05–A09, A15, A16, A17, A18, A19 |
| VQ-006 | FR-015 / SC-004 — journal d’audit | `/admin/audit` et `/admin/audit?tenantId=...`, table/pagination/vide/erreur/chargement | `view_image(path=ui/current/audit-{global,table-end,pagination,older-page,empty,error,loading}-fr-375.png, detail=original)` et desktop ciblé | PASS pour couverture visuelle — table locale, dernière colonne et pagination sont visibles ; aucune preuve backend déduite | A05–A14, A23, A24 |
| VQ-007 | FR-005..009 / scoped assignments — attribution UI | `/app/roles?tenantId=tenant`, remplie/succès/retrait/erreur | `view_image(path=ui/current/client-assignment-filled-fr-375.png, detail=original)` ; `view_image(path=ui/current/client-revoke-dialog-fr-375.png, detail=original)` ; lecture de `tests/e2e/b2b.spec.ts` | PASS UI simulée — roster, rôle et portée sont visibles, mais cette preuve n’est pas une preuve d’autorisation serveur | A20, A21, A25, A26, A27 |
| VQ-008 | DESIGN_UI §6 — sidebar/menu et thème sombre | sidebar mobile ouverte, sidebar réduite desktop, quatre routes dark | `view_image(path=ui/current/sidebar-mobile-open-fr-375.png, detail=original)` ; `view_image(path=ui/current/sidebar-collapsed-fr-1280.png, detail=original)` ; originaux `*-dark-*` | FAIL — navigation et dark theme sont lisibles, mais `roles-dark-*-375` laisse le bouton d’attribution sous la barre fixe | A12, A13, A14, A28, A29, A30, A31 |

## `manualQa.adversarialCases`

| scenario id | criterion reference | adversarial class | expected behavior | verdict | artifactRefs |
|---|---|---|---|---|---|
| ADV-001 | DESIGN_UI §9 / SC-004 | FR/EN clipping, label orphaning | Tous les labels, aides, erreurs et actions restent lisibles aux trois largeurs | FAIL — le texte est lisible, mais plusieurs actions 375px sont coupées par la barre fixe dans les états avec alerte/statut | A15, A16, A17, A18, A19, A20, A21, A22, A23 |
| ADV-002 | DESIGN_UI §6 / SC-004 | responsive overflow / fixed-nav occlusion | Aucun contenu actionnable ne doit être masqué par la navigation inférieure fixe | FAIL — profil error, organisations error/success et attribution success montrent une partie du bouton sous la barre ; correction attendue : garantir un dégagement réel ou capturer/positionner l’action au-dessus de la barre | A15, A17, A18, A20, A22, A32 |
| ADV-003 | DESIGN_UI §5/§9 | keyboard Escape and focus restoration | Escape ferme la modale et rend le focus au bouton déclencheur | FAIL — le scénario est présent et marqué passé dans le log mocké, mais aucune nouvelle invocation navigateur n’a été exécutée dans cette passe ; prérequis manquant : navigateur/serveur autorisé | A25, A26, A36 |
| ADV-004 | DESIGN_UI §5/§7 | modal bounds and actions | Dialogue borné, titre visible, Annuler/Confirmer accessibles visuellement | PASS — impact et retrait sont correctement bornés à 375/768/1280, FR/EN | A20, A21, A33, A34 |
| ADV-005 | FR-001..018 / SC-004 | state coverage completeness | Organisations, assignments et audit couvrent loading/empty/error/success/paged en FR/EN et trois largeurs | PASS — 48 états attendus, 282 captures présentes, sans manque/inattendu | A01, A02, A03, A04, A05–A14 |
| ADV-006 | FR-003..008 / SC-001..002 | backend authorization/persistence | API/SQL réels rejettent les accès hors portée et persistent les décisions/audits | FAIL — impossible à exécuter dans ce mandat ; les réponses API de `b2b-visual.spec.ts` et `b2b.spec.ts` sont des mocks et ne peuvent pas fournir cette autorité | A25, A26, A35, A36 |
| ADV-007 | FR-015 / DESIGN_UI §6 | local table scroll and last-column reach | Le tableau ne déborde pas globalement et la dernière colonne est atteignable | PASS — `audit-table-end` montre la fin de table dans la région locale ; desktop global reste borné | A23, A24, A28, A29 |
| ADV-008 | DESIGN_UI §4/§9 | dark-mode contrast and responsive shell | Le thème sombre conserve contraste, hiérarchie et navigation aux trois largeurs | FAIL — contrastes globalement lisibles, mais le bouton `Attribuer` en 375px est partiellement couvert dans `roles-dark-*` | A12, A13, A14, A30, A31, A32 |

## `artifactRefs`

| id | kind | description | path |
|---|---|---|---|
| A01 | integrity-log | Vérification manifeste/bundle/PNG, 282 fichiers, zéro erreur | `specs/002-b2b-organizations-rbac/evidence/ui-final-qa-artifacts/manifest-integrity-check.txt` |
| A02 | coverage-log | Inventaire des 48 états attendus et présents | `specs/002-b2b-organizations-rbac/evidence/ui-final-qa-artifacts/coverage-check.txt` |
| A03 | test-log | Suite visuelle ciblée 6/6 | `specs/002-b2b-organizations-rbac/evidence/ui-current-visual-tests.log` |
| A04 | manifest | Bundle courant et 282 captures post-build | `specs/002-b2b-organizations-rbac/evidence/ui-current-manifest.json` |
| A05 | contact-sheet | États audit/assignment, 5 lignes × 6 variantes | `specs/002-b2b-organizations-rbac/evidence/ui-final-qa-artifacts/contact-sheets/contact-01.png` |
| A06 | contact-sheet | États audit/assignment/organisations, 5 lignes × 6 variantes | `specs/002-b2b-organizations-rbac/evidence/ui-final-qa-artifacts/contact-sheets/contact-02.png` |
| A07 | contact-sheet | États assignment/organisations | `specs/002-b2b-organizations-rbac/evidence/ui-final-qa-artifacts/contact-sheets/contact-03.png` |
| A08 | contact-sheet | États organisations/profil | `specs/002-b2b-organizations-rbac/evidence/ui-final-qa-artifacts/contact-sheets/contact-04.png` |
| A09 | contact-sheet | États organisations/profil/roles | `specs/002-b2b-organizations-rbac/evidence/ui-final-qa-artifacts/contact-sheets/contact-05.png` |
| A10 | contact-sheet | Rôles contrôles 0–10 | `specs/002-b2b-organizations-rbac/evidence/ui-final-qa-artifacts/contact-sheets/contact-06.png` |
| A11 | contact-sheet | Rôles contrôles 11–12 | `specs/002-b2b-organizations-rbac/evidence/ui-final-qa-artifacts/contact-sheets/contact-07.png` |
| A12 | contact-sheet | Rôles contrôles 5–9 et dark/editor/dialog | `specs/002-b2b-organizations-rbac/evidence/ui-final-qa-artifacts/contact-sheets/contact-08.png` |
| A13 | contact-sheet | Rôles dark/editor/dialog/assignments | `specs/002-b2b-organizations-rbac/evidence/ui-final-qa-artifacts/contact-sheets/contact-09.png` |
| A14 | contact-sheet | Sidebar réduite/mobile ouverte et applicabilité des largeurs | `specs/002-b2b-organizations-rbac/evidence/ui-final-qa-artifacts/contact-sheets/contact-10.png` |
| A15 | screenshot | Profil FR mobile avec alerte d’erreur et bouton recouvert | `specs/002-b2b-organizations-rbac/evidence/ui/current/profile-error-fr-375.png` |
| A16 | screenshot | Profil FR mobile, formulaire et labels longs | `specs/002-b2b-organizations-rbac/evidence/ui/current/profile-top-fr-375.png` |
| A17 | screenshot | Organisations FR mobile, état erreur | `specs/002-b2b-organizations-rbac/evidence/ui/current/organizations-error-fr-375.png` |
| A18 | screenshot | Organisations FR mobile, état succès et bouton bas | `specs/002-b2b-organizations-rbac/evidence/ui/current/organizations-created-fr-375.png` |
| A19 | screenshot | Organisations FR mobile, vide/chargement | `specs/002-b2b-organizations-rbac/evidence/ui/current/organizations-empty-fr-375.png` |
| A20 | screenshot | Attribution FR mobile remplie/succès | `specs/002-b2b-organizations-rbac/evidence/ui/current/client-assignment-filled-fr-375.png` |
| A21 | screenshot | Dialogue de retrait FR mobile | `specs/002-b2b-organizations-rbac/evidence/ui/current/client-revoke-dialog-fr-375.png` |
| A22 | screenshot | Attribution FR mobile état succès | `specs/002-b2b-organizations-rbac/evidence/ui/current/client-assignment-success-fr-375.png` |
| A23 | screenshot | Audit FR mobile table, fin de table, pagination | `specs/002-b2b-organizations-rbac/evidence/ui/current/audit-table-end-fr-375.png` |
| A24 | screenshot | Audit FR mobile global/ancienne page | `specs/002-b2b-organizations-rbac/evidence/ui/current/audit-global-fr-375.png` |
| A25 | source-test | Assertions clavier, dialogue, focus et portée UI | `tests/e2e/b2b.spec.ts` |
| A26 | source-test | Capture des états FR/EN, largeurs et états de formulaire | `tests/e2e/b2b-visual.spec.ts` |
| A27 | source-component | Composition des attributions et scope UI | `apps/web/src/pages/RoleAssignments.tsx` |
| A28 | screenshot | Audit desktop FR en clair | `specs/002-b2b-organizations-rbac/evidence/ui/current/audit-global-fr-1280.png` |
| A29 | screenshot | Audit desktop FR fin de table | `specs/002-b2b-organizations-rbac/evidence/ui/current/audit-table-end-fr-1280.png` |
| A30 | screenshot | Sidebar desktop réduite FR sombre | `specs/002-b2b-organizations-rbac/evidence/ui/current/sidebar-collapsed-fr-1280.png` |
| A31 | screenshot | Sidebar mobile ouverte FR sombre | `specs/002-b2b-organizations-rbac/evidence/ui/current/sidebar-mobile-open-fr-375.png` |
| A32 | source-style | CSS de barre fixe et dégagement mobile | `apps/web/src/ui/shell.css` |
| A33 | screenshot | Dialogue impact FR mobile | `specs/002-b2b-organizations-rbac/evidence/ui/current/roles-impact-dialog-fr-375.png` |
| A34 | screenshot | Dialogue impact FR desktop | `specs/002-b2b-organizations-rbac/evidence/ui/current/roles-impact-dialog-fr-1280.png` |
| A35 | contract | Contrat responsive/accessibilité Brume | `DESIGN_UI.md` |
| A36 | source-log | Résultats 46 tests UI mockés, dont b2b visual et b2b | `specs/002-b2b-organizations-rbac/evidence/ui-current-tests.log` |

## Limites et suites requises

- Aucun verdict d’autorisation, de persistance ou d’isolation ne peut être PASS depuis des réponses simulées ; il faut une exécution API/SQL réelle avec infrastructure jetable explicitement configurée.
- Escape/focus est vérifié dans le code de test et le journal antérieur, pas rejoué ici ; il faut une passe navigateur autorisée pour un PASS indépendant de cette interaction.
- Lighthouse/axe et conformité WCAG exhaustive ne sont pas exécutés.
- Le blocage responsive à 375px doit être corrigé ou démontré comme non-recouvrant par une capture d’action ciblée, puis les états touchés doivent être recapturés et revus.
