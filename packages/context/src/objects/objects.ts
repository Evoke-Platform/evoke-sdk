// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import TTLCache from '@isaacs/ttlcache';
import { AxiosRequestConfig } from 'axios';
import { useMemo } from 'react';
import { ApiServices, Callback, useApiServices } from '../api/index.js';
import { Filter } from './filters.js';

export type EvokeFormDisplayConfiguration = {
    submitLabel?: string;
};

export type EvokeForm = {
    id: string;
    name: string;
    entries: FormEntry[];
    objectId: string;
    formObjectId?: string;
    actionId?: string;
    autosaveActionId?: string;
    display?: EvokeFormDisplayConfiguration;
};

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
    table?: TableViewLayout | null;
    dropdown?: DropdownViewLayout | null;
};

export type DropdownViewLayoutSort = {
    propertyId: string;
    direction?: 'asc' | 'desc' | null;
};

export type DropdownViewLayout = {
    secondaryTextExpression: string;
    sort?: DropdownViewLayoutSort | null;
};

export type TableViewLayout = {
    properties: PropertyReference[];
    sort?: Sort | null;
};

export type PropertyReference = {
    id: string;
    format?: string;
};

export type Sort = {
    colId: string;
    sort?: 'asc' | 'desc' | null;
};

export type Obj = {
    id: string;
    name: string;
    typeDiscriminatorProperty?: string | null;
    viewLayout?: ViewLayout | null;
    baseObject?: BaseObjReference | null;
    properties?: Property[] | null;
    actions?: Action[] | null;
    formId?: string | null;
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
    errorMessage?: string | null;
    minimum?: number | null;
    maximum?: number | null;
};

export type DateValidation = {
    errorMessage?: string | null;
    to?: string | null;
    from?: string | null;
};

export type CriteriaValidation = {
    criteria?: Record<string, unknown> | null;
};

export type StringValidation = {
    operator: 'any' | 'all';
    rules?: RegexValidation[] | null;
};

export type DocumentValidation = {
    errorMessage?: string | null;
    maxDocuments?: number | null;
    minDocuments?: number | null;
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
    enum?: string[] | null;
    strictlyTrue?: boolean | null;
    nonStrictEnum?: boolean | null;
    objectId?: string | null;
    relatedPropertyId?: string | null;
    required?: boolean | null;
    searchable?: boolean | null;
    formula?: string | null;
    formulaType?: 'aggregate' | 'custom' | 'arithmetic' | null;
    mask?: string | null;
    validation?: PropertyValidation | null;
    manyToManyPropertyId?: string | null;
    textTransform?: 'titleCase' | 'upperCase' | 'lowerCase' | 'sentenceCase' | null;
};

export type ActionType = 'create' | 'update' | 'delete';

export type InputStringValidation = StringValidation & {
    minLength?: number | null;
    maxLength?: number | null;
    mask?: string | null;
};

export type BasicInputParameter = Omit<InputParameter, 'name' | 'required'>;

export type InputParameter = {
    id: string;
    name?: string | null;
    type: PropertyType;
    required?: boolean | null;
    enum?: string[] | null;
    strictlyTrue?: boolean | null;
    nonStrictEnum?: boolean | null;
    validation?: PropertyValidation | InputStringValidation | null;
    objectId?: string | null;
    relatedPropertyId?: string | null;
    manyToManyPropertyId?: string | null;
};
export type Action = {
    id: string;
    name: string;
    type: ActionType;
    outputEvent: string;
    inputProperties?: ActionInput[] | null;
    parameters?: InputParameter[] | null;
    form?: Form | null;
    defaultFormId?: string | null;
    customCode?: string | null;
    preconditions?: object | null;
};

export type ObjectInstance = {
    id: string;
    objectId: string;
    name: string;
    [key: string]: unknown;
};

export type RegexValidation = {
    regex: string;
    errorMessage?: string | null;
};

export type SelectOption = {
    label: string;
    value: string;
};

export type VisibilityCondition = {
    property: string;
    operator: 'eq' | 'ne';
    value: string | number | boolean;
    isInstanceProperty?: boolean | null;
};

export type VisibilityConfiguration = {
    operator?: 'any' | 'all' | null;
    conditions?: VisibilityCondition[] | null;
};

export type RelatedObjectDefaultValue = {
    criteria: Record<string, unknown>;
    sortBy?: string | null;
    orderBy?: 'asc' | 'desc' | 'ASC' | 'DESC' | null;
};

export type CriteriaDefaultValue = Record<string, unknown>;

export type JsonLogic = Record<string, unknown> | boolean | number | string | null;

