# Normalisation CSS Brume — 2026-10-24

Lot ciblé sur les fondations et composants consommés, sur la branche
`codex/design-system-brume`. Les modifications locales antérieures sont conservées.
Aucun changement métier, API, SQL ou permission dans ce lot ; aucun merge ni déploiement.

## Observations et corrections

Mesures avant modification : `.omo/css-normalization-before.json` et capture associée.

| Problème observé dans le navigateur | Correction partagée |
| --- | --- |
| Erreur de champ grise : `.ui-field p` gagnait sur `.ui-field-error` | Spécificité du sélecteur d'erreur corrigée ; message et `aria-invalid` conservés |
| Filtre avec `min-width:auto` et `flex-grow:0` : règle sur le label imbriqué | Règle sur `.ui-filter > .ui-field`, largeur minimale nulle |
| Marqueur natif du compte supprimé sans remplacement | Suppressions de marqueur retirées, `summary` natif conservé |
| Nom de l'application à 22px mais interligne 37.4px hérité des paragraphes | Token de titre 1.2, soit 26.4px |
| Liens contextuels identifiés principalement par la couleur | Soulignement dans contenu, compte et authentification |
| `border-box` et héritage des contrôles déjà fournis par Preflight | Deux règles redondantes retirées, sans second reset |

Lato auto-hébergée 400/700 remplace Source Sans 3 sur arbitrage explicite de
l'utilisateur. Le paquet de police est remplacé, sans service externe ni dépendance
fonctionnelle supplémentaire. Les valeurs sont centralisées dans les tokens.
La page marketing conserve ses styles hors charte Brume. Couleurs, surfaces,
espacements validés, sidebar 264/56px, items 34px et scrollbars sont conservés.
Les blocs `.secret` restent correctement repliés en `pre-wrap` ; aucun défilement
supplémentaire inutile n'a été ajouté. Aucun `overflow-x:hidden` global ajouté.

## Validation

- `pnpm lint`, `pnpm test` : succès, **41 tests**.
- `pnpm build`, `pnpm smoke` : succès ; API construite, santé et arrêt propre.
- Typecheck frontend : succès. Typecheck racine : échec préexistant dans
  `apps/api/src/business/lifecycle.integration.test.ts` (142, 145, 149), conservé hors périmètre.
- **36 tests ciblés** Chromium/Firefox/WebKit : FR/EN × clair/sombre × 375/768/1280px.
  Galerie, erreurs, champs natifs, profil, membres, invitations, refus UI membre,
  authentification, focus clavier, contenus longs et reduced-motion.
- **132 tests de régression UI** : succès sur les projets desktop/mobile existants.
  Parcours, navigation, confirmations et états consommateurs.
- Polices servies depuis l'origine locale ; aucun chargement de police externe
  observé dans la matrice ciblée. Aucun pageerror dans cette matrice.

Reçus : `.omo/css-normalization-{lint,unit,build,smoke,types,browser}.log`,
`.omo/css-regression.log`. Captures fraîches : `.omo/css-normalization-captures`
et `.omo/css-regression-captures`. Les **216 captures ciblées** sont au format
viewport, avec haut et bas de galerie séparés : signatures PNG et dimensions
375/768/1280 × 1024 vérifiées dans `.omo/css-normalization-capture-validation.json`.
Les captures pleine page de régression peuvent ajouter une bande vide hors du
shell à défilement interne ; cette bande est un artefact de capture et n'est pas
utilisée comme preuve de composition. La série ciblée la remplace.
Tests reproductibles :
`pnpm exec playwright test --config=playwright.css.config.ts` après build,
puis `pnpm exec playwright test --headed` pour la régression complète.

Les tests UI interceptent l'API avec des fixtures synthétiques : ils vérifient les
consommateurs et gardes frontend, sans certifier les permissions serveur ou SQL.
Les contrôles PostgreSQL/auth réels restent non exécutables avec l'environnement
actuel (Docker indisponible et identifiants de bases jetables absents). Ils ne sont
pas nécessaires pour prouver une correction CSS et ne sont pas déclarés réussis.
Pas d'audit WCAG exhaustif, de lecteur d'écran ou d'appareil mobile physique.
Le `git diff --check` global signale une ligne vide finale préexistante au lot CSS
dans `application.tsx` ; fichier préservé.

Deux revues indépendantes de la normalisation sont consignées dans
`.omo/evidence/css-normalization-integrity-review.md` et
`.omo/evidence/css-normalization-visual-review.md`. Synthèse : `design-qa.md`.

## Synchronisation documentaire

Analyse de `.specs/standards/doc-sync-map.yml` : `isolated-css` n'impose aucune
mise à jour API/données/sécurité. La charte `DESIGN_UI.md` reflète la police et les
règles réelles ; ce rapport conserve les preuves. Les frontières et parcours
documentés ne changent pas. La rubrique Brume du changelog préexistante couvre
l'évolution ; aucune entrée métier artificielle ajoutée pour ce lot.
