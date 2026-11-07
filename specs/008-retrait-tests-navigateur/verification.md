# Vérification : Retrait des tests navigateur

Le 7 novembre 2026, sur la branche `codex/retrait-tests-navigateur` issue de `38d14b0`, avec PostgreSQL 17.8 local jetable :

- `pnpm verify` : PASS, 54 tests unitaires, build et smoke HTTP inclus.
- `pnpm docs:test` : PASS, 22 tests ; `pnpm docs:check` : PASS.
- `pnpm verify:security` : PASS, 50 tests PostgreSQL ; le test de reprise est exécuté séparément. L'audit des dépendances signale une vulnérabilité modérée et aucune haute selon son seuil configuré.
- `pnpm verify:tenant-isolation` : PASS, 15 tests PostgreSQL/HTTP.
- Test séparé de préservation et rejeu des migrations : PASS, sur une base jetable distincte.
- Tests navigateur et SMTP réel par navigateur : retirés à la demande du propriétaire ; aucune couverture de parcours UI, focus ou responsive n'est revendiquée.

Les résultats concernent le contenu local avant publication ; la CI distante reste à vérifier. Aucune base déployée n'a été inspectée ni modifiée.
