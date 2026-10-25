# Focus clavier et barre mobile — preuve corrective

Le 25 octobre 2026, Chromium complet, build de production, réponses API simulées.

## Reproduction et correction

Trois causes ont été distinguées : capture du haut d’un document plus grand que le
viewport, manque de dégagement en fin de document, focus natif ignorant la barre
fixe. Le défilement centré rendait chaque contrôle accessible ; le dernier point
était pourtant un défaut clavier réel. Deux exécutions avant correction ont
laissé le bas du bouton Enregistrer du profil à **847,5 px** alors que la barre
commençait à **839 px**, y compris après 5 secondes d’attente.

`ui-reachability-initial.log` contient l’échec reproductible. La marge de défilement
sur le contrôle n’a pas corrigé le focus natif et a été retirée. La correction
conservée ajoute seulement `scroll-padding-bottom` au viewport mobile portant le
shell, avec les **88 px de dégagement Brume existants** et la safe area.

## Preuve courante

- PASS : build et ESLint ; suite complète **47/47** dans `ui-keyboard-current-tests.log`.
- PASS : dernière matrice **6/6**, FR/EN × 375/768/1280, dans `ui-reachability-final.log`.
- Pour les états profil erreur, organisation succès/erreur, attribution succès et rôles sombres, tous les contrôles de formulaire visibles sont amenés au centre puis leurs quatre limites sont contrôlées dans le viewport utile, au-dessus de la barre mobile.
- Chaque formulaire est ensuite parcouru avec de vrais événements **Tab**, sans recentrage entre deux contrôles. Le test vérifie le contrôle focalisé et sa géométrie après stabilisation du défilement. Les contrôles désactivés restent vérifiés par défilement et sont exclus du parcours clavier natif.
- `ui/reachability/*-scroll-action-*` montre les actions centrées, y compris les boutons désactivés ; `*-action-*` montre les actions focalisées par Tab. Les 282 vues d’ensemble restent dans `ui/current/`.
- `ui-current-manifest.json` contient les dates de toutes les preuves courantes et les SHA256 JavaScript **et CSS** du build.

Exemples mobiles à examiner :

- `ui/reachability/profile-error-fr-375-form-0-action-7.png`
- `ui/reachability/organizations-created-fr-375-form-1-action-3.png`
- `ui/reachability/organizations-error-fr-375-form-1-action-3.png`
- `ui/reachability/client-assignment-success-fr-375-form-0-action-3.png`
- `ui/reachability/roles-dark-fr-375-form-2-scroll-action-3.png`

Une capture d’ensemble prise en haut de page montre naturellement la continuation
du document derrière la barre fixe ; elle ne représente pas la fin du défilement
ni le positionnement d’une action focalisée. Les captures ciblées et les assertions
clavier apportent cette preuve complémentaire. Le texte courant peut continuer
sous le viewport ; aucune action focalisée ne doit rester sous la barre.

## Limites

Ces contrôles démontrent le comportement navigateur des formulaires simulés. Ils
ne démontrent pas les autorisations, la persistance ou l’isolation SQL ; les preuves
API/SQL réelles sont séparées. La revue indépendante de ce delta CSS reste requise.
