# Plan d'implémentation : Édition sûre du profil par tenant

**Branch**: `faugera-edition-profils-b2b` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

## Summary

Le profil et ses routes existent déjà. Le changement corrige leur comportement lors
d'un changement de portée : le formulaire précédent est retiré immédiatement, le
nouveau profil est chargé et les réponses tardives ne changent pas l'état courant.
L'API, la transaction métier existante et les fonctions SQL restent les autorités.

## Contexte technique

- **Langage/versions** : TypeScript strict, Node 24, pnpm 11.25.
- **Dépendances** : React/Vite, Fastify, Better Auth et PostgreSQL/pg déjà en place.
- **Stockage** : `identity.user` pour les informations personnelles ; membership pour
  les métadonnées professionnelles du tenant.
- **Tests** : Vitest pour API/DTO ; Playwright pour les parcours navigateur.
- **Périmètre** : composant de formulaire et tests navigateur ; aucune migration ni
  nouvelle dépendance.
- **Objectif** : aucun formulaire ni message de l'ancien tenant ne reste actif après
  un changement de portée.

## Constitution Check

- Réutilisation du monolithe modulaire et du code existant : conforme.
- Autorisation par identité vérifiée, transaction locale et permissions persistées :
  conforme via `transact` et `businessTransaction`.
- Pas de sélecteur d'acteur, de permissions client ou de nouveau chemin d'autorisation :
  conforme.
- UI FR/EN, navigation clavier et retours accessibles : requis et vérifiés.
- Aucun changement de modèle, d'API ou d'environnement : documentation d'architecture
  non modifiée ; la spec et ce plan conservent le périmètre de la correction.

## Décisions de conception

Le chargement doit être associé à la query tenant ; une query différente ne peut pas
afficher le profil précédent, même pendant le rendu précédant l'effet React. Les
annonces de chargement, enregistrement et succès utilisent une région de statut stable,
placée hors de la région `aria-busy`. Si la portée change pendant que le focus est dans
le formulaire, le focus rejoint le statut de chargement. Les opérations d'écriture
terminées après un changement de portée ne mettent pas à jour l'interface courante.

Aucun middleware dédié n'est requis : `registerBusinessRoutes` passe le profil par
`transact`, qui vérifie la session, l'origine des écritures et délègue à la transaction
métier tenant-scopée. La base n'accepte les mutations de profil que pour l'acteur
courant et refuse les memberships non autorisées. Le profil de compte n'accepte aucun
identifiant cible ni champ de rôle.

## Structure concernée

```text
apps/api/src/business/profile-routes.ts
apps/api/src/business/profile-dto.ts
apps/api/src/business/profile-routes.test.ts
apps/web/src/pages/ProfileDetailsForm.tsx
apps/web/src/pages/b2b-messages.ts
tests/e2e/frontend-pages.spec.ts
```

Les routes et tests d'intégration PostgreSQL existants seront vérifiés sans créer de
middleware ou de migration. La correction UI gardera les modifications dans le
formulaire et son test de parcours.

## Hors périmètre et complexité

Aucune nouvelle abstraction, migration SQL, modification Better Auth, permission,
route, dépendance ou mise à jour de la carte B2B. Les limites et preuves restent
explicites dans [quickstart.md](quickstart.md).
