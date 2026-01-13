// Copyright (c) 2025 System Automation Corporation.
// This file is licensed under the MIT License.

import { AxiosError } from 'axios';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useApiServices } from '../api/index.js';
import { Obj } from '../objects/index.js';

export type AppType = 'public' | 'portal' | 'private';

type ServiceWorkerAppPolicy = {
    appId: string;
    offlineEnabled: boolean;
    trustedDeviceOptIn: boolean;
    policyVersion: number;
};

type ServiceWorkerMessage =
    | { type: 'SET_APP_POLICY'; payload: ServiceWorkerAppPolicy }
    | { type: 'CLEAR_OFFLINE_DATA' }
    | { type: 'SKIP_WAITING' };

type ServiceWorkerMessageResponse = { ok: true } | { ok: false; error: string };

async function getActiveServiceWorkerTarget(): Promise<ServiceWorker | null> {
    const controller = navigator.serviceWorker.controller as ServiceWorker | null;
    if (controller) return controller;

    const getRegistration =
        typeof navigator.serviceWorker.getRegistration === 'function'
            ? navigator.serviceWorker.getRegistration.bind(navigator.serviceWorker)
            : null;
    if (!getRegistration) return null;

    const registration = await getRegistration();
    if (!registration) return null;

    return registration.active ?? registration.waiting ?? registration.installing ?? null;
}

/**
 * Sends a message to the active service worker (if present) and waits for a response.
 */
async function sendServiceWorkerMessage(
    message: ServiceWorkerMessage,
    options?: { timeoutMs?: number },
): Promise<ServiceWorkerMessageResponse> {
    if (typeof window === 'undefined') return { ok: false, error: 'no-window' };
    if (!('serviceWorker' in navigator)) return { ok: false, error: 'unsupported' };

    const timeoutMs = options?.timeoutMs ?? 5_000;

    const target = await getActiveServiceWorkerTarget();
    if (!target) return { ok: false, error: 'no-active-worker' };

    return await new Promise<ServiceWorkerMessageResponse>((resolve) => {
        const channel = new MessageChannel();
        const cleanup = () => {
            channel.port1.onmessage = null;
            channel.port1.close();
            channel.port2.close();
        };

        const timeoutId = window.setTimeout(() => {
            cleanup();
            resolve({ ok: false, error: 'timeout' });
        }, timeoutMs);

        channel.port1.onmessage = (event: MessageEvent) => {
            window.clearTimeout(timeoutId);
            const data = event.data as ServiceWorkerMessageResponse | undefined;
            cleanup();
            resolve(data ?? { ok: false, error: 'no-response' });
        };

        try {
            target.postMessage(message, [channel.port2]);
        } catch (error: unknown) {
            window.clearTimeout(timeoutId);
            cleanup();
            resolve({ ok: false, error: (error as Error)?.message ?? 'postMessage-failed' });
        }
    });
}

/**
 * Sets the current app's offline policy in the service worker so it can gate cache read/write.
 */
async function setAppPolicy(policy: ServiceWorkerAppPolicy): Promise<ServiceWorkerMessageResponse> {
    return await sendServiceWorkerMessage({ type: 'SET_APP_POLICY', payload: policy });
}

/**
 * Clears all Shell offline caches/state managed by the service worker.
 */
async function clearServiceWorkerOfflineData(): Promise<ServiceWorkerMessageResponse> {
    return await sendServiceWorkerMessage({ type: 'CLEAR_OFFLINE_DATA' });
}

/**
 * Clears private-data runtime caches (instance/object GET caching).
 */
async function clearPrivateOfflineCaches(): Promise<void> {
    if (typeof caches === 'undefined') return;

    const keys = await caches.keys();
    const privateCacheKeys = keys.filter(
        (key) =>
            key.startsWith('evoke-shell-runtime-') &&
            (key.includes('-data-objects') || key.includes('-data-instances')),
    );

    await Promise.all(privateCacheKeys.map((key) => caches.delete(key)));
}

const offlineOptInCookieName = 'evoke_offline_opt_in';
const defaultOfflineOptInMaxAgeDays = 365;

/**
 * Returns `true` when the offline opt-in cookie is present and truthy.
 */
