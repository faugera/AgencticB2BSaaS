# Couverture des tests

## Réduction demandée — 25 octobre 2026

La suite Playwright générale passe de 182 à 72 cas (-110, soit 60 %).
Les anciens nombres dans les rapports de livraison restent des preuves historiques.
Les tests ne sont ni masqués par un filtre CI ni marqués skip : les scénarios
purement cosmétiques et les multiplications de thèmes/tailles sont supprimés.

| Groupe | Avant | Après | Décision |
| --- | ---: | ---: | --- |
| Normalisation CSS |24|0| Suppression des mesures de polices/couleurs/marges et captures |
| Galerie et composition de référence |26|0| Suppression des contrôles de démonstration et géométrie exacte |
| Invitations/préférences |24|4| FR/EN sur les deux profils, sans matrice thème/largeur |
| Inscription/profil/documentation |26|10| Parcours et refus conservés, tailles gérées par les profils |
| Journal d'audit |18|10| Consultation/pagination/chargement/vide/erreur et refus de rôle conservés |
| Régressions PR7 |32|16| Cinq correctifs conservés ; resize traverse encore375/768/1280 |
| Autres accès/auth/navigation |32|32| Inchangé |
| Total général |182|72| Deux projets desktop/mobile, français et anglais |

Les captures PNG systématiques sont retirées de la suite générale ; les traces
Playwright en cas d'échec restent activées. Le focus clavier, l'absence de
débordement, les refus d'accès et les sessions ne sont pas traités comme cosmétiques.
Les contrôles uniques du profil sans autre session et de l'email invalide ont été
conservés dans frontend-pages.spec.ts. Le changement de thème reste testé comme une
préférence persistante ; la couleur d'espace est vérifiée par l'écriture API, sans
imposer de couleur CSS calculée. Aucun code produit ni permission n'est modifié.

## Commandes et frontières

- `pnpm verify` : types,lint,tests unitaires,build,smoke.
- `pnpm test:e2e` : 72 scénarios navigateur sur frontend compilé ; fixtures HTTP.
- `pnpm verify:security` : audit dépendances et intégrations PostgreSQL réelles.
- `pnpm verify:tenant-isolation` : refus SQL/HTTP inter-tenant.
- `pnpm test:auth:e2e` : activation/MFA/session et collaboration avec PostgreSQL/SMTP réels.

Les trois derniers gates et leurs assertions sont inchangés. Ils restent dans la CI.
Les tests UI simulés ne remplacent pas une preuve d'autorisation serveur.

## Vérification exécutée

Le 25 octobre : `pnpm verify` passe (types, lint, 44 tests unitaires, build, smoke).
`playwright test --headed --workers 2` passe : 72/72 en 35,6 secondes sur cette machine.
La suite précédente de 182 cas avait pris 2,4 minutes avec deux workers ; ces durées
sont des mesures locales, sans garantie de temps CI. Aucun test backend ou permission
n'a été modifié. Les validations PostgreSQL et auth réelle ne sont pas relancées
localement pour cette modification de tests navigateur ; la CI les conserve.

## Synchronisation documentaire

Parcours direct de maintenance de tests, sans nouveau contrat métier ou schéma.
README et rapport CSS historique : UPDATED. Docs d'architecture et carte produit :
REVIEWED_NO_CHANGE, aucune frontière ni capacité produit modifiée. Changelog produit :
REVIEWED_NO_CHANGE, pas de changement utilisateur applicatif. Variables et IAM :
NOT_APPLICABLE. Aucun changement de dépendance.

## Contrôle documentaire

pnpm docs:test teste le vérificateur avec fixtures valides/invalides ; pnpm docs:check
vérifie structure, statuts, liens et chemins maintenus. Voir docs/setup/spec-kit.md.
Ces contrôles ne remplacent aucun gate applicatif ou de sécurité existant.
