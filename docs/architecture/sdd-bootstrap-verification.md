# Bootstrap SDD déclaratif — audit et preuves du 2026-10-24

## Périmètre et état initial

Mission documentaire, sans installation, dépendance, script persisté, migration,
modification applicative ou CI. Parcours direct documentaire du workflow.
Audit avant création : manifests, lockfile, Compose, CI, configurations de tests,
routes, auth, transaction métier, migrations, UI, instructions et documentation.

- Branche initiale : `codex/correct-audit-findings`.
- HEAD initial : `a3905b92435343e10c5ad399003bf7f34e82a8be`.
- Branche dédiée créée : `codex/bootstrap-sdd-declarative-os`.
- État initial non propre : 17 fichiers suivis modifiés et 9 entrées non suivies
  dans `git status --short` (certains dossiers contiennent plusieurs fichiers).
- Empreintes SHA-256 capturées pour les 103 fichiers suivis/non ignorés présents
  avant édition, y compris les fichiers locaux non suivis.
- `origin/main` consultée par `git ls-remote origin refs/heads/main` au début
  et en fin de vérification : même SHA que HEAD initial, aucun mouvement observé.
  Cela ne verrouille pas la branche contre des modifications ultérieures.

## Audit Brownfield

Node observé `v24.22.1`, pnpm `11.25.0`. Workspaces pnpm : deux apps et un package
de contrats type-only. React 19/Vite 7/Tailwind 4/React Router 7 ; API Fastify 5,
Better Auth 1.7.12, Nodemailer, PostgreSQL 17 via pg, sans ORM. Versions et commandes
proviennent des manifests et fichiers réels, pas de recommandations externes.

Commandes disponibles vérifiées par lecture de `package.json` : `pnpm typecheck`,
`pnpm lint`, `pnpm test`, `pnpm build`, `pnpm smoke`, `pnpm verify`, `pnpm test:e2e`,
`pnpm test:auth`, `pnpm verify:security`, `pnpm verify:tenant-isolation`,
`pnpm test:auth:e2e`. Leur existence n'est pas un résultat d'exécution.
La CI `.github/workflows/ci.yml` lance les gates applicatifs et les tests DB/SMTP
jetables ; elle n'ajoute aucun contrôle déclaratif SDD.

Patterns et mécanismes B2B sont référencés par fichier dans les cinq standards.
L'autorisation transactionnelle, RLS tenants/workspaces, fonctions privées,
bootstrap explicite et permissions persistées sont IMPLEMENTED statiquement.
Audit privilégié et couverture UI/accessibilité sont PARTIAL. Agents/jobs/exports,
facturation et SSO sont PLANNED. Support dédié/ABAC et suppression logique sont
NOT_FOUND. État DB déployé et configuration production : UNKNOWN.

Écarts préexistants conservés :

- Les tests lifecycle locaux réclament des colonnes de suppression logique/dates
  métier absentes des migrations inspectées. Aucune réussite de ces tests n'est affirmée.
- `apps/api/migration.env.example` contient une valeur de mot de passe non vide
  préexistante, distincte d'un placeholder explicite. Sa validité est UNKNOWN ;
  elle n'est ni reproduite ici ni modifiée, ce fichier étant hors périmètre autorisé.
- ADR-001 décrit le bootstrap historique ; un avertissement renvoie désormais à
  ADR-005. ADR-003 est supersédé ; ADR-004 annonce déjà sa portée historique.
  Les anciens résultats des notes de vérification ne sont pas repris comme preuve actuelle.
- Le runbook conserve `/app` comme point d'entrée opérateur ; le code redirige
  maintenant les super-admins vers `/admin`. Le parcours reste compatible,
  mais les routes canoniques sont précisées dans l'index d'architecture.

## Fichiers de la mission

