# Analyse : Idempotence côté client

Contrôle de cohérence entre `spec.md`, `plan.md`, `tasks.md` et le diff réalisé,
le 15 novembre 2026, branche `codex/rattrapage-documentaire`.

## Couverture des exigences

| Exigence | Tâches | Preuve |
|---|---|---|
| FR-001 (clé sur les 4 mutations) | T003, T004 | `mutate()` appelé par `Organizations.tsx`, `InvitationManagement.tsx` (création, retry, revoke), `AccessRequests.tsx` |
| FR-002 (rejeu unique, même clé) | T001, T003 | test `replays once with the same key when the transport fails` |
| FR-003 (pas de rejeu sur erreur HTTP) | T002, T003 | test `does not replay an HTTP error` |
| FR-004 (lectures inchangées) | T002, T003 | test `sends no idempotency key on reads` ; `api()` intact |
| FR-005 (contrats inchangés) | T003 | test `keeps the Zod contract for schema calls` ; aucun schéma modifié |
| FR-006 (preuves unitaires) | T001, T002 | `apps/web/src/http-idempotency.test.ts`, 6 tests |
| FR-007 (documentation) | T005 | `docs/features-b2b.md`, `.specs/domains/product-map.md` |

## Cohérence interne

- Le plan annonce « aucun changement serveur » : le diff ne touche ni `apps/api`
  ni `apps/api/migrations` ni `packages/shared`.
- La spec annonce quatre mutations idempotentes : le serveur en déclare exactement
  quatre (`tenant.created`, `invitation.created`, `invitation.updated`,
  `access_request.reviewed`).
- La spec annonce l'absence de rejeu sur HTTP : `mutate()` ne réessaie que dans le
  `catch` de `send`, qui couvre les échecs de transport ; `read()` lève après réponse.
- Le test vit dans un fichier séparé pour ne pas remplacer `http.test.ts` et
  préserver ses 5 tests existants.

## Écarts et décisions

- `documentation-impact.md` de la spec 011 est consolidé dans celui de la spec 010 :
  le contrôle `docs-check` exige un impact unique lorsque deux specs figurent dans
  le même diff. Les deux specs restent distinctes.
- Le rejeu est borné à une tentative : un second échec de transport propage
  l'erreur, sans boucle ni délai.
- La clé est générée par `crypto.randomUUID()` : 36 caractères, bien en dessous de
  la limite serveur de 200.

## Risques résiduels

- Le rejeu ne couvre pas une réponse perdue après traitement serveur si l'erreur
  réseau survient avant l'établissement de la connexion ; la clé protège alors le
  second envoi, ce qui est l'objectif.
- Aucun test d'intégration PostgreSQL n'exerce la clé de bout en bout dans ce lot :
  `NOT_RUN`.
- La livraison SMTP reste « au moins une fois » ; l'idempotence HTTP ne la rend pas
  exactement-une-fois.

## Verdict

Cohérent et borné. Aucune violation de la constitution ni élargissement de périmètre.
