// Copyright (c) 2025 System Automation Corporation.
// This file is licensed under the MIT License.

import { AxiosError } from 'axios';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useApiServices } from '../api/index.js';
import { Obj } from '../objects/index.js';

export type AppType = 'public' | 'portal' | 'private';

export type App = {
    id: string;
    name: string;
    type: AppType;
    offlineEnabled?: boolean;
    description?: string;
    initials?: string;
    icon?: string;
    iconColor?: string;
    pages?: Page[];
    navigation?: NavigationMenu;
    defaultPages?: Record<string, string>;
    mfa?: 'required' | 'optional';
};

export type Page = {
    id: string;
    name: string;
    slug?: string;
    children?: PageElement[];
};

export type PageElement = Container | Widget;

export type Container = {
    id: string;
    type: 'container';
    children?: PageElement[];
};

export type Widget = {
    id: string;
    pluginId: string;
    widgetKey: string;
    colSpan: number;
    isSticky?: boolean;
    noPadding?: boolean;
    properties: Record<string, unknown>;
};

export type NavigationLocation = 'side' | 'top' | 'none';

export type NavigationMenu = {
    location?: NavigationLocation;
    items?: NavigationItem[];
};

export type NavigationItem = {
    pageId: string;
    pageName: string;
};

const defaultApp: App = {
    id: '_evoke',
    name: 'Evoke Platform',
    type: 'public',
    offlineEnabled: false,
};

export type AppExtended = App & {
    /**
     * Looks up the default page slug for a given object or its nearest type ancestor.
     *
     * @param {string} objectId - The ID of the object to start the search from.
     * @returns {Promise<string | undefined>} The default page slug, or `undefined` if no default page is found.
     */
    findDefaultPageSlugFor: (objectId: string) => Promise<string | undefined>;
    /**
     * `true` when the current browser reports network connectivity.
     *
     * Note: this is a browser signal (`navigator.onLine` + online/offline events), not a guarantee that APIs are reachable.
     */
    isOnline: boolean;
    /**
     * `true` when the current device has opted in to offline private-data caching.
     *
     * This value is expected to be driven by the app layer (e.g., AppViewer OfflineProvider) so it is reactive.
     */
    hasOfflineOptIn: boolean;
};

const defaultAppExtended: AppExtended = {
    ...defaultApp,
    findDefaultPageSlugFor: (objectId: string) => Promise.resolve(undefined),
    isOnline: typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
    hasOfflineOptIn: false,
};

const AppContext = createContext<AppExtended>(defaultAppExtended);

AppContext.displayName = 'AppContext';

export type AppProviderProps = {
    app: App;
    hasOfflineOptIn?: boolean;
    children?: ReactNode;
};

function AppProvider(props: AppProviderProps) {
    const { app, children, hasOfflineOptIn } = props;
    const apiServices = useApiServices();

    const [isOnline, setIsOnline] = useState<boolean>(() =>
        typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);

        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    const findDefaultPageSlugFor = useCallback(
        async (objectId: string) => {
            let defaultPageId: string | undefined;
            let currentObjectId: string | undefined = objectId;
            while (currentObjectId !== undefined) {
                if (app.defaultPages?.[currentObjectId]) {
                    defaultPageId = app.defaultPages[currentObjectId];
                    break;
                }

                const effectiveObject: Obj | undefined = await apiServices.get<Obj>(
                    `data/objects/${currentObjectId}/effective`,
                    {
                        params: { filter: { fields: ['baseObject'] } },
                    },
                );

                currentObjectId = effectiveObject?.baseObject?.objectId ?? undefined;
            }

            let defaultPage: Page | undefined;
            if (defaultPageId) {
                const pageId = defaultPageId.includes('/')
                    ? defaultPageId.split('/').slice(2).join('/')
                    : defaultPageId;
                try {
                    defaultPage = await apiServices.get<Page>(
                        `/webContent/apps/${app.id}/pages/${encodeURIComponent(encodeURIComponent(pageId))}`,
                    );
                } catch (error) {
                    const err = error as AxiosError;
                    if (err.response?.status === 404) {
                        defaultPage = undefined;
                    }
                }
            }
            if (defaultPage?.slug) {
                return `/${app.id}/${defaultPage.slug}`;
            }
        },
        [apiServices, app],
    );

    const appExtended = useMemo<AppExtended>(
        () => ({
            ...app,
            findDefaultPageSlugFor,
            isOnline,
            hasOfflineOptIn: Boolean(hasOfflineOptIn),
        }),
        [app, findDefaultPageSlugFor, hasOfflineOptIn, isOnline],
    );

    return <AppContext.Provider value={appExtended}>{children}</AppContext.Provider>;
}

export function useApp() {
    return useContext(AppContext);
}

export default AppProvider;
