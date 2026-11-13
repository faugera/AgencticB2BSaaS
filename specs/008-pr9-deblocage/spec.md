# Feature Specification: Déblocage de la PR 9

**Created**: 2026-11-13
**Status**: Draft

## User Scenarios & Testing

- Un test de catalogue de rôles s'exécute dans une base partagée sans être bloqué par les connexions des autres suites, tout en conservant la limitation réelle.
- Un super-admin et un membre ne voient pas les tenants d'une organisation supprimée ; les tenants actifs autorisés restent visibles.
- La documentation décrit les migrations réellement présentes dans la branche.

## Requirements

- **FR-001**: Isoler les connexions de fixture sans désactiver ni affaiblir la limitation d'authentification.
- **FR-002**: Exclure les tenants dont l'organisation est supprimée des contextes exposés, sans changer les droits sur les organisations actives.
- **FR-003**: Conserver les migrations existantes immuables et synchroniser les documents concernés.
- **FR-004**: Exécuter les contrôles de sécurité et d'isolation sur PostgreSQL jetable ; signaler tout contrôle non exécuté.

## Success Criteria

- **SC-001**: La suite de rôles passe après les autres suites et lors de deux exécutions successives sur une base jetable.
- **SC-002**: Les tests SQL/HTTP démontrent l'exclusion des tenants supprimés et la conservation des accès autorisés.
- **SC-003**: La documentation et les gates CI applicables passent sur la révision publiée.
