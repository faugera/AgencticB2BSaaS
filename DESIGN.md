# Brume — Guide de conception des interfaces admin et projet

24 octobre 2026 · Contrat de composition UX/UI · Complément de [DESIGN_UI.md](DESIGN_UI.md).

## 1. Autorité et mode d'emploi

Ce guide décrit comment composer des interfaces de travail précises, calmes et
premium pour AgencticB2BSaaS. [DESIGN_UI.md](DESIGN_UI.md) reste la source de vérité
des fondations Brume : palette, tokens, typographie, espacements, composants,
navigation, mouvement et accessibilité. Les valeurs exécutables vivent dans
[tokens.css](apps/web/src/ui/tokens.css), [components.css](apps/web/src/ui/components.css)
et [shell.css](apps/web/src/ui/shell.css). Ne pas maintenir une deuxième palette ici.

Lire la charte, choisir le gabarit adapté à la tâche, puis réutiliser les composants
existants. Une règle de composition ne justifie ni nouveau token ni composant
sans usage concret. En cas de conflit, les arbitrages utilisateur et les fondations
Brume priment ; réconcilier les documents avant de coder.

**Portée :** application authentifiée, administration, profil, sécurité et parcours
d'accès. Le marketing reste hors de ce contrat. Les patterns de gestion de projet
ci-dessous sont des conventions pour de futurs usages : ils ne déclarent aucune
route, donnée ou fonctionnalité livrée. Consulter la
[carte produit](.specs/domains/product-map.md) pour le statut réel.

## 2. Intention premium

Le soin se voit dans les alignements, la stabilité des écrans, la qualité des
libellés et la précision des états. Chaque vue doit permettre de comprendre sa
portée, de repérer le travail utile et d'agir avec confiance.

| Qualité recherchée | Traduction dans l'interface | À éviter |
| --- | --- | --- |
| Précision | Colonnes alignées, unités explicites, dates contextualisées | Chiffres sans définition, pourcentages décoratifs |
| Sérénité | Fonds neutres, surfaces ouvertes, séparateurs fins | Cartes imbriquées, ombres partout, dégradés décoratifs |
| Maîtrise | Portée visible, action principale claire, confirmation proportionnée | Actions globales ambiguës, mutations implicites |
| Continuité | Contexte, filtres et saisie conservés pendant le parcours | Retours en haut de liste et réinitialisations inattendues |
| Finition | États vide/chargement/erreur conçus avec le contenu | Écran soigné uniquement avec des données idéales |

La signature Brume associe une sidebar neutre, une composition compacte et des
espaces de travail légèrement teintés. L'administration plateforme reste neutre.
La teinte du workspace exprime son identité ; les couleurs sémantiques conservent
leur sens. Pas d'effet verre, de nouvelle police ou d'icône décorative ajouté pour
rendre une page « premium ».

## 3. Utilisateurs et décisions

| Contexte | Besoin principal | Conséquence de conception |
| --- | --- | --- |
| Super-admin | Identifier l'organisation avant une opération plateforme | Portée explicite, vues globales distinctes des vues d'organisation |
| Tenant-admin | Gérer accès et collaboration de son organisation | Listes scannables, rôles lisibles, confirmations sur la bonne cible |
| Gestionnaire de workspace | Organiser son espace dans ses permissions | Identité du workspace et niveau de portée visibles |
| Membre | Accéder à son travail et à son compte | Navigation utile, peu de chrome administratif |
| Responsable de projet, usage futur | Comprendre avancement, priorités et blocages | Synthèse reliée aux éléments concrets |
| Contributeur projet, usage futur | Trouver sa prochaine action et son contexte | Liste de travail claire, détail sans perdre la vue |

Ces contextes décrivent des besoins, pas de nouveaux rôles d'autorisation. Prévoir
aussi l'usage au clavier, à fort zoom, en mobilité et avec une traduction longue.
Une action indisponible doit être compréhensible sans survol.

## 4. Fondations à préserver

