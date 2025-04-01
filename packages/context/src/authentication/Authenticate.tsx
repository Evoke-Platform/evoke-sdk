import { AccountInfo, AuthenticationResult, EventMessage, EventType, InteractionType } from '@azure/msal-browser';
import { MsalAuthenticationTemplate, useMsal } from '@azure/msal-react';
import { isNil } from 'lodash';
import React, { ReactNode, useEffect, useState } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import { authRequest } from './authConfig';
import AuthenticationContextProvider, { AuthenticationRequest } from './AuthenticationContextProvider';
import { SessionExpiryConfirmationDialog } from './SessionExpiryConfirmationDialog';

export type AuthenticateProps = {
    children: ReactNode;
};

const tokenRequest: AuthenticationRequest = {
    ...authRequest,
    scopes: [
        `https://${
            process.env.REACT_APP_INFRASTRUCTURE == 'dev' ? 'cedardev' : 'evoke'
        }.onmicrosoft.us/api/user_authentication`,
        'offline_access',
    ],
};

export const Authenticate: React.FC<AuthenticateProps> = ({ children }) => {
    const msal = useMsal();
    const { instance } = msal;

    const [account, setAccount] = useState<AccountInfo | null>(
        instance.getActiveAccount() ?? instance.getAllAccounts()[0],
    );

    const [open, setOpen] = useState<boolean>(false);

    const broadcast = new BroadcastChannel(`user_activities`);
    broadcast.onmessage = (ev: MessageEvent<{ type: string; account: AccountInfo; reason?: string }>) => {
        if (ev.data.type === 'logout' && ev.data.account?.localAccountId === account?.localAccountId) {
            instance.logoutRedirect({
                account,
                postLogoutRedirectUri: `/logout?p=${encodeURIComponent(window.location.pathname + window.location.search)}&reason=${encodeURIComponent(ev.data.reason ?? '')}`,
            });
        }
    };

    useEffect(() => {
        const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
        setAccount(account);

        instance.addEventCallback((msg: EventMessage) => {
            if (msg.eventType === EventType.LOGIN_SUCCESS) {
                setAccount((msg.payload as AuthenticationResult).account);
            } else if (msg.eventType === EventType.LOGIN_FAILURE) {
                instance.logoutRedirect({
                    account,
                    postLogoutRedirectUri: `/logout?p=${encodeURIComponent(window.location.pathname + window.location.search)}`,
                });
            } else if (msg.eventType === EventType.LOGOUT_SUCCESS) {
                broadcast.postMessage({ type: 'logout', account });
            }
        });
    }, [instance]);

    const onIdle = () => {
        if (isLeader()) {
            broadcast.postMessage({ type: 'logout', account, reason: 'session_expired' });
        }
    };

    const onPrompt = () => {
        setOpen(true);
    };

    const onActive = () => {
        setOpen(false);
    };

    const { activate, getRemainingTime, isLeader } = useIdleTimer({
        name: 'evoke-session-timeout',
        onIdle,
        onActive,
        onPrompt,
        promptBeforeIdle: 1000 * 60,
        timeout: 1000 * 60 * 30,
        throttle: 500,
        crossTab: true,
        leaderElection: true,
        syncTimers: 200,
    });

    const onClose = () => {
        setOpen(false);
        activate();
    };

    const onLogout = () => {
        setOpen(false);
        broadcast.postMessage({ type: 'logout', account });
    };

    const onContinue = () => {
        setOpen(false);
        activate();
    };

    return (
        <MsalAuthenticationTemplate
            interactionType={InteractionType.Redirect}
            authenticationRequest={{ ...authRequest, account: account ?? undefined }}
        >
            {!isNil(account) && (
                <AuthenticationContextProvider msal={msal} authRequest={tokenRequest}>
                    {children}
                </AuthenticationContextProvider>
            )}
            <SessionExpiryConfirmationDialog
                open={open}
                remainingTime={Math.ceil(getRemainingTime() / 1000)}
                onClose={onClose}
                onLogout={onLogout}
                onContinue={onContinue}
            />
        </MsalAuthenticationTemplate>
    );
};
