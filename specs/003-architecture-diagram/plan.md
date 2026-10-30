# Implementation Plan: Schéma d'architecture maintenu

## Summary
Créer une page HTML autonome Brume dans docs, liée aux sources versionnées, et faire
pointer l'ancien fichier local vers elle. Un manifeste d'empreintes normalisées signale
les changements des deux documents sources et des migrations ; il ne génère aucun dessin.

## Technical Context
HTML/SVG autonome, Node 24 et pnpm existants ; aucune dépendance ni changement métier.
Contrôles Node sur répertoires temporaires, docs et navigateur Chromium.

## Constitution Check
Spec, plan et tâches proportionnés ; sécurité et schéma SQL inchangés ; sources et
limites explicites. Ancien fichier local conservé avant remplacement par un lien.

## Project Structure
- `docs/architecture.html` : vue suivie dans Git.
- `scripts/architecture-sync.mjs` et test associé : contrôle et confirmation.
- `.github/workflows/ci.yml` : contrôle local reproduit en CI.
- `.specs/standards/doc-sync-map.yml` : routage vers la vue.

## Validation
Tests négatifs/positifs du contrôle ; `pnpm docs:test`, `pnpm docs:check`, lint et
inspection navigateur FR aux largeurs 375, 768 et 1280 ; aucune modification SQL.
La CI détecte aussi un test de rôle qui inspecte un menu fermé et un scénario visuel
complet de nombreuses captures dont le budget de 30 secondes est insuffisant en CI.
Ouvrir le menu avant chaque assertion de rôle et marquer uniquement ce scénario lent ;
conserver toutes les assertions et les deux projets navigateur.
