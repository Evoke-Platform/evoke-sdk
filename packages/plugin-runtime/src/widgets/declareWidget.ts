// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { FunctionComponent } from 'react';
import { WidgetDescriptor, WidgetPropertyDescriptor } from './descriptors';

type Widget = WidgetDescriptor<unknown> & {
    properties: WidgetProperty[];
};

type WidgetProperty = WidgetPropertyDescriptor & {
    name: string;
};

let widgets: Widget[];
let packageVersion: string | undefined;

export const context = {
    modulePath: '',
};

export function declareWidget<P>(widget: FunctionComponent<P>, descriptor: WidgetDescriptor<P>) {
    if (widgets) {
        const id = descriptor.id || widget.name;
        const name = descriptor.name || widget.displayName || widget.name;
        const version = descriptor.version || packageVersion;
        const src = descriptor.src || context.modulePath;

        widgets.push({
            ...descriptor,
            id,
            name,
            version,
            src,
            properties: Object.entries<WidgetPropertyDescriptor>(descriptor.properties).map(([key, value]) => ({
                ...value,
                name: key,
            })),
        });
    }
}

export function startWidgetDeclarations(version?: string) {
    widgets = [];
    packageVersion = version;
}

export function getWidgets() {
    return widgets;
}
