# UI, état et navigation

Références : `apps/web/src/main.tsx` (React Router),
`apps/web/src/application.tsx` (`Application`, `AcceptInvitation`, `Security`,
`NotFound`, `AccessDenied`), `apps/web/src/auth/AuthPage.tsx`,
`apps/web/src/admin/AdminSidebar.tsx`. Réutiliser ces surfaces avant extraction ;
aucune bibliothèque de composants ou de formulaires dédiée identifiée.

Les références suivantes appartiennent au code fusionné dans PR7.
Les conventions Brume actuelles ci-dessous supplantent les observations historiques.

- État local `useState`/`useEffect` ; portée d'organisation issue de l'URL,
  conservée dans les liens et l'historique. Pas de store global à introduire.
- Formulaires HTML avec labels, `required`, limites et `FormData` ; serveur
  toujours responsable de la validation et des permissions.
- `api` et `HttpError` dans `apps/web/src/http.ts`, `authClient` dans
  `apps/web/src/auth/client.ts` : réutiliser les appels same-origin et états busy.
- Feedback intégré par `role="alert"`, `role="status"`, `aria-busy` ; préserver
  navigation clavier, labels et retours d'erreur. Pas de système toast à ajouter.
- `apps/web/src/i18n.ts` : `useLanguage`, `uiMessages`, `UIMessage`, locale
  persistée en localStorage. Auth : `apps/web/src/auth/messages.ts`.
  Français par défaut et anglais ; textes, erreurs et labels par clés.
  Utiliser `Intl` pour tout nouveau format localisé ; aucune garantie globale
  d'usage actuel d'Intl ou conformité WCAG n'a été démontrée.
- `apps/web/src/styles.css` : styles existants, tokens et media queries.
`DESIGN_UI.md` est le contrat actif Brume ; `DESIGN.md` y renvoie. La couche
`apps/web/src/ui` porte les primitives partagées, sans framework visuel concurrent.
- `apps/web/src/auth/redirect.ts` : destinations sûres. Les gardes de `/admin`
  se fondent sur `/api/me` et ne remplacent jamais les contrôles API/SQL.
- Ne conserver ni credentials ni jetons en localStorage. Les invitations passent
  par fragment et mémoire, avec les limites décrites dans ADR-005.
- Vérifier les parcours critiques fr/en, mobile/tablette/desktop et absence de
  débordement horizontal ; réutiliser `tests/e2e/home.spec.ts`,
  `tests/e2e/auth.spec.ts`, `tests/e2e/admin.spec.ts`, `tests/e2e/tenant-scope.spec.ts`.
  Les sessions simulées des tests UI ne prouvent pas l'isolation serveur.

## Brume — conventions actuelles

`application.tsx` garde les gardes/transactions UI ; les compositions sont dans
`pages`, les primitives et le shell dans `ui`. `http.ts` possède api/HttpError.
`useLanguage` partage les préférences via un abonnement React ; le cache local est
utilisé avant connexion puis la préférence propre au compte vient de l'API. Aucun
jeton n'y est persisté. Les confirmations utilisent le dialogue HTML modal natif,
avec focus restitué et annulation ; les listes ont filtres locaux et états distincts.
La galerie interactive dans /docs est réservée aux super-admins et sans écriture
métier. Les textes/mesures de DESIGN_UI.md supplantent les anciennes observations
historiques ci-dessus. Les captures UI interceptées ne prouvent pas le backend SQL.
