# Vérification des correctifs de revue

Résultats locaux du 30 octobre 2026, sur la branche de la PR 9 :

- PASS : `pnpm verify`, dont 53 tests unitaires, build et smoke.
- PASS : `pnpm verify:security`, 74 tests PostgreSQL réussis ; le test historique est exécuté séparément.
- PASS : conservation et rejeu des migrations sur une base PostgreSQL jetable neuve.
- PASS : quatre parcours réels desktop/mobile d'invitation et de connexion avec PostgreSQL et Mailpit jetables.
- PASS : 124 scénarios navigateur avec API simulées en Chromium installé ; ils ne prouvent pas les autorisations serveur.
- PASS : quatre tests PostgreSQL ciblés sur l'initialisation et la concurrence des préférences, sur une base neuve.
- PASS : contrôle documentaire et neuf tests du contrôle ; empreintes filtrées et brutes identiques pour les migrations 0016 à 0018.
- NOT_RUN : application des migrations à une infrastructure de production ; la reprise 0017 requiert un opérateur autorisé à contourner la RLS.

La CI distante reste à confirmer sur le commit publié. Le navigateur Chromium installé a été utilisé avec une configuration locale adaptée.
