// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import React, { createContext, useContext } from 'react';
import { useNotification } from '../notification/index.js';

export type SignalRConnectionInfo = {
    url: string;
    accessToken: string;
};

export type Subscription<T> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribe: (topic: string, callback: (...args: T[]) => any) => void;
    unsubscribe: (topic: string, callback?: (...args: T[]) => void) => void;
};

export type DocumentChange = {
    objectId: string;
    instanceId: string;
    documentId: string;
    type: string;
};

export type InstanceChange = string;

export type SignalRConnectionContextType = {
    documentChanges?: Subscription<DocumentChange>;
    instanceChanges?: Subscription<InstanceChange>;
};

export const SignalRConnectionContext = createContext<SignalRConnectionContextType>({});

SignalRConnectionContext.displayName = 'SignalRConnectionContext';

function SignalRConnectionProvider({ children }: { children: React.ReactNode }) {
    const notifications = useNotification();

    return (
        <SignalRConnectionContext.Provider
            value={{
                documentChanges: {
                    subscribe: (topicName, callback) => {
                        const [objectId, instanceId] = topicName.split('/');

                        notifications.documentChanges?.subscribe(objectId, instanceId, callback);
                    },
                    unsubscribe: (topicName, callback) => {
                        const [objectId, instanceId] = topicName.split('/');

                        notifications.documentChanges?.unsubscribe(objectId, instanceId, callback);
                    },
                },
                instanceChanges: {
                    subscribe: (objectId, callback) => {
                        notifications.instanceChanges?.subscribe(objectId, (...changes) => {
                            callback(...changes.map((change) => change.instanceId));
                        });
                    },
                    unsubscribe: (objectId, callback) => {
                        notifications.instanceChanges?.unsubscribe(
                            objectId,
                            callback
                                ? (...changes) => {
                                      callback?.(...changes.map((change) => change.instanceId));
                                  }
                                : undefined,
                        );
                    },
                },
            }}
        >
            {children}
        </SignalRConnectionContext.Provider>
    );
}

export function useSignalRConnection() {
    console.warn('Use of useSignalRConnection is deprecated. Use useNotification instead.');

    return useContext(SignalRConnectionContext);
}

export default SignalRConnectionProvider;
