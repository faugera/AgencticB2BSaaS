# Rejeu depuis un checkout Windows neuf

PASS, 25 octobre2026, checkout21c2d787475052b80c10dcbff34e5188a7b025eb.
Les15fichiersSQL sont identiques octet par octet au checkout primaire ; seuls0013–0015
sont épinglés LF par cette PR. Aucune ancienne migration n'a été modifiée.

Le migrateur compilé dans ce checkout neuf a été exécuté avec Node natif contre la
base jetable enterprise_auth_test_b2b_final7 déjà migrée depuis le checkout primaire.
Résultat :15versions, historique strictementidentique (noms/checksums/applied_at).
Aucune nouvelle version ni mutation de date au rejeu. Détails : checkout-byte-proof.json.
