# Vérification : Réconciliation de la sécurité B2B

Le 7 novembre 2026, sur le contenu local de `codex/reconciliation-securite-stack` issu de `0aef683` :

- `pnpm verify` : PASS, 55 tests unitaires, build et smoke inclus.
- `pnpm docs:test` : PASS, 22 tests ; `pnpm docs:check` : PASS après revue et actualisation du manifeste d'architecture.
- `pnpm verify:security` : PASS sur PostgreSQL 17.8 jetable, 59 tests ; le test de reprise est exécuté séparément. L'audit des dépendances signale une vulnérabilité modérée, sous le seuil haut configuré.
- `pnpm verify:tenant-isolation` : PASS, 15 tests PostgreSQL/HTTP.
- Préservation et rejeu des migrations : PASS, 1 test sur une seconde base vide ; le rejet d'un checksum modifié est couvert par la suite auth.
- Les scénarios navigateur sont retirés à la demande du propriétaire ; aucune preuve de rendu ou de parcours utilisateur n'est revendiquée pour la révision finale.
- CI distante et historique de migration des environnements non jetables : NOT_RUN/UNKNOWN. Les noms 0016–0018 restent provisoires tant que cet historique n'est pas établi.

Un premier passage sécurité a échoué sur une limite de débit partagée entre fixtures ; le test concerné isole maintenant cette limite dans la base jetable. La reprise et la seconde exécution passent. Aucune base déployée n'a été inspectée ou modifiée.
