// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

export type WidgetDescriptor<Props> = {
    id?: string;
    name?: string;
    description?: string;
    version?: string;
    properties: {
        [P in Extract<keyof Props, string>]: WidgetPropertyDescriptor;
    };
    [key: string]: unknown;
};

export type WidgetPropertyDescriptor = {
    type: string;
    displayName?: string;
    [key: string]: unknown;
};
