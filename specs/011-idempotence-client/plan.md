# Plan d'implémentation : Idempotence côté client

**Branch**: `codex/rattrapage-documentaire` | **Date**: 2026-11-15
**Spec**: [spec.md](spec.md)

## Résumé

Ajouter `mutate()` dans `apps/web/src/http.ts` : génère un UUID par soumission,
transmet `Idempotency-Key`, rejoue une seule fois sur erreur réseau avec la même
clé, et n'envoie rien sur les lectures. Brancher les quatre parcours déjà
idempotents côté serveur. Aucun changement serveur.

## Contexte technique

- **Langage/versions** : React 19, TypeScript strict, Vitest (environnement node).
- **Client HTTP** : `apps/web/src/http.ts`, `fetch` natif, `credentials: same-origin`.
- **Serveur** : actions `tenant.created`, `invitation.created`, `invitation.updated`,
  `access_request.reviewed` (`apps/api/src/business/routes.ts:73-78`).
- **Validation** : schémas Zod existants dans `apps/web/src/contracts/api.ts`.
- **Contraintes serveur** : clé non vide, ≤ 200 caractères, sans CRLF, sinon 400.
- **Hors périmètre** : autorisation, schéma, migration, reprise SMTP.

## Vérification de la constitution

- **Prudence** : aucune règle d'autorisation modifiée ; la clé ne remplace jamais
  la réautorisation serveur.
- **Simplicité** : une fonction et quatre appels, sans dépendance nouvelle
  (`crypto.randomUUID` est natif).
- **Frontières B2B** : le serveur reste l'unique autorité ; le client ne décide rien.
- **Preuves honnêtes** : le rejeu est prouvé par des tests unitaires ; PostgreSQL
  réel et CI restent `NOT_RUN`.
- **Résultat** : conforme.

## Décisions de conception

1. **Fonction dédiée** plutôt qu'un en-tête implicite dans `api()` : la clé n'est
   envoyée que là où le serveur l'honore.
2. **Rejeu interne unique** sur exception de transport, avec la même clé ; aucune
   reprise sur réponse HTTP, pour ne pas masquer un refus.
3. **Nouvelle clé par appel** : chaque soumission utilisateur est une intention
   distincte ; la stabilité ne concerne que le rejeu interne.
4. **Tests unitaires** avec `fetch` simulé : en-tête, stabilité, renouvellement,
   absence sur GET, absence de rejeu sur 4xx/5xx.

## Structure concernée

```text
apps/web/src/http.ts
apps/web/src/http-idempotency.test.ts
apps/web/src/pages/Organizations.tsx
apps/web/src/pages/InvitationManagement.tsx
apps/web/src/pages/AccessRequests.tsx
specs/011-idempotence-client/
```

## Validation après conception

- **Constitution** : aucune violation.
- **Contrat** : réponses et schémas inchangés.
- **Preuve** : tests unitaires ciblés puis suite complète.
- **Limites** : la livraison SMTP reste « au moins une fois » ; l'idempotence ne la
  rend pas exactement-une-fois.
