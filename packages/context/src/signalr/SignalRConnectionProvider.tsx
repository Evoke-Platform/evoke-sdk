// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { HttpTransportType, HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr/dist/esm/index.js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useApiServices } from '../api/index.js';

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
    const [instancesSignalRConnection, setInstancesSignalRConnection] = useState<HubConnection>();
    const [documentsSignalRConnection, setDocumentsSignalRConnection] = useState<HubConnection>();

    const api = useApiServices();

    useEffect(() => {
        const getConnectionInfo = (hubName: string) => {
            return api.post<SignalRConnectionInfo>(`/signalr/hubs/${hubName}/negotiate`);
        };

        const getConnection = async () => {
            try {
                const instancesConnectionInfo = await getConnectionInfo('instanceChanges');
                const documentsConnectionInfo = await getConnectionInfo('documentChanges');

                if (instancesConnectionInfo) {
                    const options = {
                        accessTokenFactory: async () => {
                            if (instancesConnectionInfo.accessToken) {
                                return instancesConnectionInfo.accessToken;
                            } else {
                                return getConnection();
                            }
                        },
                    };

                    const connection = new HubConnectionBuilder()
                        .withUrl(instancesConnectionInfo.url, options as unknown as HttpTransportType)
                        .configureLogging(LogLevel.Error)
                        .withAutomaticReconnect()
                        .build();

                    setInstancesSignalRConnection(connection);
                }

                if (documentsConnectionInfo) {
                    const options = {
                        accessTokenFactory: async () => {
                            if (documentsConnectionInfo.accessToken) {
                                return documentsConnectionInfo.accessToken;
                            } else {
                                return getConnection();
                            }
                        },
                    };

                    const connection = new HubConnectionBuilder()
                        .withUrl(documentsConnectionInfo.url, options as unknown as HttpTransportType)
                        .configureLogging(LogLevel.Error)
                        .withAutomaticReconnect()
                        .build();

                    setDocumentsSignalRConnection(connection);
                }
                // eslint-disable-next-line no-empty
            } catch (err) {}
        };

        getConnection();
    }, []);

    useEffect(() => {
        let documentsConnectionStopped = false;

        const startConnection = async (connection: HubConnection, numOfAttempts: number) => {
            await connection.start().catch((error: Error) => {
                if (numOfAttempts < 4 && !documentsConnectionStopped) {
                    setTimeout(() => {
                        if (!documentsConnectionStopped) {
                            startConnection(connection, numOfAttempts + 1);
                        }
                    }, 2000);
                } else {
                    console.warn(`Cannot start connection to SignalR due to error "${error}"`);
                }
            });
        };

        if (documentsSignalRConnection) {
            startConnection(documentsSignalRConnection, 0);
        }

        return () => {
            documentsSignalRConnection?.stop();
            documentsConnectionStopped = true;
        };
    }, [documentsSignalRConnection]);

    useEffect(() => {
        let instancesConnectionStopped = false;

        const startConnection = async (connection: HubConnection, numOfAttempts: number) => {
            await connection.start().catch((error: Error) => {
                if (numOfAttempts < 4 && !instancesConnectionStopped) {
                    setTimeout(() => {
                        if (!instancesConnectionStopped) {
                            startConnection(connection, numOfAttempts + 1);
                        }
                    }, 2000);
                } else {
                    console.warn(`Cannot start connection to SignalR due to error "${error}"`);
                }
            });
        };

        if (instancesSignalRConnection) {
            startConnection(instancesSignalRConnection, 0);
        }

        return () => {
            instancesSignalRConnection?.stop();
            instancesConnectionStopped = true;
        };
    }, [instancesSignalRConnection]);

    return (
        <SignalRConnectionContext.Provider
            value={{
                documentChanges: documentsSignalRConnection
                    ? {
                          subscribe: (topicName, callback) => documentsSignalRConnection.on(topicName, callback),
                          unsubscribe: (topicName, callback) =>
                              callback
                                  ? documentsSignalRConnection.off(topicName, callback)
                                  : documentsSignalRConnection.off(topicName),
                      }
                    : undefined,
                instanceChanges: instancesSignalRConnection
                    ? {
                          subscribe: (topicName, callback) => instancesSignalRConnection.on(topicName, callback),
                          unsubscribe: (topicName, callback) =>
                              callback
                                  ? instancesSignalRConnection.off(topicName, callback)
                                  : instancesSignalRConnection.off(topicName),
                      }
                    : undefined,
            }}
        >
            {children}
        </SignalRConnectionContext.Provider>
    );
}

export function useSignalRConnection() {
    return useContext(SignalRConnectionContext);
}

export default SignalRConnectionProvider;
