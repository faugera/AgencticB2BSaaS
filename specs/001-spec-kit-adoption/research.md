# Recherche et arbitrages

- Décision : Spec Kit 1.2.3 officiel déjà installé via uv/PyPI. Les 377 fichiers du paquet
  installé correspondent octet par octet au wheel publié sur PyPI ; SHA256 du wheel :
  945ad1cdfddf3e5cf138259827564af4b41c4ade053e16a4222f1589248d0eaa.
- Sources : [release officielle](https://github.com/github/spec-kit/releases/tag/v1.2.3),
  [distribution](https://pypi.org/project/specify-cli/1.2.3/),
  [adoption brownfield](https://github.github.com/spec-kit/guides/existing-projects.html).
- Décision : Bash pour Windows Git Bash et Linux CI, sans installer un second moteur.
- Décision : préserver les cinq anciens dossiers, documenter la réconciliation à part.
  Alternative rejetée : conversion rétroactive de tout l'historique.
- Décision : spec systématique, autonomie sur périmètre approuvé, contrôles proportionnés.
  Alternative rejetée par l'utilisateur : parcours direct pour les petits changements.
- Décision : contrôle Node natif ; parseur YAML limité aux champs chemin/path/targets de nos
  fichiers de routage, sans prétendre valider tout YAML. Pas d'extension Spec Kit personnalisée.
- Les versions stables sont figées ; upgrades explicites par PR, pas de mise à jour automatique.
- Aucun NEEDS CLARIFICATION restant ; aucune recherche déléguée nécessaire.
