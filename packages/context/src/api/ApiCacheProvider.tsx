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
