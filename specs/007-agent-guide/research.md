# Recherche — Agent guide

## Décisions

- **Le guide reste une carte de navigation.** La constitution demande à `AGENTS.md`
  de guider sans dupliquer les règles des documents spécialisés.
- **Les commandes sont vérifiées dans `package.json` et les conditions sont reliées
  aux documents opérationnels.** `pnpm verify` couvre types, lint, tests unitaires,
  build et smoke ; les tests E2E et PostgreSQL/Mailpit sont des contrôles distincts.
- **La stack est présentée au niveau des modules et renvoie au standard
  architecture-stack.** Les faits de référence sont également documentés dans
  `docs/architecture.md` et `.specs/standards/architecture-stack.md`.
- **Les frontières B2B, Spec Kit et les règles « faire / ne pas faire » sont
  condensées et renvoient aux sources détaillées.** Les données protégées, RLS,
  migrations immuables et contrôle serveur ne doivent pas être simplifiés au point
  de devenir ambigus.

## Raisons

Les éléments ci-dessus sont vérifiables dans les documents du dépôt et reflètent
la constitution. Une nouvelle description exhaustive de la stack ou des procédures
créerait des divergences ; les références explicites réduisent ce risque.

## Alternatives considérées

- **Copier l’ensemble des procédures dans `AGENTS.md`** : rejeté, car cela dupliquerait
  runbooks, standards et workflow.
- **Garder uniquement les liens** : rejeté, car le guide doit permettre d’identifier
  immédiatement l’objectif, les commandes principales, l’architecture et les garde-fous.

## Besoins non résolus

Aucun ; les sources locales suffisent pour ce changement documentaire.
