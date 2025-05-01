// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import TTLCache from '@isaacs/ttlcache';
import { AxiosRequestConfig } from 'axios';
import { useMemo } from 'react';
import { ApiServices, Callback, useApiServices } from '../api/index.js';
import { Filter } from './filters.js';

export type BaseObjReference = {
    objectId: string;
    discriminatorValue: unknown;
};

export type ViewLayoutEntityReference = {
    id: string;
    objectId: string;
};

type ViewLayoutEntity = {
    id: string;
    name: string;
    objectId: string;
};

export type TableViewLayoutEntity = ViewLayoutEntity & TableViewLayout;

export type DropdownViewLayoutEntity = ViewLayoutEntity & DropdownViewLayout;

export type ViewLayout = {
    table?: TableViewLayout;
    dropdown?: DropdownViewLayout;
};

export type DropdownViewLayoutSort = {
    propertyId: string;
    direction?: 'asc' | 'desc';
};

export type DropdownViewLayout = {
    secondaryTextExpression: string;
    sort?: DropdownViewLayoutSort;
};

export type TableViewLayout = {
    properties: PropertyReference[];
    sort?: Sort;
};

export type PropertyReference = {
    id: string;
    format?: string;
};

export type Sort = {
    colId: string;
    sort?: 'asc' | 'desc';
};

export type Obj = {
    id: string;
    name: string;
    typeDiscriminatorProperty?: string;
    viewLayout?: ViewLayout;
    baseObject?: BaseObjReference;
    properties?: Property[];
    actions?: Action[];
};

export type ObjWithRoot = Obj & { rootObjectId: string };

export type PropertyType =
    | 'address'
    | 'array'
    | 'boolean'
    | 'collection'
    | 'criteria'
    | 'date'
    | 'date-time'
    | 'document'
    | 'image'
    | 'integer'
    | 'number'
    | 'object'
    | 'richText'
    | 'string'
    | 'time'
    | 'user';

export type NumericValidation = {
    errorMessage?: string;
    minimum?: number;
    maximum?: number;
};

export type DateValidation = {
    errorMessage?: string;
    to?: string;
    from?: string;
};

export type CriteriaValidation = {
    criteria?: Record<string, unknown>;
};

export type StringValidation = {
    operator: 'any' | 'all';
    rules?: RegexValidation[];
};

export type DocumentValidation = {
    errorMessage?: string;
    maxDocuments?: number;
    minDocuments?: number;
};

export type PropertyValidation =
    | StringValidation
    | NumericValidation
    | DateValidation
    | CriteriaValidation
    | DocumentValidation;

export type Property = {
    id: string;
    name: string;
    type: PropertyType;
    enum?: string[];
    objectId?: string;
    relatedPropertyId?: string;
    required?: boolean;
    searchable?: boolean;
    formula?: string;
    formulaType?: 'aggregate' | 'custom' | 'arithmetic';
    mask?: string;
    validation?: PropertyValidation;
    manyToManyPropertyId?: string;
    textTransform?: 'titleCase' | 'upperCase' | 'lowerCase' | 'sentenceCase';
};

export type ActionType = 'create' | 'update' | 'delete';

export type InputStringValidation = StringValidation & {
    minLength?: number;
    maxLength?: number;
    mask?: string;
};

export type InputParameter = {
    id: string;
    name?: string;
    type: PropertyType;
    required?: boolean;
    enum?: string[];
    validation?: PropertyValidation | InputStringValidation;
    objectId?: string;
    relatedPropertyId?: string;
    manyToManyPropertyId?: string;
};
export type Action = {
    id: string;
    name: string;
    type: ActionType;
    outputEvent: string;
    inputProperties?: ActionInput[];
    parameters?: InputParameter[];
    form?: Form;
    customCode?: string;
    preconditions?: object;
};

export type ObjectInstance = {
    id: string;
    objectId: string;
    name: string;
    [key: string]: unknown;
};

export type RegexValidation = {
    regex: string;
    errorMessage?: string;
};

