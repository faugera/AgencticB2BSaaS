# Découverte et décisions

Base : main f47449c, incluant la PR8 déjà fusionnée ; branche codex/b2b-organizations-rbac,
checkout initial propre. Deux passes SQL/autorisation et profil/SDK ont identifié les
anciens contrats mono-tenant, rôles singuliers, journal privé et profil SDK name.
Cet état initial est historique ; les migrations0013–0015 et leurs consommateurs
implémentent désormais les décisions détaillées dans spec.md et plan.md.

## Arbitrage résolu : noms inconnus

Le blocage initial NOT NULL face aux invitations email seules a été levé par la réponse
utilisateur : first_name/last_name peuvent rester null jusqu'à Mon profil ; un PUT complet
exige les deux champs valides. Aucun prénom/nom manquant n'est inventé. L'heuristique de
reprise premier mot/reste conserve les mononymes incomplets et autorise correction.
Cet arbitrage est implémenté et testé ; aucune question ne reste ouverte sur ce point.

## Infrastructure de preuve

Docker Desktop était indisponible (pipe dockerDesktopLinuxEngine absent). Une nouvelle
instance PostgreSQL17 portable dédiée et Mailpit loopback ont servi aux validations,
sans reprendre un datadir existant ni une base de développement. Résultats courants :
[evidence/verification.md](evidence/verification.md). Les constats initiaux ne sont pas
présentés comme l'état final d'implémentation.
