# QA design — normalisation Brume

2026-10-24 — **PASS pour le lot CSS**, aucune promotion de la livraison backend.

Autorité : `DESIGN_UI.md` et arbitrages utilisateur. Lato auto-hébergée 400/700,
échelle typographique et espacements validés supplantent ces détails de l'ancienne
référence visuelle Brume. Les surfaces et le langage visuel sont conservés.

## Preuves actuelles

- 36 tests ciblés réussis : Chromium/Firefox/WebKit × FR/EN × clair/sombre ×
  mobile/tablette/desktop. Galerie haut/erreur et bas, profil long, membres longs,
  invitations invalides et authentification erreur/focus : 216 captures viewport.
- Signatures et dimensions validées :
  `.omo/css-normalization-capture-validation.json`.
- 132 tests de régression réussis : routes et parcours consommateurs existants,
  navigation, confirmations, formulaires, gardes UI et états.
- Deux revues indépendantes **PASS**, sans défaut bloquant :
  `.omo/evidence/css-normalization-integrity-review.md` et
  `.omo/evidence/css-normalization-visual-review.md`.

Le contrôle visuel confirme la cohérence de Lato, la visibilité des erreurs et du
focus, le marqueur natif du compte, les liens soulignés, les filtres flexibles,
le repli des contenus longs et le dégagement de la navigation mobile.

## Limites

Certaines anciennes captures `fullPage` de régression ajoutent une bande de fond
hors du shell à défilement interne. Les nouvelles captures viewport avec état bas
de galerie les remplacent pour juger la composition ; aucun style produit n'a été
modifié pour masquer cet artefact du pipeline.

API interceptée pour les tests UI : aucune certification SQL/permissions serveur.
Pas d'audit WCAG exhaustif, de lecteur d'écran ou d'appareil physique. Les gates
DB/auth restent bloqués par l'environnement préexistant ; les trois erreurs du
test lifecycle bloquent le typecheck racine. Le typecheck frontend, lint, 41 tests
unitaires, build et smoke passent. Détails : `docs/design/css-normalization.md`.

Aucun merge ni déploiement. Les travaux locaux antérieurs sont préservés.
