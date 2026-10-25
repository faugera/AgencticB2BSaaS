# Catalogue global sans tenant — régression UI

25 octobre 2026, Chromium complet, build de production et API simulée.

- Rouge : `ui-global-catalog-red.log` montre l’appel `/api/role-assignments?` sans tenant alors que le serveur simulé le refuse avec 403.
- Correction : l’effet de chargement des attributions exige désormais un tenant provenant de l’URL ou du contexte autorisé. Sans tenant, le catalogue et son éditeur restent disponibles et l’aide de sélection existante remplace le formulaire d’attribution.
- Vert : **12/12** tests B2B et matrice visuelle dans `ui-global-catalog-green.log`. Le nouveau test vérifie zéro appel roster, zéro alerte et l’éditeur de rôle utilisable sans tenant.
- Les scénarios avec attributions utilisent une URL tenant explicite ; `ui/current/roles-global-catalog-{fr,en}-{375,768,1280}.png` couvre la vue globale.
- Le manifeste courant couvre désormais **378 captures** : 288 vues d’ensemble et 90 actions de défilement/clavier. Dates et hashes du bundle sont vérifiés après le dernier build.

Backend inchangé. Ce test simule le refus API ; les preuves HTTP/SQL réelles restent distinctes.
