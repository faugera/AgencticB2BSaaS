# Analyse : Vérification UI par socle DOM minimal

Contrôle de cohérence entre `spec.md`, `plan.md`, `tasks.md` et le diff réalisé,
le 15 novembre 2026, branche `codex/rattrapage-documentaire`.

## Couverture des exigences

| Exigence | Tâches | Preuve |
|---|---|---|
| FR-001 (dépendances de développement) | T001 | `package.json` (racine), `pnpm-lock.yaml` |
| FR-002 (jsdom par fichier, sans navigateur) | T002 | `vitest.config.ts`, en-têtes `@vitest-environment jsdom` |
| FR-003 (parcours critiques) | T003, T004, T005 | 6 tests dans 3 fichiers |
| FR-004 (aucun code de production, autorité serveur) | — | Diff limité aux tests, configuration et documentation |
| FR-005 (documentation et CI) | T006 | `docs/testing.md`, section « Socle DOM minimal » |

## Cohérence interne

- Le plan annonce trois fichiers et six tests : le diff livre exactement
  `navigation.dom.test.tsx` (2), `application-guard.dom.test.tsx` (2) et
  `organizations-form.dom.test.tsx` (2).
- Aucun composant de production n'est modifié : les tests importent l'existant.
- Les tests ne dépendent ni du réseau, ni de PostgreSQL, ni de Mailpit ; `fetch` et
  `api` sont simulés.
- L'environnement `node` reste le défaut : seuls les fichiers `*.dom.test.tsx`
  déclarent `jsdom`.

## Écarts et décisions

- Le fichier `apps/web/src/http.test.ts` conserve son rôle : les tests DOM vivent
  dans des fichiers séparés et n'altèrent pas les tests existants.
- Le test de navigation utilise les liens rendus (`href`) plutôt que des textes
  traduits, pour rester stable entre le français et l'anglais.
- Le formulaire de création d'organisation est explicitement vérifié comme non
  idempotent : seule la création de tenant passe par `mutate()`.

## Risques résiduels

- `jsdom` ne rend pas la mise en page : aucune assertion CSS, responsive ou de
  débordement n'est revendiquée.
- Aucun rendu de navigateur réel n'est exercé ; la décision du 7 novembre 2026 de
  retirer Playwright reste en vigueur.
- Les tests d'interface ne prouvent aucune autorisation : les refus et portées
  restent vérifiés par les suites serveur.

## Verdict

Cohérent, borné, sans élargissement de l'autorité applicative.
