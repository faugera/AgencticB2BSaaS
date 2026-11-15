# Vérification : Idempotence côté client

Résultats locaux du 15 novembre 2026, branche `codex/rattrapage-documentaire` issue
de `main` (`94e8b9a`). Les contrôles portent sur les modifications du lot 4.

## Contrôles exécutés

| Contrôle | Résultat | Détail |
|---|---|---|
| `pnpm typecheck` | **PASS** | racine et trois workspaces |
| `pnpm lint` | **PASS** | zéro warning |
| `pnpm test` | **PASS** | 18 fichiers, 122 tests (116 existants + 6 nouveaux) |
| `pnpm docs:test` | **PASS** | 40 tests, 40 réussis |
| `pnpm docs:check` | **PASS** | structure, liens, manifestes et décisions du diff valides |

## Contrôles non exécutés

| Contrôle | Résultat | Motif |
|---|---|---|
| `pnpm build` | PASS en CI | run `43737124731` |
| `pnpm smoke` | PASS en CI | run `43737124731` |
| `pnpm verify:security` | PASS en CI | PostgreSQL jetable, run `43737124731` |
| `pnpm verify:tenant-isolation` | PASS en CI | PostgreSQL jetable, run `43737124731` |
| Rejeu réel navigateur / API | NOT_RUN | aucun environnement pilote configuré dans cette session |
| CI distante | **PASS** | run `43737124731`, 2 min 14 s |

## Preuves unitaires

`apps/web/src/http-idempotency.test.ts` couvre six cas :

1. `api()` sur GET n'envoie aucun `Idempotency-Key`.
2. `mutate()` envoie une clé UUID v4, la méthode `POST` et le `content-type`.
3. Un échec de transport déclenche exactement deux requêtes avec la même clé.
4. Deux soumissions distinctes produisent deux clés différentes.
5. Une réponse HTTP 400 n'est pas rejouée et propage `HttpError`.
6. La validation Zod reste appliquée aux réponses de `mutate()`.

## Portée du diff

- `apps/web/src/http.ts` : nouvelle fonction `mutate()`, factorisation
  `splitArgs`/`send`/`read` ; `api()` conserve son comportement.
- Pages branchées : `Organizations.tsx` (création de tenant),
  `InvitationManagement.tsx` (création, retry, revoke),
  `AccessRequests.tsx` (revue).
- Tests : `apps/web/src/http-idempotency.test.ts` (nouveau).
- Documentation : `docs/features-b2b.md`, `.specs/domains/product-map.md`,
  `specs/STATUS.md`.
- Aucun changement de schéma, de migration, d'autorisation ni de contrat partagé.

## Limites

- Le serveur reste seul juge de l'idempotence ; le client transmet une clé, il ne
  garantit rien à lui seul.
- La perte de réponse après traitement serveur est couverte par la clé côté serveur,
  mais n'est pas rejouée en intégration réelle dans ce lot.
- Le double-clic reste limité par l'état `busy` des boutons, pas par l'idempotence.
