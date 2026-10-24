---
id: "2026-10-24-complete-frontend-pages"
status: implementing
---

## 1. Objectif & Scope

Remplacer les 404 de `/signup`, `/docs`, `/app/profile`, `/admin/profile` par
des parcours fonctionnels et créer `/app/members` et `/app/invitations`.

Décisions utilisateur confirmées :
- Signup = demande d'accès persistée, sans inscription libre ni accès automatique.
- Chaque tenant-admin traite uniquement les demandes destinées à son organisation.
- Le demandeur utilise un lien propre à l'organisation partagé par l'administrateur ;
  aucun annuaire public des tenants.
- Profil : nom modifiable, email/rôles en lecture seule, sessions actives et révocation
  des autres sessions en conservant la session courante.
- Membres/invitations : pages dédiées, selon les permissions existantes.

`/docs` est réservé aux super-admins, selon l'arbitrage utilisateur du 2026-10-24.
Il présente un guide opérationnel des capacités existantes ; son contenu est servi
par une API autorisée côté serveur et n'est pas embarqué dans le bundle public.

In-Scope : parcours, persistance des demandes, traitement tenant-scopé, navigation,
FR/EN, responsive, tests négatifs et synchronisation documentaire.
Out-of-Scope : inscription libre, création automatique d'organisation, annuaire
public, changement d'email/rôles depuis le profil, SSO et suppression logique.
Préserver les modifications applicatives préexistantes du checkout.

## 2. Standards Applicables

Sélection depuis `.specs/standards/index.yml` :
- `.specs/standards/architecture-stack.md` : conserver pnpm, Fastify/pg/React.
- `.specs/standards/b2b-tenancy-rbac.md` : collecte publique et traitement tenant-scopé.
- `.specs/standards/api-validation-errors.md` : validation runtime et erreurs sobres.
- `.specs/standards/ui-components-state.md` : réutilisation des formulaires et navigation.
- `.specs/standards/workflow.md` : états, reprise et preuves.

## 3. Code Existant à Réutiliser

| Existant | Utilisation |
| --- | --- |
| `apps/web/src/auth/client.ts` | Better Auth : profil et gestion de ses propres sessions |
| `apps/web/src/auth/AuthPage.tsx` | Présentation et navigation auth existantes |
| `apps/web/src/application.tsx` | Gardes /api/me, shell, feedback, formulaires membres/invitations |
| `apps/web/src/admin/AdminSidebar.tsx` | Navigation administrateur locale existante |
| `apps/web/src/i18n.ts`, `apps/web/src/auth/messages.ts` | Dictionnaires fr/en et préférence de langue |
| `apps/web/src/styles.css`, `DESIGN.md` | Tokens, panels, formulaires et contraintes responsive |
| `apps/api/src/business/store.ts` | Contexte serveur et transaction métier |
| `apps/api/src/business/routes.ts` | Invitations existantes, contrôle Origin, session et permissions |
| `apps/api/src/auth/service.ts`, `apps/api/src/auth/routes.ts` | API SDK protégée par session/origine |
| `apps/api/src/auth/operator.ts` | Enrollment identité uniquement lors du parcours approuvé |
| `apps/api/src/business/isolation.integration.test.ts` | Tests adversariaux deux tenants et HTTP |
| `tests/e2e/admin.spec.ts`, `tests/e2e/tenant-scope.spec.ts` | Régressions navigation et portée locale |

Nouveaux composants ciblés pour les pages absentes ; nouvelle migration additive
nécessaire car aucune table de demande d'accès n'existe. Pas de bibliothèque UI,
ORM, gestionnaire d'état ou dépendance de validation supplémentaire.

## 4. Sécurité B2B & Multi-Tenancy

La portée d'une demande vient du lien d'organisation et est validée côté serveur ;
elle n'autorise aucun accès aux données de l'organisation. La saisie de son nom
n'est pas un mécanisme de routage ou une preuve d'appartenance.

La collecte publique ne crée ni identité, ni membership, ni rôle. Réponses sobres,
validation des tailles/formats et limitation de débit sont obligatoires.
Lecture/traitement : session vérifiée, acteur actif et tenant-admin du tenant ciblé,
ou super-admin explicitement autorisé. Membres ordinaires et workspace-admins seuls
ne traitent aucune demande. Les mutations privilégiées restent auditées.

