# Markdown Accessibility Audit

An audit of markdown documentation, run on 2026-11-01. Read the executive summary for the verdict, the priorities section for what to do first, and the findings tables for detail.

## Metadata

What was audited, with what, and under which settings.

| Field | Value |
|---|---|
| Date | 2026-11-01 |
| Scope | 8 items |
| Skills run | markdown-scanner |
| Tooling | node v24.22.1, a11y-mcp-server 7.1.0 |
| Scan configuration | defaults, no config file found |
| Checks counted | 61 |

Audited:

- `specs/004-profile-scope-editing/checklists/requirements.md`
- `specs/004-profile-scope-editing/contracts/api.md`
- `specs/004-profile-scope-editing/data-model.md`
- `specs/004-profile-scope-editing/plan.md`
- `specs/004-profile-scope-editing/quickstart.md`
- `specs/004-profile-scope-editing/research.md`
- `specs/004-profile-scope-editing/spec.md`
- `specs/004-profile-scope-editing/tasks.md`

## Executive summary

Pass. No critical or serious findings.

The headline numbers for this run.

| Measure | Value |
|---|---|
| Score | 96 out of 100 |
| Grade | A |
| Findings | 16 |
| Blocking (critical plus serious) | 0 |
| Verdict | Pass |

## Severity breakdown

Counts by severity, highest impact first.

| Severity | Count | What it means |
|---|---:|---|
| critical | 0 | Blocks a person from completing the task |
| serious | 0 | Major barrier with a difficult workaround |
| moderate | 0 | Real friction, workaround exists |
| minor | 16 | Noticeable but rarely blocking |

## Findings

16 findings, ordered by severity then by rule.

### Minor (16)

Each row names the rule, the criterion it fails, where it is, and what to change.

| Rule | WCAG | Location | Problem | Fix |
|---|---|---|---|---|
| `MARKDOWN-PLAIN-TECHNICAL-JARGON` | n/a | research.md:27 | L’acronyme « DTO » apparaît sans être développé à sa première occurrence. | Écrire « objet de transfert de données (DTO) » à la première occurrence. |
| `MD-HEADING-001` | 2.4.6 AA | checklists/requirements.md:32 | Le titre « Notes » ne décrit pas clairement le contenu de cette section. | Remplacer « Notes » par un titre plus précis, par exemple « État du contrôle et suivi de l’implémentation ». |
| `MD-PLAIN-001` | n/a | checklists/requirements.md:1 | Le terme technique « tenant » n’est pas expliqué dans le document. | Remplacer « tenant » par un terme destiné aux parties prenantes, ou ajouter une brève explication en langage courant. |
| `MD-PLAIN-001` | n/a | contracts/api.md:7 | Le terme anglais « membership active » n’est pas expliqué dans ce contrat rédigé en français. | Remplacer « membership active » par un terme français adapté, par exemple « adhésion active », ou expliquer le terme à sa première occurrence. |
| `MD-PLAIN-001` | n/a | plan.md:16,37 | Les termes anglais « membership » et « query tenant » ne sont pas expliqués à leur première occurrence. | Les remplacer par des formulations françaises explicites, par exemple « adhésion au tenant » et « requête associée au tenant », ou les définir à leur première occurrence. |
| `MD-PLAIN-002` | n/a | contracts/api.md:8 | L’acronyme « DTO » apparaît sans être développé à sa première occurrence. | Remplacer « DTO strict » par « objet de transfert de données (DTO) strict » à la première occurrence. |
| `MD-PLAIN-002` | n/a | plan.md:61 | La formulation passive « seront vérifiés » ne précise pas qui doit vérifier les routes et les tests. | Employer une formulation active, par exemple : « Vérifier les routes et les tests d’intégration PostgreSQL existants sans créer de middleware ni de migration. » |
| `MD-PLAIN-PASSIVE` | n/a | quickstart.md:25 | Une consigne utilise une formulation passive, moins directe à comprendre. | Remplacer « aucune base de développement ou de production ne doit être utilisée » par « N’utilisez aucune base de développement ou de production ». |
| `MD013` | n/a | plan.md:16,19,27,29,37,39,40,47,61 | Neuf lignes dépassent la limite de 80 caractères signalée par markdownlint. | Reformater ces lignes pour respecter la limite de 80 caractères configurée. |
| `MD022` | n/a | spec.md:10 | Le titre « User Story 1 » n’est pas suivi d’une ligne vide. | Ajouter une ligne vide après le titre avant le paragraphe suivant. |
| `MD022` | n/a | spec.md:26 | Le titre « User Story 2 » n’est pas suivi d’une ligne vide. | Ajouter une ligne vide après le titre avant le paragraphe suivant. |
| `MD9-TECHNICAL-JARGON` | n/a | data-model.md:13 | Le texte emploie « query tenant » et « transaction » sans expliquer ces termes techniques. | Remplacer « query tenant » par une formulation française et définir « transaction » et « tenant » à leur première occurrence, ou renvoyer vers un glossaire. |
| `PLAIN-LANGUAGE-001` | n/a | spec.md:1 | Le terme technique « tenant » apparaît sans explication à sa première occurrence. | Définir « tenant » dès sa première occurrence, par exemple comme l’organisation ou l’espace de travail concerné. |
| `PLAIN-LANGUAGE-001` | n/a | tasks.md:12 | Le terme technique « tenant-scopée » n’est pas expliqué lors de sa première occurrence. | Remplacer par une formulation explicite, par exemple « limitée au tenant courant (espace de travail) ». |
| `PLAIN-LANGUAGE-001` | n/a | tasks.md:26 | Le terme « membership » n’est pas expliqué et peut être difficile à comprendre pour un lectorat francophone. | Employer « adhésion » ou « appartenance au tenant », selon le sens voulu, et définir le terme technique si nécessaire. |
| `PLAIN-LANGUAGE-001` | n/a | tasks.md:52 | Le terme informatique « query » apparaît sans explication en français. | Remplacer par « requête active » ou expliquer « query » lors de sa première occurrence. |

