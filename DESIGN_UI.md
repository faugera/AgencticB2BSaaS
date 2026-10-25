# AgencticB2BSaaS — Design system Brume

Version 1.0.0 · 24 octobre 2026 · Direction approuvée, implémentation en cours.

## 1. Autorité et périmètre

Contrat UX/UI de l'application, de l'administration et de l'authentification.
Source de référence pour les humains et les agents. [DESIGN.md](DESIGN.md) est son point
d'entrée et son guide complémentaire de composition pour l'admin et la gestion de
projet ; les patterns futurs n'y constituent pas des capacités livrées. Aucune
deuxième charte de fondations concurrente. Le marketing reste
hors du lot. Les valeurs exécutables vivent dans les fichiers CSS UI ; cette
charte décrit leurs rôles. Tout changement de token modifie les deux ensemble.

## 2. Produit et utilisateurs

**AgencticB2BSaaS** : piloter le travail avec l'IA en gardant la maîtrise des
décisions. Tous les rôles sont servis : membre, administrateur de workspace,
tenant-admin, super-admin. Les menus sont adaptés aux permissions réelles ;
la présentation ne crée ni rôle ni autorisation.

Personnalité : précise, sereine, fiable. Inspiration Pigment. Éviter les interfaces
spectaculaires, les cartes imbriquées, les effets décoratifs et le jargon technique.
Priorités actuelles : accéder à son espace, gérer collaborateurs/invitations,
modifier son profil et sa sécurité. IA : direction produit, pas fonctionnalité
inventée pour remplir un écran.

## 3. Référence choisie et grammaire visuelle

L'utilisateur a sélectionné la première des trois maquettes, **Brume** :
`exec-29ecece8-6fb5-443f-9f00-9fc2577918d8.png` (résultat ImageGen du chat).
Le visuel est archivé dans docs/design/brume-reference.png.

- Sidebar neutre de 264px ; contenu fluide, marge 32px, titre de page 20px.
- Invitations : liste à gauche et formulaire à droite, demandes dessous.
- Fond neutre ; légère couleur pastel uniquement dans l'espace de travail.
- Actions principales charbon ; liens violets discrets indépendants du workspace.
- Séparateurs fins ; élévation réservée aux éléments flottants.
- Les incohérences de données de la maquette ne sont pas des contrats métier :
  pas de renvoi d'invitation acceptée ni de rôle attribué par le candidat.
- Pas de cloche tant qu'une source réelle de notifications n'existe pas.

## 4. Fondations et tokens

### Couleurs sémantiques

| Token | Clair | Sombre | Rôle |
| --- | --- | --- | --- |
| --ui-bg | #fafafc | #17181d | Fond applicatif |
| --ui-surface | #ffffff | #202127 | Contenu et champs |
| --ui-sidebar | #f2f2f5 | #1b1c22 | Navigation |
| --ui-soft | #f5f5f8 | #2a2b33 | Survol et éléments secondaires |
| --ui-text | #25262b | #f1f1f5 | Texte principal |
| --ui-muted | #666775 | #b4b5c2 | Texte secondaire |
| --ui-border | #dedee7 | #3b3c48 | Champs et séparateurs |
| --ui-action | #292a30 | #ededf3 | Action principale |
| --ui-action-text | #ffffff | #202127 | Texte de l'action |
| --ui-link | #5140b5 | #c6b9ff | Liens et sélection |
| --ui-focus | #6950c7 | #c6b9ff | Focus visible |
| --ui-danger | #a32939 | #ffb1bb | Erreur / destruction |
| --ui-success | #246338 | #a0dfb1 | Réussite |
| --ui-warning | #785615 | #f0d28d | Attention / attente |

Le texte n'utilise jamais directement la couleur personnalisée du workspace.
Couleur #RRGGBB validée, teinte mélangée à 9% au fond en clair et 12% en sombre,
fondu supérieur de 240px maximum. Palette : lavande #b5a2df, bleu #93b9df,
menthe #9ccdbb, sauge #b4c69b, pêche #e2b69f, rose #d9a7bc,
sable #d6c29a, pervenche #a6b0df ; neutre = null. Couleur libre acceptée sans
modifier les couleurs sémantiques, les graphiques ou les boutons.

### Typographie

Lato, libre OFL-1.1 et auto-hébergée via Fontsource (400 et 700) ; repli
sans-serif système. Aucune requête vers un fournisseur de polices externe.
Échelle utilisateur, prioritaire sur les tailles de la maquette :
- 22px (text-2xl) : nom de l’app.
- 20px (text-xl) : titres de portails, pages et sections majeures.
- 16px (text-base) : titres des modales et têtes d’encarts importants.
- 14px (text-sm) : titres de cartes, navigation principale, tables et boutons.
- 12px (text-xs) : corps standard d’interface, formulaires, descriptions et listes.
- 11px/10px : badges, tags système, compteurs, timestamps et métadonnées en mono.
- Exception sidebar : texte 13px, icônes 16px, hauteur des items 34px.
Interlignage 1.5, titres 1.2–1.3, actions 1.4. Graisses 400/700 centralisées dans les tokens. Chiffres tabulaires dans les tables.
Métadonnées ui-monospace/SFMono-Regular/Consolas.
Titres alignés à gauche, pas de capitales décoratives. Texte long limité à 70ch.

