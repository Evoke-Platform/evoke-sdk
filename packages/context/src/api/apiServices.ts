// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticationContext, useAuthenticationContext } from '../authentication/AuthenticationContextProvider.js';
import { useApiBaseUrl } from './ApiBaseUrlProvider.js';
import { Callback } from './callback.js';
import { paramsSerializer } from './paramsSerializer.js';

export type Data = Record<string, unknown> | FormData;

const sessionId = uuidv4();

export class ApiServices {
    constructor(
        private api: AxiosInstance,
        authContext?: AuthenticationContext,
    ) {
        this.api.interceptors.request.use(async (config) => {
            const headers: Record<string, string> = { 'X-Session-Id': sessionId };

            if (authContext) {
                const token = await authContext.getAccessToken();
                headers['Authorization'] = `Bearer ${token}`;
            }

            config.headers = Object.assign({}, config.headers, headers);

            return config;
        });
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

    get<T, D = Data>(url: string, config?: AxiosRequestConfig<D>): Promise<T>;
    get<T>(url: string, cb: Callback<T>): void;
    get<T, D = Data>(url: string, config: AxiosRequestConfig<D>, cb: Callback<T>): void;

    async get<T, D>(url: string, configOrCallback?: AxiosRequestConfig<D> | Callback<T>, cb?: Callback<T>) {
        let config: AxiosRequestConfig<D> | undefined;

        if (cb) {
            config = configOrCallback as AxiosRequestConfig<D>;
        } else if (typeof configOrCallback === 'function') {
            cb = configOrCallback;
        } else {
            config = configOrCallback;
        }

        return this.promiseOrCallback(this.api.get<T, AxiosResponse<T, D>>(url, config), cb);
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

            if (typeof dataOrCallback === 'function') {
                cb = dataOrCallback;
            } else {
                data = dataOrCallback;
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

            if (typeof dataOrCallback === 'function') {
                cb = dataOrCallback;
            } else {
                data = dataOrCallback;
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

            if (typeof dataOrCallback === 'function') {
                cb = dataOrCallback;
            } else {
                data = dataOrCallback;
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

    const apiServices = useMemo(
        () => new ApiServices(axios.create({ baseURL, paramsSerializer }), authContext),
        [authContext, baseURL],
    );

    return apiServices;
}
