# Recherche : Édition sûre du profil par tenant

## Décision : conserver les routes et l'autorisation existantes

- **Décision** : garder `GET/PUT /api/profile` et le flux `transact` commun.
- **Rationale** : l'inscription de routes se fait dans `registerBusinessRoutes` ;
  les opérations vérifient l'origine d'écriture, la session Better Auth et la
  portée dans `businessTransaction`. Les fonctions SQL modifient l'acteur courant
  et son membership ciblée. Le navigateur ne fournit aucun identifiant d'acteur.
- **Alternatives considérées** : middleware dédié au profil ou nouvelle couche
  d'autorisation. Rejetées car elles dupliqueraient les contrôles existants sans
  renforcer la frontière serveur.

## Décision : invalider l'état de formulaire à chaque changement de portée

- **Décision** : lier l'affichage, les statuts et les réponses d'écriture à la
  query tenant qui les a produits.
- **Rationale** : le formulaire utilise actuellement un état non associé à sa query.
  Une query modifiée peut donc laisser visible et enregistrable le profil d'un autre
  tenant jusqu'à la fin du prochain chargement.
- **Alternatives considérées** : conserver les anciennes valeurs pendant le
  chargement. Rejetée car les champs professionnels sont tenant-scopés et pourraient
  être réécrits dans la nouvelle portée.

## Décision : ne pas modifier le modèle de données

- **Décision** : aucun changement de migration, de DTO partagé ou de contrat HTTP.
- **Rationale** : les champs personnels, les champs professionnels, les préférences
  et les rôles sont déjà séparés ; les tests HTTP couvrent la persistance tenant et
  le refus inter-client.
- **Alternatives considérées** : créer une route ou ressource de profil versionnée.
  Rejetée pour cette correction locale sans nouveau comportement métier.
