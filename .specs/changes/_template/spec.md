---
id: "<YYYY-MM-DD>-<slug>"
status: draft
---

## 1. Objectif & Scope

- Problème : <fait observable>.
- Résultat attendu : <résultat vérifiable>.
- In-Scope : <périmètre exact>.
- Out-of-Scope : <exclusions>.
- Contraintes, hypothèses et arbitrages : <preuves ou UNKNOWN ; question bloquante>.

## 2. Standards Applicables

Sélectionner depuis `.specs/standards/index.yml`, sans recopier les standards.

| ID | Chemin exact | Justification |
| --- | --- | --- |
| <standard applicable> | <chemin existant> | <nature du changement> |

## 3. Code Existant à Réutiliser

| Composant, hook, service, schéma, contrat, helper ou test | Chemin exact | Réutilisation prévue |
| --- | --- | --- |
| <existant inspecté> | <chemin existant> | <extension minimale> |

Pour chaque création proposée : <pourquoi l'existant ne suffit pas>.

## 4. Sécurité B2B & Multi-Tenancy

- Organisation/tenant et portée workspace : <contexte serveur>.
- Données accessibles, filtrage et autorisations : <frontières>.
- Matrice RBAC : <action × rôle ; refus par défaut>.
- Tests d'accès refusé : <sans session, sans permission, autre tenant/workspace>.
- Jobs, exports et agents IA : <impact ou absence motivée>.
- Sans impact : `NOT_APPLICABLE` avec justification explicite.

## 5. Delta Fonctionnel & Technique

### ADDED

<Ajouts par rapport au code réel, ou aucun.>

### MODIFIED

<Modifications de l'existant, ou aucune.>

### REMOVED

<Retraits et impacts sur appelants, ou aucun.>

### Critères d'acceptation

```gherkin
GIVEN <état initial prouvé>
WHEN <action>
THEN <résultat observable>
```

Ajouter les cas négatifs de sécurité applicables et associer chaque critère à une
méthode de vérification réelle ; distinguer test existant et test à ajouter.

## 6. Impact Documentation Projet (Auto-Doc)

Analyser `.specs/standards/doc-sync-map.yml`, y compris si aucune cible n'est affectée.

| Chemin exact ou aucune cible | Politique required/review/none | Modification attendue | Justification |
| --- | --- | --- | --- |
| <cible> | <politique> | <delta ou aucune> | <impact sémantique> |
