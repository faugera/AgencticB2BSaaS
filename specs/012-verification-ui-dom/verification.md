# Vérification : Vérification UI par socle DOM minimal

Résultats locaux du 15 novembre 2026, branche `codex/rattrapage-documentaire`
issue de `main` (`94e8b9a`).

## Contrôles exécutés

| Contrôle | Résultat | Détail |
|---|---|---|
| `pnpm typecheck` | **PASS** | racine et trois workspaces |
| `pnpm lint` | **PASS** | zéro warning |
| `pnpm test` | **PASS** | 21 fichiers, 128 tests, dont 6 tests DOM en `jsdom` |
| `pnpm docs:test` | **PASS** | 40 tests |
| `pnpm build` | **PASS** | build complet des trois workspaces |
| `pnpm docs:check` | **PASS** | structure, liens, manifestes et décisions du diff valides |
| `pnpm smoke` | NOT_RUN | hors périmètre du lot |

## Preuves DOM

| Fichier | Cas couverts |
|---|---|
| `apps/web/src/admin/navigation.dom.test.tsx` | 2 tests : liens plateforme seuls sur `/admin` ; liens tenant filtrés par permissions et `tenantId` conservé |
| `apps/web/src/test/application-guard.dom.test.tsx` | 2 tests : non super-admin redirigé de `/admin` vers `/403` ; super-admin redirigé de `/app` vers `/admin` |
| `apps/web/src/test/organizations-form.dom.test.tsx` | 2 tests : création de tenant via `mutate()` ; création d'organisation sur le chemin non idempotent |

Les appels réseau sont simulés : aucun serveur, aucune base, aucun navigateur.

## Contrôles non exécutés

| Contrôle | Résultat | Motif |
|---|---|---|
| Navigateur réel (Playwright) | NOT_RUN | retiré à la demande du propriétaire le 7 novembre 2026 ; décision D2 maintenue |
| Rendu CSS, responsive, clavier réel | NOT_RUN | hors périmètre de `jsdom` |
| `pnpm smoke` | NOT_RUN | hors périmètre du lot |
| `pnpm verify:security` / `pnpm verify:tenant-isolation` | NOT_RUN | PostgreSQL jetable non configuré |
| CI distante | NOT_RUN | non consultée |

## Portée du diff

- `package.json`, `pnpm-lock.yaml` : `jsdom`, `@testing-library/react`,
  `@testing-library/dom` en dépendances de développement.
- `vitest.config.ts` : `include` étendu à `*.test.{ts,tsx}`, environnement `node`
  par défaut conservé.
- Trois fichiers de tests DOM uniquement ; aucun composant de production modifié.
- Documentation : `docs/testing.md`, `specs/STATUS.md`, `CHANGELOG.md`,
  `specs/008-admin-control-plane/tasks.md`, `specs/010-rattrapage-documentaire/`.

## Limites

- Ces tests prouvent une logique de navigation, pas une autorisation : le serveur
  reste l'autorité et conserve ses propres tests de refus.
- Aucune assertion de style, de disposition ou d'accessibilité réelle n'est
  revendiquée.
- La CI exécute ces tests via `pnpm test`, mais elle n'a pas été observée dans cette
  session.
