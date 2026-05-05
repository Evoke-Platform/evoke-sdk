// Copyright (c) 2026 System Automation Corporation.
// This file is licensed under the MIT License.

import { ReactNode, createContext, useContext, useRef } from 'react';

export type ApiCache = {
    inflightGets: Map<string, Promise<unknown>>;
    inflightTimers: Map<string, ReturnType<typeof setTimeout>>;
    ttlMs: number;
};

export const ApiCacheContext = createContext<ApiCache | null>(null);

export type ApiCacheProviderProps = {
    children: ReactNode;
    ttlMs?: number;
};

/**
 * Enables in-flight GET request deduplication for all `useApiServices` consumers wrapped
 * by this provider. Concurrent requests to the same URL share a single network call, and
 * the response is reused for `ttlMs` milliseconds (default 200ms) after it resolves.
 * Without this provider, no deduplication occurs.
 */
export function ApiCacheProvider({ children, ttlMs = 200 }: ApiCacheProviderProps) {
    const cache = useRef<ApiCache>({
        inflightGets: new Map(),
        inflightTimers: new Map(),
        ttlMs,
    });

    return <ApiCacheContext.Provider value={cache.current}>{children}</ApiCacheContext.Provider>;
}

export function useApiCache() {
    return useContext(ApiCacheContext);
}
