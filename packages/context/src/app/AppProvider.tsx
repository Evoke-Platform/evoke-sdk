// Copyright (c) 2025 System Automation Corporation.
// This file is licensed under the MIT License.

import { AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useApiServices } from '../api/index.js';
import { Obj } from '../objects/index.js';

export type AppType = 'public' | 'portal' | 'private';

type ServiceWorkerAppPolicy = {
    appId: string;
    /**
     * Full display name for installable PWA metadata (manifest `name`).
     */
    appName?: string;
    /**
     * Short display name for installable PWA metadata (manifest `short_name`).
     */
    appShortName?: string;
    offlineEnabled: boolean;
    trustedDeviceOptIn: boolean;
    /**
     * Version of the policy schema shared with the service worker.
     */
    policyVersion: number;
};

type ServiceWorkerMessage =
    | { type: 'SET_APP_POLICY'; payload: ServiceWorkerAppPolicy }
    | { type: 'CLEAR_OFFLINE_DATA' }
    | { type: 'SKIP_WAITING' };

enum ServiceWorkerMessageError {
    NoWindow = 'no-window',
    Unsupported = 'unsupported',
    NoActiveWorker = 'no-active-worker',
    Timeout = 'timeout',
    NoResponse = 'no-response',
    PostMessageFailed = 'postMessage-failed',
}

type ServiceWorkerMessageResponse = { ok: true } | { ok: false; error: ServiceWorkerMessageError };

// Bump when the SW policy schema changes.
const offlinePolicyVersion = 1;

/**
 * Finds the active service worker to message, preferring the controller when available.
 */
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
    if (typeof window === 'undefined') return { ok: false, error: ServiceWorkerMessageError.NoWindow };
    if (!('serviceWorker' in navigator)) return { ok: false, error: ServiceWorkerMessageError.Unsupported };

    const timeoutMs = options?.timeoutMs ?? 5_000;

    const target = await getActiveServiceWorkerTarget();
    if (!target) return { ok: false, error: ServiceWorkerMessageError.NoActiveWorker };

    return await new Promise<ServiceWorkerMessageResponse>((resolve) => {
        // port1 stays with this page and receives responses; port2 is transferred so the SW can reply on the channel.
        const channel = new MessageChannel();
        const cleanup = () => {
            channel.port1.onmessage = null;
            channel.port1.close();
            channel.port2.close();
        };

        const timeoutId = window.setTimeout(() => {
            cleanup();
            resolve({ ok: false, error: ServiceWorkerMessageError.Timeout });
        }, timeoutMs);

        channel.port1.onmessage = (event: MessageEvent) => {
            window.clearTimeout(timeoutId);
            const data = event.data as ServiceWorkerMessageResponse | undefined;
            cleanup();
            resolve(data ?? { ok: false, error: ServiceWorkerMessageError.NoResponse });
        };

        try {
            target.postMessage(message, [channel.port2]);
        } catch (error: unknown) {
            window.clearTimeout(timeoutId);
            cleanup();
            resolve({ ok: false, error: ServiceWorkerMessageError.PostMessageFailed });
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
            key.startsWith(shellRuntimeCachePrefix) &&
            (key.includes('-data-objects') || key.includes('-data-instances')),
    );

    await Promise.all(privateCacheKeys.map((key) => caches.delete(key)));
}

async function waitForServiceWorkerController(timeoutMs: number): Promise<boolean> {
    /**
     * On first load, a service worker can be registered/active but not yet "controlling" this tab.
     * If we try to sync offline policy or warm caches before the tab is controlled, it becomes a timing gamble:
     * sometimes the service worker won't see/intercept the requests, and offline setup won't stick until a refresh.
     *
     * This helper waits (briefly) for the browser to hand control of this tab to the service worker.
     */
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator)) return false;
    if (navigator.serviceWorker.controller) return true;

    return await new Promise<boolean>((resolve) => {
        const onControllerChange = () => {
            window.clearTimeout(timeoutId);
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
            resolve(Boolean(navigator.serviceWorker.controller));
        };

        const timeoutId = window.setTimeout(() => {
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
            resolve(Boolean(navigator.serviceWorker.controller));
        }, timeoutMs);

        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    });
}

const offlineOptInCookieName = 'evoke_offline_opt_in';
const shellCachePrefix = 'evoke:shell';
const shellRuntimeCachePrefix = `${shellCachePrefix}-runtime-`;
const offlineEnabledStoragePrefix = 'evoke:shell:offlineEnabled:';
// Default trusted-device cookie lifetime in days; can be overridden via enableOfflineData options.
const defaultOfflineOptInMaxAgeDays = 90;

/**
 * Returns `true` when the offline opt-in cookie is present and truthy.
 */
function hasOfflineOptInCookie(): boolean {
    if (typeof window === 'undefined') return false;

    const rawValue = Cookies.get(offlineOptInCookieName);

    if (!rawValue) return false;

    const normalized = rawValue.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
}

/**
 * Sets the offline opt-in cookie for this browser/device.
 */
function setOfflineOptInCookie(value: boolean, options?: { maxAgeDays?: number }): void {
    if (typeof window === 'undefined') return;

    const maxAgeDays = options?.maxAgeDays ?? defaultOfflineOptInMaxAgeDays;
    const secure = window.location.protocol === 'https:';
    const cookieOptions = {
        expires: Math.max(1, Math.floor(maxAgeDays)),
        path: '/',
        sameSite: 'lax' as const,
        ...(secure ? { secure: true } : {}),
    };

    Cookies.set(offlineOptInCookieName, value ? 'true' : 'false', cookieOptions);
}

