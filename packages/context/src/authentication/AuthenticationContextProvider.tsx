// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { AccountInfo, RedirectRequest } from '@azure/msal-browser';
import { IMsalContext } from '@azure/msal-react';
import { ReactNode, createContext, useCallback, useContext, useMemo } from 'react';
import { AuthState, useAuth } from 'react-oidc-context';

export type AuthenticationContext = {
    account: UserAccount;
    logout: VoidFunction;
    getAccessToken: () => Promise<string>;
};

export type OidcAuthenticationContext = AuthenticationContext & Pick<AuthState, 'isAuthenticated' | 'isLoading'>;

export type AnyAuthenticationContext = AuthenticationContext | OidcAuthenticationContext;

export type UserAccount = {
    id: string;
    name?: string;
};

const Context = createContext<AnyAuthenticationContext | undefined>(undefined);

Context.displayName = 'AuthenticationContext';

export type AuthenticationRequest = Pick<RedirectRequest, 'scopes' | 'extraQueryParameters' | 'state'>;

export type OidcAuthenticationRequest = {
    scopes?: string[];
    extraQueryParameters?: Record<string, string>;
    state?: string;
};

// Original MSAL props
export type AuthenticationContextProviderProps = {
    msal: IMsalContext;
    authRequest: AuthenticationRequest;
    children?: ReactNode;
};

// Alternative OIDC props
export type OidcAuthenticationContextProviderProps = {
    authRequest: OidcAuthenticationRequest;
    children?: ReactNode;
};

// Combined props type for auto-detection
export type CombinedAuthenticationContextProviderProps =
    | (AuthenticationContextProviderProps & { msal: IMsalContext }) // MSAL with required msal prop
    | (OidcAuthenticationContextProviderProps & { msal?: never }); // OIDC without msal prop

function AuthenticationContextProvider(props: CombinedAuthenticationContextProviderProps) {
    // Auto-detect provider type based on presence of msal prop
    if ('msal' in props && props.msal) {
        const { msal, authRequest, children } = props;

        return (
            <MsalProvider msal={msal} authRequest={authRequest}>
                {children}
            </MsalProvider>
        );
    } else {
        // OIDC provider
        const { authRequest, children } = props;

        return <OidcProvider authRequest={authRequest}>{children}</OidcProvider>;
    }
}

// MSAL Implementation
function MsalProvider({
    msal,
    authRequest,
    children,
}: {
    msal: IMsalContext;
    authRequest: AuthenticationRequest;
    children?: ReactNode;
}) {
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
                      account: { id: account.localAccountId, name: account.name },
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

// OIDC Implementation
function OidcProvider({ authRequest, children }: OidcAuthenticationContextProviderProps) {
    const auth = useAuth();

    const getAccessToken = useCallback(
        async function () {
            try {
                if (auth.user?.access_token) {
                    return auth.user.access_token;
                }

                // Try to refresh the token silently
                await auth.signinSilent();

                return auth.user?.access_token || '';
            } catch (error) {
                console.error('Failed to get access token:', error);

                // If silent refresh fails, redirect to login
                auth.signinRedirect();

                return '';
            }
        },
        [auth],
    );

    const context: OidcAuthenticationContext | undefined = useMemo(
        () =>
            auth.isAuthenticated && auth.user
                ? {
                      account: { id: auth.user.profile.sub, name: auth.user.profile.name },
                      logout: () => {
                          auth.signoutRedirect({
                              post_logout_redirect_uri: `/logout?p=${encodeURIComponent(
                                  window.location.pathname + window.location.search,
                              )}`,
                          });
                      },
                      getAccessToken,
                      isAuthenticated: true,
                      isLoading: auth.isLoading,
                  }
                : undefined,
        [auth, getAccessToken],
    );

    return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function useAuthenticationContext() {
    return useContext(Context);
}

export default AuthenticationContextProvider;