- Lato auto-hébergée, graisses 400/700 ; aucune police distante.
- Nom de l'app 22px ; pages et sections majeures 20px ; modales et encarts
  importants 16px ; titres de cartes, tables et boutons 14px ; corps, formulaires,
  descriptions, fils d'Ariane et listes 12px ; métadonnées 10–11px monospace.
- Exception sidebar : texte 13px, icônes 16px, items 34px ; largeur 264px ou 56px.
- Espacements et interlignes de la charte ; pas de `line-height:1` généralisé.
  Les noms de tokens existants font foi : ne pas déduire leurs valeurs de leur suffixe.
- Contrôles tactiles de 44px selon la charte, avec exception sidebar documentée.
  Ne pas étendre cette exception aux autres actions denses.
- Scrollbars discrètes 6px/4px avec variante native selon moteur ; zones défilantes
  identifiables. Focus visible, liens contextuels soulignés, états natifs utiles conservés.
- Rayon 6px pour les contrôles et 8px pour les surfaces flottantes ; élévation
  réservée aux menus et dialogues. Sections ordinaires ouvertes et alignées.

La taille du texte reste relative à son rôle : un chiffre de KPI n'est pas un
prétexte pour créer un titre géant. Les contenus métier doivent rester lisibles
avec les longueurs réelles, les accents et les traductions.

## 5. Anatomie d'une page

Ordre de lecture commun : **contexte → titre → action → filtres → contenu → suite**.

1. Contexte : organisation/workspace actif, puis fil d'Ariane si la profondeur le
   justifie. Éviter de répéter le même contexte dans chaque bloc.
2. En-tête : un `h1`, un sous-texte court seulement s'il aide à comprendre la tâche,
   une action principale et les actions secondaires pertinentes.
3. Navigation locale : onglets pour des vues sœurs d'une entité ; sidebar pour
   changer de domaine. Une sélection locale ne remplace pas un lien profond.
4. Outils : recherche, filtres et tri près des données qu'ils affectent.
5. Contenu : une liste, une table, un formulaire ou une vue de travail dominante.
   Les informations secondaires accompagnent cette tâche.
6. Suite : pagination réelle, total contextualisé ou fin de liste explicite selon
   le contrat des données. Aucun contrôle sans effet.

```text
Sidebar       Contexte / fil d'Ariane
              Titre de la page                 Action principale
              Onglets éventuels
              Recherche et filtres
              Contenu principal                Détail contextuel si utile
              Pagination réelle / suite
```

Le contenu est aligné à gauche et borné par le shell Brume, au maximum 1600px.
Conserver les marges responsive validées. Les formulaires courts ne s'étirent pas
sur toute la largeur ; les tables utilisent la place disponible. Séparer les
sections majeures de 24px et leur contenu interne de 16px selon la charte.

## 6. Gabarits d'administration

| Gabarit | Structure attendue | Critère de réussite |
| --- | --- | --- |
| Vue d'ensemble | État utile, exceptions à traiter, accès aux listes | Chaque indicateur ouvre les données ou l'action qui l'expliquent |
| Liste de gestion | En-tête, outils, table, actions contextualisées | Identifier cible, statut et action sans ouvrir chaque ligne |
| Fiche d'entité | Identité, propriétés principales, sections métier, historique si disponible | Comprendre la portée et retrouver le retour à la liste |
| Paramètres | Groupes cohérents, aide locale, sauvegarde explicite | Savoir ce qui a changé et si l'enregistrement a réussi |
| Revue de demande | Demandeur, contexte, état, décision et conséquence | Approuver/refuser la bonne demande sans ambiguïté |
| Profil et sécurité | Identité, données modifiables, sessions, actions sensibles séparées | Distinguer lecture seule, changement de profil et révocation |

Dans les vues scoped, afficher une invitation à sélectionner l'organisation si
aucune n'est active. Ne pas présenter l'absence de portée comme une liste vide.
Un changement de portée actualise les libellés et données ; les liens et retours
conservent cette portée conformément au routage existant.

