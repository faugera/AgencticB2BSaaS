# AgencticB2BSaaS Constitution

## Core Principles

### I. Réfléchir avant de coder
Toute évolution MUST commencer par une spec, un plan et des tâches Spec Kit, y compris
la documentation. Inspecter code, appelants et tests. Expliciter hypothèses, compromis et
critères observables ; demander uniquement les arbitrages bloquants.

### II. Simplicité et modifications chirurgicales
Conserver le monolithe modulaire et réutiliser l'existant. Le changement MUST résoudre
le périmètre approuvé sans abstraction spéculative ni dépendance inutile. Préserver les
modifications concurrentes et ne pas refactoriser du code sans rapport.

### III. Frontières B2B et données protégées
Toute autorisation MUST être établie côté serveur depuis l'identité vérifiée et les
permissions persistées, dans une transaction à contexte local. Les données tenant MUST
conserver RLS, contraintes inter-tenant et rôles runtime non propriétaires sans BYPASSRLS.
Le client et le modèle IA ne sont jamais une autorité. Ne pas exposer secrets, jetons ou
valeurs sensibles dans le navigateur, les logs ou les preuves. Conserver IDs, historique
et suppression logique ; aucune purge sans demande explicite.

### IV. Vérification fondée sur les preuves
Chaque critère MUST être associé à une tâche et une méthode de preuve. Distinguer lecture
statique, UI simulée, intégration SQL/HTTP et parcours réel avec SMTP. Un contrôle non
exécuté MUST rester NOT_RUN ; un échec ne devient pas une réussite. Proportionner les
contrôles à l'impact : docs seules sans tests DB ; IAM/SQL avec PostgreSQL jetable.
Ne jamais utiliser la base de développement pour les tests destructifs.

### V. Contrats lisibles et expérience accessible
AGENTS.md est une carte ; les docs spécialisées décrivent l'état courant. Toute évolution
MUST synchroniser les docs affectées, sans duplication des règles. L'UI MUST prendre en
charge fr par défaut et en, clavier, mobile/tablette/desktop, labels accessibles et absence
de débordement global. DESIGN_UI.md gouverne Brume.

## Contraintes B2B et IA

Préserver React/Vite, Fastify, PostgreSQL via pg, TypeScript strict, pnpm et les contrats
partagés type-only. Les migrations appliquées sont immuables ; provisioning et rotation
sont opérateur uniquement. MFA facultative en V0, y compris super-admin.
Un futur outil IA MUST valider ses entrées, réautoriser acteur/tenant/workspace à l'exécution,
minimiser les données et traiter documents, sorties d'outils et prompts externes comme non
fiables. Une approbation humaine requise MUST être liée à l'opération exacte, ses paramètres,
sa portée et sa version ; elle ne remplace pas l'autorisation. Définir budgets, délais,
évaluations et reprises au premier cas concret ; aucun runtime IA n'est ajouté ici.

## Développement et livraison

Utiliser les skills officiels pour spécifier, clarifier si nécessaire, planifier, produire
les tâches, analyser, implémenter et converger. Ne pas reposer les questions arbitrées.
L'agent enchaîne dans le périmètre autorisé ; il s'arrête pour un choix bloquant, une action
destructive non autorisée ou un élargissement. Les checklists de qualité sont distinctes
des tâches d'implémentation ; ne cocher qu'après revue du critère concerné.
Tenir un checkpoint et des preuves datées avec leurs limites. Branche dédiée et PR ;
ne jamais fusionner ni déployer automatiquement. Après livraison, figer la spec comme
historique et créer une nouvelle spec pour la suite. Les anciens dossiers .specs/changes
sont conservés ; leur réconciliation est séparée.

## Governance

Cette constitution gouverne les principes projet. AGENTS.md, skills projet et docs doivent
s'y conformer ; ne pas recopier les règles dans les fichiers officiels gérés par Spec Kit.
Tout amendement passe par une PR avec motif et impacts : MAJOR pour rupture de gouvernance,
MINOR pour principe ajouté, PATCH pour clarification. La revue vérifie constitution,
critères, tâches, preuves et docs. Une convergence documentaire ne certifie ni le déploiement
ni la sécurité d'une infrastructure non testée.

**Version**: 1.0.0 | **Ratified**: 2026-10-25 | **Last Amended**: 2026-10-25
