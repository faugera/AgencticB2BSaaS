# Analyse de cohérence avant implémentation

18exigences reliées aux tâchesT004–T012 ; trois migrations distinctes, aucun fichier
SQL historique modifié. Arbitrages résolus ; nullableprofil explicite remplace NOTNULL.
Constitution, protectionsDB et contrats SDK compatibles dans le plan.
Critère sensible : conserver les vérifications de portée sur tous les endpoints legacy,
retirer les attentes mono-tenant seulement lorsqu’elles contredisent la nouvelle spec.
Aucun blocker de conception restant ; validations exécutées à consigner séparément.
