# Spécification : Réconciliation de la sécurité B2B

**Feature Branch**: `codex/reconciliation-securite-stack`
**Status**: Complete
**Closed**: 2026-11-15 par la décision D1 (gel des noms + runbook de reprise)

> Les correctifs B2B sont livrés sur `main` et le reliquat d'exploitation est
> désormais couvert : noms 0016–0025 gelés, procédure de reprise documentée dans
> `docs/setup/private-pilot.md`. Aucun environnement non jetable n'a été inspecté :
> son historique reste `UNKNOWN`, sans modification des migrations appliquées.

## User Scenarios & Testing

Un utilisateur travaille dans un tenant actif, avec les seules capacités de ce tenant. L'annuaire, les workspaces, les rôles, le profil et l'audit restent dans leur portée. Les préférences indépendantes ne s'écrasent pas entre sessions.

## Requirements

- **FR-001** : Restreindre l'annuaire aux organisations accessibles et préserver les migrations historiques immuables.
- **FR-002** : Lier la création de workspace au tenant courant, sélectionner un tenant actif et récupérer les événements historiques d'audit sans tenant ou hors anciennes limites de longueur.
- **FR-003** : Propager le tenant effectif au catalogue des rôles et à l'audit ; distinguer les permissions membres et invitations et préserver la protection existante du profil lors d'un changement de tenant.
- **FR-004** : Fusionner atomiquement les préférences fournies sans écraser les autres champs ni une initialisation concurrente.
- **FR-005** : Documenter les décisions de reprise et vérifier les frontières avec PostgreSQL jetable, sans tests navigateur.

## Success Criteria

- **SC-001** : Les tests unitaires, sécurité, isolation et reprise de migrations passent sur la révision soumise.
- **SC-002** : Les huit constats de la PR 9 sont reliés à un comportement et à une preuve ou limite explicite.
- **SC-003** : Les noms de migration 0016–0025 sont gelés ; la reprise des environnements non jetables suit une procédure documentée et vérifiée, sans réécriture d'une migration appliquée. Leur historique réel reste `UNKNOWN` tant qu'aucun opérateur ne l'a inspecté.
