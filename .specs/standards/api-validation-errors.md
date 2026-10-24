# API, validation et erreurs

- Étendre `registerBusinessRoutes` dans `apps/api/src/business/routes.ts` pour
  les opérations métier existantes. `apps/api/src/auth/routes.ts` adapte Better
  Auth sans fabriquer de permissions. Pas de couche supplémentaire sans besoin concret.
- Validation runtime : JSON Schema natif Fastify (validateur Ajv intégré), schémas
  `uuid`, `shortName`, `emailSchema`, `roleSchema`, `tenantQuery` dans les routes.
  Types TypeScript seuls ne valident pas les entrées. Pas de Zod installé.
- Réutiliser les contraintes de longueur, formats, enums et
  `additionalProperties: false` là où le contrat le prévoit ; requêtes SQL paramétrées.
- Contrats publics : `packages/shared/src/index.ts` (`HealthResponse`,
  `AccessContext`, `Workspace`, `MeResponse`). Tous les DTO de routes ne sont pas
  partagés et tous les retours n'ont pas de schéma de réponse : ne pas prétendre le contraire.
- Auth et origine : session vérifiée, contrôle Origin sur les écritures,
  contexte relu dans la transaction métier ; voir standard B2B obligatoire.
- `apps/api/src/app.ts` centralise les erreurs métier : 400 `INVALID_REQUEST`,
  401 `UNAUTHENTICATED` via `AccessError`, 403 `ACCESS_DENIED`/`UNTRUSTED_ORIGIN`,
  404 `NOT_FOUND`, 409 `CONFLICT`, 429 `RATE_LIMITED`, 500 `INTERNAL_ERROR`.
  Ne pas exposer SQL, paramètres, mail ou détails internes. Better Auth conserve
  ses propres contrats via son adaptateur ; ne pas lui imposer le format métier.
- Les créations métier retournent 201. `/health` est la liveness ; `/ready`
  vérifie la disponibilité configurée et renvoie 503 en échec.
- Limitation métier par processus ; auth en DB. Les règles exactes sont dans
  `apps/api/src/app.ts` et `apps/api/src/auth/service.ts`.
- Tests réutilisables : `apps/api/src/app.test.ts`,
  `apps/api/src/auth/http.test.ts`, `apps/api/src/business/isolation.integration.test.ts`.
