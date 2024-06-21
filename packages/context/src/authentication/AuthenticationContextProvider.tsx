// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { AccountInfo, RedirectRequest } from '@azure/msal-browser';
import { IMsalContext } from '@azure/msal-react';
import { ReactNode, createContext, useCallback, useContext, useMemo } from 'react';

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

export type AuthenticationContextProviderProps = {
    msal: IMsalContext;
    authRequest: AuthenticationRequest;
    children?: ReactNode;
};

export type AuthenticationRequest = Pick<RedirectRequest, 'scopes' | 'extraQueryParameters' | 'state'>;

function AuthenticationContextProvider(props: AuthenticationContextProviderProps) {
    const { msal, authRequest, children } = props;

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
        [msal, authRequest],
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
        [account, msal, getAccessToken],
    );

    return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function useAuthenticationContext() {
    return useContext(Context);
}

export default AuthenticationContextProvider;