Les paramètres à risque sont séparés des réglages ordinaires par une section
claire. La confirmation nomme l'entité et la conséquence réelle. Ne pas promettre
une annulation ou une restauration que le produit ne fournit pas.

## 7. Compositions de gestion de projet

**Patterns futurs, à appliquer seulement avec un besoin et un contrat métier validés.**
Organisation et workspace sont des notions existantes ; le niveau projet, ses
relations et ses permissions restent à définir avant implémentation.

| Vue | Quand l'utiliser | Règles de composition |
| --- | --- | --- |
| Aperçu projet | Comprendre la situation et décider quoi traiter | Objectif court, responsable si connu, échéance, blocages, travail récent réel |
| Liste / table | Comparer, filtrer et modifier des éléments structurés | Sujet dominant, statut, responsable, priorité et échéance si utiles |
| Kanban | Piloter un flux par états | Colonnes nommées selon le workflow validé, compteurs réels, cartes sobres |
| Planning / timeline | Lire dates et dépendances | Échelle explicite, période visible, état « sans date », accès au détail |
| Fiche de tâche | Comprendre et mettre à jour une unité de travail | Sujet, statut, description, propriétés, puis échanges et activité disponibles |
| Revue / approbation | Prendre une décision avec des éléments vérifiables | Objet, auteur, preuves, décision attendue et conséquence |

Une vue alternative expose les mêmes objets et états, avec un contexte conservé.
Ne pas proposer toutes les vues par défaut : retenir celles qui servent la tâche.
Un panneau de détail convient à la comparaison ; une page dédiée convient aux
contenus longs et parcours complexes. Réutiliser les mêmes propriétés et actions.

### Statuts, priorité et avancement

- Statut du travail, priorité, retard et résultat d'une opération sont des notions
  distinctes. Ne pas les fusionner dans un badge unique.
- Les libellés et transitions viennent du contrat métier. Ne pas imposer ici un
  workflow « À faire / En cours / Terminé » comme capacité existante.
- Un blocage comporte une raison et, si disponible, une action pour le résoudre.
  « En retard » dépend d'une date réelle et de sa règle de calcul.
- Un pourcentage affiche son périmètre et son calcul ; sans mesure, présenter
  l'état disponible plutôt qu'une jauge fictive. Zéro et inconnu diffèrent.
- Déplacer une carte exige une alternative clavier et une action textuelle sur
  mobile. Une opération refusée rétablit l'état réel et explique l'échec.

## 8. Tables, filtres et données denses

La table sert à comparer. La première colonne identifie l'objet ; les colonnes
suivantes suivent l'ordre de décision. Aligner les textes à gauche, les nombres
comparables à droite, les dates de façon constante ; conserver chiffres tabulaires
et formats `Intl`. Les actions textuelles restent rattachées à leur ligne.

Utiliser une table HTML avec en-têtes explicites. Un nom d'objet est un lien
distinct ; ne pas rendre toute une ligne cliquable si elle contient d'autres
contrôles. Une largeur minimale de colonne doit protéger la lecture sans forcer
le débordement de la page. Le défilement horizontal appartient à la région de table.

| Situation | Réponse attendue |
| --- | --- |
| Données absentes | Expliquer le vide et proposer l'action permise |
| Filtres sans résultat | Montrer les filtres actifs et permettre leur réinitialisation |
| Chargement initial | Squelette adapté ou statut, sans faux zéro |
| Actualisation | Conserver le contexte quand possible ; annoncer l'état busy |
| Erreur | Message persistant et reprise adaptée, sans présenter la liste comme vide |
| Données partielles | Nommer le périmètre disponible, sans total global trompeur |

Les filtres courants restent visibles ; les critères rares peuvent être regroupés
si une composition existante le permet. Indiquer ce qui est filtré et éviter des
contrôles qui semblent rechercher côté serveur quand ils filtrent seulement la
liste chargée. Tri, pagination, sélection multiple et export ne sont montrés que
s'ils sont réellement pris en charge. Une sélection de page ne doit pas sembler
sélectionner tous les résultats.

## 9. Formulaires et décisions sensibles

