# Plan d’implémentation : Administration multi-niveaux et control plane

**Branche** : `faugera-audit-architecture-saas` | **Date** : 2026-11-06 | **Spec** : [spec.md](spec.md)

## Résumé

Clarifier et sécuriser la séparation entre la gestion du tenant client et la gouvernance de la plateforme SaaS B2B. L’objectif est de faire du `/settings` le périmètre tenant et du `/control` le périmètre plateforme, avec des permissions et des refus explicites, tout en gardant la base existante cohérente avec les rôles, les tenants et l’audit déjà en place.

## Contexte technique

- **Monolithe modulaire** : API Fastify, interface web React/Vite, PostgreSQL et rôles runtime déjà définis.
- **Modèle de sécurité** : identité vérifiée, contexte transactionnel local, permissions persistées, audit append-only et RLS appliqué sur les données sensibles.
- **Périmètre cible** : séparation fonctionnelle et routière entre administration client et contrôle plateforme ; aucun changement de pile ou de modèle de données non justifié.
- **Contraintes** : préserver les mécanismes d’authentification existants, les rôles tenant, les permissions et les règles inter-tenant déjà établies dans le dépôt.

## Constitution Check — Contrôle de constitution

| Principe | Évaluation |
|---|---|
| Réfléchir avant de coder | PASS — la spécification définit les surfaces, les rôles et les refus attendus. |
| Simplicité et modifications chirurgicales | PASS — la séparation est une règle de conception, sans refonte de la pile. |
| Frontières B2B et données protégées | PASS — le modèle maintient la frontière tenant / plateforme et la notion de contexte réservé. |
| Vérification fondée sur les preuves | PASS — les critères de succès sont mesurables et testables par scénario d’accès. |
| Contrats lisibles et expérience accessible | PASS — la séparation des surfaces doit rester respirante et accessible. |
| Livraison | PASS — aucune fusion ni déploiement automatique n’est requis par cette feature. |

## Recherche de conception

1. Conserver la distinction entre le rôle de tenant et le rôle de plateforme, sans implication implicite d’un territoire vers l’autre.
2. Tracer les tentatives de franchissement de frontière, les accès cross-tenant et les escalades comme incidents de sécurité avec contexte servér.
3. Traiter `tenantId = 0000` comme un identifiant réservé du control plane, jamais comme un tenant client ni comme une ressource de données client.
4. Garder le périmètre `/settings` et `/control` séparé dans l’interface, l’API et la logique d’autorisation.

## Structure du projet

```text
specs/008-admin-control-plane/
├── spec.md
├── plan.md
├── research.md
├── tasks.md
├── checklists/
│   └── requirements.md
└── contracts/            # si un contrat API dédié est nécessaire
```

## Phases de livraison proposées

### Phase A — Clarification des surfaces administratives

Définir précisément les chemins, rôles, permissions et messages de refus associés à `/settings` et `/control`, puis vérifier qu’ils ne chevauchent pas les permissions tenant déjà existantes.

### Phase B — Sécurité des frontières

Ajouter les validations métier, les tests de refus cross-tenant, le contrôle du tenant réservé et la journalisation critique du bootstrap d’un dernier administrateur.

### Phase C — Validation et preuves

Mettre en place les tests de parcours, les contrôles d’audit et la synchronisation documentaire sur les routes, rôles et sécurité B2B.

## Synchronisation documentaire attendue

- `docs/architecture.md` et `docs/architecture.html` pour la séparation des surfaces.
- `docs/features-b2b.md` et `.specs/standards/b2b-tenancy-rbac.md` pour la règle de portée et les rôles.
- `docs/setup/private-pilot.md` et `docs/testing.md` pour les preuves et la couverture de sécurité.

## Gates de vérification

- Tests de refus cross-tenant et de contrôle de bordure.
- Vérification qu’un TENANT_ADMIN n’accède pas au control plane.
- Vérification qu’un `tenantId = 0000` n’est pas traité comme tenant client normal.
- Contrôles de docs et de qualité de la spécification.
