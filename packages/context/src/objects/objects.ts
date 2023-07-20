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

export type PropertyType = 'array' | 'boolean' | 'date' | 'date-time' | 'integer' | 'number' | 'object' | 'string';

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

    findInstances(filter?: Filter): Promise<ObjectInstance[]>;
    findInstances(cb: Callback<ObjectInstance[]>): void;
    findInstances(filter: Filter, cb: Callback<ObjectInstance[]>): void;

    findInstances(filterOrCallback?: Filter | Callback<ObjectInstance[]>, cb?: Callback<ObjectInstance[]>) {
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

    getInstance(id: string): Promise<ObjectInstance>;
    getInstance(id: string, cb: Callback<ObjectInstance>): void;

    getInstance(id: string, cb?: Callback<ObjectInstance>) {
        if (!cb) {
            return this.services.get<ObjectInstance, unknown>(`data/objects/${this.objectId}/instances/${id}`);
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

    newInstance(input: ActionRequest): Promise<ObjectInstance>;
    newInstance(input: ActionRequest, cb: Callback<ObjectInstance>): void;

    newInstance(input: ActionRequest, cb?: Callback<ObjectInstance>) {
        if (!cb) {
            return this.services.post<ObjectInstance, ActionRequest>(
                `data/objects/${this.objectId}/instances/actions`,
                input,
            );
        }

        this.services.post(`data/objects/${this.objectId}/instances/actions`, input, cb);
    }

    instanceAction(id: string, input: ActionRequest): Promise<ObjectInstance>;
    instanceAction(id: string, input: ActionRequest, cb: Callback<ObjectInstance>): void;

    instanceAction(id: string, input: ActionRequest, cb?: Callback<ObjectInstance>) {
        if (!cb) {
            return this.services.post<ObjectInstance, ActionRequest>(
                `data/objects/${this.objectId}/instances/${id}/actions`,
                input,
            );
        }

        this.services.post(`data/objects/${this.objectId}/instances/${id}/actions`, input, cb);
    }
}

export function useObject(objectId: string) {
    const services = useApiServices();

    return useMemo(() => new ObjectStore(services, objectId), [services, objectId]);
}