Regrouper les champs par intention ; une colonne par défaut, deux uniquement pour
des informations liées et suffisamment courtes. Label visible, aide avant erreur,
champ requis identifiable, erreur reliée au champ. Les exemples appartiennent aux
placeholders et ne remplacent pas les labels. Les champs readonly restent copiables.

La sauvegarde indique son périmètre : section, formulaire ou entité. Conserver les
valeurs en cas d'échec, empêcher la double soumission et annoncer le résultat.
Ne pas ajouter de sauvegarde automatique à un formulaire à validation explicite.
Si une protection contre la perte de saisie devient nécessaire, la spécifier et
la vérifier avant de promettre ce comportement.

Un dialogue convient à une décision courte. Il nomme la cible, la conséquence et
l'action finale (« Révoquer l'invitation » plutôt que « Oui »). Annulation visible,
Escape, focus contenu et restitution du focus sont requis. Ne pas imbriquer les
modales. Pour une édition longue, préférer une page ; un panneau latéral sert la
comparaison, avec les mêmes exigences de focus et de fermeture.

## 10. Indicateurs, activité et IA

Un aperçu admin ou projet répond à une question opérationnelle. Ajouter un KPI
seulement si sa définition, sa période, sa source et son accès au détail sont
connus. Les variations exigent une base comparable. Les graphiques ont titre,
unités et alternative textuelle ou tabulaire ; aucune information essentielle ne
dépend uniquement d'une couleur ou d'un tooltip.

L'activité décrit des événements réels avec acteur, action, objet et date. Distinguer
une activité produit d'une preuve d'audit de sécurité. Pas de journal ou de cloche
alimenté par des données inventées en production.

Les futurs composants IA distinguent suggestion, action proposée, validation
humaine, exécution et résultat. Afficher la portée et les conséquences avant une
action ; une recommandation n'est pas une décision déjà appliquée. Indiquer les
sources disponibles et les erreurs réelles, sans score de confiance fictif.
Les délais, reprises et annulations ne sont proposés que si le runtime les supporte.

## 11. Responsive, thèmes et accessibilité

| Contexte | Adaptation attendue |
| --- | --- |
| Desktop | Sidebar et contenu à droite ; outils et détails côte à côte si utiles |
| Tablette | Préserver la priorité du contenu ; empiler les panneaux avant de comprimer les champs |
| Mobile | Menu et navigation textuelle existants ; formulaires empilés ; détail accessible sans survol |
| Tables / Kanban / planning | Défilement local identifié ou liste alternative pertinente ; contexte de l'élément conservé |
| Zoom / texte long | Retour à la ligne, flex/grid rétractables, actions accessibles et aucune donnée essentielle tronquée |

Clair et sombre ont la même hiérarchie et les mêmes affordances. Le thème ne
change ni le sens des statuts ni l'organisation des actions. La préférence de
mouvement réduit est respectée ; le mouvement existant reste fonctionnel et bref.
Pas de nouvelle animation d'entrée systématique.

Préserver l'ordre de lecture et de tabulation, les labels accessibles et le focus
visible. Utiliser les éléments natifs avant d'inventer des comportements ARIA.
Pas d'action essentielle uniquement au survol ou au glisser-déposer. Couleur,
position et icône seules ne suffisent pas à exprimer un état. Cible WCAG 2.2 AA,
sans déclaration de conformité avant audit ; le corps 12px et la sidebar 34px sont
des choix validés à vérifier au zoom et au clavier, pas une preuve de conformité.

FR par défaut et EN complet, y compris aides, erreurs, statuts et noms accessibles.
Les dates ambiguës ont une forme lisible ; une date relative peut être accompagnée
d'une date absolue accessible. Ne pas tronquer noms, emails ou traductions pour
conserver artificiellement une hauteur uniforme.

## 12. Composants existants et extensions