### Géométrie, densité et mouvement

Grille de 4px avec demi-pas de 2px : 2/4/6/8/10/12/14/16/20/24/32px.
Exception optique : gap vertical sidebar 3px. Le guide d'espacement utilisateur
est retenu ; il ne transforme pas les surfaces Brume en grandes cartes arrondies.

| Usage | Règle |
| --- | --- |
| Conteneur des vues | max-width 1600px, centré dans le contenu ; sidebar hors du conteneur |
| Page horizontal | 12px mobile ; 24px dès 640px ; 32px dès 1024px |
| Page vertical | haut 12px puis 24px dès 640px ; bas 88px + safe-area mobile, 24px dès 768px |
| Sections majeures / intérieur | 24px / 16px |
| Panneaux encadrés | 20px ou 24px ; sections Brume ouvertes : padding vertical 20px, alignement horizontal commun |
| Modales / pieds | padding 24px ; pied séparé avec padding-top 12px |
| Listes | lignes 14–16px vertical |
| Cellules de table | 14px horizontal, 10px vertical ; variante compacte 8px vertical |
| Bouton standard / secondaire | 14×8px / 12×6px ; hauteur tactile conservée hors sidebar |
| Champs / formulaires | padding 12×8px ; gap vertical 14px ; colonnes jumelles 12px |
| Badges | 8px horizontal, 2px vertical ; variante 10×4px si justifiée |
| Sidebar | padding 16px ; items 34px ; gap items 3px, groupes 16px, icône/texte 10px, sous-menu 20px |

Grilles KPI, matrices, pagination et sous-menus : conventions disponibles pour
leurs usages futurs, sans créer de fonctionnalité ou composant inutilisé.

Espacement courant défini par la table ci-dessus ; 48px réservé à une séparation exceptionnelle. Rayons : 6px contrôles, 8px surfaces flottantes.
Contrôles interactifs : hauteur minimale 44px, sauf items sidebar 34px selon choix utilisateur ; labels longs peuvent se répartir.
Densité équilibrée : formulaires aérés, tableaux compacts. Focus 2px, décalage 3px.
Transitions fonctionnelles 140ms ease-out (couleur/opacité), pas d'entrée animée
systématique. Réduction des animations respectée. Une ombre seulement pour dialogue
et menu flottant ; pas d'ombre sous chaque liste ou section.

## 5. Composants réutilisables

Chaque composant conserve les attributs HTML natifs, le focus et les labels.
Variantes limitées aux usages réels. Les états normal/focus/disabled/busy/error
et empty sont montrés dans la galerie quand ils s'appliquent.

| Composant | Contrat / états |
| --- | --- |
| Button | primary, secondary, quiet, danger ; submit explicite dans les formulaires ; disabled/busy |
| Input, Select, Field | label visible, aide/erreur reliées par ID, readonly sélectionnable, validation native et serveur |
| Badge | neutral/success/warning/danger ; texte explicite, jamais couleur seule |
| Alert | role alert pour erreur, status pour réussite/information ; persistant près de l'action |
| EmptyState | titre et aide/action contextualisés ; distinguer vide et filtre sans résultat |
| Skeleton | état transitoire, aria-busy et libellé traduit |
| ConfirmDialog | dialogue HTML modal, focus natif, titre, annuler/continuer, Escape et restitution du focus |
| DataTable | HTML table, colonnes typées, actions textuelles ; région de défilement locale sur petit écran |
| FilterBar | recherche et sélecteur de statut, filtre uniquement les données disponibles ; pas de pagination fictive |
| AppShell | sidebar réductible, contenu à droite, menu de compte et navigation mobile textuelle |
| WorkspaceAppearance | palette + hex libre + neutre ; gestionnaire autorisé uniquement |
| InvitationManagement | table/formulaire, renvoi/révocation selon état et permissions |
| AccessRequests | candidat/date/état, rôle décidé par admin, confirmation avant refus |

La galerie /docs est interactive et réservée aux super-admins. Données synthétiques
explicitement nommées, aucune vraie écriture métier dans les démonstrations.
Elle n'est pas un éditeur de tokens : changements versionnés dans le code/charte.

## 6. Structure et navigation

