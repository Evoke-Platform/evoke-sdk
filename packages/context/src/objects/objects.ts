// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

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

export type DropdownViewLayout = {
    secondaryTextExpression: string;
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

export type VisibilityConfiguration = {
    operator?: 'any' | 'all';
    conditions?: {
        property: string;
        operator: 'eq' | 'neq';
        value: string | number | boolean;
    }[];
};

export type RelatedObjectDefaultValue = {
    criteria: Record<string, unknown>;
    sortBy?: string;
    orderBy?: 'asc' | 'desc' | 'ASC' | 'DESC';
};

export type DisplayConfiguration = {
    label?: string;
    placeholder?: string;
    required?: boolean;
    description?: string;
    defaultValue?: string | number | string[] | RelatedObjectDefaultValue;
    readOnly?: boolean;
    tooltip?: string;
    prefix?: string;
    suffix?: string;
    placeholderChar?: string;
    rowCount?: number;
    charCount?: boolean;
    mode?: 'default' | 'existingOnly';
    relatedObjectDisplay?: 'dropdown' | 'dialogBox';
    visibility?: VisibilityConfiguration | string;
    viewLayout?: ViewLayoutEntityReference;
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
    visibility?: VisibilityConfiguration | string;
};

export type Column = {
    width: number;
    entries?: FormEntry[];
};

export type Columns = {
    type: 'columns';
    columns: Column[];
    visibility?: VisibilityConfiguration | string;
};

export type Section = {
    label: string;
    entries?: FormEntry[];
};

export type Sections = {
    type: 'sections';
    sections: Section[];
    visibility?: VisibilityConfiguration | string;
};

export type FormEntry = InputParameterReference | Columns | Sections | Content;

export type Form = {
    entries?: FormEntry[];
};

export type ActionInputType =
    | 'button'
    | 'Section'
    | 'Columns'
    | 'Content'
    | 'Select'
    | 'TextField'
    | 'DateTime'
    | 'Document'
    | 'RepeatableField'
    | 'ManyToManyRepeatableField'
    | 'MultiSelect'
    | 'Decimal'
    | 'RichText'
    | 'Date'
    | 'Integer'
    | 'Image'
    | 'Object'
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
    displayOption?: 'dropdown' | 'dialogBox';
    rows?: number;
    showCharCount?: boolean;
    readOnly?: boolean;
    isMultiLineText?: boolean;
    verticalLayout?: boolean;
    input?: boolean;
    widget?: string;
    conditional?: {
        json?: string;
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
    sanitized?: boolean;
};

export class ObjectStore {
    constructor(
        private services: ApiServices,
        private objectId: string,
    ) {}

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

        const config: AxiosRequestConfig = {
            params: {
                sanitizedVersion: options?.sanitized,
            },
        };

        if (!cb) {
            return this.services.get(`data/objects/${this.objectId}/effective`, config);
        }

        this.services.get(`data/objects/${this.objectId}/effective`, config, cb);
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
