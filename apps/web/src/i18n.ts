import { useEffect, useState } from 'react';

export const uiMessages = {
  fr: {
    access_denied: 'Accès refusé',
    access_denied_help:
      'Votre compte ne dispose plus des droits nécessaires. Contactez votre administrateur.',
    language: 'Langue',
    sign_out: 'Se déconnecter',
    main_navigation: 'Navigation principale',
    workspaces: 'Espaces de travail',
    account_security: 'Sécurité du compte',
    access_unavailable_or_denied_contact_your_administrator:
      'Accès indisponible ou refusé. Contactez votre administrateur.',
    unable_to_complete_this_request_try_again_later:
      'Impossible de terminer cette demande. Réessayez plus tard.',
    saved_but_email_delivery_failed_retry_from_invitations:
      'Création enregistrée, mais envoi email en échec. Réessayez depuis les invitations.',
    changes_saved: 'Modification enregistrée.',
    loading: 'Chargement…',
    private_pilot: 'Pilote privé',
    welcome: 'Bienvenue',
    platform_administration: 'Administration de la plateforme',
    active_organization: 'Organisation active',
    select_an_organization: 'Sélectionner une organisation',
    create_an_organization: 'Créer une organisation',
    organization_name: 'Nom de l’organisation',
    administrator_email: 'Email de l’administrateur',
    create_and_invite: 'Créer et inviter',
    your_workspaces: 'Vos espaces de travail',
    this_workspace_is_authorized_by_the_server:
      'Cet espace est autorisé par le serveur.',
    private: 'Privé',
    organization: 'Organisation',
    no_accessible_workspace_ask_your_administrator_for_access:
      'Aucun espace accessible. Demandez un accès à votre administrateur.',
    new_private_workspace: 'Nouvel espace privé',
    create_workspace: 'Créer l’espace',
    assign_access: 'Attribuer un accès',
    member: 'Membre',
    role: 'Rôle',
    workspace_administrator: 'Administrateur de l’espace',
    save: 'Enregistrer',
    workspace_name: 'Nom de l’espace',
    visibility: 'Visibilité',
    remove_from_workspace: 'Retirer de l’espace',
    invitations_and_members: 'Invitations et membres',
    email_address: 'Adresse email',
    organization_administrator: 'Administrateur de l’organisation',
    invite: 'Inviter',
    accepted: 'Acceptée',
    revoked: 'Révoquée',
    delivery_failed: 'Envoi en échec',
    pending: 'En attente',
    resend: 'Renvoyer',
    revoke: 'Révoquer',
    remove_access: 'Retirer l’accès',
    two_factor_authentication_optional:
      'Authentification à deux facteurs (facultative)',
    use_a_totp_authenticator_and_keep_recovery_codes_offline:
      'Utilisez une application TOTP et conservez vos codes de récupération hors ligne.',
    verification_failed_try_again: 'Vérification impossible. Réessayez.',
    current_password: 'Mot de passe actuel',
    disable_mfa: 'Désactiver la MFA',
    set_up_mfa: 'Configurer la MFA',
    add_this_uri_to_your_authenticator_then_confirm_a_code_do_not_sh:
      'Ajoutez cette URI dans votre application, puis confirmez un code. Ne partagez pas ces secrets.',
    recovery_codes: 'Codes de récupération',
    verification_code: 'Code de vérification',
    confirm: 'Confirmer',
    your_invitation: 'Votre invitation',
    reopen_the_link_from_your_email: 'Ouvrez à nouveau le lien de votre email.',
    sign_in_to_accept: 'Se connecter pour accepter',
    accept_invitation: 'Accepter l’invitation',
    invitation_invalid_expired_or_incompatible_with_your_account:
      'Invitation invalide, expirée ou incompatible avec votre compte.',
    page_not_found: 'Page introuvable.',
    back_to_the_application: 'Revenir à l’application',
    enterprise_ai_os_home: 'Accueil Enterprise AI OS',
    the_foundation: 'Les fondations',
    sign_in: 'Se connecter',
    a_considered_beginning: 'Un début réfléchi',
    with_intention: 'Avec intention.',
    a_clearer_foundation_for_the_way_your_enterprise_works_built_to_:
      'Une base claire pour votre entreprise. Conçue pour réunir les personnes, les systèmes et l’IA.',
    explore_the_foundation: 'Explorer les fondations',
    foundation_edition: 'ÉDITION FONDATION',
    good_systems_start_with_clear_principles:
      'De bons systèmes reposent sur des principes clairs.',
    clarity_by_design: 'La clarté par conception',
    a_focused_workspace_with_room_to_grow_complexity_earns_its_place:
      'Un espace ciblé, avec la liberté d’évoluer. La complexité doit être justifiée.',
    trust_at_the_core: 'La confiance au cœur',
    security_and_tenant_isolation_are_requirements_for_every_future_:
      'La sécurité et l’isolation des organisations sont les bases de chaque fonctionnalité.',
    people_in_the_loop: 'L’humain dans la boucle',
    intelligent_tools_should_support_good_judgment_and_accountable_d:
      'Des outils intelligents au service du discernement et de décisions responsables.',
    thoughtfully_built_just_getting_started:
      'Conçu avec soin. Ce n’est que le début.',
    foundation_001: 'Fondation / 001',
  },
  en: {
    access_denied: 'Access denied',
    access_denied_help:
      'Your account no longer has the required permissions. Contact your administrator.',
    language: 'Language',
    sign_out: 'Sign out',
    main_navigation: 'Main navigation',
    workspaces: 'Workspaces',
    account_security: 'Account security',
    access_unavailable_or_denied_contact_your_administrator:
      'Access unavailable or denied. Contact your administrator.',
    unable_to_complete_this_request_try_again_later:
      'Unable to complete this request. Try again later.',
    saved_but_email_delivery_failed_retry_from_invitations:
      'Saved, but email delivery failed. Retry from invitations.',
    changes_saved: 'Changes saved.',
    loading: 'Loading…',
    private_pilot: 'Private pilot',
    welcome: 'Welcome',
    platform_administration: 'Platform administration',
    active_organization: 'Active organization',
    select_an_organization: 'Select an organization',
    create_an_organization: 'Create an organization',
    organization_name: 'Organization name',
    administrator_email: 'Administrator email',
    create_and_invite: 'Create and invite',
    your_workspaces: 'Your workspaces',
    this_workspace_is_authorized_by_the_server:
      'This workspace is authorized by the server.',
    private: 'Private',
    organization: 'Organization',
    no_accessible_workspace_ask_your_administrator_for_access:
      'No accessible workspace. Ask your administrator for access.',
    new_private_workspace: 'New private workspace',
    create_workspace: 'Create workspace',
    assign_access: 'Assign access',
    member: 'Member',
    role: 'Role',
    workspace_administrator: 'Workspace administrator',
    save: 'Save',
    workspace_name: 'Workspace name',
    visibility: 'Visibility',
    remove_from_workspace: 'Remove from workspace',
    invitations_and_members: 'Invitations and members',
    email_address: 'Email address',
    organization_administrator: 'Organization administrator',
    invite: 'Invite',
    accepted: 'Accepted',
    revoked: 'Revoked',
    delivery_failed: 'Delivery failed',
    pending: 'Pending',
    resend: 'Resend',
    revoke: 'Revoke',
    remove_access: 'Remove access',
    two_factor_authentication_optional: 'Two-factor authentication (optional)',
    use_a_totp_authenticator_and_keep_recovery_codes_offline:
      'Use a TOTP authenticator and keep recovery codes offline.',
    verification_failed_try_again: 'Verification failed. Try again.',
    current_password: 'Current password',
    disable_mfa: 'Disable MFA',
    set_up_mfa: 'Set up MFA',
    add_this_uri_to_your_authenticator_then_confirm_a_code_do_not_sh:
      'Add this URI to your authenticator, then confirm a code. Do not share these secrets.',
    recovery_codes: 'Recovery codes',
    verification_code: 'Verification code',
    confirm: 'Confirm',
    your_invitation: 'Your invitation',
    reopen_the_link_from_your_email: 'Reopen the link from your email.',
    sign_in_to_accept: 'Sign in to accept',
    accept_invitation: 'Accept invitation',
    invitation_invalid_expired_or_incompatible_with_your_account:
      'Invitation invalid, expired, or incompatible with your account.',
    page_not_found: 'Page not found.',
    back_to_the_application: 'Back to the application',
    enterprise_ai_os_home: 'Enterprise AI OS home',
    the_foundation: 'The foundation',
    sign_in: 'Sign in',
    a_considered_beginning: 'A considered beginning',
    with_intention: 'With intention.',
    a_clearer_foundation_for_the_way_your_enterprise_works_built_to_:
      'A clearer foundation for the way your enterprise works. Built to bring people, systems, and AI together.',
    explore_the_foundation: 'Explore the foundation',
    foundation_edition: 'FOUNDATION EDITION',
    good_systems_start_with_clear_principles:
      'Good systems start with clear principles.',
    clarity_by_design: 'Clarity by design',
    a_focused_workspace_with_room_to_grow_complexity_earns_its_place:
      'A focused workspace, with room to grow. Complexity earns its place.',
    trust_at_the_core: 'Trust at the core',
    security_and_tenant_isolation_are_requirements_for_every_future_:
      'Security and tenant isolation are requirements for every future capability.',
    people_in_the_loop: 'People in the loop',
    intelligent_tools_should_support_good_judgment_and_accountable_d:
      'Intelligent tools should support good judgment and accountable decisions.',
    thoughtfully_built_just_getting_started:
      'Thoughtfully built. Just getting started.',
    foundation_001: 'Foundation / 001',
  },
} as const;
export type UIMessage = keyof typeof uiMessages.fr;
type Locale = keyof typeof uiMessages;
function initialLocale(): Locale {
  try {
    return localStorage.getItem('locale') === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}
export function useLanguage() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem('locale', locale);
    } catch {
      /* Optional preference. */
    }
  }, [locale]);
  const t = (key: UIMessage): string => uiMessages[locale][key];
  return { locale, setLocale, t };
}
