export const documentation = {
  fr: [
    { title: 'Accès et organisations', text: 'Le super-admin crée les organisations et invite leur administrateur. Un tenant-admin partage un lien de demande, examine les demandes de son organisation puis invite les personnes approuvées. Une demande seule ne donne aucun accès.' },
    { title: 'Identité et invitations', text: 'Une personne invitée vérifie son email, définit son mot de passe puis accepte l’invitation avec cette même adresse. Les invitations expirent après 48 heures. Le renvoi renouvelle le lien ; l’état de livraison permet de repérer un échec email.' },
    { title: 'Workspaces et permissions', text: 'Les espaces sont privés par défaut. Les administrateurs d’organisation gèrent les membres et invitations de leur tenant. Les administrateurs de workspace gèrent uniquement leur espace. Le rôle affiché dans le navigateur ne remplace jamais une autorisation serveur.' },
    { title: 'Profil et sécurité', text: 'Le profil permet de modifier son nom, de consulter ses sessions et de déconnecter ses autres appareils. Email et rôles sont en lecture seule. L’authentification TOTP reste facultative ; conserver les codes de récupération hors ligne.' },
    { title: 'Livraison et limites', text: 'Toute livraison passe par une PR et le contrôle CI verify. Les demandes d’accès et les invitations ne créent pas automatiquement une organisation. Les fonctions agents IA, facturation et SSO ne sont pas implémentées dans ce pilote.' },
  ],
  en: [
    { title: 'Access and organizations', text: 'The super-admin creates organizations and invites their administrator. A tenant admin shares an access-request link, reviews requests for their organization and invites approved people. A request alone grants no access.' },
    { title: 'Identity and invitations', text: 'An invited person verifies their email, sets a password and accepts the invitation using that same address. Invitations expire after 48 hours. Resending rotates the link; delivery status exposes email failures.' },
    { title: 'Workspaces and permissions', text: 'Workspaces are private by default. Organization administrators manage their tenant’s members and invitations. Workspace administrators manage only their own workspace. A role displayed in the browser never replaces server authorization.' },
    { title: 'Profile and security', text: 'The profile lets you change your name, inspect your sessions and sign out your other devices. Email and roles are read-only. TOTP remains optional; keep recovery codes offline.' },
    { title: 'Delivery and limits', text: 'Delivery requires a pull request and the CI verify check. Access requests and invitations never create an organization automatically. AI agents, billing and SSO are not implemented in this pilot.' },
  ],
} as const;
