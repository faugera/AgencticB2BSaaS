# Contrats API : Fiabilisation du socle SaaS

Ce document fixe les comportements externes à préserver ou à ajouter. Les DTO
existants restent décrits par les routes et types partagés ; les réponses ne
doivent pas être présumées valides uniquement parce qu’elles portent un type
TypeScript.

## Rejeu des mutations critiques

Les routes de création couvertes acceptent une clé d’idempotence opaque par
requête :

- `POST /api/platform/tenants`
- `POST /api/organizations/:id/tenants`
- `POST /api/invitations`
- `POST /api/access-requests/:id` lorsqu’une revue d’accès déclenche une invitation

La clé est liée à l’acteur, l’action, la portée et l’empreinte du contenu
normalisé, incluant la méthode, la route, les paramètres, la requête et le
corps. Même clé dans la même portée et même requête : renvoyer le résultat
initial sûr, sans nouvelle mutation. Même clé et empreinte différente dans
cette portée : `409 CONFLICT`. Une portée distincte (par exemple une autre
organisation) constitue une opération séparée. Le résultat ne contient jamais
le jeton d’invitation ni la charge de l’email. La réservation est conservée au
maximum 24 heures ; après expiration, la clé n’est plus garantie.

La création peut rester `201 Created` pour la ressource métier ; la livraison
peut être `pending`. Le client ne doit pas interpréter `201` comme une livraison
email confirmée.

## Livraison et consultation d’état

Les événements de provisionnement identité et les emails de vérification,
d’activation et d’invitation sont durables et reprenables. L’interface expose
uniquement l’état métier de livraison et une action de reprise autorisée ; elle
n’expose jamais le contenu chiffré, le jeton ou la clé.

Une création de tenant ou une approbation qui déclenche un email répond
`delivery: "pending"` ; `201 Created` confirme uniquement la ressource métier.
L’état d’invitation persiste `pending`, `sent` ou `failed`.

Les erreurs SMTP non déterministes restent en état récupérable ; une panne
temporaire ne supprime pas l’invitation. Les réponses d’API distinguent
l’opération métier de son effet email.

## Réponses validées au runtime

Le périmètre des réponses structurées consommées par l’interface est :

| Route | Schéma client |
|---|---|
| `GET /api/me` | `meSchema` (sans collection workspace non bornée) |
| `GET /api/tenants` | `tenantSummaryListSchema` |
| `GET /api/organizations` | `organizationSummaryListSchema` |
| `GET /api/workspaces` | `workspacePageSchema` |
| `GET /api/invitations` | `invitationPageSchema` |
| `GET /api/members` | `memberPageSchema` |
| `GET /api/preferences` | `preferencesSchema` |
| `GET /api/audit-logs` | `auditPageSchema` |
| `GET /api/access-requests` | `accessRequestListSchema` |
| `GET /api/access-link` | `accessLinkSchema` |
| `POST /api/access-requests/:id` | `accessReviewResultSchema` |
| `GET /api/platform/docs` | `guideSchema` |
| `GET /api/roles` | `roleDefinitionListSchema` |
| `GET /api/role-assignments` | `rolePersonListSchema` |
| `GET /api/profile` | `profileDetailsSchema` |

Les autres mutations dont l’interface n’interprète pas le corps de réponse ne
sont pas dans cette liste ; leurs erreurs HTTP restent contrôlées par la
frontière commune. Toute nouvelle réponse structurée consommée par le web doit
être ajoutée ici et validée avant d’être utilisée. Les tests de contrat couvrent
chaque schéma listé, notamment l’absence d’un champ requis et les valeurs
d’enum inconnues.

Les listes membres, invitations et workspaces sont bornées à 50 éléments par
réponse et suivent une forme stable :

```json
{
  "items": [],
  "nextCursor": null
}
```

Les réponses doivent rejeter les champs manquants, enums inconnus, curseurs
invalides et données non conformes. Les erreurs restent compactes, sans SQL,
trace, secret ou détail de fournisseur. Les contrats d’erreur métier déjà
utilisés (`INVALID_REQUEST`, `UNAUTHENTICATED`, `ACCESS_DENIED`, `NOT_FOUND`,
`CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`) sont conservés.

## Limitation de débit

Les limites métiers s’appliquent globalement à toutes les instances pour une
règle et une clé de client, sans faire confiance à des en-têtes IP fournis par
le navigateur. Lorsque le store partagé ne peut pas garantir la décision, les
endpoints protégés renvoient une erreur de dépendance temporairement indisponible
(503), pas une autorisation implicite ni un compteur local.

`/health` demeure une liveness indépendante du stockage de limite. `/ready`
reste distinct et vérifie les dépendances nécessaires au service.

## Pagination et autorisation

Les collections volumineuses retournent un nombre borné d’éléments et un curseur
opaque optionnel. L’ordre est stable et déterministe. Chaque appel réévalue
identité, tenant et permission côté serveur dans le contexte transactionnel ;
le curseur n’est jamais un justificatif d’autorisation.

Un curseur invalide retourne `400 INVALID_REQUEST`. Une portée non autorisée
retourne le refus métier existant, sans confirmer l’existence d’un élément
étranger.

## En-têtes et confidentialité

- Les mutations demeurent same-origin et utilisent les protections CSRF/origine
  existantes.
- Les réponses métier ne contiennent aucun jeton ni secret.
- Les clés d’idempotence ne sont pas des identifiants d’autorisation.
- Aucun corps de mail ou jeton ne figure dans les logs de requête ou dans une
  preuve de test.
