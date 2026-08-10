import {
    HttpTransportType,
    HubConnection,
    HubConnectionBuilder,
    IHttpConnectionOptions,
    LogLevel,
} from '@microsoft/signalr';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useApiServices } from '../api/index.js';
import { ObjectStore } from '../objects/index.js';

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
                          subscribe: (objectId, instanceId, callback) => {
                              new ObjectStore(api, objectId)
                                  .get()
                                  .then((object) =>
                                      documentsNotification.on(`${object.rootObjectId}/${instanceId}`, callback),
                                  )
                                  .catch(() =>
                                      console.warn(
                                          `Cannot subscribe to notifications for unknown object "${objectId}"`,
                                      ),
                                  );
                          },
                          unsubscribe: (objectId, instanceId, callback) => {
                              new ObjectStore(api, objectId)
                                  .get()
                                  .then((object) =>
                                      callback
                                          ? documentsNotification.off(`${object.rootObjectId}/${instanceId}`, callback)
                                          : documentsNotification.off(`${object.rootObjectId}/${instanceId}`),
                                  )
                                  .catch(() => undefined);
                          },
                      }
                    : undefined,
                instanceChanges: instancesNotification
                    ? {
                          subscribe: (objectId, callback) => {
                              new ObjectStore(api, objectId)
                                  .get()
                                  .then((object) => instancesNotification.on(object.rootObjectId, callback))
                                  .catch(() =>
                                      console.warn(
                                          `Cannot subscribe to notifications for unknown object "${objectId}"`,
                                      ),
                                  );
                          },
                          unsubscribe: (objectId, callback) => {
                              new ObjectStore(api, objectId)
                                  .get()
                                  .then((object) =>
                                      callback
                                          ? instancesNotification.off(object.rootObjectId, callback)
                                          : instancesNotification.off(object.rootObjectId),
                                  )
                                  .catch(() => undefined);
                          },
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
