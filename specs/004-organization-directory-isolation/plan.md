# Implementation Plan: Isolation de l'annuaire des organisations

**Branch**: `codex/b2b-organizations-rbac` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

## Summary

Remplacer la fonction SQL d'annuaire par une version additive qui réutilise `business.organization_access`, exclut `deleted_at`, puis démontrer les refus avec la suite PostgreSQL jetable existante.

## Technical Context

TypeScript strict, Fastify, PostgreSQL 17 via `pg`, Vitest. Aucune dépendance ni route supplémentaire. La migration `0014` reste inchangée et `0016` porte le remplacement de fonction.

## Constitution Check

La décision d'autorisation reste côté SQL, depuis l'acteur vérifié et dans la transaction locale. Le changement préserve RLS, `SECURITY DEFINER` à `search_path` fixe, la suppression logique et les rôles runtime non propriétaires.

## Touchpoints

- `apps/api/migrations/0016_organization_directory_isolation.sql` : fonction additive et grants inchangés.
- `apps/api/src/business/organizations.integration.test.ts` : matrice SQL à deux clients et suppression logique.
- Documentation B2B, modèle et architecture : contrat d'annuaire restreint.

## Verification

Exécuter le test d'intégration ciblé puis les gates SQL/IAM avec PostgreSQL/Mailpit jetables explicitement configurés. Sans cette infrastructure, ces gates restent NOT_RUN.
