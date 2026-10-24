# UI, état et navigation

Références : `apps/web/src/main.tsx` (React Router),
`apps/web/src/application.tsx` (`Application`, `AcceptInvitation`, `Security`,
`NotFound`, `AccessDenied`), `apps/web/src/auth/AuthPage.tsx`,
`apps/web/src/admin/AdminSidebar.tsx`. Réutiliser ces surfaces avant extraction ;
aucune bibliothèque de composants ou de formulaires dédiée identifiée.

`AdminSidebar.tsx`, les gardes `/admin` et les tests admin/tenant-scope cités ici
sont des observations du travail local préexistant, exclu de cette PR documentaire.
Sur un checkout propre, vérifier leur présence avant réutilisation ; conserver les
patterns disponibles dans `Application`/`AuthPage` si cette évolution n'est pas livrée.

- État local `useState`/`useEffect` ; portée d'organisation issue de l'URL,
  conservée dans les liens et l'historique. Pas de store global à introduire.
- Formulaires HTML avec labels, `required`, limites et `FormData` ; serveur
  toujours responsable de la validation et des permissions.
- `api` et `HttpError` dans `application.tsx`, `authClient` dans
  `apps/web/src/auth/client.ts` : réutiliser les appels same-origin et états busy.
- Feedback intégré par `role="alert"`, `role="status"`, `aria-busy` ; préserver
  navigation clavier, labels et retours d'erreur. Pas de système toast à ajouter.
- `apps/web/src/i18n.ts` : `useLanguage`, `uiMessages`, `UIMessage`, locale
  persistée en localStorage. Auth : `apps/web/src/auth/messages.ts`.
  Français par défaut et anglais ; textes, erreurs et labels par clés.
  Utiliser `Intl` pour tout nouveau format localisé ; aucune garantie globale
  d'usage actuel d'Intl ou conformité WCAG n'a été démontrée.
- `apps/web/src/styles.css` : styles existants, tokens et media queries.
  `DESIGN.md` reste la direction visuelle proposée ; ne pas créer de bibliothèque UI.
- `apps/web/src/auth/redirect.ts` : destinations sûres. Les gardes de `/admin`
  se fondent sur `/api/me` et ne remplacent jamais les contrôles API/SQL.
- Ne conserver ni credentials ni jetons en localStorage. Les invitations passent
  par fragment et mémoire, avec les limites décrites dans ADR-005.
- Vérifier les parcours critiques fr/en, mobile/tablette/desktop et absence de
  débordement horizontal ; réutiliser `tests/e2e/home.spec.ts`,
  `tests/e2e/auth.spec.ts`, `tests/e2e/admin.spec.ts`, `tests/e2e/tenant-scope.spec.ts`.
  Les sessions simulées des tests UI ne prouvent pas l'isolation serveur.