## Remediation priorities

The remaining 16 moderate and minor findings can follow in normal work.

## What passed

45 checks ran and found nothing.

- Accessibilité des tableaux : aucun problème relevé.
- Accessibilité des tableaux : aucun tableau détecté.
- Ancres : aucun lien d’ancre détecté.
- Ancres : aucun lien d’ancre repéré.
- Ancres : aucun lien d’ancre à valider.
- Ancres : aucun lien d’ancre.
- Ancres : aucun problème relevé.
- Ancres : aucune ancre ni lien interne détecté.
- Ancres : aucune ancre à valider.
- Ancres internes : aucune ancre à valider.
- Diagrammes Mermaid et ASCII : aucun diagramme détecté.
- Diagrammes Mermaid et ASCII : aucun diagramme repéré.
- Diagrammes Mermaid et ASCII : aucun diagramme.
- Diagrammes Mermaid et ASCII : aucun problème relevé.
- Hiérarchie des titres : aucun problème relevé.
- Hiérarchie des titres : un H1 et des H2 correctement ordonnés.
- Hiérarchie des titres : un H1 sans saut de niveau.
- Hiérarchie des titres : un H1, des H2 séquentiels, aucun défaut apparent.
- Hiérarchie des titres : un seul H1 et aucun saut de niveau ; deux espacements MD022 signalés.
- Hiérarchie des titres : un seul H1 et aucun saut de niveau.
- Langage clair et listes : aucun paragraphe de plus de 150 mots ni phrase de plus de 40 mots repéré.
- Langage clair et listes : aucun paragraphe de plus de 150 mots, aucune phrase de plus de 40 mots et aucune liste.
- Langage clair, longueur des phrases et structure des listes : aucun problème relevé.
- Liens descriptifs : aucun lien ni URL détecté.
- Liens descriptifs : aucun lien ni URL repéré.
- Liens descriptifs : aucun lien ni URL.
- Liens descriptifs : aucun problème relevé.
- Liens descriptifs : le lien « spec.md » décrit sa destination.
- Normalisation des tirets : aucun motif applicable.
- Normalisation des tirets : aucun problème relevé.
- Normalisation des tirets : aucun tiret cadratin ou demi-cadratin dans le texte courant.
- Normalisation des tirets : aucun tiret cadratin ou demi-cadratin détecté dans le texte courant.
- Normalisation des tirets : aucun tiret cadratin ou demi-cadratin détecté.
- Normalisation des tirets : aucun tiret cadratin ou demi-cadratin, ni double tiret dans le texte courant.
- Normalisation des tirets : aucun tiret typographique ou double tiret dans le texte courant.
- Tableaux : aucun tableau repéré.
- Tableaux : aucun tableau.
- Tableaux : en-têtes présents, aucune cellule initiale vide et texte explicatif avant le tableau.
- Texte alternatif : aucune image détectée.
- Texte alternatif : aucune image repérée.
- Texte alternatif : aucune image.
- Texte alternatif des images : aucun problème relevé.
- Textes alternatifs : aucun problème relevé.
- Émojis : aucun émoji détecté.
- Émojis : aucun émoji repéré.

