import React, { useState, createContext, useEffect, useContext } from 'react';
import { HttpTransportType, HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr/dist/esm/index.js';
import { useApiServices } from '../api/index.js';

export type NotificationConnectionInfo = {
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

export type NotificationContextType = {
    documentChanges?: Subscription<DocumentChange>;
    instanceChanges?: Subscription<InstanceChange>;
};

export const NotificationContext = createContext<NotificationContextType>({});

NotificationContext.displayName = 'NotificationContext';

function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [instancesNotification, setInstancesNotification] = useState<HubConnection>();
    const [documentsNotification, setDocumentsNotification] = useState<HubConnection>();

    const api = useApiServices();

    useEffect(() => {
        const getConnectionInfo = (hubName: string) => {
            return api.post<NotificationConnectionInfo>(`/notification/hubs/${hubName}/negotiate`);
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

                    setInstancesNotification(connection);
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

                    setDocumentsNotification(connection);
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
                    console.warn(`Cannot start connection to Notification Service due to error "${error}"`);
                }
            });
        };

        if (documentsNotification) {
            startConnection(documentsNotification, 0);
        }

        return () => {
            documentsNotification?.stop();
            documentsConnectionStopped = true;
        };
    }, [documentsNotification]);

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
                    console.warn(`Cannot start connection to Notification Service due to error "${error}"`);
                }
            });
        };

        if (instancesNotification) {
            startConnection(instancesNotification, 0);
        }

        return () => {
            instancesNotification?.stop();
            instancesConnectionStopped = true;
        };
    }, [instancesNotification]);

    return (
        <NotificationContext.Provider
            value={{
                documentChanges: documentsNotification
                    ? {
                          subscribe: (topicName, callback) => documentsNotification.on(topicName, callback),
                          unsubscribe: (topicName, callback) =>
                              callback
                                  ? documentsNotification.off(topicName, callback)
                                  : documentsNotification.off(topicName),
                      }
                    : undefined,
                instanceChanges: instancesNotification
                    ? {
                          subscribe: (topicName, callback) => instancesNotification.on(topicName, callback),
                          unsubscribe: (topicName, callback) =>
                              callback
                                  ? instancesNotification.off(topicName, callback)
                                  : instancesNotification.off(topicName),
                      }
                    : undefined,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    return useContext(NotificationContext);
}

export default NotificationProvider;