function hasOfflineOptInCookie(): boolean {
    if (typeof window === 'undefined') return false;

    const cookie = window.document.cookie ?? '';
    const rawValue = cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${offlineOptInCookieName}=`))
        ?.split('=')[1];

    if (!rawValue) return false;

    const normalized = decodeURIComponent(rawValue).trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
}

/**
 * Sets the offline opt-in cookie for this browser/device.
 */
function setOfflineOptInCookie(value: boolean, options?: { maxAgeDays?: number }): void {
    if (typeof window === 'undefined') return;

    const maxAgeDays = options?.maxAgeDays ?? defaultOfflineOptInMaxAgeDays;
    const maxAgeSeconds = Math.max(1, Math.floor(maxAgeDays * 24 * 60 * 60));

    const parts = [
        `${offlineOptInCookieName}=${encodeURIComponent(value ? 'true' : 'false')}`,
        'path=/',
        'samesite=lax',
        `max-age=${maxAgeSeconds}`,
    ];

    if (window.location.protocol === 'https:') parts.push('secure');

    window.document.cookie = parts.join('; ');
}

/**
 * Clears the offline opt-in cookie (device opt-out).
 */
function clearOfflineOptInCookie(): void {
    if (typeof window === 'undefined') return;

    const parts = [
        `${offlineOptInCookieName}=`,
        'path=/',
        'samesite=lax',
        'expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'max-age=0',
    ];

    if (window.location.protocol === 'https:') parts.push('secure');

    window.document.cookie = parts.join('; ');
}

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

export type OfflineController = {
    /**
     * `true` when the current browser has network connectivity.
     */
    isOnline: boolean;
    /**
     * `true` when the current browser is offline.
     */
    isOffline: boolean;
    /**
     * `true` when the current app is configured as offline-capable (`offlineEnabled=true`).
     * This enables structural offline (booting UI/chrome offline after one online visit).
     */
    isStructuralOfflineEnabled: boolean;
    /**
     * `true` when the user has opted this device into private offline data caching (trusted device).
     */
    isTrustedDevice: boolean;
    /**
     * Enables private data offline caching for this device.
     * Writes the trusted-device cookie and updates the Shell service worker policy.
     */
    enableOfflineData: () => Promise<void>;
    /**
     * Disables private data offline caching for this device.
     * Clears the trusted-device cookie and updates the Shell service worker policy.
     */
    disableOfflineData: () => Promise<void>;
    /**
     * Clears all offline data caches managed by the Shell service worker.
     */
    clearOfflineData: () => Promise<void>;
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
     * Offline tooling for the current app.
     *
     * Provides:
     * - connectivity state (online/offline)
     * - trusted-device opt-in (private data offline)
     * - actions that update the Shell service worker policy for caching
     */
    offline: OfflineController;
};

const defaultAppExtended: AppExtended = {
    ...defaultApp,
    findDefaultPageSlugFor: (objectId: string) => Promise.resolve(undefined),
    offline: {
        isOnline: true,
        isOffline: false,
        isStructuralOfflineEnabled: false,
        isTrustedDevice: false,
        enableOfflineData: async () => undefined,
        disableOfflineData: async () => undefined,
        clearOfflineData: async () => undefined,
    },
};

const AppContext = createContext<AppExtended>(defaultAppExtended);

AppContext.displayName = 'AppContext';

export type AppProviderProps = {
    app: App;
    children?: ReactNode;
};

function AppProvider(props: AppProviderProps) {
    const { app, children } = props;
    const apiServices = useApiServices();

    const isStructuralOfflineEnabled = Boolean(app.offlineEnabled);

    const [isOnline, setIsOnline] = useState<boolean>(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true,
    );
    const [trustedDeviceCookieVersion, setTrustedDeviceCookieVersion] = useState<number>(0);

    const appIdRef = useRef(app.id);
    useEffect(() => {
        appIdRef.current = app.id;
    }, [app.id]);

    useEffect(() => {
        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);

        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    const syncOfflinePolicy = useCallback(
        async (nextTrustedDeviceOptIn: boolean) => {
            if (typeof window === 'undefined') return;
            if (!('serviceWorker' in navigator)) return;

            try {
                await setAppPolicy({
                    appId: appIdRef.current,
                    offlineEnabled: isStructuralOfflineEnabled,
                    trustedDeviceOptIn: Boolean(isStructuralOfflineEnabled && nextTrustedDeviceOptIn),
                    policyVersion: 1,
                });
            } catch {
                // Best-effort: service worker may not be registered/controlling yet.
            }
        },
        [isStructuralOfflineEnabled],
    );

    useEffect(() => {
        void syncOfflinePolicy(hasOfflineOptInCookie());
    }, [app.id, isStructuralOfflineEnabled, trustedDeviceCookieVersion, syncOfflinePolicy]);

    const enableOfflineData = useCallback(async () => {
        setOfflineOptInCookie(true);
        setTrustedDeviceCookieVersion((value) => value + 1);
        await syncOfflinePolicy(true);
    }, [syncOfflinePolicy]);

    const disableOfflineData = useCallback(async () => {
        clearOfflineOptInCookie();
        setTrustedDeviceCookieVersion((value) => value + 1);
        await syncOfflinePolicy(false);
        try {
            await clearPrivateOfflineCaches();
        } catch {
            // Best-effort: cache storage may be unavailable or restricted.
        }
    }, [syncOfflinePolicy]);

    const clearOfflineData = useCallback(async () => {
        const result = await clearServiceWorkerOfflineData();

        if (result.ok !== true && typeof caches !== 'undefined') {
            const keys = await caches.keys();
            await Promise.all(keys.filter((key) => key.startsWith('evoke-shell-')).map((key) => caches.delete(key)));
        }

        const prefix = 'evoke:offlineEnabled:';
        for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
            const key = window.sessionStorage.key(i);
            if (key && key.startsWith(prefix)) window.sessionStorage.removeItem(key);
        }
    }, []);

    const offline = useMemo<OfflineController>(
        () => ({
            isOnline,
            isOffline: !isOnline,
            isStructuralOfflineEnabled,
            get isTrustedDevice() {
                return hasOfflineOptInCookie();
            },
            enableOfflineData,
            disableOfflineData,
            clearOfflineData,
        }),
        [clearOfflineData, disableOfflineData, enableOfflineData, isOnline, isStructuralOfflineEnabled],
    );

    const appExtended: AppExtended = {
        ...app,
        findDefaultPageSlugFor: useCallback(
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
            [app],
        ),
        offline,
    };

    return <AppContext.Provider value={appExtended}>{children}</AppContext.Provider>;
}

export function useApp() {
    return useContext(AppContext);
}

export default AppProvider;