| Fichiers | Rôle |
| --- | --- |
| `AGENTS.md` | Navigation conservée, quatre règles et routeur ajoutés ; 88 lignes |
| `README.md` | Liens SDD et ownership des exemples d'environnement ajoutés après contenu local existant |
| `.env.example` | Commentaires DB obsolètes remplacés par renvois aux exemples propriétaires ; aucune variable runtime dupliquée |
| `CHANGELOG.md` | Politique minimale, sans historique inventé ni entrée fonctionnelle artificielle |
| `docs/architecture.md` | Index des modules, flux HTTP et frontières actuelles |
| `docs/data-model.md` | Entités, contraintes, RLS et écarts lifecycle |
| `docs/features-b2b.md` | Statuts des capacités, matrice RBAC et parcours |
| `docs/architecture/0001-foundation.md`, `docs/architecture/0002-codex-harness.md` | Renvois d'autorité pour éviter les contradictions historiques |
| `docs/architecture/sdd-bootstrap-verification.md` | Présent rapport de preuves et limites |
| `.specs/standards/index.yml` | Catalogue des cinq standards et conditions de chargement |
| `.specs/standards/doc-sync-map.yml` | Huit règles de routage sémantique |
| `.specs/standards/architecture-stack.md` | Stack, modules et commandes exactes |
| `.specs/standards/b2b-tenancy-rbac.md` | Exigences, statuts, preuves et lacunes de sécurité |
| `.specs/standards/api-validation-errors.md` | Schémas Fastify, erreurs, contrats et accès aux données |
| `.specs/standards/ui-components-state.md` | Composants et patterns React réutilisables |
| `.specs/standards/workflow.md` | États, reprise, preuves, documentation et concurrence Git |
| `.specs/domains/product-map.md` | Vision, domaines, statuts et dépendances, sans doublonner les détails SQL |
| `.specs/changes/_template/spec.md`, `.specs/changes/_template/tasks.md` | Six sections Delta-First et cinq groupes de tâches avec preuves/checkpoint |
| `.agents/skills/sdd-discover/SKILL.md` | Maintenance ciblée des standards |
| `.agents/skills/sdd-shape/SKILL.md` | Cadrage réutilisation/delta et tâches |
| `.agents/skills/sdd-implement/SKILL.md` | Implémentation et synchronisation documentaire |
| `.agents/skills/sdd-verify/SKILL.md` | Vérification par preuves et promotion verified |
| `.agents/skills/sdd-archive/SKILL.md` | Consolidation et promotion archived |

Total : 25 fichiers de mission, dont 20 créés et 5 modifiés. Dossiers d'archive et
de changements concrets différés à leur premier usage, sans fichier artificiel.
Les deux skills existants sont conservés et référencés.

## Architecture SDD et analyse documentaire

Chargement ciblé via index, standard B2B obligatoire pour backend/DB/IAM.
Specs en delta ADDED/MODIFIED/REMOVED, critères GIVEN/WHEN/THEN et réutilisation
justifiée. États draft → shaped → implementing → verified → archived ; seuls les
skills de vérification/archivage promeuvent leurs états respectifs. Le parcours
direct garde analyse documentaire et preuves proportionnées.

Routage : DB→modèle ; IAM→ADR/matrice/standard ; API→architecture ; environnement→
exemples propriétaires/README ; métier→carte/capacités, tous required si réellement
affectés. Changelog et refactoring architecture sont review ; CSS isolé none.

| Cible de cette mission | Décision | Justification |
| --- | --- | --- |
| README, AGENTS, standards, skills, templates | UPDATED | Nouveau contrat d'exécution déclaratif |
| Architecture, modèle, capacités, carte produit | UPDATED | Documentation initiale fondée sur code inspecté |
| ADR-001 et ADR-002 | UPDATED | Autorité historique/actuelle explicitée |
| `.env.example` | UPDATED | Commentaire devenu faux ; références aux exemples existants |
| `apps/api/.env.example` | REVIEWED_NO_CHANGE | Variables auth/DB/SMTP pertinentes déjà présentes ; aucun changement runtime |
| `docs/architecture/0005-private-pilot.md` | REVIEWED_NO_CHANGE | Aucune évolution IAM ; modifications locales existantes préservées |
| CHANGELOG | REVIEWED_NO_CHANGE | Fichier initialisé sans entrée ; aucun changement utilisateur livré |
| Règles DB/API/fonctionnalité du routage | NOT_APPLICABLE | Aucun delta applicatif ; audit documentaire initial uniquement |

Aucune cible obligatoire manquante pour le bootstrap. La valeur préexistante dans
l'exemple opérateur est une limite explicitement signalée, pas un secret nouvellement ajouté.

## Résultats des contrôles

Validation ponctuelle en mémoire via Node, sans nouveau fichier exécutable ;
`js-yaml` 4.3.2 réutilisé depuis la dépendance transitive existante d'ESLint.

