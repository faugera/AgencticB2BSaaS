# Implementation Plan: Déblocage de la PR 9

## Summary

Diagnostiquer le compteur Better Auth partagé, isoler les fixtures par adresse unique si la reproduction confirme cette cause, puis ajouter une migration corrective pour le contexte tenant. Corriger les références documentaires et vérifier le tout sans modifier les migrations appliquées.

## Constitution Check

Autorisation serveur, RLS et audit préservés ; aucune modification de limite de production. Utiliser exclusivement des services jetables et conserver les preuves par révision. Pas de fusion sans vérifications et décision humaine.

## Vérification

1. Observer la clé et la réponse du limiteur dans une base jetable, puis rejouer les suites pour démontrer le correctif du 429.
2. Ajouter une régression avant une migration additive : organisation supprimée avec tenant actif, super-admin, membre autorisé et organisation active témoin. Vérifier `/api/me` et les appelants de `business.context()`.
3. Examiner le routage documentaire et synchroniser architecture, modèle, ADR et standard B2B selon leur pertinence ; réviser le manifeste du diagramme.
4. Exécuter `pnpm verify`, `pnpm docs:test`, `pnpm docs:check`, `pnpm verify:security`, `pnpm verify:tenant-isolation` et `pnpm test:auth:e2e` sur services jetables ; consigner PASS/FAIL/NOT_RUN et limites.

## Risques

Vérifier avant création le numéro libre et les historiques de migration de chaque environnement concerné ; ne pas supposer que 0019 est libre hors de cette branche. Docker était indisponible lors du dernier contrôle ; retenter sans utiliser la base de développement.
