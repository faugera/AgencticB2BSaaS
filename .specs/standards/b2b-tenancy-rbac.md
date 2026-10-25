# Sécurité B2B : exigences et preuves

Références : [ADR-005](../../docs/architecture/0005-private-pilot.md),
[matrice](../../docs/features-b2b.md), [spec courante](../../specs/002-b2b-organizations-rbac/spec.md).
IMPLEMENTED décrit le code ; aucune certification production n'est déduite des tests locaux.

| Mécanisme | Statut | Contrat |
| --- | --- | --- |
| Identité vérifiée, acteur actif | IMPLEMENTED | Better Auth fournit identité ; rôle/portée persistés relus par opération |
| Client/organisation distinct du tenant | IMPLEMENTED | Un client possède plusieurs tenants/workspaces ; un acteur ordinaire reste dans un seul client |
| Multi-tenant explicite, statut | IMPLEMENTED | Membership composite acteur+tenant ; seul active autorise |
| Catalogue global et rôles cumulables | IMPLEMENTED | Édition super-admin, délégation explicite et union dans la portée |
| Pyramide stricte | IMPLEMENTED | Aucun soi/pair/supérieur ; dernier administrateur actif protégé contre concurrence |
| Organisation-admin transversal | IMPLEMENTED | Son client seulement, privé compris, contrôlé et audité |
| Transaction locale et RLS FORCE | IMPLEMENTED | Organisations/tenants/workspaces/journal ; fonctions étroites privées sans grants runtime |
| Runtimes sans propriété/BYPASSRLS | IMPLEMENTED | Provisioning et assertRuntimePrivileges ; état production UNKNOWN |
| Journal unique append-only runtime | IMPLEMENTED | business.audit_logs ; archive privée figée, pas de valeurs sensibles |
| Tests négatifs HTTP/SQL | IMPLEMENTED | Suites integration réexécutées pour chaque changement ; mocks insuffisants |
| Export/rétention externe, ledger inviolable | PLANNED | Hors V0 |
| Runtime IA / jobs / support dédié | NOT_FOUND | Garde-fous constitutionnels, aucun runtime |

## Prescriptions

Le tenantId client demande une portée ; il ne la prouve pas. Même transaction pour
contexte local et requête, sans contexte persistant sur connexion mutualisée. Les
permissions workspace exigent leur workspace exact ; une permission d'un autre tenant
ou client ne s'hérite jamais. Références composites et refus sans contexte obligatoires.

Un administrateur ne modifie que les niveaux inférieurs de sa portée. Le super-admin
applicatif n'est pas un superuser SQL. Le catalogue ne permet aucune attribution de
rôle plateforme. Les rôles fixes sont protégés ; changements globaux affectants exigent
impact et confirmation, et tracent auteur/date/capacités ajoutées ou retirées.

Les membres invited/suspended n'ouvrent pas le tenant même avec session valide.
L'organisation-admin traverse sans membership mais un statut explicite inactif refuse
ce tenant. Suppression logique révoque accès et conserve IDs ; aucune purge implicite.

Audit : événements plateforme tenant=null super-admin seulement ; événements tenant
selon audit.read, jamais autre client. Sans contexte authentifié, auteur null ; la cible
ne devient pas auteur. IP/user-agent dérivés serveur et bornés. Historique copié avec
legacy_id ; ancienne route /api/platform/audit retirée, aucun second journal actif.

Les demandes publiques via lien opaque ne créent ni identité ni accès. Réponse générique,
origine/validation/limite ; approbation réutilise invitations et contrôle de niveau.
Pagination UUID des demandes100 et du journal50 résolue dans la portée autorisée.
Profil et préférences n'acceptent aucun sélecteur d'identité ni champ de rôle/tenant/statut.
MFA facultative V0 ; pas de secrets dans navigateur/logs/preuves. RLS ne neutralise pas
un serveur compromis capable de forger le contexte. Jobs/IA futurs doivent réautoriser
acteur et portée à l'exécution conformément à la constitution.
