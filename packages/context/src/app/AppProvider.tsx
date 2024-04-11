// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { createContext, ReactNode, useCallback, useContext } from 'react';
import { useApiServices } from '../api';
import { Obj } from '../objects';

export type AppType = 'public' | 'portal' | 'private';

export type App = {
    id: string;
    name: string;
    type: AppType;
    description?: string;
    initials?: string;
    icon?: string;
    iconColor?: string;
    pages?: Page[];
    navigation?: NavigationMenu;
    defaultPages?: Record<string, string>;
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
    properties: Record<string, unknown>;
};

export type NavigationMenu = {
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
};

type AppWithFunctions = App & {
    getDefaultPageSlug: (objectId: string) => Promise<string | undefined>;
};

const defaultAppWithFunctions: AppWithFunctions = {
    ...defaultApp,
    getDefaultPageSlug: (objectId: string) => Promise.resolve(undefined),
};

const AppContext = createContext<AppWithFunctions>(defaultAppWithFunctions);

AppContext.displayName = 'AppContext';

export type AppProviderProps = {
    app: App;
    children?: ReactNode;
};

function AppProvider(props: AppProviderProps) {
    const { app, children } = props;
    const apiServices = useApiServices();

    const appWithFunctions: AppWithFunctions = {
        ...app,
        getDefaultPageSlug: useCallback(
            async (objectId: string) => {
                let defaultPageId: string | undefined;
                const objectHierarchy = [objectId];
                let currentObjectId: string | undefined = objectId;
                while (currentObjectId !== undefined) {
                    if (app.defaultPages?.[currentObjectId]) {
                        defaultPageId = app.defaultPages[currentObjectId];
                        break;
                    }

                    let effectiveObject: Obj | undefined;
                    try {
                        effectiveObject = await apiServices.get<Obj>(`data/objects/${currentObjectId}/effective`, {
                            params: { filter: { fields: ['baseObject'] }, sanitizedVersion: true },
                        });
                    } catch (error) {
                        console.error(error);
                    }
                    if (effectiveObject?.baseObject?.objectId) {
                        objectHierarchy.push(effectiveObject?.baseObject?.objectId);
                    }
                    currentObjectId = effectiveObject?.baseObject?.objectId ?? undefined;
                }

                let defaultPage: Page | undefined;
                if (defaultPageId && typeof defaultPageId === 'string') {
                    const pageId = defaultPageId.includes('/')
                        ? defaultPageId.split('/').slice(2).join('/')
                        : defaultPageId;
                    defaultPage = await apiServices.get<Page>(
                        `/webContent/apps/${app.id}/pages/${encodeURIComponent(encodeURIComponent(pageId))}`,
                    );
                }
                return defaultPage?.slug;
            },
            [app],
        ),
    };

    return <AppContext.Provider value={appWithFunctions}>{children}</AppContext.Provider>;
}

export function useApp() {
    return useContext(AppContext);
}

export default AppProvider;
