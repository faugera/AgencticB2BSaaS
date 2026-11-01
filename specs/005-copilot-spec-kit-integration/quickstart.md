# Vérification : Intégration de GitHub Copilot à Spec Kit

Depuis la racine du dépôt, sur Spec Kit 1.2.3 :

```powershell
specify integration list --catalog
specify integration info copilot
specify integration status --json
```

Avant l’installation, vérifier les destinations du mode skills (`.github/skills/`
et `.github/hooks/speckit.json`) et préserver tout contenu local. Vérifier que le mode est
bien `skills`; `.vscode/settings.json` n’est pas utilisé par ce mode.

Après approbation explicite du conflit de sécurité multi-install :

```powershell
specify integration install copilot --script sh --integration-options="--skills" --force
specify integration status --json
pnpm docs:test
pnpm docs:check
pnpm lint
```

Résultats attendus : `copilot`, `codex` et `claude` sont installés ; `codex` demeure le
défaut ; le manifeste Copilot est présent et toutes ses empreintes correspondent.
Spec Kit 1.2.3 ne déclare pas Copilot compatible avec une installation multiple :
après un ajout autorisé avec `--force`, `integration status --json` peut indiquer
`"status": "error"`/`unsafe-multi-install`. Ce résultat amont doit être signalé, même si
les trois intégrations sont inscrites et que le contrôle des manifestes ne relève aucun
fichier manquant ou modifié.

Pour un essai d’exécution du moteur, installer et authentifier Copilot CLI conformément
au guide officiel Copilot. Utiliser un dépôt jetable contenant le workflow et les skills,
puis lancer le cycle avec `integration=copilot` :

```powershell
$env:SPECKIT_COPILOT_ALLOW_ALL_TOOLS = '0'
specify workflow run .specify/workflows/speckit/workflow.yml --input integration=copilot --input spec="Description de la feature"
```

Le réglage `SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0` empêche l’adaptateur d’ajouter `--yolo`.
Tester le rejet à la porte d’approbation et vérifier qu’aucune étape `implement` n’est
appelée. Ne pas exécuter ce test dans le checkout de travail s’il peut créer des artefacts
persistants.

## Preuves du checkout (2026-11-01)

- **PASS — installation** : Spec Kit 1.2.3 inscrit Copilot avec Codex et Claude et conserve
  Codex comme défaut. Les manifestes Codex, Claude, Copilot et Spec Kit ont été lus ;
  zéro fichier manquant, modifié ou chemin invalide.
- **PASS — fins de ligne** : avec `core.autocrlf=true`, `git check-attr` retourne `eol=lf`
  pour les dix chemins du manifeste Copilot ; `specify integration status --json` conserve
  zéro fichier manquant ou modifié.
- **FAIL avec cause amont documentée — statut** : `specify integration status --json`
  retourne `status: error` et `unsafe-multi-install` puisque Copilot n’est pas déclaré
  sûr en multi-installation. Les compteurs de fichiers manquants/modifiés/chemins invalides
  restent à zéro.
- **PASS — vérification statique** : tests du contrôle documentaire vérifiant la
  propagation de l’intégration sélectionnée aux commandes Spec Kit et les portes
  d’approbation bloquantes avant `implement`.
- **NOT_RUN — dispatch réel** : l’exécutable `copilot` est absent du `PATH` local.
  L’authentification n’a donc pas été vérifiée et aucun workflow via le modèle Copilot
  n’a été lancé. Les tests statiques ne prouvent pas une exécution réelle.
