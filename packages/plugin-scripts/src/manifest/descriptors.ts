// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

export type ItemDescriptor = {
    id: string;
    name: string;
    description?: string;
    version?: string;
    properties: PropertyDescriptor[];
};

export type PropertyDescriptor = {
    name: string;
    displayName?: string;
    type: string;
    isOptional?: boolean;
    [key: string]: unknown;
};

export type WidgetDescriptor = ItemDescriptor & {
    src: string;
};

// For backwards compatibility.
export type WidgetPropertyDescriptor = PropertyDescriptor;
