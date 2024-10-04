// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import React, { createContext, useContext, useState } from 'react';
import { InstanceSubscription, useNotification } from '../notification/index.js';

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

type SignalRConnectionInstanceCallback = Parameters<Subscription<InstanceChange>['subscribe']>[1];
type NotificationInstanceCallback = Parameters<InstanceSubscription['subscribe']>[1];

function SignalRConnectionProvider({ children }: { children: React.ReactNode }) {
    const notifications = useNotification();

    const [instanceCallbacks] = useState(
        // Map provided callbacks to our wrappers that are sent to the underlying
        // notification provider.
        new WeakMap<SignalRConnectionInstanceCallback, NotificationInstanceCallback>(),
    );

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
                        // If there is already a wrapper for the given callback, we must reuse the
                        // same one.  Otherwise, if we overwrite the entry in our cache, we'll lose
                        // track of the original wrapper.
                        let wrapper: NotificationInstanceCallback | undefined = instanceCallbacks.get(callback);

                        if (!wrapper) {
                            wrapper = (...changes) => {
                                callback(...changes.map((change) => change.instanceId));
                            };

                            instanceCallbacks.set(callback, wrapper);
                        }

                        notifications.instanceChanges?.subscribe(objectId, wrapper);
                    },
                    unsubscribe: (objectId, callback) => {
                        notifications.instanceChanges?.unsubscribe(
                            objectId,
                            callback && instanceCallbacks.get(callback),
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