export type DisplayConfiguration = {
    label?: string | null;
    placeholder?: string | null;
    required?: boolean | null;
    description?: string | null;
    defaultValue?: string | boolean | number | string[] | RelatedObjectDefaultValue | CriteriaDefaultValue | null;
    readOnly?: boolean | null;
    tooltip?: string | null;
    prefix?: string | null;
    suffix?: string | null;
    placeholderChar?: string | null;
    rowCount?: number | null;
    charCount?: boolean | null;
    mode?: 'default' | 'existingOnly' | null;
    relatedObjectDisplay?: 'dropdown' | 'dialogBox' | null;
    visibility?: VisibilityConfiguration | JsonLogic | null;
    viewLayout?: ViewLayoutEntityReference | null;
    choicesDisplay?: {
        type: 'dropdown' | 'radioButton';
        sortBy?: 'ASC' | 'DESC' | 'NONE' | null;
    } | null;
    booleanDisplay?: 'checkbox' | 'switch' | null;
};

export type InputParameterReference = {
    type: 'input';
    parameterId: string;
    display?: DisplayConfiguration | null;
    enumWithLabels?: SelectOption[] | null;
    documentMetadata?: Record<string, string> | null;
};

export type Content = {
    type: 'content';
    html: string;
    visibility?: VisibilityConfiguration | JsonLogic | null;
};

export type Column = {
    width: number;
    entries?: FormEntry[] | null;
};

export type Columns = {
    type: 'columns';
    columns: Column[];
    visibility?: VisibilityConfiguration | JsonLogic | null;
};

export type Section = {
    label: string;
    entries?: FormEntry[] | null;
};

export type Sections = {
    type: 'sections';
    label?: string | null;
    sections: Section[];
    visibility?: VisibilityConfiguration | JsonLogic | null;
};

export type ReadonlyField = {
    type: 'readonlyField';
    propertyId: string;
    display?: DisplayConfiguration | null;
};

export type InputField = {
    type: 'inputField';
    input: BasicInputParameter;
    display?: DisplayConfiguration | null;
    documentMetadata?: Record<string, string> | null;
};

export type FormEntry = InputField | InputParameterReference | ReadonlyField | Sections | Columns | Content;

export type Form = {
    entries?: FormEntry[] | null;
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
    id?: string | null;
    label?: string | null;
    type?: ActionInputType | null;
    key?: string | null;
    initialValue?:
        | boolean
        | string
        | string[]
        | number
        | RelatedObjectDefaultValue
        | SelectOption[]
        | SelectOption
        | null;
    defaultToCurrentDate?: boolean | null;
    defaultToCurrentTime?: boolean | null;
    defaultValueCriteria?: object | null;
    sortBy?: string | null;
    orderBy?: 'asc' | 'desc' | 'ASC' | 'DESC' | null;
    html?: string | null;
    labelPosition?: string | null;
    placeholder?: string | null;
    description?: string | null;
    tooltip?: string | null;
    prefix?: string | null;
    suffix?: string | null;
    data?: {
        /**
         * An array of values required for select options.
         */
        values?: SelectOption[] | null;
    } | null;
    inputMask?: string | null;
    inputMaskPlaceholderChar?: string | null;
    tableView?: boolean | null;
    mode?: 'default' | 'existingOnly' | null;
    displayOption?: 'dropdown' | 'dialogBox' | 'radioButton' | 'checkbox' | 'switch' | null;
    rows?: number | null;
    showCharCount?: boolean | null;
    readOnly?: boolean | null;
    isMultiLineText?: boolean | null;
    verticalLayout?: boolean | null;
    input?: boolean | null;
    widget?: string | null;
    conditional?: {
        json?: JsonLogic | null;
        show?: boolean | null;
        when?: string | null;
        eq?: string | number | boolean | null;
    } | null;
    property?: InputParameter | null;
    viewLayout?: ViewLayoutEntityReference | null;
    documentMetadata?: Record<string, string> | null;
    validate?: {
        required?: boolean | null;
        criteria?: object | null;
        operator?: 'any' | 'all' | null;
        regexes?: RegexValidation[] | null;
        minLength?: number | null;
        maxLength?: number | null;
        minDate?: string | null;
        maxDate?: string | null;
        minTime?: string | null;
        maxTime?: string | null;
        min?: number | null;
        max?: number | null;
        minDocuments?: number | null;
        maxDocuments?: number | null;
        customMessage?: string | null;
    };
    /**
     * An array of sub-components to be rendered inside sections.
     */
    components?:
        | {
              key: string;
              label?: string | null;
              components: ActionInput[];
          }[]
        | null;
    /**
     * An array of sub-components to be rendered inside columns.
     */
    columns?:
        | {
              width: number;
              currentWidth?: number | null;
              components: ActionInput[];
          }[]
        | null;
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
