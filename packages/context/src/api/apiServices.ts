// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticationContext, useAuthenticationContext } from '../authentication/AuthenticationContextProvider.js';
import { useApiBaseUrl } from './ApiBaseUrlProvider.js';
import { ApiCache, useApiCache } from './ApiCacheProvider.js';
import { Callback } from './callback.js';
import { paramsSerializer } from './paramsSerializer.js';

export type Data = Record<string, unknown> | FormData | File;

/** GET-specific request config. Extends AxiosRequestConfig with caching options. */
export type GetRequestConfig<D = Data> = AxiosRequestConfig<D> & {
    /** Set to `false` to skip the in-flight cache for this request. */
    cache?: false;
};

const sessionId = uuidv4();

export class ApiServices {
    private readonly authId: string;

    constructor(
        private api: AxiosInstance,
        authContext?: AuthenticationContext,
        private cache: ApiCache | null = null,
    ) {
        // Hidden from enumeration so that internal cache mutations are not visible
        // to libraries that compare or clone objects by their enumerable properties.
        // TypeScript has already assigned this.cache above; we just change its descriptor.
        Object.defineProperty(this, 'cache', { value: cache, enumerable: false, writable: true, configurable: true });
        this.authId = authContext?.account.id ?? 'anon';

        this.api.interceptors.request.use(async (config) => {
            const headers: Record<string, string> = { 'X-Session-Id': sessionId };

            if (authContext) {
                const token = await authContext.getAccessToken();
                headers['Authorization'] = `Bearer ${token}`;
            }

            config.headers = Object.assign({}, headers, config.headers);

            return config;
        });
    }

    // Reset the timer for deleting the cached GET request. If the timer expires, the cached request is removed from the inflightGets map.
    private resetDeleteTimer(cacheKey: string, request: Promise<AxiosResponse<unknown>>) {
        if (!this.cache) return;

        const { inflightGets, inflightTimers } = this.cache;
        const existing = inflightTimers.get(cacheKey);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(() => {
            if (inflightGets.get(cacheKey) === request) {
                inflightGets.delete(cacheKey);
            }
            inflightTimers.delete(cacheKey);
        }, this.cache.ttlMs);

        inflightTimers.set(cacheKey, timer);
    }

    private async promiseOrCallback<T>(promise: Promise<AxiosResponse<T>>, cb?: Callback<T>) {
        if (!cb) {
            const response = await promise;

            return response.data;
        }

        promise.then(
            (result) => cb(null, result.data),
            (error) => cb(error),
        );
    }

    get<T, D = Data>(url: string, config?: GetRequestConfig<D>): Promise<T>;
    get<T>(url: string, cb: Callback<T>): void;
    get<T, D = Data>(url: string, config: GetRequestConfig<D>, cb: Callback<T>): void;

    async get<T, D>(url: string, configOrCallback?: GetRequestConfig<D> | Callback<T>, cb?: Callback<T>) {
        let config: GetRequestConfig<D> | undefined;

        if (cb) {
            config = configOrCallback as GetRequestConfig<D>;
        } else if (typeof configOrCallback === 'function') {
            cb = configOrCallback;
        } else {
            config = configOrCallback;
        }

        // Strip `cache` before forwarding to axios — it is an Evoke-only option.
        const { cache: cacheFlag, ...axiosConfig } = config ?? {};

        // Bypass cache when explicitly disabled or when a custom paramsSerializer is
        // provided (can't guarantee it produces a stable cache key).
        if (!this.cache || cacheFlag === false || axiosConfig.paramsSerializer) {
            return this.promiseOrCallback(this.api.get<T, AxiosResponse<T, D>>(url, axiosConfig), cb);
        }

        const { inflightGets, inflightTimers } = this.cache;

        // create unique cache key for the request based on the full URL (including baseURL) and serialized params
        const paramStr = axiosConfig.params ? paramsSerializer(axiosConfig.params) : '';
        const cacheKey = `${this.authId}|${this.api.defaults.baseURL ?? ''}|${url}|${paramStr}`;
        let request = inflightGets.get(cacheKey) as Promise<AxiosResponse<T, D>> | undefined;

        if (!request) {
            request = this.api.get<T, AxiosResponse<T, D>>(url, axiosConfig);
            inflightGets.set(cacheKey, request);
            request.then(
                () => this.resetDeleteTimer(cacheKey, request as Promise<AxiosResponse<unknown>>),
                () => {
                    inflightGets.delete(cacheKey);
                    inflightTimers.delete(cacheKey);
                },
            );
        } else if (inflightTimers.has(cacheKey)) {
            this.resetDeleteTimer(cacheKey, request as Promise<AxiosResponse<unknown>>);
        }

        return this.promiseOrCallback(request, cb);
    }

