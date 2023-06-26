// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

export type Filter = {
    fields?: Fields;
    where?: Where;
    order?: string[];
    skip?: number;
    limit?: number;
};

export type Fields = string[] | Record<string, boolean>;

export type Where = Condition | AndClause | OrClause;

export type AndClause = {
    and: Where[];
};

export type OrClause = {
    or: Where[];
};

export type Condition = {
    [key: string]: PredicateComparison | ShortHandEqualType;
};

export type ShortHandEqualType = string | number | boolean | Date;

export type PredicateComparison = {
    eq?: unknown;
    neq?: unknown;
    gt?: unknown;
    gte?: unknown;
    lt?: unknown;
    lte?: unknown;
    inq?: unknown[];
    nin?: unknown[];
    between?: [unknown, unknown];
    exists?: boolean;
    like?: unknown;
    nlike?: unknown;
    ilike?: unknown;
    nilike?: unknown;
};
