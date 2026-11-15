# Plan d'implémentation : Vérification UI par socle DOM minimal

## Résumé

Ajouter un harnais DOM minimal (jsdom + Testing Library) au runner Vitest
existant, sans navigateur ni nouvelle étape CI. Trois fichiers de tests couvrent
la séparation de navigation, les redirections de garde et le branchement d'un
formulaire sur `mutate()`.

## Vérification de la constitution

Les tests d'interface ne deviennent jamais une autorité : les refus et les
portées restent décidés côté serveur. Aucun secret, jeton ni donnée réelle n'est
utilisé ; les fixtures sont locales. Aucune migration ni permission n'est
modifiée. Aucune fusion ni déploiement automatique.

## Approche

1. Installer `jsdom`, `@testing-library/react` et `@testing-library/dom` en
   dépendances de développement à la racine (Vitest y est déjà).
2. Étendre l'`include` Vitest de `*.test.ts` à `*.test.{ts,tsx}` ; les tests DOM
   déclarent `@vitest-environment jsdom` dans leur propre fichier, les autres
   restent en environnement `node`.
3. Trois fichiers :
   - `apps/web/src/admin/navigation.dom.test.tsx` : liens tenant vs plateforme,
     liens conditionnels et propagation du `tenantId`.
   - `apps/web/src/test/application-guard.dom.test.tsx` : refus `/admin` et
     redirection `/app` → `/admin`.
   - `apps/web/src/test/organizations-form.dom.test.tsx` : soumission du
     formulaire de création de tenant via `mutate()`.
4. Documenter la portée dans `docs/testing.md` et l'état dans
   `specs/STATUS.md`.
5. Exécuter `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm docs:test`,
   `pnpm docs:check`.

## Structure concernée

```text
package.json
pnpm-lock.yaml
vitest.config.ts
apps/web/src/admin/navigation.dom.test.tsx
apps/web/src/test/application-guard.dom.test.tsx
apps/web/src/test/organizations-form.dom.test.tsx
docs/testing.md
specs/012-verification-ui-dom/
```

## Limites assumées

Pas de rendu CSS, pas de responsive, pas de clavier réel, pas d'authentification
navigateur, pas de Playwright. Ces contrôles restent hors périmètre et ne sont
pas présentés comme couverts.