/**
 * Clears the offline opt-in cookie (device opt-out).
 */
function clearOfflineOptInCookie(): void {
    if (typeof window === 'undefined') return;

    const secure = window.location.protocol === 'https:';
    const cookieOptions = {
        path: '/',
        sameSite: 'lax' as const,
        ...(secure ? { secure: true } : {}),
    };

    Cookies.remove(offlineOptInCookieName, cookieOptions);
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

export type OfflineTools = {
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
     * Pass `maxAgeDays` to override the default cookie lifetime.
     */
    enableOfflineData: (options?: { maxAgeDays?: number }) => Promise<void>;
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

export type ConnectivityState = {
    /**
     * `true` when the current browser reports network connectivity.
     */
    isOnline: boolean;
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
     * Offline tooling for the current app (not connectivity status).
     *
     * Provides:
     * - trusted-device opt-in (private data offline)
     * - actions that update the Shell service worker policy for caching
     */
    offlineTools: OfflineTools;
    /**
     * Network connectivity state for the current browser session.
     */
    connectivity: ConnectivityState;
};

const defaultAppExtended: AppExtended = {
    ...defaultApp,
    findDefaultPageSlugFor: (objectId: string) => Promise.resolve(undefined),
    offlineTools: {
        isStructuralOfflineEnabled: false,
        isTrustedDevice: false,
        enableOfflineData: async () => undefined,
        disableOfflineData: async () => undefined,
        clearOfflineData: async () => undefined,
    },
    connectivity: {
        isOnline: typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
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
        typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
    );
    // Bumped after cookie writes to force policy sync even if app inputs are unchanged.
    const [policySyncCounter, setPolicySyncCounter] = useState<number>(0);

    const appIdRef = useRef(app.id);
    const appNameRef = useRef(app.name);
    useEffect(() => {
        appIdRef.current = app.id;
    }, [app.id]);
    useEffect(() => {
        appNameRef.current = app.name;
    }, [app.name]);

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
        async (nextTrustedDeviceOptIn: boolean): Promise<boolean> => {
            if (typeof window === 'undefined') return false;
            if (!('serviceWorker' in navigator)) return false;

            try {
                const appName = appNameRef.current?.trim() || appIdRef.current;
                const result = await setAppPolicy({
                    appId: appIdRef.current,
                    appName,
                    appShortName: appName,
                    offlineEnabled: isStructuralOfflineEnabled,
                    trustedDeviceOptIn: Boolean(isStructuralOfflineEnabled && nextTrustedDeviceOptIn),
                    policyVersion: offlinePolicyVersion,
                });
                return result.ok === true;
            } catch {
                // Best-effort: service worker may not be registered/controlling yet.
                console.warn('[evoke-sdk] Failed to sync offline policy to service worker.');
                return false;
            }
        },
        [isStructuralOfflineEnabled],
    );

    useEffect(() => {
        void (async () => {
            const ok = await syncOfflinePolicy(hasOfflineOptInCookie());
            if (ok) return;

            const controlled = await waitForServiceWorkerController(10000);
            if (!controlled) return;

            await syncOfflinePolicy(hasOfflineOptInCookie());
        })();
    }, [app.id, app.name, isStructuralOfflineEnabled, policySyncCounter, syncOfflinePolicy]);

    const enableOfflineData = useCallback(
        async (options?: { maxAgeDays?: number }) => {
            setOfflineOptInCookie(true, options);
            setPolicySyncCounter((value) => value + 1);
            const ok = await syncOfflinePolicy(true);
            if (ok) return;

            const controlled = await waitForServiceWorkerController(10_000);
            if (!controlled) return;

            await syncOfflinePolicy(true);
        },
        [syncOfflinePolicy],
    );

    const disableOfflineData = useCallback(async () => {
        clearOfflineOptInCookie();
        setPolicySyncCounter((value) => value + 1);
        const ok = await syncOfflinePolicy(false);
        if (!ok) {
            const controlled = await waitForServiceWorkerController(10_000);
            if (controlled) {
                await syncOfflinePolicy(false);
            }
        }
        try {
            await clearPrivateOfflineCaches();
        } catch {
            // Best-effort: cache storage may be unavailable or restricted.
            console.warn('[evoke-sdk] Failed to clear private offline caches during opt-out.');
        }
    }, [syncOfflinePolicy]);

    const clearOfflineData = useCallback(async () => {
        const result = await clearServiceWorkerOfflineData();

        if (result.ok !== true && typeof caches !== 'undefined') {
            const keys = await caches.keys();
            await Promise.all(
                keys.filter((key) => key.startsWith(`${shellCachePrefix}-`)).map((key) => caches.delete(key)),
            );
        }

        for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
            const key = window.sessionStorage.key(i);
            if (key && key.startsWith(offlineEnabledStoragePrefix)) {
                window.sessionStorage.removeItem(key);
            }
        }
    }, []);

    const offlineTools = useMemo<OfflineTools>(
        () => ({
            isStructuralOfflineEnabled,
            get isTrustedDevice() {
                return hasOfflineOptInCookie();
            },
            enableOfflineData,
            disableOfflineData,
            clearOfflineData,
        }),
        [clearOfflineData, disableOfflineData, enableOfflineData, isStructuralOfflineEnabled],
    );

    const connectivity = useMemo<ConnectivityState>(() => ({ isOnline }), [isOnline]);

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
        offlineTools,
        connectivity,
    };

    return <AppContext.Provider value={appExtended}>{children}</AppContext.Provider>;
}

export function useApp() {
    return useContext(AppContext);
}

export default AppProvider;