export type SelectOption = {
    label: string;
    value: string;
};

export type VisibilityCondition = {
    property: string;
    operator: 'eq' | 'ne';
    value: string | number | boolean;
    isInstanceProperty?: boolean;
};

export type VisibilityConfiguration = {
    operator?: 'any' | 'all';
    conditions?: VisibilityCondition[];
};

export type RelatedObjectDefaultValue = {
    criteria: Record<string, unknown>;
    sortBy?: string;
    orderBy?: 'asc' | 'desc' | 'ASC' | 'DESC';
};

export type CriteriaDefaultValue = Record<string, unknown>;

export type JsonLogic = Record<string, unknown> | boolean | number | string | null;

export type DisplayConfiguration = {
    label?: string;
    placeholder?: string;
    required?: boolean;
    description?: string;
    defaultValue?: string | number | string[] | RelatedObjectDefaultValue | CriteriaDefaultValue;
    readOnly?: boolean;
    tooltip?: string;
    prefix?: string;
    suffix?: string;
    placeholderChar?: string;
    rowCount?: number;
    charCount?: boolean;
    mode?: 'default' | 'existingOnly';
    relatedObjectDisplay?: 'dropdown' | 'dialogBox';
    visibility?: VisibilityConfiguration | JsonLogic;
    viewLayout?: ViewLayoutEntityReference;
    choicesDisplay?: {
        type: 'dropdown' | 'radioButton';
        sortBy?: 'ASC' | 'DESC' | 'NONE';
    };
};

export type InputParameterReference = {
    type: 'input';
    parameterId: string;
    display?: DisplayConfiguration;
    enumWithLabels?: SelectOption[];
    documentMetadata?: Record<string, string>;
};

export type Content = {
    type: 'content';
    html: string;
    visibility?: VisibilityConfiguration | JsonLogic;
};

export type Column = {
    width: number;
    entries?: FormEntry[];
};

export type Columns = {
    type: 'columns';
    columns: Column[];
    visibility?: VisibilityConfiguration | JsonLogic;
};

export type Section = {
    label: string;
    entries?: FormEntry[];
};

export type Sections = {
    type: 'sections';
    label?: string;
    sections: Section[];
    visibility?: VisibilityConfiguration | JsonLogic;
};

export type FormEntry = InputParameterReference | Columns | Sections | Content;

export type Form = {
    entries?: FormEntry[];
};

export type ActionInputType =
    | 'button'
    | 'Boolean'
    | 'Columns'
    | 'Content'
    | 'Criteria'
    | 'Date'
    | 'DateTime'
    | 'Decimal'
    | 'Document'
    | 'Image'
    | 'Integer'
    | 'ManyToManyRepeatableField'
    | 'MultiSelect'
    | 'Object'
    | 'RepeatableField'
    | 'RichText'
    | 'Section'
    | 'Select'
    | 'TextField'
    | 'Time'
    | 'User';

/**
 * Represents an object action inputProperty object.
 */
