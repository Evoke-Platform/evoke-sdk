import {
    HttpTransportType,
    HubConnection,
    HubConnectionBuilder,
    IHttpConnectionOptions,
    LogLevel,
} from '@microsoft/signalr';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useApiServices } from '../api/index.js';

export type NotificationConnectionInfo = {
    url: string;
    accessToken: string;
};

export type InstanceSubscription = {
    subscribe: (objectId: string, callback: (...args: NotificationInstanceChange[]) => void) => void;
    unsubscribe: (objectId: string, callback?: (...args: NotificationInstanceChange[]) => void) => void;
};

export type DocumentSubscription = {
    subscribe: (
        objectId: string,
        instanceId: string | undefined,
        callback: (...args: NotificationDocumentChange[]) => void,
    ) => void;
    unsubscribe: (
        objectId: string,
        instanceId: string | undefined,
        callback?: (...args: NotificationDocumentChange[]) => void,
    ) => void;
};

export type NotificationDocumentChange = {
    objectId: string;
    instanceId: string;
    documentId: string;
    type: string;
};

export type NotificationInstanceChange = {
    objectId: string;
    instanceId: string;
};

export type NotificationContextType = {
    documentChanges?: DocumentSubscription;
    instanceChanges?: InstanceSubscription;
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
                    const options: IHttpConnectionOptions = {
                        accessTokenFactory: () => {
                            return instancesConnectionInfo.accessToken ?? '';
                        },
                    };

                    const connection = new HubConnectionBuilder()
                        .withUrl(instancesConnectionInfo.url, options)
                        .configureLogging(LogLevel.Error)
                        .withAutomaticReconnect()
                        .build();

                    setInstancesNotification(connection);
                }

                if (documentsConnectionInfo) {
                    const options = {
                        accessTokenFactory: () => {
                            return documentsConnectionInfo.accessToken ?? '';
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
            } catch (err) {
                console.log(err);
            }
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
                          subscribe: (objectId, instanceId, callback) =>
                              documentsNotification.on(`${objectId}/${instanceId}`, callback),
                          unsubscribe: (objectId, instanceId, callback) =>
                              callback
                                  ? documentsNotification.off(`${objectId}/${instanceId}`, callback)
                                  : documentsNotification.off(`${objectId}/${instanceId}`),
                      }
                    : undefined,
                instanceChanges: instancesNotification
                    ? {
                          subscribe: (objectId, callback) => instancesNotification.on(objectId, callback),
                          unsubscribe: (objectId, callback) =>
                              callback
                                  ? instancesNotification.off(objectId, callback)
                                  : instancesNotification.off(objectId),
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
