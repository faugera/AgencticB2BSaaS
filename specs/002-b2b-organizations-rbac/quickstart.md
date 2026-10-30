# Validation reproductible

PostgreSQL17 et Mailpit jetables explicitement configurés, base enterprise_auth_test_*.
Ne pas lire les fichiers privés ni utiliser une base dev. Docker Desktop est indisponible
au cadrage ; une instance portable séparée peut fournir PostgreSQL.

~~~sh
pnpm docs:test
pnpm docs:check
pnpm verify
pnpm verify:security
pnpm verify:tenant-isolation
pnpm test:e2e
pnpm test:auth:e2e
~~~

En plus : test migrations0001–0012 sur fixture historique puis nouvelles versions,
rejeu du migrateur sans duplication ni modification de dates, cas invalide sans email
admin rollback atomique ; matrice acteurs/clients/rôles et suspension ; journal immuable.
UI : FR/EN375/768/1280, profil, catalogue super, attributions adminclient, erreurs/vide,
confirmation des modifications globales et absence de débordement. Distinguer UI simulée
et parcours SQL/HTTP/SMTP réel. Tous résultats consignés dans verification.md.

## Résultats et reprise

[Registre actuel](evidence/verification.md). Le test de reprise requiert une DB vide
enterprise_auth_test_b2b_migration[digits] et AUTH_TEST_MIGRATION_PRESERVATION=true.
Commande : pnpm exec vitest run --config vitest.auth.config.ts
apps/api/src/business/migration-preservation.integration.test.ts.
Pour cette machine, les configs de preuve evidence/playwright-ui.config.ts et
evidence/playwright-live.config.ts utilisent Chromium complet (headless-shell ICU indisponible).
Ne pas reprendre les credentials synthétiques de preuve comme configuration de production.