export type ActionInput = {
    id?: string;
    label?: string;
    type?: ActionInputType;
    key?: string;
    initialValue?: string | string[] | number | RelatedObjectDefaultValue | SelectOption[] | SelectOption;
    defaultToCurrentDate?: boolean;
    defaultToCurrentTime?: boolean;
    defaultValueCriteria?: object;
    sortBy?: string;
    orderBy?: 'asc' | 'desc' | 'ASC' | 'DESC';
    html?: string;
    labelPosition?: string;
    placeholder?: string;
    description?: string;
    tooltip?: string;
    prefix?: string;
    suffix?: string;
    data?: {
        /**
         * An array of values required for select options.
         */
        values?: SelectOption[];
    };
    inputMask?: string;
    inputMaskPlaceholderChar?: string;
    tableView?: boolean;
    mode?: 'default' | 'existingOnly';
    displayOption?: 'dropdown' | 'dialogBox' | 'radioButton';
    rows?: number;
    showCharCount?: boolean;
    readOnly?: boolean;
    isMultiLineText?: boolean;
    verticalLayout?: boolean;
    input?: boolean;
    widget?: string;
    conditional?: {
        json?: JsonLogic;
        show?: boolean;
        when?: string;
        eq?: string | number | boolean;
    };
    property?: InputParameter;
    viewLayout?: ViewLayoutEntityReference;
    documentMetadata?: Record<string, string>;
    validate?: {
        required?: boolean;
        criteria?: object;
        operator?: 'any' | 'all';
        regexes?: RegexValidation[];
        minLength?: number;
        maxLength?: number;
        minDate?: string;
        maxDate?: string;
        minTime?: string;
        maxTime?: string;
        min?: number;
        max?: number;
        minDocuments?: number;
        maxDocuments?: number;
        customMessage?: string;
    };
    /**
     * An array of sub-components to be rendered inside sections.
     */
    components?: {
        key: string;
        label?: string;
        components: ActionInput[];
    }[];
    /**
     * An array of sub-components to be rendered inside columns.
     */
    columns?: {
        width: number;
        currentWidth?: number;
        components: ActionInput[];
    }[];
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
    /**
     * When true, returns a sanitized version of the object reflecting
     * only the properties and actions available to the current user.
     */
    sanitized?: boolean;

    /**
     * When true, bypasses the cache and forces a new API call.
     */
    bypassCache?: boolean;

    /**
     * When true, preserves the original order of properties instead of
     * alphabetizing them (properties are alphabetized by default).
     */
    skipAlphabetize?: boolean;
};

/**
 * Provides methods for working with objects and their instances in Evoke.
 * Supports retrieving object definitions, finding/retrieving instances,
 * creating new instances, and performing actions on existing instances.
 */
export class ObjectStore {
    // Cache that stores in-flight promises
    // 30 second TTL for cached promises
    private static cache = new TTLCache<string, Promise<ObjWithRoot>>({
        ttl: 30 * 1000,
    });

    constructor(
        private services: ApiServices,
        private objectId: string,
    ) {}

    private getCacheKey(options?: ObjectOptions): string {
        return `${this.objectId}:${options?.sanitized ? 'sanitized' : 'default'}:${
            options?.skipAlphabetize ? 'unsorted' : 'sorted'
        }`;
    }

    private processObject(object: ObjWithRoot, options?: ObjectOptions): ObjWithRoot {
        const result = { ...object };

        if (result.properties) {
            // alphabetize properties by default unless disabled
            if (!options?.skipAlphabetize) {
                result.properties = [...result.properties].sort((a, b) =>
                    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
                );
            }
        }

        return result;
    }

    /**
     * Invalidates cached data for this specific object ID and all its option variants.
     * Use this when you know the object definition has changed on the server.
     */
    public invalidateCache(): void {
        const prefix = `${this.objectId}:`;
        for (const key of ObjectStore.cache.keys()) {
            if (typeof key === 'string' && key.startsWith(prefix)) {
                ObjectStore.cache.delete(key);
            }
        }
    }

    /**
     * Invalidates the entire object cache across all ObjectStore instances.
     * Use this when you need to force fresh data for all objects.
     */
    public static invalidateAllCache(): void {
        ObjectStore.cache.clear();
    }

    /**
     * Retrieves the object definition with inherited properties and actions.
     * Results are cached with a 30-second TTL to reduce API calls for frequently accessed objects.
     *
     * By default, properties are alphabetized by name. Use options to customize behavior.
     *
     * @param options - Configuration options for object retrieval and processing
     * @returns A promise resolving to the object with root
     */
    get(options?: ObjectOptions): Promise<ObjWithRoot>;
    get(cb?: Callback<ObjWithRoot>): void;
    get(options: ObjectOptions, cb?: Callback<ObjWithRoot>): void;

