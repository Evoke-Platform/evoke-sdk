// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { AccountInfo, RedirectRequest } from '@azure/msal-browser';
import { IMsalContext } from '@azure/msal-react';
import type { FusionAuthProviderContext } from '@fusionauth/react-sdk';
import axios from 'axios';
import { ExtraSigninRequestArgs } from 'oidc-client-ts';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { AuthContextProps } from 'react-oidc-context';

export type AuthenticationContext = {
    account: UserAccount;
    logout: VoidFunction;
    getAccessToken: () => Promise<string>;
};

export type UserAccount = {
    id: string;
    name?: string;
    username?: string;
    lastLoginTime?: number;
    activeMfaSession?: boolean;
};

type FusionUserInfo = NonNullable<FusionAuthProviderContext['userInfo']> & {
    aud?: string;
    username?: string;
    lastLoginTime?: number;
};

const Context = createContext<AuthenticationContext | undefined>(undefined);

Context.displayName = 'AuthenticationContext';

export type AuthenticationContextProviderProps = {
    msal?: IMsalContext;
    fusionInstance?: FusionAuthProviderContext;
    oidcInstance?: AuthContextProps;
    authRequest: AuthenticationRequest;
    children?: ReactNode;
    logout?: (reason?: string) => void;
};

export type AuthenticationRequest = Pick<RedirectRequest, 'scopes' | 'extraQueryParameters' | 'state'>;

export function AuthenticationContextProvider(props: AuthenticationContextProviderProps) {
    const { msal, oidcInstance, fusionInstance, authRequest, children, logout } = props;

    // Auto-detect provider type based on presence of msal prop
    if (msal) {
        return (
            <MsalProvider msal={msal} authRequest={authRequest}>
                {children}
            </MsalProvider>
        );
    } else if (fusionInstance) {
        const { fusionInstance, authRequest, children } = props;

        return (
            <FusionAuthProvider fusionInstance={fusionInstance} authRequest={authRequest} logout={logout}>
                {children}
            </FusionAuthProvider>
        );
    } else if (oidcInstance) {
        const { oidcInstance, authRequest, children } = props;

        return (
            <OidcProvider oidcInstance={oidcInstance} authRequest={authRequest}>
                {children}
            </OidcProvider>
        );
    }
}

function MsalProvider({ msal, authRequest, children }: AuthenticationContextProviderProps) {
    if (!msal) {
        throw new Error('MSAL instance is required for MsalProvider');
    }

    const account: AccountInfo | undefined = msal.instance.getActiveAccount() ?? msal.instance.getAllAccounts()[0];

    const getAccessToken = useCallback(
        async function () {
            try {
                const response = await msal.instance.acquireTokenSilent({ ...authRequest, account });

                return response.accessToken;
            } catch (err: unknown) {
                await msal.instance.acquireTokenRedirect({ ...authRequest, account });

                return '';
            }
        },
        [msal, authRequest, account],
    );

    const context: AuthenticationContext | undefined = useMemo(
        () =>
            account
                ? {
                      account: {
                          id: account.localAccountId,
                          name: account.name,
                          lastLoginTime: account.idTokenClaims?.last_login_time as number | undefined,
                          activeMfaSession: Boolean(account.idTokenClaims?.active_mfa_session),
                      },
                      logout: () => {
                          msal.instance.logoutRedirect({
                              account,
                              postLogoutRedirectUri: `/logout?p=${encodeURIComponent(
                                  window.location.pathname + window.location.search,
                              )}`,
                          });
                      },
                      getAccessToken,
                  }
                : undefined,
        [account, msal, getAccessToken, authRequest],
    );

    return <Context.Provider value={context}>{children}</Context.Provider>;
}

