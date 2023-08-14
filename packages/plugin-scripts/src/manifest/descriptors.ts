// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

export type ItemDescriptor = {
    id: string;
    name: string;
    description?: string;
    version?: string;
    src: string;
    properties: PropertyDescriptor[];
};

export type PropertyDescriptor = {
    name: string;
    displayName?: string;
    type: string;
    isOptional?: boolean;
    [key: string]: unknown;
};

// For backwards compatibility.
export type WidgetDescriptor = ItemDescriptor;
export type WidgetPropertyDescriptor = PropertyDescriptor;
