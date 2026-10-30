# Vérification du schéma — 30 octobre 2026

- PASS : comparaison statique des sept liens dessinés avec les migrations 0002 et
  0014 ; journal actif sans FK vérifié dans 0015. Le schéma omet des liens, signalés
  comme tels. Revue indépendante en lecture seule.
- PASS : `pnpm docs:test`, 10 tests dont ajout, suppression et modification des
  sources ; `pnpm docs:check` et `pnpm lint` avant les modifications concurrentes.
- PASS : test réel Chromium en `file://` aux largeurs 375, 768 et 1280 : redirection
  depuis l'ancien fichier, absence de débordement global, deux régions accessibles
  au clavier et ouverture de la description textuelle. Revue visuelle indépendante
  des captures correspondantes. Pas de test avec un lecteur d'écran réel.
- PASS : la modification du document d'architecture a déclenché le contrôle, puis
  la confirmation a rétabli sa réussite après revue.
- Attention : une migration 0016 et des documents associés sont en cours dans un
  autre checkout et ne font pas partie de cette PR. Le schéma de cette branche couvre
  les migrations jusqu'à 0015 ; il ne certifie pas la base déployée. Si 0016 est
  intégrée, le contrôle imposera une nouvelle revue des sources.
