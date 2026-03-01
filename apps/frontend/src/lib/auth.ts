export const auth0Config = {
  domain: (import.meta.env['VITE_AUTH0_DOMAIN'] as string) || '',
  clientId: (import.meta.env['VITE_AUTH0_CLIENT_ID'] as string) || '',
  audience: (import.meta.env['VITE_AUTH0_AUDIENCE'] as string) || '',
  redirectUri: window.location.origin,
};

export const loginWithRedirect = (loginFn: () => void) => {
  loginFn();
};

export const logout = (
  logoutFn: (options?: { logoutParams?: { returnTo?: string } }) => void,
) => {
  logoutFn({ logoutParams: { returnTo: window.location.origin } });
};