Scrollbars discrètes : 6px vertical, 4px horizontal, piste transparente,
thumb #D6CEC2 et survol #A8A29E. Firefox utilise la largeur native thin ;
les dimensions exactes dépendent du moteur. Ne pas masquer les zones défilantes.

Desktop/tablette >=768px : shell borné à 100dvh ; sidebar et contenu possèdent
chacun leur propre défilement. Contenu min-width/min-height 0. Sidebar 264px,
réductible à 56px ; items 34px, texte 13px, icônes 16px. Les icônes conservent nom accessible et tooltip natif.
Organisation active dans le menu ; scope conservé dans les URLs/historique.
Compte en bas : profil, langue, thème et déconnexion.

Mobile <768px : document défilant, barre inférieure textuelle tenant compte des
safe areas. Destinations adaptées au workspace courant ; hors workspace,
accès espaces/profil/menu. Menu donne accès à toutes les fonctions autorisées.
Pas d'icônes dans la barre inférieure. Un bouton textuel ouvre/ferme la sidebar.
Tableaux défilent dans leur région, jamais toute la page.

Icônes Phosphor outline uniquement dans la sidebar ; future cloche uniquement
si réellement fonctionnelle. Ailleurs : verbes et libellés textuels, pas d'icône
ajoutée pour décorer les actions. Les affordances HTML natives restent natives.

## 7. Interactions et rédaction

Une action principale par tâche. Petites modifications dans la page ; formulaires
secondaires en panneau si utile ; confirmations en dialogue, pas de window.confirm.
Labels toujours visibles, placeholder seulement pour exemple. Conserver saisie et
contexte en échec ; prévenir double soumission ; distinguer chargement et vide.
Erreurs importantes persistantes près de l'action, réussite par status. Pas de
centre de notifications ou toaster ajouté pour remplacer le feedback utile.

Ton neutre et impersonnel : « Modifications enregistrées », « Inviter »,
« Invitation envoyée ». Éviter tutoiement/vouvoiement quand inutile. Actions et
résultats utilisent le même vocabulaire. FR par défaut et EN complet par clés.
Intl pour dates/nombres ; libellés longs et emails restent lisibles.

## 8. Préférences et personnalisation

Thème system/light/dark et langue fr/en au compte. Cache local pour avant connexion,
puis valeurs serveur propres à l’acteur. Erreur d’enregistrement annoncée, aucun
faux succès. La préférence locale ne constitue pas une autorisation.
Couleur workspace persistée côté serveur et modifiable par son gestionnaire via les
permissions existantes. Changer de workspace réinitialise la teinte ; les pages
globales et administration restent neutres.

## 9. Accessibilité et validation

Cible WCAG 2.2 AA : sémantique native, labels, noms accessibles, focus visible,
clavier, contraste, texte des statuts, reduced-motion et reflow au zoom.
Vérifier FR/EN × 375/768/1280 × clair/sombre, contenus vides/longs, erreurs,
dialogue Escape/annulation/confirmation et restitution du focus. Les tests simulés
UI ne prouvent ni SQL ni RBAC ; tests PostgreSQL adversariaux séparés.
Aucune déclaration de conformité exhaustive sans audit dédié.

La normalisation repose sur Tailwind Preflight : border-box, héritage des contrôles
et redimensionnement vertical des textarea sont conservés, sans second reset.
Les tokens portent police, graisses et interlignes ; les liens contextuels sont
soulignés et le compte conserve son indicateur natif de dépliage. Les filtres
peuvent rétrécir, les tables défilent dans leur région et les textes longs se
replient sans masquer le débordement de la page. Preuves et limites du lot CSS :
`docs/design/css-normalization.md`.

## 10. Évolution, couverture et décisions

Ajouter un composant avec usage réel, documenter variantes et états, vérifier dans
la galerie puis les parcours consommateurs. Compositions métier près du domaine,
primitives dans UI. Dépréciation : remplacement et migration avant suppression.
Catalogue futur non annoncé disponible : saisies avancées, visualisations,
permissions/audit, fichiers/collaboration et composants agentiques.
IA : états idle/running/waiting-human/succeeded/failed/cancelled, actions explicites,
preuves et validation humaine proportionnée. Contrats métier réels, jamais faux
pourcentages de confiance ou exécutions fictives en production.

| Date | Décision | Motif |
| --- | --- | --- |
| 2026-10-24 | Brume parmi trois propositions | Validation utilisateur |
| 2026-10-24 | Neutres, pastel workspace, actions textuelles | Faible charge cognitive |
| 2026-10-24 | Lato auto-hébergée, remplace Source Sans 3 | Arbitrage utilisateur, aucun service externe |
| 2026-10-24 | Galerie super-admin, IA en roadmap | Pas de capacités fictives |

Preuves et statut : .specs/changes/2026-10-24-design-system-brume/tasks.md.
