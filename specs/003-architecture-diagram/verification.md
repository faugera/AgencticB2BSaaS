# Vérification du schéma — 30 octobre 2026

- PASS : comparaison statique des sept liens dessinés avec les migrations 0002 et
  0014 ; journal actif sans FK vérifié dans 0015. Le schéma omet des liens, signalés
  comme tels. Revue indépendante en lecture seule.
- PASS : `pnpm docs:test`, 10 tests dont ajout, suppression et modification des
  sources ; `pnpm docs:check` et `pnpm lint` avant les modifications concurrentes.
- PASS : test réel Chromium en `file://` aux largeurs 375, 768 et 1280 : redirection
  depuis l'ancien fichier, absence de débordement global, deux régions accessibles
  au clavier et ouverture de la description textuelle. Revue visuelle indépendante
  des captures correspondantes. Pas de test avec un lecteur d'écran réel.
- PASS : la modification du document d'architecture a déclenché le contrôle, puis
  la confirmation a rétabli sa réussite après revue.
- Attention : une migration 0016 et des documents associés sont en cours dans un
  autre checkout et ne font pas partie de cette PR. Le schéma de cette branche couvre
  les migrations jusqu'à 0015 ; il ne certifie pas la base déployée. Si 0016 est
  intégrée, le contrôle imposera une nouvelle revue des sources.

## Reprise CI de la PR 10
- FAIL reproduit localement : navigation des rôles sur le projet mobile, menu fermé
  après rechargement ; l'assertion négative avant rechargement inspectait aussi un
  menu fermé et ne prouvait pas l'absence du lien.
- PASS après correction : 14 scénarios ciblés, 6 vues FR/EN et navigation des rôles
  dans chacun des projets desktop/mobile. Chromium complet local a été utilisé avec
  les paramètres des deux projets. Les vues mobile ont duré jusqu'à 28 secondes en
  local ; le journal CI rapporte plusieurs dépassements du budget global de 30 s.
  Les assertions sont conservées et seul ce scénario lourd est marqué lent.
- La suite complète CI et les tests SQL/SMTP n'ont pas été relancés localement pour
  cette correction limitée aux tests ; les résultats du nouveau run CI font foi.

Le run CI suivant a passé 98 tests navigateur puis échoué au parcours réel : la base
des tests de sécurité contenait un opérateur que la protection du parcours refusait
de modifier. Reproduction locale : 13 tests d'organisations créent les fixtures dans
une base jetable, puis le parcours sur cette même base échoue avec ce refus attendu.
Après séparation, `pnpm db:provision`, `pnpm auth:migrate` et `pnpm test:auth:e2e`
passent sur une autre base PostgreSQL 17 jetable avec Mailpit : 2 parcours desktop et
2 mobile. Le garde-fou n'a pas changé. Les services jetables ont été arrêtés ; aucune
base de développement ou de production n'a été utilisée.
