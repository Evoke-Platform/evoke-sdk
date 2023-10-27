// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { createContext, ReactNode, useContext } from 'react';

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

const defaultApp: App = { id: '_evoke', name: 'Evoke Platform', type: 'public' };
const AppContext = createContext<App>(defaultApp);

AppContext.displayName = 'AppContext';

export type AppProviderProps = {
    app: App;
    children?: ReactNode;
};

function AppProvider(props: AppProviderProps) {
    const { app, children } = props;

    return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
}

export function useApp() {
    return useContext(AppContext);
}

export default AppProvider;
