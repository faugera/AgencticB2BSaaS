# Plan d'implémentation : Rattrapage documentaire et portabilité du contrôle

**Branch**: `codex/rattrapage-documentaire` | **Date**: 2026-11-15
**Spec**: [spec.md](spec.md)

## Résumé

Aligner les quatre documents d'état sur `main` au commit `94e8b9a`, corriger la
portabilité Windows du test de résolution de feature, et produire un tableau de
statut unique des specs. Aucun changement de code applicatif, de contrat HTTP, de
migration ou d'autorisation.

## Contexte technique

- **Langage/versions** : Node 24, pnpm 11.25.0, TypeScript strict.
- **Documents** : `README.md`, `docs/architecture.md`, `docs/features-b2b.md`,
  `.specs/domains/product-map.md`, `CHANGELOG.md`.
- **Contrôle** : `scripts/docs-check.mjs`, `scripts/architecture-sync.mjs`,
  `scripts/docs-check.test.mjs`.
- **Vérification** : `pnpm docs:test`, `pnpm docs:check`, `pnpm typecheck`,
  `pnpm lint`, `pnpm test`.
- **Contraintes** : `docs/architecture.md` est une source du manifeste
  `docs/architecture-sources.json` ; toute modification exige
  `node scripts/architecture-sync.mjs --reviewed`.
- **Hors périmètre** : migrations, code applicatif, idempotence client, control
  plane, tests navigateur.

## Vérification de la constitution

- **Prudence** : aucune migration ni règle d'autorisation touchée ; les documents
  décrivent seulement le code existant.
- **Simplicité** : modifications chirurgicales de texte et d'un test, sans
  dépendance nouvelle.
- **Frontières B2B** : les affirmations de sécurité sont alignées sur le code
  livré ; aucune garantie n'est ajoutée ni retirée silencieusement.
- **Preuves honnêtes** : CI et PostgreSQL jetable restent `NOT_RUN` ; l'absence de
  clé d'idempotence côté client est documentée comme une limite.
- **Résultat** : conforme. Aucune dérogation demandée.

## Décisions de conception

1. **En-têtes datés et neutres** : remplacer les références de branche par « état de
   `main` au 15 novembre 2026 (commit `94e8b9a`) », sans prétendre à un déploiement.
2. **Limites exactes** : décrire le mono-instance applicatif avec état partagé en
   PostgreSQL, l'outbox chiffrée et le worker, plutôt que « synchronous mail ».
3. **Idempotence** : documenter la capacité côté API et l'absence d'envoi de la clé
   par le client web, sans la présenter comme disponible à l'utilisateur.
4. **Portabilité** : convertir le chemin en forme POSIX avant l'appel à `bash` et
   sauter explicitement le test si `bash` est introuvable.
5. **Tableau de statut** : un fichier `specs/STATUS.md`, une ligne par spec, avec
   tâches restantes, nature, preuve et blocage.

## Structure concernée

```text
README.md
CHANGELOG.md
docs/architecture.md
docs/architecture-sources.json   (régénéré par architecture-sync)
docs/features-b2b.md
.specs/domains/product-map.md
scripts/docs-check.test.mjs
specs/STATUS.md
specs/010-rattrapage-documentaire/
```

## Validation après conception

- **Constitution** : aucune violation ; pas de secret, pas de donnée sensible.
- **Documentation** : le manifeste d'architecture est régénéré après revue du delta.
- **Contrôle** : `pnpm docs:test` doit passer 40/40 sous Windows.
- **Limites** : la CI distante et les contrôles PostgreSQL restent `NOT_RUN`.