    post<T, D = Data>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>;
    post<T>(url: string, cb: Callback<T>): void;
    post<T, D = Data>(url: string, data: D, cb: Callback<T>): void;
    post<T, D = Data>(url: string, data: D, config: AxiosRequestConfig<D>, cb: Callback<T>): void;

    async post<T, D extends Data>(
        url: string,
        dataOrCallback?: D | Callback<T>,
        configOrCallback?: AxiosRequestConfig<D> | Callback<T>,
        cb?: Callback<T>,
    ) {
        let data: D | undefined;
        let config: AxiosRequestConfig<D> | undefined;

        if (cb) {
            data = dataOrCallback as D;
            config = configOrCallback as AxiosRequestConfig<D>;
        } else if (typeof configOrCallback === 'function') {
            data = dataOrCallback as D;
            cb = configOrCallback;
        } else {
            config = configOrCallback;

            if (typeof dataOrCallback === 'function' && !(dataOrCallback instanceof File)) {
                cb = dataOrCallback;
            } else {
                data = dataOrCallback as D;
            }
        }

        return this.promiseOrCallback(this.api.post(url, data, config), cb);
    }

    patch<T, D = Data>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>;
    patch<T>(url: string, cb: Callback<T>): void;
    patch<T, D = Data>(url: string, data: D, cb: Callback<T>): void;
    patch<T, D = Data>(url: string, data: D, config: AxiosRequestConfig<D>, cb: Callback<T>): void;

    async patch<T, D extends Data>(
        url: string,
        dataOrCallback?: D | Callback<T>,
        configOrCallback?: AxiosRequestConfig<D> | Callback<T>,
        cb?: Callback<T>,
    ) {
        let data: D | undefined;
        let config: AxiosRequestConfig<D> | undefined;

        if (cb) {
            data = dataOrCallback as D;
            config = configOrCallback as AxiosRequestConfig<D>;
        } else if (typeof configOrCallback === 'function') {
            data = dataOrCallback as D;
            cb = configOrCallback;
        } else {
            config = configOrCallback;

            if (typeof dataOrCallback === 'function' && !(dataOrCallback instanceof File)) {
                cb = dataOrCallback;
            } else {
                data = dataOrCallback as D;
            }
        }

        return this.promiseOrCallback(this.api.patch(url, data, config), cb);
    }

    put<T, D = Data>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>;
    put<T>(url: string, cb: Callback<T>): void;
    put<T, D = Data>(url: string, data: D, cb: Callback<T>): void;
    put<T, D = Data>(url: string, data: D, config: AxiosRequestConfig<D>, cb: Callback<T>): void;

    async put<T, D extends Data>(
        url: string,
        dataOrCallback?: D | Callback<T>,
        configOrCallback?: AxiosRequestConfig<D> | Callback<T>,
        cb?: Callback<T>,
    ) {
        let data: D | undefined;
        let config: AxiosRequestConfig<D> | undefined;

        if (cb) {
            data = dataOrCallback as D;
            config = configOrCallback as AxiosRequestConfig<D>;
        } else if (typeof configOrCallback === 'function') {
            data = dataOrCallback as D;
            cb = configOrCallback;
        } else {
            config = configOrCallback;

            if (typeof dataOrCallback === 'function' && !(dataOrCallback instanceof File)) {
                cb = dataOrCallback;
            } else {
                data = dataOrCallback as D;
            }
        }

        return this.promiseOrCallback(this.api.put(url, data, config), cb);
    }

    delete<T, D = Data>(url: string, config?: AxiosRequestConfig<D>): Promise<T>;
    delete<T>(url: string, cb: Callback<T>): void;
    delete<T, D = Data>(url: string, config: AxiosRequestConfig<D>, cb: Callback<T>): void;

    async delete<T, D>(url: string, configOrCallback?: AxiosRequestConfig<D> | Callback<T>, cb?: Callback<T>) {
        let config: AxiosRequestConfig<D> | undefined;

        if (cb) {
            config = configOrCallback as AxiosRequestConfig<D>;
        } else if (typeof configOrCallback === 'function') {
            cb = configOrCallback;
        } else {
            config = configOrCallback;
        }

        return this.promiseOrCallback(this.api.delete<T, AxiosResponse<T, D>>(url, config), cb);
    }
}

export function useApiServices() {
    const authContext = useAuthenticationContext();
    const baseURL = useApiBaseUrl();
    const cache = useApiCache();

    const apiServices = useMemo(
        () => new ApiServices(axios.create({ baseURL, paramsSerializer }), authContext, cache),
        [authContext, baseURL, cache],
    );

    return apiServices;
}

export type { AxiosError, AxiosRequestConfig };
