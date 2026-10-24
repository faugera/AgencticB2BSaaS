---
id: "2026-10-24-design-system-brume"
status: implementing
---

## 1. Objectif & Scope

Appliquer la proposition visuelle 1 (Brume, exec-29ecece8-6fb5-443f-9f00-9fc2577918d8.png) choisie par l'utilisateur : app/admin/auth neutres, teinte workspace pastel discrète, typo lisible, actions textuelles. Nouvelle charte DESIGN_UI.md source de vérité ; DESIGN.md devient sa porte d'entrée en conservant l'historique pertinent.
Socle et compositions SaaS utilisés : boutons/champs/feedback/badges/dialogue/table/filtres/empty/skeleton/shell/sélecteurs/profil/approbation. Galerie interactive dans /docs super-admin. Palette+couleur libre par workspace (administrateur), thème système/clair/sombre et langue au compte (cache local avant connexion). Mobile : barre textuelle contextuelle et accès au menu. Pas d'icônes hors menu latéral ; aucune cloche tant qu'aucune notification réelle n'existe.
Hors périmètre : marketing, moteur IA, notifications, exports/bulk actions, catalogue inutilisé. Ne pas copier les incohérences métier de la maquette (renvoi d'invitation acceptée, rôle demandé par candidat). Préserver le checkout antérieur et ses gates bloqués.

## 2. Standards Applicables

architecture-stack, ui-components-state, api-validation-errors, b2b-tenancy-rbac et workflow depuis .specs/standards/index.yml. Priorité à la stack existante, sans outillage React ou framework supplémentaire spéculatif.

## 3. Code Existant à Réutiliser

apps/web/src/application.tsx (gardes/actions), auth/client.ts (SDK), http.ts, i18n.ts et auth/messages.ts. Extraire seulement les sections nécessaires à la composition. business/routes.ts transact et businessTransaction conservent session/origine/contexte. Migration additive 0009 pour préférences privées et apparence des workspaces. Nouveaux composants UI car aucun module partagé n'existe ; police libre auto-hébergée et bibliothèque d'icônes ciblée.

## 4. Sécurité B2B & Multi-Tenancy

Préférences propres à l'acteur courant, aucun id d'acteur accepté du client. Couleur workspace : lecture uniquement si workspace lisible via RLS ; écriture via workspace_admin dans le contexte serveur. Métadonnées privées derrière fonctions étroites SECURITY DEFINER à search_path fixe, références composites tenant/workspace. Valider les enums et hex #RRGGBB, convertir toute couleur en teinte de fond sûre (texte/actions indépendants). Galerie derrière garde super-admin existante. Tests négatifs absence session, rôle, autre identité/tenant et injections de couleur. Aucun job/agent IA concerné.

## 5. Delta Fonctionnel & Technique

### ADDED
GET/PUT /api/preferences : {locale: fr|en, theme: system|light|dark} pour soi.
PUT /api/workspaces/:id/appearance?tenantId=... : {color: #RRGGBB|null}, gestionnaire seulement.
Workspace expose color nullable. Galerie /docs inclut des exemples synthétiques interactifs.
### MODIFIED
Shell et navigation app/admin, composants auth, liste/invitation/approbation/profil et tokens ; contenu marketing conservé.
### REMOVED
Styles applicatifs dupliqués remplacés par règles de composants ; pas de fonctionnalité métier retirée.

### Critères d'acceptation

- GIVEN un tenant-admin WHEN il consulte invitations THEN liste à gauche, formulaire à droite sur écran large, regroupement vertical sur petit écran ; recherche/filtres agissent sur les données chargées et états vides distincts.
- GIVEN chaque rôle WHEN il navigue THEN mêmes permissions et URLs/scopes conservés, menu réductible desktop et accès mobile textuel sans icônes hors sidebar.
- GIVEN un acteur WHEN il change thème/langue THEN préférence serveur propre à son compte, cache local avant connexion ; échec annoncé sans faux succès.
- GIVEN un gestionnaire WHEN il change couleur workspace THEN couleur persistée et teinte sûre en clair/sombre ; membre ordinaire/autre tenant refusés.
- GIVEN un membre ou anonyme WHEN il ouvre /docs THEN refus/connexion ; super-admin voit galerie avec états et exemples fonctionnels.
- GIVEN fr/en et 375/768/1280 WHEN parcours clavier et états sont exercés THEN lisibilité, focus et absence overflow de page.

## 6. Impact Documentation Projet (Auto-Doc)

Required UPDATED : docs/data-model.md (0009), docs/architecture.md (API/préférences/UI), docs/architecture/0005-private-pilot.md et .specs/standards/b2b-tenancy-rbac.md (métadonnées), docs/features-b2b.md et .specs/domains/product-map.md (capacités et limites). Review UPDATED : CHANGELOG.md, README.md, docs/architecture/routes-verification.md. DESIGN_UI.md nouveau contrat et DESIGN.md pointeur cohérent. Environnement : aucune variable ajoutée. Aucune certification SQL sans exécution jetable.

Note de validation : Fastify retire par défaut les propriétés supplémentaires.
Configurer removeAdditional:false pour faire respecter les schémas existants
additionalProperties:false par refus 400, au lieu de supprimer silencieusement
les champs ; les tests de frontière utilisent cette même configuration.

Arbitrages compl�mentaires : typo 22/20/16/14/12/11/10px (corps 12px), sidebar 264px/56px, items 34px, texte 13px et ic�nes 16px. Ces d�cisions supplantent la maquette.
