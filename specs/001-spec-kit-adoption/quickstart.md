# Vérifier l'adoption

Depuis la racine avec Node 24, pnpm 11.25 et Spec Kit 1.2.3 :

~~~sh
specify version
specify integration status
SPECIFY_FEATURE_DIRECTORY=specs/001-spec-kit-adoption bash .specify/scripts/bash/check-prerequisites.sh --json --require-spec --require-tasks --include-tasks
pnpm docs:test
pnpm docs:check
pnpm lint
~~~

Attendu : intégrations codex/claude, aucun fichier géré modifié/manquant, trois artefacts
résolus ; tests positifs/négatifs et contrôle réussis. Ouvrir la constitution via chacun
des skills plan/analyze et vérifier leur référence commune. Ces skills sont des instructions
exécutées par l'assistant, pas des commandes terminal lançant une IA.
Les validations de cette migration ne nécessitent ni PostgreSQL, ni SMTP, ni navigateur.
