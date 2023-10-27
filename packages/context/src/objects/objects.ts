// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { AxiosRequestConfig } from 'axios';
import { useMemo } from 'react';
import { ApiServices, Callback, useApiServices } from '../api/index.js';
import { Filter } from './filters.js';

export type Obj = {
    id: string;
    name: string;
    properties?: Property[];
    actions?: Action[];
};

export type PropertyType =
    | 'address'
    | 'array'
    | 'boolean'
    | 'collection'
    | 'date'
    | 'date-time'
    | 'image'
    | 'integer'
    | 'number'
    | 'object'
    | 'string'
    | 'time';

export type Property = {
    id: string;
    name: string;
    type: PropertyType;
    enum?: string[];
    objectId?: string;
    required?: boolean;
    searchable?: boolean;
    formula?: string;
};

export type ActionType = 'create' | 'update' | 'delete';

export type Action = {
    id: string;
    name: string;
    type: ActionType;
    outputEvent: string;
    inputProperties?: ActionInput[];
};

export type ObjectInstance = {
    id: string;
    objectId: string;
    name: string;
    [key: string]: unknown;
};

export type RegexValidation = {
    regex: string;
    errorMessage: string;
};

export type SelectOption = {
    label: string;
    value: string;
};

/**
 * Represents an object action inputProperty object.
 */
export type ActionInput = {
    label: string;
    type: string;
    key: string;
    initialValue?: unknown;
    placeholder?: string;
    description?: string;
    tooltip?: string;
    prefix?: string;
    suffix?: string;
    showCharCount?: boolean;
    readOnly?: boolean;
    isMultiLineText?: boolean;
    data?: {
        /**
         * An array of values required for select options.
         */
        values?: SelectOption[];
    };
    validate?: {
        required?: boolean;
        operator?: 'any' | 'all';
        regexes?: RegexValidation[];
    };
    /**
     * An array of sub-components to be rendered inside sections.
     */
    components?: ActionInput[];
    [key: string]: unknown;
};

export type ActionRequest = {
    actionId: string;
    input?: Record<string, unknown>;
};

export type HistoryEventType = 'create' | 'update' | 'delete' | 'queue' | 'print' | 'email' | 'upload';
export type HistoryType = 'correspondence' | 'document' | 'instance';

export type History = {
    user: Reference;
    event: string;
    eventType: HistoryEventType;
    type: HistoryType;
    timestamp: string;
    subject: Reference;
    data?: HistoryData[];
};

export type HistoryData = {
    property: string;
    historicalValue?: unknown;
    updatedValue?: unknown;
};

export type Reference = {
    id: string;
    name?: string;
};

export type ObjectOptions = {
    sanitized?: boolean;
};

export class ObjectStore {
    constructor(private services: ApiServices, private objectId: string) {}

    get(options?: ObjectOptions): Promise<Obj>;
    get(cb?: Callback<Obj>): void;
    get(options: ObjectOptions, cb?: Callback<Obj>): void;

    get(optionsOrCallback?: ObjectOptions | Callback<Obj>, cb?: Callback<Obj>) {
        let options: ObjectOptions | undefined;

        if (cb) {
            options = optionsOrCallback as ObjectOptions;
        } else if (typeof optionsOrCallback === 'function') {
            cb = optionsOrCallback;
        } else {
            options = optionsOrCallback;
        }

        const config: AxiosRequestConfig = {
            params: {
                sanitizedVersion: options?.sanitized,
            },
        };

        if (!cb) {
            return this.services.get(`data/objects/${this.objectId}`, config);
        }

        this.services.get(`data/objects/${this.objectId}`, config, cb);
    }

    findInstances<T extends ObjectInstance = ObjectInstance>(filter?: Filter): Promise<T[]>;
    findInstances<T extends ObjectInstance = ObjectInstance>(cb: Callback<T[]>): void;
    findInstances<T extends ObjectInstance = ObjectInstance>(filter: Filter, cb: Callback<T[]>): void;

    findInstances<T extends ObjectInstance>(filterOrCallback?: Filter | Callback<T[]>, cb?: Callback<T[]>) {
        let filter: Filter | undefined;

        if (cb) {
            filter = filterOrCallback as Filter;
        } else if (typeof filterOrCallback === 'function') {
            cb = filterOrCallback;
        } else {
            filter = filterOrCallback;
        }

        const config: AxiosRequestConfig = {
            params: {
                filter,
            },
        };

        if (!cb) {
            return this.services.get(`data/objects/${this.objectId}/instances`, config);
        }

        this.services.get(`data/objects/${this.objectId}/instances`, config, cb);
    }

    getInstance<T extends ObjectInstance = ObjectInstance>(id: string): Promise<T>;
    getInstance<T extends ObjectInstance = ObjectInstance>(id: string, cb: Callback<T>): void;

    getInstance<T extends ObjectInstance>(id: string, cb?: Callback<T>) {
        if (!cb) {
            return this.services.get<T, unknown>(`data/objects/${this.objectId}/instances/${id}`);
        }

        this.services.get(`data/objects/${this.objectId}/instances/${id}`, cb);
    }

    getInstanceHistory(id: string): Promise<History[]>;
    getInstanceHistory(id: string, cb: Callback<History[]>): void;

    getInstanceHistory(id: string, cb?: Callback<History[]>) {
        if (!cb) {
            return this.services.get<History[], unknown>(`data/objects/${this.objectId}/instances/${id}/history`);
        }

        this.services.get(`data/objects/${this.objectId}/instances/${id}/history`, cb);
    }

    newInstance<T extends ObjectInstance = ObjectInstance>(input: ActionRequest): Promise<T>;
    newInstance<T extends ObjectInstance = ObjectInstance>(input: ActionRequest, cb: Callback<T>): void;

    newInstance<T extends ObjectInstance>(input: ActionRequest, cb?: Callback<T>) {
        if (!cb) {
            return this.services.post<T, ActionRequest>(`data/objects/${this.objectId}/instances/actions`, input);
        }

        this.services.post(`data/objects/${this.objectId}/instances/actions`, input, cb);
    }

    instanceAction<T extends ObjectInstance = ObjectInstance>(id: string, input: ActionRequest): Promise<T>;
    instanceAction<T extends ObjectInstance = ObjectInstance>(id: string, input: ActionRequest, cb: Callback<T>): void;

    instanceAction<T extends ObjectInstance>(id: string, input: ActionRequest, cb?: Callback<T>) {
        if (!cb) {
            return this.services.post<T, ActionRequest>(`data/objects/${this.objectId}/instances/${id}/actions`, input);
        }

        this.services.post(`data/objects/${this.objectId}/instances/${id}/actions`, input, cb);
    }
}

export function useObject(objectId: string) {
    const services = useApiServices();

    return useMemo(() => new ObjectStore(services, objectId), [services, objectId]);
}
