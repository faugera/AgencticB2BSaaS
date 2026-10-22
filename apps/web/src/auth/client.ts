import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  // Navigation is handled by React Router, retaining pending invitation state.
  plugins: [twoFactorClient({ onTwoFactorRedirect: async () => {} })],
});
