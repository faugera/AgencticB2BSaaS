# Recherche : séparation tenant / control plane

## Constat

Le dépôt décrit déjà un socle B2B fort : organisation, tenant, workspaces, rôles et audits. La nouvelle spécification vise à rendre explicite la séparation fonctionnelle entre l’administration client et la plateforme, sans introduire une nouvelle frontière de confiance au niveau du navigateur.

## Décision de conception

- `/settings` est la surface d’administration tenant pour les rôles de tenant.
- `/control` est la surface d’administration plateforme pour les rôles de plateforme.
- Les validations se font côté serveur à partir de l’identité persistée, du contexte transactionnel et des permissions autorisées.
- Le tenant sentinelle `0000` reste réservé à la plateforme et n’est jamais un tenant métier parce qu’il ne porte ni organisation cliente ni données client.

## Alternatives rejetées

- Fusionner les surfaces administratives dans une même route : non compatible avec les invariants de sécurité et le découplage strict demandé.
- Déduire la permission de super-admin depuis un rôle de tenant ou depuis un contexte client : non acceptable, ni auditable ni vérifiable.
- Autoriser `0000` comme tenant client : casse la partition de données et la séparation de la plateforme.

## Preuves attendues

- Les routes propres au tenant refusent les accès de plateforme.
- Les routes de plateforme refusent les utilisateurs de tenant.
- Les tests d’audit vérifient les refus cross-tenant, les mutations interdites et les auto-élévations.
