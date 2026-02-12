// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.
import { AccountInfo, RedirectRequest } from '@azure/msal-browser';
import { IMsalContext } from '@azure/msal-react';
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

type FusionAuthUserInfo = {
    aud: string;
    lastLoginTime: number;
    name: string;
    sub: string;
    tid: string;
    username: string;
};

type FusionAuthRefreshResponse = {
    at: string;
    at_exp: string;
    tenantId: string;
};

type FusionAuthProviderContext = {
    isAuthenticated: boolean;
    loading: boolean;
    tenantId: string;
    clientId: string;
    login: (state?: string) => void;
    logout: (redirectUrl: string, reason?: string) => void;
    refreshToken: () => Promise<FusionAuthRefreshResponse>;
    user: FusionAuthUserInfo | null;
    error: Error | null;
};

const Context = createContext<AuthenticationContext | undefined>(undefined);

Context.displayName = 'AuthenticationContext';

export type AuthenticationContextProviderProps = {
    msal?: IMsalContext;
    fusionInstance?: FusionAuthProviderContext;
    oidcInstance?: AuthContextProps;
    authRequest: AuthenticationRequest;
    children?: ReactNode;
};

export type AuthenticationRequest = Pick<RedirectRequest, 'scopes' | 'extraQueryParameters' | 'state'>;

function AuthenticationContextProvider(props: AuthenticationContextProviderProps) {
    const { msal, oidcInstance, fusionInstance, authRequest, children } = props;

    // Auto-detect provider type based on presence of msal prop
    if (msal) {
        return (
            <MsalProvider msal={msal} authRequest={authRequest}>
                {children}
            </MsalProvider>
        );
    } else if (fusionInstance) {
        return (
            <FusionAuthProvider fusionInstance={fusionInstance} authRequest={authRequest}>
                {children}
            </FusionAuthProvider>
        );
    } else if (oidcInstance) {
        return (
            <OidcProvider oidcInstance={oidcInstance} authRequest={authRequest}>
                {children}
            </OidcProvider>
        );
    }

    return <Context.Provider value={undefined}>{children}</Context.Provider>;
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

function FusionAuthProvider({ fusionInstance, children }: AuthenticationContextProviderProps) {
    if (!fusionInstance) {
        throw new Error('Fusion instance is required for FusionAuthProvider.');
    }

    const { isAuthenticated, user, tenantId, logout } = fusionInstance;

    const context: AuthenticationContext | undefined = useMemo(() => {
        return isAuthenticated && user?.sub
            ? {
                  tenantId: user.tid,
                  account: {
                      id: user.sub,
                      name: user.name,
                      username: user.username,
                      lastLoginTime: user.lastLoginTime,
                  },
                  logout: () => {
                      logout(
                          `${window.location.origin}/logout?p=${encodeURIComponent(window.location.pathname + window.location.search)}`,
                      );
                  },
                  getAccessToken: async () => {
                      return sessionStorage.getItem(`${tenantId}-fusionauth.at`) || '';
                  },
              }
            : undefined;
    }, [isAuthenticated, user, tenantId, logout]);

    return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function useAuthenticationContext() {
    return useContext(Context);
}

export default AuthenticationContextProvider;