L'approbation réutilise l'invitation existante ; aucun rôle plateforme attribuable.
La gestion des sessions est limitée à l'identité courante via Better Auth. Les jetons
de session ne sont ni affichés, ni journalisés, ni persistés dans localStorage.

Contrats : POST `/api/access-link` crée/retrouve le lien opaque du tenant administré ;
POST `/api/access-requests` collecte prénom/nom/email via ce lien et retourne une
réponse générique sans exposer l'organisation. GET `/api/access-requests` liste les
demandes du tenant ; POST `/api/access-requests/:id` accepte (rôle member/tenant_admin)
ou rejette sous verrou SQL. L'acceptation crée l'invitation dans la même transaction,
puis réutilise la livraison existante après commit. Les doublons ne recréent pas de
demande. Aucune approbation ne crée directement de membership.
GET `/api/platform/docs` exige un super-admin actif et retourne les sections fr/en
du guide opérationnel, sans credentials, configuration privée ou contenu arbitraire.

Tests : absence de session, absence de rôle, falsification tenant/lien, lecture et
approbation inter-tenant, demandes invalides/doublons, conservation session courante,
révocation limitée à ses autres sessions, refus d'escalade via mise à jour du profil.
Jobs/agents IA : NOT_APPLICABLE, aucun runtime concerné.

## 5. Delta Fonctionnel & Technique

### ADDED

Pages demandées, demande d'accès persistée tenant-scopée, traitement administratif,
profil/sessions, liens de navigation et tests associés.

### MODIFIED

Routage React et découpage de l'affichage membres/invitations par page, sans changer
leurs permissions. La page d'accueil utilisateur garde une navigation vers ces pages.

### REMOVED

Aucune fonctionnalité existante retirée ; les nouvelles routes remplacent leur 404.

### Critères d'acceptation

```gherkin
GIVEN un lien de demande propre à une organisation
WHEN un visiteur soumet prénom, nom et email valides
THEN la demande est persistée pour cette organisation sans accès métier accordé

GIVEN un tenant-admin et une demande de son organisation
WHEN il approuve la demande
THEN le parcours d'invitation existant est utilisé avec un rôle métier autorisé

GIVEN un tenant-admin d'une autre organisation
WHEN il lit ou traite une demande hors de sa portée
THEN le serveur refuse sans exposer la demande ni accorder de rôle

GIVEN un utilisateur connecté sur plusieurs sessions
WHEN il modifie son nom puis révoque ses autres sessions depuis son profil
THEN le nom est persisté, les autres sessions sont révoquées et la session courante reste valide

GIVEN un membre ordinaire
WHEN il tente les opérations d'administration des membres, invitations ou demandes
THEN les permissions serveur existantes continuent à refuser ces opérations

GIVEN chaque nouveau parcours dans les langues fr et en
WHEN il est utilisé sur mobile, tablette et desktop
THEN les actions, erreurs, labels et états sont traduits et sans débordement horizontal de page

GIVEN un visiteur anonyme ou un utilisateur sans rôle super-admin
WHEN il ouvre /docs ou appelle directement /api/platform/docs
THEN aucun contenu documentaire ne lui est fourni et l'accès est refusé ou redirigé vers la connexion

GIVEN un super-admin connecté et actif
WHEN il ouvre /docs
THEN il consulte le guide opérationnel dans la langue choisie
```

## 6. Impact Documentation Projet (Auto-Doc)

Analyse de `.specs/standards/doc-sync-map.yml` :

| Cible | Politique | Delta attendu et justification |
| --- | --- | --- |
| `docs/data-model.md` | required | Persistance et contraintes des demandes d'accès |
| `docs/architecture.md` | required | Nouveaux flux HTTP et pages |
| `docs/architecture/0005-private-pilot.md` | required | Collecte publique distincte de l'enrollment invitation-only |
| `.specs/standards/b2b-tenancy-rbac.md` | required | Nouveau traitement des demandes tenant-scopé |
| `docs/features-b2b.md`, `.specs/domains/product-map.md` | required | Capacités réellement implémentées et nouvelles permissions |
| `docs/architecture/routes-verification.md` | required | Retirer les routes livrées des 404 après preuves |
| `README.md` | review | Navigation et fonctionnement de la demande d'accès si affectés |
| `CHANGELOG.md` | review | Évolution utilisateur notable après réalisation |
| `.env.example` | none | Aucune nouvelle variable prévue |