Réutiliser [la couche UI](apps/web/src/ui) et son inventaire dans
[DESIGN_UI.md](DESIGN_UI.md#5-composants-réutilisables). Les compositions métier
restent dans [pages](apps/web/src/pages). La galerie `/docs`, réservée aux
super-admins, présente les composants intégrés avec données synthétiques.

| Niveau | Usage |
| --- | --- |
| Socle existant | Button, Input, Select, Field, Badge, Alert, EmptyState, Skeleton, ConfirmDialog, DataTable et AppShell |
| Compositions existantes | Gestion des invitations et demandes, profil/sessions, apparence workspace ; vérifier le statut dans la carte produit |
| Patterns à concevoir au besoin | Fil d'Ariane, panneau de détail, sélection multiple, pagination serveur, KPI, Kanban, planning et composants IA |

Cette dernière ligne est un guide d'évolution, pas un backlog à générer. Pour
chaque ajout nécessaire : documenter anatomie, variantes utiles, états, permissions
consommées, clavier, responsive et traductions ; vérifier dans la galerie puis
dans le parcours consommateur. Aucun composant inutilisé, dépendance ou abstraction
créé pour compléter un catalogue.

## 13. Critères de revue avant livraison

- La portée et la prochaine action sont compréhensibles sans texte explicatif permanent.
- Un seul contenu domine ; titres, colonnes, boutons et séparateurs partagent leurs alignements.
- Les fondations Brume sont réutilisées ; aucune valeur concurrente ni carte décorative.
- Chargement, vide, sans résultat, erreur, busy, readonly et accès refusé sont distingués.
- Textes longs, FR/EN, clair/sombre et largeurs 375/768/1280px sont vérifiés ; ajouter les cas propres au parcours.
- Le clavier atteint et actionne les contrôles ; les confirmations restituent le focus.
- La page ne déborde pas horizontalement ; les régions denses défilent localement.
- Données, totaux et indicateurs correspondent à des contrats réels ; aucune capacité simulée annoncée.
- Captures et résultats datent du dernier changement rendu ; l'API simulée est distinguée de la preuve serveur.

Une livraison nomme les contrôles exécutés et leurs limites. Une belle capture ne
démontre ni autorisation serveur, ni persistance, ni conformité accessibilité.
Pour le code, suivre les gates du dépôt et les
[standards UI](.specs/standards/ui-components-state.md).

## 14. Statut, limites et maintenance

Ce complément est documentaire : aucune interface, route, permission ou capacité
de gestion de projet n'est créée par son ajout. L'historique replié ci-dessous
reste une archive sans autorité sur les règles Brume actuelles ; ses mesures et
comportements obsolètes ne doivent pas être réutilisés.

Les vérifications CSS précédentes ont leur propre périmètre dans
[le compte rendu de normalisation](docs/design/css-normalization.md). Elles ne
valident pas les futurs patterns décrits ici. La conformité WCAG exhaustive et
les preuves backend manquantes restent des limites connues ; ce guide ne les
considère pas comme une dette acceptée ni comme des contrôles réussis.

Synchronisation de ce lot : `DESIGN.md` **UPDATED** pour les compositions ;
`DESIGN_UI.md` **UPDATED** pour la navigation entre contrats. Selon
[doc-sync-map.yml](.specs/standards/doc-sync-map.yml), données/API/sécurité,
environnement et carte produit sont **NOT_APPLICABLE** : aucun contrat ni statut
fonctionnel modifié. `CHANGELOG.md` et `docs/architecture.md` sont
**REVIEWED_NO_CHANGE** : aucun changement exécutable ou de frontière.

Toute évolution de fondation met à jour charte et CSS ensemble. Toute évolution
de parcours précise le besoin, les données et permissions réelles, puis ses états
et preuves. Conserver un seul vocabulaire entre navigation, action, confirmation
et résultat.

<details>
<summary>Archive — direction historique, sans autorité sur Brume</summary>

# Enterprise AI OS — Design contract

Status: proposed shared design direction. Implement incrementally when building real UI; no visual redesign in this documentation PR.

## Principles
Premium, minimal, functional UI inspired by Linear and Pigment. Low cognitive load; one clear primary action per context. Prefer whitespace, hierarchy and progressive disclosure over explanatory paragraphs or decorative icons. Feature documentation belongs in the documentation space, not persistent page chrome.

## Foundations
- React 19, Vite, Tailwind CSS v4; reuse existing UI first.
- Consistent spacing, typography, density, focus rings, radius, surface/elevation and semantic tokens. Light and dark modes.
- Workspace identity: a restrained pastel gradient fading from the top of the workspace page background; configurable per workspace. It must not tint critical status indicators, buttons or data charts.
- Platform administration uses neutral backgrounds.
- WCAG 2.2 AA target: keyboard, contrast, visible focus, reduced motion and responsive layout.

## Responsive behavior (required)
- Mobile-first layouts across phone, tablet and desktop. Navigation collapses gracefully; key actions remain discoverable and keyboard/touch accessible.
- Dense tables use appropriate responsive alternatives (prioritized columns, detail drill-down or horizontal scroll within the table region), never overflow the entire page.
- Charts, dialogs, filters, tooltips and forms adapt to narrow viewports. No hover-only interaction. Verify representative viewport widths and landscape where relevant.

## Internationalization (required)
- French (`fr`) is the default UI language; English (`en`) is available from the first functional release.
- Provide a discoverable language switcher, ideally in user preferences. Preserve the selection and update the document language.
- Every visible string and accessible label uses translation keys, including errors, tooltips, validation, empty states, notifications and dialogs. Avoid text embedded in images.
- Use locale-aware `Intl` formatting for dates, numbers, money and pluralization. Design flexible labels and buttons for longer translations. Avoid fixed widths that truncate meaningful text.
- Test both languages on desktop and mobile, including fallback when a translation is missing.

## Reusable primitives, when justified
Button, Input, Select, Tooltip, Dialog, PageHeader, Breadcrumb, FilterBar, DataTable, Chart and status feedback. Do not scaffold unused components. Domain-specific components live near domain modules. Use contextual tooltips for important unfamiliar actions, with accessible labels.

## Interaction
Compact navigation, meaningful empty/loading/error states, clear permissions feedback, confirm destructive actions. Keep important data visible; hide complexity behind drill-down and tooltips. Avoid icon-only actions without accessible names.

## Quality checks
Responsive desktop/mobile, no overflow, keyboard navigation, contrast and visual consistency. E2E test critical workflows as they become real.

## Admin shell
- Desktop/tablet from 768px: a fixed-sidenav shell below the masthead, bounded by `100dvh`. The right `.admin-content` region owns vertical scrolling; the sidebar only scrolls when its own content exceeds available height.
- Sidebar width token `--admin-sidebar-width: 15rem`; fluid content uses `minmax(0, 1fr)` and zero minimum sizes. Content padding uses `--space-5`/`--space-6`.
- Reuse `--surface`, `--surface-soft`, `--border`, `--text-muted`, `--link`, `--focus`, `--radius-md` and the existing typography. Admin surfaces remain neutral; workspace detail retains its existing tint.
- Below 768px: navigation precedes the main area in document flow, menu items wrap into two columns, and the document owns scrolling. No hidden or hover-only actions.
- Feature navigation: overview, organizations, workspaces, invitations/members, account security. Active links use `aria-current`, a surface fill and stronger text. Every link/control is at least 44px high.
- The organization selector belongs to the sidebar and persists scope in each feature URL. Organization creation stays available without a selected organization. Empty scoped views provide a selection prompt.

## Account, requests and documentation pages
- Reuse `.auth-page`, `.auth-navigation` and `.auth-card` for access requests, and
  `.panel` for profiles, request review and the protected guide. No new visual library.
- Profile/session and request lists use `--space-4`/`--space-5`, `--border` and
  `--radius-md`, with wrapping device/email/link text and no fixed content width.
- States: loading via status, errors via alert, busy controls disabled, success
  via status. Confirm revocation of other sessions and rejection of a request.
- Read-only profile email and shareable request link remain selectable. No session
  token is displayed. Documentation is server-authorized for super-admins only.

</details>
