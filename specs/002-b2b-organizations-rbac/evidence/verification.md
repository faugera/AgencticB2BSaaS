# Vérification B2B — 25 octobre 2026

Périmètre : branche codex/b2b-organizations-rbac depuis main f47449c ; migrations
0013–0015 additives, aucun ancien SQL modifié. Les sources UI sont figées au manifeste.
SQL0014 SHA256 : 840ad90bec99d91b8186fc763b7c60791139158e99c15a65bd84b674405b6fd5.

| Contrôle | Résultat | Preuve / limite |
| --- | --- | --- |
| pnpm verify | PASS | verify-final.log ; puis typecheck/lint/52unitaires/smoke et builds API/web relancés sur les derniers deltas |
| pnpm verify:security | PASS | security-final.log : contrôles statiques, audit dépendances sans vulnérabilité connue, 65 intégrations réelles |
| pnpm verify:tenant-isolation | PASS | isolation-final.log : 15/15 SQL/HTTP |
| Reprise/rejeu historique opt-in | PASS | migration-final.log : 1/1, base dédiée vide ; rollback billing sans source, IDs/dates/email et replay |
| UI simulée Chromium complet | PASS | ui-current-tests.log : 46/46 ; derniers deltas navigation couverts dans matrice6/6 |
| Matrice visuelle FR/EN375/768/1280 | PASS exécution | ui-current-visual-tests.log, manifeste282PNG, 47états×6 ; revue indépendante distincte |
| Auth/SMTP navigateur réel | PASS | auth-live-final.log : desktop2/2 + mobile2/2 sur DB finale |
| pnpm docs:test / pnpm docs:check | PASS | 9tests et structure/liens/statuts contrôlés |
| Revue finale indépendante | IN_PROGRESS | T012 ; aucun verdict global inventé |
| Production / migration dev | NOT_RUN | Non autorisées ; aucun déploiement ni certification infrastructure |

La suite de reprise est SKIPPED dans le gate d'intégration courant, car elle exige une
base vide dédiée ; elle a été exécutée séparément avec le flag explicite et figure aussi
dans la CI. Les fixtures des intégrations HTTP simulent seulement le transport SMTP ;
les parcours auth-live utilisent Mailpit réel. Les captures UI ne prouvent pas les droits.

PostgreSQL17 portable sur loopback59889, données synthétiques task-only ; Docker
Desktop indisponible. Mailpit officiel1.32.0, SHA256 archive Windows vérifié depuis les
métadonnées GitHub ; loopback SMTP51025/HTTP58025. Aucun credential réel, private.env,
ou DB de développement lu/migré. Chromium headless-shell échoue ICU avant assertion ;
configurations de preuve emploient channel chromium complet, sans modifier le défaut CI.

## Défauts trouvés et corrigés

- DTO facultatifs, alias canoniques et reprise des dates ; cast SQL audit varchar/text.
- Refus workspace étranger, isolation des impacts de rôle et memberships inactifs.
- Dernier admin par capacité effective, verrou concurrent et révocation des rôles redondants.
- Permissions custom exactes sans plein accès implicite ; délégation UI super/workspace.
- Captures anciennes partielles remplacées par matrice fraîche, formulaire et modalité Brume.

Les premiers logs et rapports FAIL sont historiques de cette tentative ; le manifeste
ui-current et les fichiers *-final font référence. Captures PNG locales non versionnées,
reproductibles par le scénario visual et son manifeste ; aucun fichier image temporaire
n'est ajouté à la PR. Les preuves historiques PR7/PR8 ne sont pas présentées comme relancées.

## Limites

MFA V0 facultative ; SMTP synchrone avec retry manuel, pas d'outbox. Metadata abonnement
sans paiement. L'heuristique de nom premier mot/reste ne détermine pas les noms composés ;
Mon profil permet correction. L'audit protège contre mutations runtime, pas contre
opérateur SQL de confiance ; ni export/rétention externe ni certification accessibilité.