## Needs a human

Items a skill could not decide, or could not check automatically.

- **markdown-scanner**: Le scanner automatisé n’a pas pu lire le fichier depuis son périmètre d’accès ; les domaines ont été examinés directement.
- **markdown-scanner**: markdownlint-cli2 a signalé 20 dépassements MD013 et 2 violations MD032 ; ces règles ne correspondent pas aux domaines d’accessibilité examinés.
- **markdown-scanner**: Le scanner automatisé n’a pas pu lire le fichier depuis son périmètre d’accès ; les domaines ont été examinés manuellement.
- **markdown-scanner**: markdownlint-cli2 a signalé neuf dépassements de longueur de ligne.
- **markdown-scanner**: Le scanner automatisé n’a pas pu lire le fichier depuis son périmètre d’accès ; les domaines ont été examinés manuellement.
- **markdown-scanner**: markdownlint-cli2 a relevé 19 violations MD013 et 2 MD024, hors des domaines d’accessibilité examinés.
- **markdown-scanner**: Le scanner automatisé n’a pas pu accéder au fichier ; les domaines ont été vérifiés directement.
- **markdown-scanner**: markdownlint-cli2 a signalé une ligne MD013 de 105 caractères ; cette règle ne correspond pas à un domaine d’accessibilité.
- **markdown-scanner**: Le scanner automatisé n’a pas pu accéder au fichier ; les domaines ont été vérifiés par lecture directe.
- **markdown-scanner**: markdownlint a signalé MD013 aux lignes 8, 10 et 11 ; cette règle ne correspond pas à un domaine d’accessibilité.
- **markdown-scanner**: Le scanner automatisé n’a pas pu accéder au fichier ; les neuf domaines ont été examinés manuellement.
- **markdown-scanner**: markdownlint a signalé MD013 aux lignes 6 et 29 ; cette règle ne correspond pas aux domaines d’accessibilité examinés.
- **markdown-scanner**: Le scanner automatisé n’a pas pu lire le fichier depuis son périmètre d’accès ; les domaines ont été examinés manuellement.
- **markdown-scanner**: Le scanner MCP et markdownlint-cli2 n’ont pas pu lire ou contrôler le fichier depuis leur périmètre d’accès ; le contenu a été examiné directement.

## Next steps

1. Keep the current checks in continuous integration so this does not regress.
2. Re-audit when the interface changes materially, or quarterly.
3. Confirm the automated result with a manual screen reader and keyboard pass.

Automated checks find a minority of accessibility barriers. A passing score is a floor, not a guarantee.

## Findings data

The merged findings, embedded so the next run can compute a delta without parsing this document.

