# Tâches — Brume

## 1. Données et validation
- [x] Migration additive et contrats préférences/apparence, validations et refus écrits (exécution SQL non vérifiée).
## 2. Backend
- [ ] Fonctions privées et routes écrites ; tests multi-identités/tenants encore bloqués par l'environnement PostgreSQL.
## 3. Frontend
- [x] Charte, tokens, police et composants utilisés + galerie.
- [x] Shell desktop/mobile, navigation, compte/thème/langue.
- [x] Invitations/listes/profil/auth et personnalisation workspace côté UI.
## 4. Vérification
- [ ] Typecheck frontend, lint/unit/build/smoke et parcours navigateur passent ; types racine bloqués par le test lifecycle préexistant.
- [ ] Sécurité/isolation/auth réels, comparaison visuelle à la référence.
## 5. Documentation
- [x] Synchroniser les cibles required et enregistrer preuves/limites.

## Checkpoint
Branche codex/design-system-brume, modifications antérieures conservées. Statut implementing conservé : test lifecycle local invalide et DB/Docker indisponible. Aucun merge/déploiement.

Le lot Brume avait 108 parcours navigateur réussis et une double revue visuelle ;
le lot ultérieur de normalisation CSS les remplace par 132 parcours réussis et
36 cas ciblés sur Chromium/Firefox/WebKit. Lato auto-hébergée remplace Source Sans 3
sur arbitrage utilisateur ; tailles/espacements utilisateur priment sur la référence.
Voir `docs/design/css-normalization.md` pour les preuves récentes, limites et rapports.
Sécurité SQL/auth réelle et migration 0009 restent à vérifier avant promotion verified.