    get(optionsOrCallback?: ObjectOptions | Callback<ObjWithRoot>, cb?: Callback<ObjWithRoot>) {
        let options: ObjectOptions | undefined;

        if (cb) {
            options = optionsOrCallback as ObjectOptions;
        } else if (typeof optionsOrCallback === 'function') {
            cb = optionsOrCallback;
        } else {
            options = optionsOrCallback;
        }

        const cacheKey = this.getCacheKey(options);

        if (!options?.bypassCache) {
            const cachedPromise = ObjectStore.cache.get(cacheKey);

            if (cachedPromise) {
                if (cb) {
                    const callback = cb;
                    cachedPromise.then((data) => callback(null, data)).catch((err) => callback(err));
                    return;
                }
                return cachedPromise;
            }
        }

        const config: AxiosRequestConfig = {
            params: {
                sanitizedVersion: options?.sanitized,
            },
        };

        const promise = this.services
            .get<ObjWithRoot>(`data/objects/${this.objectId}/effective`, config)
            .then((result) => this.processObject(result, options));

        ObjectStore.cache.set(cacheKey, promise);

        if (cb) {
            const callback = cb;
            promise.then((data) => callback(null, data)).catch((err) => callback(err));
            return;
        }

        return promise;
    }

    /**
     * Finds instances of the object that match the specified filter criteria.
     */
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

    /**
     * Retrieves a specific instance of the object by ID.
     */
    getInstance<T extends ObjectInstance = ObjectInstance>(id: string): Promise<T>;
    getInstance<T extends ObjectInstance = ObjectInstance>(id: string, cb: Callback<T>): void;

    getInstance<T extends ObjectInstance>(id: string, cb?: Callback<T>) {
        if (!cb) {
            return this.services.get<T, unknown>(`data/objects/${this.objectId}/instances/${id}`);
        }

        this.services.get(`data/objects/${this.objectId}/instances/${id}`, cb);
    }

    /**
     * Retrieves the history of an instance of the object.
     */
    getInstanceHistory(id: string): Promise<History[]>;
    getInstanceHistory(id: string, cb: Callback<History[]>): void;

    getInstanceHistory(id: string, cb?: Callback<History[]>) {
        if (!cb) {
            return this.services.get<History[], unknown>(`data/objects/${this.objectId}/instances/${id}/history`);
        }

        this.services.get(`data/objects/${this.objectId}/instances/${id}/history`, cb);
    }

    /**
     * Creates a new instance of the object.
     */
    newInstance<T extends ObjectInstance = ObjectInstance>(input: ActionRequest): Promise<T>;
    newInstance<T extends ObjectInstance = ObjectInstance>(input: ActionRequest, cb: Callback<T>): void;

    newInstance<T extends ObjectInstance>(input: ActionRequest, cb?: Callback<T>) {
        if (!cb) {
            return this.services.post<T, ActionRequest>(`data/objects/${this.objectId}/instances/actions`, input);
        }

        this.services.post(`data/objects/${this.objectId}/instances/actions`, input, cb);
    }

    /**
     * Performs an action on an existing instance of the object.
     */
    instanceAction<T extends ObjectInstance = ObjectInstance>(id: string, input: ActionRequest): Promise<T>;
    instanceAction<T extends ObjectInstance = ObjectInstance>(id: string, input: ActionRequest, cb: Callback<T>): void;

    instanceAction<T extends ObjectInstance>(id: string, input: ActionRequest, cb?: Callback<T>) {
        if (!cb) {
            return this.services.post<T, ActionRequest>(`data/objects/${this.objectId}/instances/${id}/actions`, input);
        }

        this.services.post(`data/objects/${this.objectId}/instances/${id}/actions`, input, cb);
    }
}

/**
 * Creates an ObjectStore instance for the specified object.
 * Provides access to object definitions and instance operations.
 * Object definitions are cached for performance.
 *
 * @param objectId - ID of the object to access
 * @returns ObjectStore instance
 */
export function useObject(objectId: string) {
    const services = useApiServices();

    return useMemo(() => new ObjectStore(services, objectId), [services, objectId]);
}