| Contrôle | Statut | Méthode et preuve | Limite |
| --- | --- | --- | --- |
| Stack et commandes | PASS | Lecture manifests/config/CI ; `node -v`, `pnpm -v` | Pas d'exécution des gates applicatifs |
| YAML catalogue et routage | PASS | Parse js-yaml, assertions champs, unicité standards, cinq entrées/huit règles et existence cibles | Contrat déclaratif, pas moteur exécuté |
| Skills | PASS | Parse des cinq frontmatters, noms/descriptions et chemins ; inspection des responsabilités | Découverte/rechargement dans une nouvelle session Codex non testé |
| Templates | PASS | Assertions frontmatter draft, six sections, trois deltas, GIVEN/WHEN/THEN et cinq groupes | Aucun changement métier réel exécuté via ces skills |
| Limite AGENTS | PASS | Comptage Node et `wc -l AGENTS.md` : 88 | Limite demandée 130 |
| Références | PASS | Assertions d'existence des liens Markdown locaux et chemins littéraux des documents de mission ; chemins futurs explicités | Pas de vérification de liens web ou placeholders futurs |
| Cohérence workflow | PASS | Relecture états, reprise, droits de promotion, blocage MISSING/FAIL/NOT_RUN et analyse documentaire | Revue statique sans enforcement CI |
| Diff | PASS | `git diff --check`, examen diff et nouveaux documents | Le diff Git global inclut aussi le travail initial |
| Périmètre Git | PASS | Comparaison SHA-256 aux 103 fichiers initiaux ; aucune suppression ni modification hors chemins autorisés | Fichiers ignorés non inventoriés ; aucune commande n'en modifie |
| Concurrence cible | PASS | Deux lectures `git ls-remote origin refs/heads/main`, SHA inchangé | Instantané, pas verrou Git |
| Tests, types, lint, build, smoke, E2E, DB sécurité | NOT_RUN | Aucun code/config exécutable changé ; validations documentaires proportionnées | Aucune garantie runtime nouvelle |
| Migration/installation/déploiement | NOT_APPLICABLE | Hors mission et non exécutés | Aucune action d'infrastructure |

Le premier essai de validation groupée a échoué par troncature de commande shell ;
rejoué en commandes courtes, parse YAML/chemins et comparaison des empreintes ont
réussi séparément. Python ne dispose pas de PyYAML ; aucune dépendance installée.
Le validateur Python du skill-creator n'a pas été exécuté ; les frontmatters ont
été validés avec le parseur YAML existant et des assertions équivalentes de structure.

## Git safety et limites finales

`git status --short` reste non propre : travail initial et fichiers de mission.
Les fichiers applicatifs, tests, migrations, manifests, lockfile, configs et scripts
restent identiques à leur empreinte initiale. README préexistant conservé avec ajout
ciblé ; ADR-005 et DESIGN locaux laissés intacts. Aucun reset, clean, stash ou
résolution forcée. Aucun commit/push/PR créé, aucun merge ni déploiement.
Le contrat est immédiatement lisible depuis AGENTS mais son exécution reste celle
de Codex : aucune automatisation SDD CI ni preuve runtime supplémentaire n'est livrée.

## Préparation de la PR documentaire

Le relevé ci-dessus décrit l'état à la fin du bootstrap, avant sa publication.
La PR suivante sélectionne uniquement ces 25 fichiers. Le README est sélectionné
par ajout SDD : ses paragraphes locaux smoke/admin restent hors index et sont préservés.
Les observations de code local ne sont pas des fonctionnalités livrées par cette PR.

Références locales préexistantes explicitement exclues, donc indisponibles sur un
checkout propre de cette seule PR :

- `apps/api/migrations/0007_enabled_administrator.sql` ;
- `apps/api/src/business/lifecycle.integration.test.ts` ;
- `apps/web/src/admin/AdminSidebar.tsx` ;
- `apps/web/src/auth/LocalTestAdminCredentials.tsx` ;
- `docs/architecture/routes-verification.md` ;
- `tests/e2e/admin-layout.spec.ts`, `tests/e2e/admin.spec.ts`, `tests/e2e/tenant-scope.spec.ts`.

Les descriptions `/admin`, navigation avancée et dernier administrateur actif
doivent être lues dans cette portée locale jusqu'à livraison des changements
applicatifs séparés. Aucun de ces fichiers n'est ajouté pour résoudre un lien.
La CI existante vérifie le contenu réellement publié par la PR ; les contrôles
runtime du rapport de bootstrap restent NOT_RUN tant qu'aucun résultat nouveau
n'est disponible pour le commit de publication.