function OidcProvider({ oidcInstance, authRequest, children }: AuthenticationContextProviderProps) {
    if (!oidcInstance) {
        throw new Error('OIDC instance is required for OidcProvider');
    }

    const userRef = useRef(oidcInstance.user);

    useEffect(() => {
        userRef.current = oidcInstance.user;
    }, [oidcInstance.user]);

    // The authRequest for react-oidc is formatted slightly differently than msal.
    const oidcAuthRequest: Pick<ExtraSigninRequestArgs, 'scope' | 'extraQueryParams' | 'state'> = {
        scope: authRequest.scopes?.join(' ') ?? 'openid profile',
        extraQueryParams: authRequest.extraQueryParameters,
        state: authRequest.state,
    };

    const getAccessToken = useCallback(
        async function () {
            try {
                // With automaticSilentRenew: true, oidc-client-ts will attempt to renew the token in the background before it expires.
                // However, this is not guaranteed to be perfectly in sync with your API calls. Always check for expiration here and call signinSilent if needed
                // to ensure you get a valid token on demand.
                if (userRef.current?.access_token && !userRef.current.expired) {
                    return userRef.current.access_token;
                }
                // Token is either missing or expired - attempt silent refresh.
                const user = await oidcInstance.signinSilent(oidcAuthRequest);

                // If signinSilent returns null, it means silent login failed
                if (!user) {
                    console.log('Silent login failed, redirecting to login');

                    oidcInstance.signinRedirect(oidcAuthRequest);

                    return '';
                }

                return user.access_token;
            } catch (error) {
                console.error('Failed to get access token:', error);

                // If silent refresh throws an error (e.g., network failure, missing silent_redirect_uri,
                // invalid session, refresh token expired, or provider returned an error), redirect to login
                oidcInstance.signinRedirect(oidcAuthRequest);

                return '';
            }
        },
        [oidcInstance.signinSilent, oidcInstance.signinRedirect, authRequest],
    );

    const context: AuthenticationContext | undefined = useMemo(
        () =>
            oidcInstance.isAuthenticated && userRef.current
                ? {
                      account: {
                          id: userRef.current.profile.sub,
                          name:
                              userRef.current.profile.name ??
                              (`${userRef.current.profile.given_name ?? ''} ${userRef.current.profile.family_name ?? ''}` ||
                                  undefined),
                          lastLoginTime: userRef.current.profile.lastLoginTime as number | undefined,
                      },
                      logout: () => {
                          oidcInstance.signoutRedirect({
                              // Fusion oidcInstance requires an absolute url.
                              post_logout_redirect_uri: `${window.location.origin}/logout?p=${encodeURIComponent(
                                  window.location.pathname + window.location.search,
                              )}`,
                          });
                      },
                      getAccessToken,
                  }
                : undefined,
        [
            // Make sure to update authentication context if the logged-in user changes.
            userRef.current?.profile.sub,
            oidcInstance.isAuthenticated,
            oidcInstance.signoutRedirect,
            getAccessToken,
        ],
    );

    return <Context.Provider value={context}>{children}</Context.Provider>;
}

function FusionAuthProvider({ fusionInstance, children, logout }: AuthenticationContextProviderProps) {
    if (!fusionInstance) {
        throw new Error('Fusion instance is required for FusionAuthProvider.');
    }

    const { isLoggedIn, userInfo } = fusionInstance;

    const user = userInfo as FusionUserInfo | null;

    // Use a cache key specific to the tenant to support multi-tenant logins.
    const CACHE_KEY = `${user?.tid}-fusionauth.at`;

    const getTokenFromCache = useCallback(() => {
        const cached = sessionStorage.getItem(CACHE_KEY);

        if (!cached) return null;

        const parsed = JSON.parse(cached);
        const now = Date.now();

        // Return cached token if it hasn't expired.
        if (parsed.expires_in > now) {
            return parsed.token;
        }

        // If the token has expired, remove it from cache.
        sessionStorage.removeItem(CACHE_KEY);

        return null;
    }, [CACHE_KEY]);

    const setTokenInCache = useCallback(
        (token: string, expires_in: number) => {
            const now = Date.now();

            sessionStorage.setItem(
                CACHE_KEY,
                JSON.stringify({
                    token,
                    // Set expiration before actual expiration
                    // to allow buffer time for usage.
                    expires_in: now + expires_in * 1000 - 30000,
                }),
            );
        },
        [CACHE_KEY],
    );

    const context: AuthenticationContext | undefined = useMemo(() => {
        return isLoggedIn && user?.sub
            ? {
                  tenantId: user.tid,
                  account: {
                      id: user.sub,
                      name: user.name,
                      username: user.username,
                      lastLoginTime: user.lastLoginTime,
                  },
                  logout: () => {
                      if (logout) {
                          // If a `logout` function is provided, use it to perform a logout.
                          // Since FusoinAuth does not currently support a dynamic `post_logout_redirect_uri`
                          // through the FusionAuth SDK, the redirect to the `/logout` route is manual.
                          // However, manually handling the redirection doesn't allow the logout to be
                          // broadcasted to other tabs. Therefore, if cross-tab logout is supported,
                          // a function that implements that logic should be provided here.
                          logout();
                      }

                      // Fallback to direct logout if no `logout` function is provided.
                      const logoutUrl = new URL(`${window.location.origin}/auth/logout`);

                      logoutUrl.searchParams.set('client_id', user.aud ?? '');
                      logoutUrl.searchParams.set(
                          'post_logout_redirect_uri',
                          `${window.location.origin}/logout?p=${encodeURIComponent(
                              window.location.pathname + window.location.search,
                          )}`,
                      );

                      // Clear cache on logout.
                      sessionStorage.removeItem(CACHE_KEY);

                      window.location.href = logoutUrl.toString();
                  },
                  getAccessToken: async () => {
                      const cachedToken = getTokenFromCache();

                      if (cachedToken) return cachedToken;

                      // If there is no cached token, retrieve a new token.
                      const tokenResponse = await axios.post(`api/accessManagement/auth/user/token`, undefined, {
                          params: {
                              client_id: user?.aud,
                          },
                      });

                      const token = tokenResponse.data;

                      // Cache the token with the expiration
                      if (token.expires_in && token.access_token) {
                          setTokenInCache(token.access_token, token.expires_in);
                      }

                      return token.access_token;
                  },
              }
            : undefined;
    }, [isLoggedIn, userInfo]);

    return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function useAuthenticationContext() {
    return useContext(Context);
}

export default AuthenticationContextProvider;
