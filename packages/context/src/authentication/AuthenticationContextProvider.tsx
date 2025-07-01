// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { AccountInfo, RedirectRequest } from '@azure/msal-browser';
import { IMsalContext } from '@azure/msal-react';
import { ExtraSigninRequestArgs } from 'oidc-client-ts';
import { ReactNode, createContext, useCallback, useContext, useMemo } from 'react';
import { useAuth } from 'react-oidc-context';

export type AuthenticationContext = {
    account: UserAccount;
    logout: VoidFunction;
    getAccessToken: () => Promise<string>;
};

export type UserAccount = {
    id: string;
    name?: string;
};

const Context = createContext<AuthenticationContext | undefined>(undefined);

Context.displayName = 'AuthenticationContext';

export type AuthenticationRequest = Pick<RedirectRequest, 'scopes' | 'extraQueryParameters' | 'state'>;

export type AuthenticationContextProviderProps = {
    msal?: IMsalContext;
    authRequest: AuthenticationRequest;
    children?: ReactNode;
};

function AuthenticationContextProvider(props: AuthenticationContextProviderProps) {
    // Auto-detect provider type based on presence of msal prop
    if (props.msal) {
        const { msal, authRequest, children } = props;

        return (
            <MsalProvider msal={msal} authRequest={authRequest}>
                {children}
            </MsalProvider>
        );
    } else {
        const { authRequest, children } = props;

        return <OidcProvider authRequest={authRequest}>{children}</OidcProvider>;
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

function OidcProvider({ authRequest, children }: AuthenticationContextProviderProps) {
    // The authRequest for react-oidc is formatted slightly differently than msal.
    const oidcAuthRequest: Pick<ExtraSigninRequestArgs, 'scope' | 'extraQueryParams' | 'state'> = {
        scope: authRequest.scopes?.join(' ') || 'openid profile email',
        extraQueryParams: authRequest.extraQueryParameters,
        state: authRequest.state,
    };

    const auth = useAuth();

    const getAccessToken = useCallback(
        async function () {
            try {
                // Check if we have a valid (non-expired) access token
                if (auth.user?.access_token && !auth.user.expired) {
                    return auth.user.access_token;
                }

                // Token is either missing or expired - attempt silent refresh
                // This handles both cases:
                // - automaticSilentRenew: true (should not reach here, but fallback as a sanity check)
                // - automaticSilentRenew: false (manual refresh when needed)
                await auth.signinSilent(oidcAuthRequest);

                return auth.user?.access_token || '';
            } catch (error) {
                console.error('Failed to get access token:', error);

                // If silent refresh fails, redirect to login
                auth.signinRedirect(oidcAuthRequest);

                return '';
            }
        },
        [auth, authRequest],
    );

    const context: AuthenticationContext | undefined = useMemo(
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