```json a11y-findings
{
  "skills": [
    "markdown-scanner"
  ],
  "scope": [
    "specs/004-profile-scope-editing/checklists/requirements.md",
    "specs/004-profile-scope-editing/contracts/api.md",
    "specs/004-profile-scope-editing/data-model.md",
    "specs/004-profile-scope-editing/plan.md",
    "specs/004-profile-scope-editing/quickstart.md",
    "specs/004-profile-scope-editing/research.md",
    "specs/004-profile-scope-editing/spec.md",
    "specs/004-profile-scope-editing/tasks.md"
  ],
  "findings": [
    {
      "rule": "MARKDOWN-PLAIN-TECHNICAL-JARGON",
      "wcag": "n/a",
      "severity": "minor",
      "location": "research.md:27",
      "summary": "L’acronyme « DTO » apparaît sans être développé à sa première occurrence.",
      "fix": "Écrire « objet de transfert de données (DTO) » à la première occurrence.",
      "evidence": "« DTO partagé »",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD-HEADING-001",
      "wcag": "2.4.6 AA",
      "severity": "minor",
      "confidence": "medium",
      "location": "checklists/requirements.md:32",
      "summary": "Le titre « Notes » ne décrit pas clairement le contenu de cette section.",
      "fix": "Remplacer « Notes » par un titre plus précis, par exemple « État du contrôle et suivi de l’implémentation ».",
      "evidence": "## Notes",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD-PLAIN-001",
      "wcag": "n/a",
      "severity": "minor",
      "confidence": "medium",
      "location": "checklists/requirements.md:1",
      "summary": "Le terme technique « tenant » n’est pas expliqué dans le document.",
      "fix": "Remplacer « tenant » par un terme destiné aux parties prenantes, ou ajouter une brève explication en langage courant.",
      "evidence": "Édition sûre du profil par tenant",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD-PLAIN-001",
      "wcag": "n/a",
      "severity": "minor",
      "confidence": "medium",
      "location": "contracts/api.md:7",
      "summary": "Le terme anglais « membership active » n’est pas expliqué dans ce contrat rédigé en français.",
      "fix": "Remplacer « membership active » par un terme français adapté, par exemple « adhésion active », ou expliquer le terme à sa première occurrence.",
      "evidence": "sa membership active dans cette portée",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD-PLAIN-001",
      "wcag": "n/a",
      "severity": "minor",
      "location": "plan.md:16,37",
      "summary": "Les termes anglais « membership » et « query tenant » ne sont pas expliqués à leur première occurrence.",
      "fix": "Les remplacer par des formulations françaises explicites, par exemple « adhésion au tenant » et « requête associée au tenant », ou les définir à leur première occurrence.",
      "evidence": "« membership pour les métadonnées professionnelles du tenant » ; « query tenant ».",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD-PLAIN-002",
      "wcag": "n/a",
      "severity": "minor",
      "confidence": "medium",
      "location": "contracts/api.md:8",
      "summary": "L’acronyme « DTO » apparaît sans être développé à sa première occurrence.",
      "fix": "Remplacer « DTO strict » par « objet de transfert de données (DTO) strict » à la première occurrence.",
      "evidence": "DTO strict",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD-PLAIN-002",
      "wcag": "n/a",
      "severity": "minor",
      "location": "plan.md:61",
      "summary": "La formulation passive « seront vérifiés » ne précise pas qui doit vérifier les routes et les tests.",
      "fix": "Employer une formulation active, par exemple : « Vérifier les routes et les tests d’intégration PostgreSQL existants sans créer de middleware ni de migration. »",
      "evidence": "« Les routes et tests d'intégration PostgreSQL existants seront vérifiés ».",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD-PLAIN-PASSIVE",
      "wcag": "n/a",
      "severity": "minor",
      "confidence": "high",
      "location": "quickstart.md:25",
      "summary": "Une consigne utilise une formulation passive, moins directe à comprendre.",
      "fix": "Remplacer « aucune base de développement ou de production ne doit être utilisée » par « N’utilisez aucune base de développement ou de production ».",
      "evidence": "aucune base de développement ou de production ne doit être utilisée",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD013",
      "wcag": "n/a",
      "severity": "minor",
      "location": "plan.md:16,19,27,29,37,39,40,47,61",
      "summary": "Neuf lignes dépassent la limite de 80 caractères signalée par markdownlint.",
      "fix": "Reformater ces lignes pour respecter la limite de 80 caractères configurée.",
      "evidence": "Lignes 16, 19, 27, 29, 37, 39, 40, 47 et 61.",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD022",
      "wcag": "n/a",
      "severity": "minor",
      "confidence": "high",
      "location": "spec.md:10",
      "summary": "Le titre « User Story 1 » n’est pas suivi d’une ligne vide.",
      "fix": "Ajouter une ligne vide après le titre avant le paragraphe suivant.",
      "evidence": "### User Story 1 - Modifier son profil (Priority: P1)",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD022",
      "wcag": "n/a",
      "severity": "minor",
      "confidence": "high",
      "location": "spec.md:26",
      "summary": "Le titre « User Story 2 » n’est pas suivi d’une ligne vide.",
      "fix": "Ajouter une ligne vide après le titre avant le paragraphe suivant.",
      "evidence": "### User Story 2 - Changer de tenant sur le profil (Priority: P1)",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "MD9-TECHNICAL-JARGON",
      "wcag": "n/a",
      "severity": "minor",
      "confidence": "medium",
      "location": "data-model.md:13",
      "summary": "Le texte emploie « query tenant » et « transaction » sans expliquer ces termes techniques.",
      "fix": "Remplacer « query tenant » par une formulation française et définir « transaction » et « tenant » à leur première occurrence, ou renvoyer vers un glossaire.",
      "evidence": "La query tenant demande un contexte ; elle ne confère aucun accès. La transaction vérifie l'acteur et le tenant...",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "PLAIN-LANGUAGE-001",
      "wcag": "n/a",
      "severity": "minor",
      "confidence": "medium",
      "location": "spec.md:1",
      "summary": "Le terme technique « tenant » apparaît sans explication à sa première occurrence.",
      "fix": "Définir « tenant » dès sa première occurrence, par exemple comme l’organisation ou l’espace de travail concerné.",
      "evidence": "Édition sûre du profil par tenant",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "PLAIN-LANGUAGE-001",
      "wcag": "n/a",
      "severity": "minor",
      "confidence": "medium",
      "location": "tasks.md:12",
      "summary": "Le terme technique « tenant-scopée » n’est pas expliqué lors de sa première occurrence.",
      "fix": "Remplacer par une formulation explicite, par exemple « limitée au tenant courant (espace de travail) ».",
      "evidence": "la transaction tenant-scopée",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "PLAIN-LANGUAGE-001",
      "wcag": "n/a",
      "severity": "minor",
      "confidence": "medium",
      "location": "tasks.md:26",
      "summary": "Le terme « membership » n’est pas expliqué et peut être difficile à comprendre pour un lectorat francophone.",
      "fix": "Employer « adhésion » ou « appartenance au tenant », selon le sens voulu, et définir le terme technique si nécessaire.",
      "evidence": "le compte ou la membership courante",
      "foundBy": [
        "markdown-scanner"
      ]
    },
    {
      "rule": "PLAIN-LANGUAGE-001",
      "wcag": "n/a",
      "severity": "minor",
      "confidence": "medium",
      "location": "tasks.md:52",
      "summary": "Le terme informatique « query » apparaît sans explication en français.",
      "fix": "Remplacer par « requête active » ou expliquer « query » lors de sa première occurrence.",
      "evidence": "à la query active",
      "foundBy": [
        "markdown-scanner"
      ]
    }
  ],
  "passed": [
    "Accessibilité des tableaux : aucun problème relevé.",
    "Accessibilité des tableaux : aucun tableau détecté.",
    "Ancres : aucun lien d’ancre détecté.",
    "Ancres : aucun lien d’ancre repéré.",
    "Ancres : aucun lien d’ancre à valider.",
    "Ancres : aucun lien d’ancre.",
    "Ancres : aucun problème relevé.",
    "Ancres : aucune ancre ni lien interne détecté.",
    "Ancres : aucune ancre à valider.",
    "Ancres internes : aucune ancre à valider.",
    "Diagrammes Mermaid et ASCII : aucun diagramme détecté.",
    "Diagrammes Mermaid et ASCII : aucun diagramme repéré.",
    "Diagrammes Mermaid et ASCII : aucun diagramme.",
    "Diagrammes Mermaid et ASCII : aucun problème relevé.",
    "Hiérarchie des titres : aucun problème relevé.",
    "Hiérarchie des titres : un H1 et des H2 correctement ordonnés.",
    "Hiérarchie des titres : un H1 sans saut de niveau.",
    "Hiérarchie des titres : un H1, des H2 séquentiels, aucun défaut apparent.",
    "Hiérarchie des titres : un seul H1 et aucun saut de niveau ; deux espacements MD022 signalés.",
    "Hiérarchie des titres : un seul H1 et aucun saut de niveau.",
    "Langage clair et listes : aucun paragraphe de plus de 150 mots ni phrase de plus de 40 mots repéré.",
    "Langage clair et listes : aucun paragraphe de plus de 150 mots, aucune phrase de plus de 40 mots et aucune liste.",
    "Langage clair, longueur des phrases et structure des listes : aucun problème relevé.",
    "Liens descriptifs : aucun lien ni URL détecté.",
    "Liens descriptifs : aucun lien ni URL repéré.",
    "Liens descriptifs : aucun lien ni URL.",
    "Liens descriptifs : aucun problème relevé.",
    "Liens descriptifs : le lien « spec.md » décrit sa destination.",
    "Normalisation des tirets : aucun motif applicable.",
    "Normalisation des tirets : aucun problème relevé.",
    "Normalisation des tirets : aucun tiret cadratin ou demi-cadratin dans le texte courant.",
    "Normalisation des tirets : aucun tiret cadratin ou demi-cadratin détecté dans le texte courant.",
    "Normalisation des tirets : aucun tiret cadratin ou demi-cadratin détecté.",
    "Normalisation des tirets : aucun tiret cadratin ou demi-cadratin, ni double tiret dans le texte courant.",
    "Normalisation des tirets : aucun tiret typographique ou double tiret dans le texte courant.",
    "Tableaux : aucun tableau repéré.",
    "Tableaux : aucun tableau.",
    "Tableaux : en-têtes présents, aucune cellule initiale vide et texte explicatif avant le tableau.",
    "Texte alternatif : aucune image détectée.",
    "Texte alternatif : aucune image repérée.",
    "Texte alternatif : aucune image.",
    "Texte alternatif des images : aucun problème relevé.",
    "Textes alternatifs : aucun problème relevé.",
    "Émojis : aucun émoji détecté.",
    "Émojis : aucun émoji repéré."
  ],
  "notes": [
    {
      "skill": "markdown-scanner",
      "note": "Le scanner automatisé n’a pas pu lire le fichier depuis son périmètre d’accès ; les domaines ont été examinés directement."
    },
    {
      "skill": "markdown-scanner",
      "note": "markdownlint-cli2 a signalé 20 dépassements MD013 et 2 violations MD032 ; ces règles ne correspondent pas aux domaines d’accessibilité examinés."
    },
    {
      "skill": "markdown-scanner",
      "note": "Le scanner automatisé n’a pas pu lire le fichier depuis son périmètre d’accès ; les domaines ont été examinés manuellement."
    },
    {
      "skill": "markdown-scanner",
      "note": "markdownlint-cli2 a signalé neuf dépassements de longueur de ligne."
    },
    {
      "skill": "markdown-scanner",
      "note": "Le scanner automatisé n’a pas pu lire le fichier depuis son périmètre d’accès ; les domaines ont été examinés manuellement."
    },
    {
      "skill": "markdown-scanner",
      "note": "markdownlint-cli2 a relevé 19 violations MD013 et 2 MD024, hors des domaines d’accessibilité examinés."
    },
    {
      "skill": "markdown-scanner",
      "note": "Le scanner automatisé n’a pas pu accéder au fichier ; les domaines ont été vérifiés directement."
    },
    {
      "skill": "markdown-scanner",
      "note": "markdownlint-cli2 a signalé une ligne MD013 de 105 caractères ; cette règle ne correspond pas à un domaine d’accessibilité."
    },
    {
      "skill": "markdown-scanner",
      "note": "Le scanner automatisé n’a pas pu accéder au fichier ; les domaines ont été vérifiés par lecture directe."
    },
    {
      "skill": "markdown-scanner",
      "note": "markdownlint a signalé MD013 aux lignes 8, 10 et 11 ; cette règle ne correspond pas à un domaine d’accessibilité."
    },
    {
      "skill": "markdown-scanner",
      "note": "Le scanner automatisé n’a pas pu accéder au fichier ; les neuf domaines ont été examinés manuellement."
    },
    {
      "skill": "markdown-scanner",
      "note": "markdownlint a signalé MD013 aux lignes 6 et 29 ; cette règle ne correspond pas aux domaines d’accessibilité examinés."
    },
    {
      "skill": "markdown-scanner",
      "note": "Le scanner automatisé n’a pas pu lire le fichier depuis son périmètre d’accès ; les domaines ont été examinés manuellement."
    },
    {
      "skill": "markdown-scanner",
      "note": "Le scanner MCP et markdownlint-cli2 n’ont pas pu lire ou contrôler le fichier depuis leur périmètre d’accès ; le contenu a été examiné directement."
    }
  ],
  "counts": {
    "critical": 0,
    "serious": 0,
    "moderate": 0,
    "minor": 16
  },
  "components": [],
  "score": 96,
  "grade": "A",
  "penalty": 13.3,
  "checks": 61,
  "generated": "2026-11-01",
  "template": "markdown"
}
```
