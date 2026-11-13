# Réconciliation du 7 novembre 2026

La branche est préparée au-dessus des PR de retrait navigateur et de sécurité B2B. Les parcours Playwright et leur CI sont retirés à la demande du propriétaire ; les résultats antérieurs restent historiques.

- `pnpm verify` : PASS, 115 tests unitaires, build et smoke.
- `pnpm docs:test` : PASS, 22 tests ; `pnpm docs:check` : PASS.
- `pnpm verify:security` : PASS, 74 tests PostgreSQL 17.8 sur base neuve ; reprise exécutée séparément.
- `pnpm verify:tenant-isolation` : PASS, 15 tests sur la même base jetable.
- Préservation et rejeu des migrations : PASS, 1 test sur une seconde base vide.
- Un premier passage a révélé un état de limite de débit résiduel ; l'initialisation de la fixture de préférences a été isolée. Un second passage sur la base réutilisée a rencontré des messages outbox résiduels ; le résultat ci-dessus provient d'une base vierge.
- Historique des environnements non jetables : UNKNOWN. Les migrations de sécurité et SaaS partagent les préfixes 0016–0018 ; leur ordre et leur numérotation sont provisoires. Aucune renumérotation ni migration d'environnement réel n'a été effectuée.
- CI distante et scénarios de restauration distincts : NOT_RUN sur cette préparation. Aucun résultat de rendu UI ou SMTP réel n'est revendiqué.
