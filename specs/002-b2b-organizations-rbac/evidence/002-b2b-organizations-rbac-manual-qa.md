# Manual QA — seconde passe visuelle B2B

Date : 2026-10-25  
Périmètre : lecture seule, captures existantes uniquement ; aucun serveur lancé et aucune écriture produit.  
Dossier de tentative : `specs/002-b2b-organizations-rbac/evidence` (le wrapper `omo ulw-loop status --json` n'a pas retourné de statut exploitable sous Windows).

## Verdict global

**FAIL / NEEDS WORK pour la vérification visuelle du build courant.** Les douze PNG sont lisibles et présentent globalement des labels FR/EN sans clipping évident sur les écrans profil. Ils sont cependant antérieurs à des modifications du shell, du profil et de l'audit ; les captures de rôles ne couvrent pas la page entière et aucune preuve visuelle ne couvre les routes organisations ou audit, ni les états modale ouverts/erreur/pagination.

## `manualQa.surfaceEvidence`

| scenario id | criterion reference | surface | invocation exacte | verdict | artifactRefs |
|---|---|---|---|---|---|
| VQ-001 | SC-004 / FR-009 — profil FR/EN responsive | PNG navigateur, profil, 375/768/1280 | `view_image(path=<profile-fr/en-{375,768,1280}.png>, detail=high)` puis lecture visuelle pixel/surface | FAIL — aucune troncature évidente, mais preuve stale après modifications de `Profile.tsx`/`AppShell.tsx` à 18:56 | A01–A06, A13, A15 |
| VQ-002 | SC-004 / FR-009 — catalogue et attributions FR/EN responsive | PNG navigateur, rôles, 375/768/1280 | `view_image(path=<roles-fr/en-{375,768,1280}.png>, detail=high/original)` | FAIL — les images 768/1280 commencent au milieu du formulaire interne ; la couverture du titre/catalogue et des états complets est absente ; shell stale | A07–A12, A13, A15, A16 |
| VQ-003 | DESIGN_UI §9 — labels, texte long et absence de débordement global | captures profil/rôles FR/EN | Même invocation `view_image` sur les 12 PNG ; dimensions/signatures contrôlées par PowerShell | FAIL — labels lisibles dans les zones visibles, mais aucun contrôle live courant de `scrollWidth`, reflow ou zoom ; le test source est mocké | A01–A12, A14, A16 |
| VQ-004 | DESIGN_UI §5/§9 — clavier, dialogue modal, restitution du focus | surface navigateur simulée déclarée par `b2b.spec.ts` | Lecture de `tests/e2e/b2b.spec.ts` : `page.keyboard.press('Escape')`, assertion `toBeFocused()` et `getByRole('dialog')` | FAIL — aucune exécution ni capture fraîche ; `ui.md` est une déclaration précédente et les réponses API sont simulées | A13, A14 |
| VQ-005 | FR-001..008 / SC-004 — organisations | route `/admin/organizations`, surface navigateur | Recherche statique des routes puis recherche d'une capture `organizations-*`; aucune capture disponible, aucun serveur lancé | FAIL — route non couverte visuellement ; aucune preuve de liste vide/chargement/erreur/création | A15, A17 |
| VQ-006 | FR-005..009 / SC-004 — attributions | `/app/roles?tenantId=tenant`, formulaire d'attribution | Capture rôles seulement ; lecture de `RoleAssignments.tsx` et de l'assertion source dans `b2b.spec.ts` | FAIL — la section vide est visible, mais pas l'état avec membres/assignation réussie/refus/confirmation ; mock-only | A07–A12, A14, A17 |
| VQ-007 | FR-015 / SC-004 — journal d'audit | `/admin/audit` et `/admin/audit?tenantId=...` | Recherche statique `AuditLog.tsx`/`audit.spec.ts`; aucune capture `audit-*`, aucun serveur lancé | FAIL — aucune preuve visuelle des tables, scroll local, pagination, empty/error ou global/tenant | A13, A17 |
| VQ-008 | preuve d'artefact uniquement | fichiers PNG sous `specs/002-b2b-organizations-rbac/evidence/ui` | PowerShell : lecture signature PNG, dimensions IHDR, taille, date ; résultat consigné dans `visual-integrity-secondpass.txt` | PASS — 12/12 non vides, signature PNG correcte, dimensions conformes au suffixe | A01–A12, A18 |

## `manualQa.adversarialCases`

| scenario id | criterion reference | adversarial class | expected behavior | verdict | artifactRefs |
|---|---|---|---|---|---|
| ADV-001 | DESIGN_UI §9 / SC-004 | FR/EN text clipping and orphan labels | Labels, headings, helper text and error messages remain readable at all three widths | FAIL — no obvious clipping in visible profile frames; freshness and incomplete role scroll prevent a PASS current-build | A01–A12, A15 |
| ADV-002 | DESIGN_UI §6 / SC-004 | responsive overflow / fixed bottom navigation occlusion | No global horizontal overflow; fixed mobile navigation must not hide actionable content | FAIL — `roles-fr/en-375.png` shows the fixed nav cutting through the permission list (a permission checkbox row is split across the nav); fullPage + internal scroll makes product impact unproven and requires a fresh viewport/scroll capture | A07, A08, A16 |
| ADV-003 | DESIGN_UI §5/§9 | keyboard Escape and focus restoration | Open impact dialog closes on Escape and returns focus to its trigger | FAIL — source assertions exist, but no fresh browser action log or modal screenshot was run | A14, A15 |
| ADV-004 | DESIGN_UI §5/§7 | modal visual bounds and confirmation state | Open dialog is visible, bounded, labelled, and exposes cancel/confirm actions | FAIL — no screenshot of the open dialog; existing role screenshots show only the closed/edited page | A07–A12, A14 |
| ADV-005 | FR-001..018 / SC-005 | affected route/state coverage | Organizations, assignments, audit, loading/empty/error/paged states have fresh FR/EN responsive evidence | FAIL — only profile and roles captures exist; organizations/audit absent and role states incomplete | A01–A17 |
| ADV-006 | FR-003..008 / SC-001..002 | backend authorization/persistence | Server rejects foreign tenant, self/peer/superior and persists audit atomically | FAIL — no backend verdict permitted from these mocks; real API/SQL prerequisites were intentionally not run in this visual pass | A13, A14, A17 |

## `artifactRefs`

| id | kind | description | path |
|---|---|---|---|
| A01 | screenshot | profil FR mobile | `specs/002-b2b-organizations-rbac/evidence/ui/profile-fr-375.png` |
| A02 | screenshot | profil EN mobile | `specs/002-b2b-organizations-rbac/evidence/ui/profile-en-375.png` |
| A03 | screenshot | profil FR tablette | `specs/002-b2b-organizations-rbac/evidence/ui/profile-fr-768.png` |
| A04 | screenshot | profil EN tablette | `specs/002-b2b-organizations-rbac/evidence/ui/profile-en-768.png` |
| A05 | screenshot | profil FR desktop | `specs/002-b2b-organizations-rbac/evidence/ui/profile-fr-1280.png` |
| A06 | screenshot | profil EN desktop | `specs/002-b2b-organizations-rbac/evidence/ui/profile-en-1280.png` |
| A07 | screenshot | rôles FR mobile | `specs/002-b2b-organizations-rbac/evidence/ui/roles-fr-375.png` |
| A08 | screenshot | rôles EN mobile | `specs/002-b2b-organizations-rbac/evidence/ui/roles-en-375.png` |
| A09 | screenshot | rôles FR tablette | `specs/002-b2b-organizations-rbac/evidence/ui/roles-fr-768.png` |
| A10 | screenshot | rôles EN tablette | `specs/002-b2b-organizations-rbac/evidence/ui/roles-en-768.png` |
| A11 | screenshot | rôles FR desktop | `specs/002-b2b-organizations-rbac/evidence/ui/roles-fr-1280.png` |
| A12 | screenshot | rôles EN desktop | `specs/002-b2b-organizations-rbac/evidence/ui/roles-en-1280.png` |
| A13 | document | preuve UI déclarée et limites, non ré-exécutée ici | `specs/002-b2b-organizations-rbac/evidence/ui.md` |
| A14 | source-test | test e2e B2B mocké, assertions clavier/dialogue/assignation | `tests/e2e/b2b.spec.ts` |
| A15 | design-contract | contrat Brume, responsive, labels et accessibilité | `DESIGN_UI.md` |
| A16 | source-style | shell responsive, navigation fixe mobile, padding/overflow | `apps/web/src/ui/shell.css` |
| A17 | source-route | routage et pages organizations/roles/audit | `apps/web/src/application.tsx`, `apps/web/src/pages/{Organizations,Roles,RoleAssignments,AuditLog}.tsx` |
| A18 | integrity-log | contrôle signature, taille, dimensions et fraîcheur des PNG | `specs/002-b2b-organizations-rbac/evidence/visual-integrity-secondpass.txt` |

## Limites non négociables

- Pas de serveur lancé, pas de navigateur exécuté, pas de `curl`, pas d'API/SQL réel : aucune conclusion backend/RBAC/persistance ne découle des mocks.
- Les captures sont toutes de 18:55:51–18:55:52 ; `Profile.tsx`, `AuditLog.tsx` et `AppShell.tsx` sont datés 18:56:29 dans le checkout courant. Une nouvelle série complète doit être capturée après stabilisation.
- La ré-exécution attendue doit couvrir `/admin/profile`, `/admin/roles`, `/app/roles?tenantId=...`, `/admin/organizations`, `/admin/audit`, `/admin/audit?tenantId=...`, FR/EN, 375/768/1280, états loading/empty/error, dialogue ouvert, Escape/focus et contenu assigné.
