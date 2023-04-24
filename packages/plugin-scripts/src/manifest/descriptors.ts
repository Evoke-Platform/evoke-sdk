// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

export type WidgetDescriptor = {
    id: string;
    name: string;
    description?: string;
    version?: string;
    src: string;
    properties: WidgetPropertyDescriptor[];
};

export type WidgetPropertyDescriptor = {
    name: string;
    displayName: string;
    type: string;
    optional?: boolean;
    [key: string]: unknown;
};
